import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as THREE from 'three';
import { CINEMATIC_CONFIG, INSPECT_FRAME } from '../motion/motion.config.mjs';
import { sampleStory, damp } from '../motion/story.mjs';
import { createProductRig } from './apexRig.mjs';
export const clearCinematicModel = url => useGLTF.clear(url);

function LightingRig() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const previous = scene.environment, previousIntensity = scene.environmentIntensity;
    const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromScene(room, 0.03);
    scene.environment = target.texture; scene.environmentIntensity = 0.7;
    room.dispose(); pmrem.dispose(); invalidate();
    return () => { scene.environment = previous; scene.environmentIntensity = previousIntensity; target.dispose(); };
  }, [gl, scene, invalidate]);
  return <>
    <ambientLight intensity={0.2}/>
    <directionalLight position={[-3, 5, 4]} intensity={2.2}/>
    <directionalLight position={[4, 2, -3]} intensity={1.1}/>
    <hemisphereLight args={['#ffffff', '#536471', 0.35]}/>
  </>;
}

function CameraRig({ director, api, compact, onFailure }) {
  const { camera, gl, invalidate } = useThree();
  const controls = useRef(null), target = useRef(new THREE.Vector3());
  const initialized = useRef(false), wasInspecting = useRef(false);
  const goal = useMemo(() => new THREE.Vector3(), []);
  const cameraGoal = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    const control = new OrbitControls(camera, gl.domElement);
    controls.current = control;
    control.enablePan = false; control.enableDamping = false;
    control.minDistance = 4.5; control.maxDistance = 14;
    control.minPolarAngle = 0.15; control.maxPolarAngle = Math.PI - 0.15;
    control.rotateSpeed = 1.35; control.zoomSpeed = 0.8;
    control.enabled = false;
    control.addEventListener('change', invalidate);
    const unsubscribe = director.subscribe(invalidate);
    const lost = event => { event.preventDefault(); onFailure(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    api.current = command => {
      if (!director.state.inspecting) return;
      if (command === 'reset') {
        camera.position.set(0, 0.3, compact ? 12 : 8.6); control.target.set(0,0,0);
        director.set({ manualExplode: 0 });
      } else {
        const offset = camera.position.clone().sub(control.target);
        if (command === 'left' || command === 'right') offset.applyAxisAngle(new THREE.Vector3(0,1,0), command === 'left' ? -0.3 : 0.3);
        else offset.setLength(THREE.MathUtils.clamp(offset.length() * (command === 'in' ? 0.88 : 1.12), control.minDistance, control.maxDistance));
        camera.position.copy(control.target).add(offset);
      }
      control.update(); invalidate();
    };
    invalidate();
    return () => {
      unsubscribe(); control.removeEventListener('change', invalidate); control.dispose();
      gl.domElement.removeEventListener('webglcontextlost', lost); controls.current = null; api.current = null;
    };
  }, [camera, gl, invalidate, director, api, compact, onFailure]);
  useFrame((_, delta) => {
    const state = director.state, control = controls.current;
    if (!control) return;
    control.enabled = state.inspecting && state.active;
    if (!state.active) return;
    if (state.inspecting) {
      if (!wasInspecting.current) { camera.position.set(0, 0.3, compact ? 12 : 8.6); control.target.set(0,0,0); control.update(); }
      wasInspecting.current = true; return;
    }
    wasInspecting.current = false;
    const frame = compact ? { ...INSPECT_FRAME, camera: [0, 0.2, 12], target: [0,0,0] } : sampleStory(state.progress);
    cameraGoal.fromArray(frame.camera); cameraGoal.z += (1 - state.reveal) * 1.0;
    const factor = !state.motion || !initialized.current ? 1 : 1 - Math.exp(-CINEMATIC_CONFIG.settleRate * Math.min(delta, .05));
    camera.position.lerp(cameraGoal, factor);
    target.current.lerp(goal.fromArray(frame.target), factor);
    camera.lookAt(target.current);
    control.target.copy(target.current);
    initialized.current = true;
    if (camera.position.distanceToSquared(cameraGoal) > 1e-7 || target.current.distanceToSquared(goal) > 1e-7) invalidate();
  });
  return null;
}

function ProductStage({ product, director, onReady, wireframe, compact }) {
  const { scene } = useGLTF(product.modelUrl);
  const { invalidate } = useThree();
  const group = useRef(null), explosion = useRef(0), first = useRef(true);
  const rig = useMemo(() => createProductRig(scene, product.modelUrl), [scene, product.modelUrl]);
  useEffect(() => { onReady(rig.supported); invalidate(); return () => rig.dispose(); }, [rig, onReady, invalidate]);
  useEffect(() => { rig.wireframe(wireframe); invalidate(); }, [rig, wireframe, invalidate]);
  useFrame((_, delta) => {
    if (!group.current || !director.state.active) return;
    const state = director.state;
    const frame = state.inspecting || compact ? { ...INSPECT_FRAME, explode: state.inspecting ? state.manualExplode : sampleStory(state.progress).explode } : sampleStory(state.progress);
    const immediate = !state.motion || first.current;
    let unsettled = false;
    const value = (a, b) => {
      const result = immediate ? b : damp(a, b, delta);
      if (Math.abs(result - b) > 0.0001) unsettled = true;
      return Math.abs(result - b) < 0.00005 ? b : result;
    };
    ['x','y','z'].forEach((key, i) => {
      group.current.position[key] = value(group.current.position[key], frame.position[i]);
      let rotation = frame.rotation[i];
      if (state.motion && !state.inspecting && !compact) {
        if (i === 0) rotation += state.pointerY * CINEMATIC_CONFIG.pointerRadians;
        if (i === 1) rotation += state.pointerX * CINEMATIC_CONFIG.pointerRadians - (1 - state.reveal) * 0.35;
      }
      group.current.rotation[key] = value(group.current.rotation[key], rotation);
    });
    group.current.scale.setScalar(frame.scale);
    explosion.current = value(explosion.current, frame.explode);
    rig.explode(explosion.current);
    first.current = false;
    if (unsettled) invalidate();
  });
  return <group ref={group}><primitive object={rig.root} dispose={null}/></group>;
}

function StageArchitecture() {
  return <group>
    <mesh position={[0,-1.96,0]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[5.4,5.4]}/>
      <shaderMaterial transparent depthWrite={false} uniforms={{}}
        vertexShader={'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }'}
        fragmentShader={'varying vec2 vUv; void main(){float r=length((vUv-.5)*2.);float a=(1.-smoothstep(.05,.85,r))*.13;gl_FragColor=vec4(.035,.09,.12,a);}'}/>
    </mesh>
    <mesh position={[0.25,0,-0.65]}><torusGeometry args={[1.95,.006,6,128]}/><meshBasicMaterial color="#79b7c8" transparent opacity={.48}/></mesh>
    <mesh position={[0.25,0,-0.65]}><torusGeometry args={[2.04,.002,4,128]}/><meshBasicMaterial color="#79b7c8" transparent opacity={.4}/></mesh>
    <mesh position={[0,-1.92,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[1.58,.007,6,128]}/><meshBasicMaterial color="#1c83a3" transparent opacity={.48}/></mesh>
    <mesh position={[0,-1.92,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[1.77,.003,4,128]}/><meshBasicMaterial color="#68b7ce" transparent opacity={.3}/></mesh>
  </group>;
}

function QualityManager({ director, enabled, onSlow }) {
  const samples = useRef([]), previous = useRef(-1), done = useRef(false);
  useFrame((_, dt) => {
    if (!enabled || done.current || !director.state.active || previous.current === director.state.progress || dt > .1) return;
    previous.current = director.state.progress;
    samples.current.push(dt);
    if (samples.current.length < 75) return;
    if (samples.current.reduce((a,b) => a+b,0) / samples.current.length > 1/38) onSlow();
    done.current = true;
  });
  return null;
}

export default function CinematicScene({ product, director, onReady, onFailure, wireframe, compact, api, eco, onSlow }) {
  return <Canvas dpr={[1, eco ? CINEMATIC_CONFIG.ecoDpr : CINEMATIC_CONFIG.maxDpr]} frameloop="demand"
    camera={{ position: [0,.35,8.4], fov: 32, near: .1, far: 50 }}
    gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
    onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1; gl.outputColorSpace = THREE.SRGBColorSpace; }}
    fallback={null}>
    <LightingRig/>
    <StageArchitecture/>
    <Suspense fallback={null}><ProductStage product={product} director={director} onReady={onReady} wireframe={wireframe} compact={compact}/></Suspense>
    <CameraRig director={director} api={api} compact={compact} onFailure={onFailure}/>
    <QualityManager director={director} enabled={!eco} onSlow={onSlow}/>
  </Canvas>;
}
