import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as THREE from 'three';
import { CINEMATIC_CONFIG, INSPECT_FRAME } from '../motion/motion.config.mjs';
import { sampleStory } from '../motion/story.mjs';
import { createProductRig } from './apexRig.mjs';
import { PART_LABELS } from '../../../../shared/experience.mjs';
import { useOwnedModel } from './useOwnedModel';
import { createInspectionCommands } from './inspectionCommands.mjs';
export { clearOwnedModelCache as clearCinematicModel } from './useOwnedModel';

class ModelBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function LightingRig({ config, director }) {
  const { gl, scene, invalidate } = useThree();
  const light = useRef(null);
  useEffect(() => {
    const previous = scene.environment;
    const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromScene(room, 0.03);
    scene.environment = target.texture;
    room.dispose(); pmrem.dispose(); invalidate();
    return () => { scene.environment = previous; target.dispose(); };
  }, [gl, scene, invalidate]);
  useEffect(() => {
    scene.environmentIntensity = config.lighting.environment;
    gl.toneMappingExposure = config.lighting.exposure;
    invalidate();
  }, [config, scene, gl, invalidate]);
  useFrame(() => {
    if (!light.current) return;
    const angle = THREE.MathUtils.degToRad(config.lighting.azimuth + director.state.lightAngle);
    light.current.position.set(-3 * Math.cos(angle) + 4 * Math.sin(angle), 5, 4 * Math.cos(angle) + 3 * Math.sin(angle));
  });
  return <>
    <ambientLight intensity={0.2}/>
    <directionalLight ref={light} position={[-3, 5, 4]} intensity={config.lighting.key}/>
    <directionalLight position={[4, 2, -3]} intensity={config.lighting.rim}/>
    <hemisphereLight args={['#ffffff', '#536471', 0.35]}/>
  </>;
}

/** Camera writes belong either to the director, OrbitControls, or a cancellable preset. */
function CameraRig({ director, api, compact, config, onFailure }) {
  const { camera, gl, invalidate } = useThree();
  const controls = useRef(null), target = useRef(new THREE.Vector3());
  const initialized = useRef(false);
  const goal = useMemo(() => new THREE.Vector3(), []), cameraGoal = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    const control = new OrbitControls(camera, gl.domElement);
    controls.current = control;
    control.enablePan = false; control.enableDamping = false;
    control.minDistance = 4.5; control.maxDistance = 20;
    control.minPolarAngle = 0.15; control.maxPolarAngle = Math.PI - 0.15;
    control.enabled = false;
    const change = () => { target.current.copy(control.target); invalidate(); };
    const command = createInspectionCommands({ camera, control, target: target.current, director, compact, invalidate });
    const start = () => { command.cancel(); invalidate(); };
    let inspecting = false, enabled = false;
    const sync = () => {
      const state = director.state;
      const nextEnabled = state.inspecting && state.active && !state.blocked;
      if (state.inspecting !== inspecting || (enabled && !nextEnabled)) command.cancel();
      if (state.inspecting && !inspecting) {
        control.target.copy(target.current); control.update();
      }
      inspecting = state.inspecting; enabled = nextEnabled;
      control.enabled = nextEnabled;
      invalidate();
    };
    control.addEventListener('change', change); control.addEventListener('start', start);
    const unsubscribe = director.subscribe(sync);
    const lost = event => { event.preventDefault(); onFailure(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    api.current=command; sync();
    return () => {
      unsubscribe(); control.removeEventListener('change',change); control.removeEventListener('start',start); control.dispose();
      gl.domElement.removeEventListener('webglcontextlost',lost); command.cancel(); controls.current=null; api.current=null;
    };
  }, [camera, gl, invalidate, director, api, compact, onFailure]);
  useEffect(() => {
    if(controls.current) { controls.current.rotateSpeed=config.controls.rotateSpeed; controls.current.zoomSpeed=config.controls.zoomSpeed; }
    invalidate();
  },[config, compact, invalidate]);
  useFrame((_, delta) => {
    const state=director.state, control=controls.current;
    if(!control || !state.active || state.blocked) return;
    control.enabled=state.inspecting;
    if(state.inspecting && initialized.current) {
      api.current?.step(delta);
      return;
    }
    api.current?.cancel();
    const sampled=sampleStory(state.progress, config.frames);
    const frame=compact ? {...sampled,camera:[0,0.2,12],target:[0,0,0]} : sampled;
    cameraGoal.fromArray(frame.camera); cameraGoal.z+=(1-state.reveal);
    goal.fromArray(frame.target);
    const rate=state.mode==='returning'?7/config.returnSeconds:config.settleRate;
    const factor=!state.motion||!initialized.current?1:1-Math.exp(-rate*Math.min(delta,.05));
    camera.position.lerp(cameraGoal,factor);target.current.lerp(goal,factor);
    camera.lookAt(target.current); control.target.copy(target.current); initialized.current=true;
    const unsettled=camera.position.distanceToSquared(cameraGoal)>1e-7||target.current.distanceToSquared(goal)>1e-7;
    if(unsettled) invalidate();
    else if(state.mode==='returning') director.set({mode:'story'});
  });
  return null;
}

function ProductStage({ product, director, onReady, onFailure, wireframe, compact, config }) {
  const scene=useOwnedModel(product.modelUrl,onFailure);
  const { invalidate }=useThree();
  const group=useRef(null), explosion=useRef(0), first=useRef(true), frozen=useRef(null), reset=useRef(0);
  const label=useRef(null), pointerStart=useRef(null);
  const [rig,setRig]=useState(null);
  const wasInspecting=useRef(false), resetting=useRef(false);
  const quaternion=useMemo(()=>new THREE.Quaternion(),[]), euler=useMemo(()=>new THREE.Euler(),[]);
  const anchor=useMemo(()=>new THREE.Vector3(),[]);
  useLayoutEffect(()=>{
    if(!scene)return;
    const next=createProductRig(scene,product.modelUrl);
    setRig(next);first.current=true;
    return()=>next.dispose();
  },[scene,product.modelUrl]);
  useEffect(()=>{if(rig){onReady(rig.supported);invalidate();}},[rig,onReady,invalidate]);
  useEffect(()=>{if(rig){rig.wireframe(wireframe);invalidate();}},[rig,wireframe,invalidate]);
  useFrame((_,dt)=>{
    if(!rig||!group.current||!director.state.active||director.state.blocked)return;
    const state=director.state, sampled=sampleStory(state.progress,config.frames);
    if(first.current) frozen.current=compact?{...INSPECT_FRAME,explode:sampled.explode}:sampled;
    if(state.inspecting) {
      if(!wasInspecting.current && state.pose) frozen.current={...state.pose};
      if(state.resetSerial!==reset.current) { frozen.current={...INSPECT_FRAME,explode:0};reset.current=state.resetSerial; resetting.current=true; }
    } else frozen.current=compact?{...sampled,position:[0,0,0]}:sampled;
    wasInspecting.current=state.inspecting;
    const frame=frozen.current;
    const factor=!state.motion||first.current?1:1-Math.exp(-(state.mode==='returning'?7/config.returnSeconds:config.settleRate)*Math.min(dt,.05));
    let unsettled=false;
    const val=(a,b)=>{const n=a+(b-a)*factor;if(Math.abs(n-b)>.0001)unsettled=true;return Math.abs(n-b)<.00005?b:n;};
    ['x','y','z'].forEach((key,i)=>{group.current.position[key]=val(group.current.position[key],frame.position[i]);});
    const rotation=[...frame.rotation];
    if(state.motion&&!state.inspecting&&!compact) { rotation[0]+=state.pointerY*config.pointerRadians;rotation[1]+=state.pointerX*config.pointerRadians-(1-state.reveal)*.35; }
    quaternion.setFromEuler(euler.set(...rotation));
    group.current.quaternion.slerp(quaternion,factor);
    if(group.current.quaternion.angleTo(quaternion)>.0001)unsettled=true;
    group.current.scale.setScalar(val(group.current.scale.x,frame.scale));
    explosion.current=val(explosion.current,(state.inspecting?state.manualExplode:frame.explode)*config.maxExplode);
    rig.explode(explosion.current); rig.focus(state.inspecting?state.selectedPart:'');
    state.renderedExplode = rig.supported && config.maxExplode > 0 ? THREE.MathUtils.clamp(explosion.current / config.maxExplode, 0, 1) : 0;
    state.pose={position:group.current.position.toArray(),rotation:group.current.rotation.toArray().slice(0,3),scale:group.current.scale.x};
    if(state.inspecting && (!resetting.current || !unsettled)) { frozen.current={...state.pose}; resetting.current=false; }
    first.current=false;
    if(label.current) {
      const part=rig.parts.get(state.selectedPart);
      label.current.visible=!!part && state.inspecting;
      if(part) {
        const bounds=new THREE.Box3().setFromObject(part);
        anchor.set(bounds.max.x,bounds.max.y,bounds.max.z);group.current.worldToLocal(anchor);label.current.position.copy(anchor);
      }
    }
    if(unsettled)invalidate();
  });
  const selectPart=e=>{
    if(!director.state.inspecting||!rig.supported||!pointerStart.current||Math.hypot(e.clientX-pointerStart.current[0],e.clientY-pointerStart.current[1])>5)return;
    let object=e.object;
    while(object&&!PART_LABELS[object.name])object=object.parent;
    if(object){e.stopPropagation();director.set({selectedPart:object.name});}
  };
  if(!rig)return null;
  return <group ref={group} onPointerDown={e=>{pointerStart.current=[e.clientX,e.clientY];}} onPointerUp={selectPart}>
    <primitive object={rig.root} dispose={null}/>
    <group ref={label} visible={false}><mesh><sphereGeometry args={[.022,10,10]}/><meshBasicMaterial color="#0066cc"/></mesh>
      <Html className="dth-part-hotspot" style={{pointerEvents:'none'}}><PartCaption director={director}/></Html>
    </group>
  </group>;
}
function PartCaption({director}) {
  const ref=useRef(null);
  useLayoutEffect(()=>{
    const update=()=>{
      const node=ref.current;if(!node)return;
      const text=director.state.inspecting ? PART_LABELS[director.state.selectedPart] : '';
      node.textContent=text||'';
      if(node.parentElement)node.parentElement.style.display=text?'block':'none';
    };
    update();return director.subscribe(update);
  },[director]);
  return <span ref={ref}/>;
}
function StageArchitecture({rings}) {
  return <group>
    <mesh position={[0,-1.96,0]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[5.4,5.4]}/>
      <shaderMaterial transparent depthWrite={false}
        vertexShader={'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }'}
        fragmentShader={'varying vec2 vUv; void main(){float r=length((vUv-.5)*2.);float a=(1.-smoothstep(.05,.85,r))*.13;gl_FragColor=vec4(.035,.09,.12,a);}'}/>
    </mesh>
    {rings&&<><mesh position={[0.25,0,-0.65]}><torusGeometry args={[1.95,.006,6,128]}/><meshBasicMaterial color="#79b7c8" transparent opacity={.48}/></mesh>
      <mesh position={[0.25,0,-0.65]}><torusGeometry args={[2.04,.002,4,128]}/><meshBasicMaterial color="#79b7c8" transparent opacity={.4}/></mesh>
      <mesh position={[0,-1.92,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[1.58,.007,6,128]}/><meshBasicMaterial color="#1c83a3" transparent opacity={.48}/></mesh>
      <mesh position={[0,-1.92,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[1.77,.003,4,128]}/><meshBasicMaterial color="#68b7ce" transparent opacity={.3}/></mesh></>}
  </group>;
}
function QualityManager({director,enabled,onSlow}) {
  const samples=useRef([]),previous=useRef(-1),done=useRef(false);
  useFrame((_,dt)=>{
    if(!enabled||done.current||!director.state.active||director.state.blocked||previous.current===director.state.progress||dt>.1)return;
    previous.current=director.state.progress;samples.current.push(dt);
    if(samples.current.length<75)return;
    if(samples.current.reduce((a,b)=>a+b,0)/samples.current.length>1/38)onSlow();done.current=true;
  });return null;
}
function SceneTelemetry({director,api}) {
  const {gl,camera}=useThree();
  useFrame(()=>{
    if(import.meta.env.VITE_EXPERIENCE_TESTS!=='true')return;
    gl.domElement.dataset.camera=JSON.stringify(camera.position.toArray());
    gl.domElement.dataset.pose=JSON.stringify(director.state.pose);
    gl.domElement.dataset.owner=director.state.mode;
    gl.domElement.dataset.blocked=String(director.state.blocked);
    gl.domElement.dataset.listeners=String(director.listenerCount);
    gl.domElement.dataset.renderedExplode=String(director.state.renderedExplode ?? 0);
    gl.domElement.dataset.capture=JSON.stringify(api.current?.capture?.() ?? null);
    gl.domElement.dataset.moving=String(api.current?.isMoving?.() ?? false);
  });return null;
}
export default function CinematicScene({product,director,onReady,onFailure,wireframe=false,compact=false,api,eco=false,onSlow=()=>{},config=CINEMATIC_CONFIG}) {
  return <Canvas dpr={[1,eco?config.ecoDpr:config.maxDpr]} frameloop="demand"
    camera={{position:[0,.35,8.4],fov:32,near:.1,far:50}}
    gl={{antialias:true,alpha:true,powerPreference:'default'}}
    onCreated={({gl})=>{gl.toneMapping=THREE.NeutralToneMapping;gl.toneMappingExposure=config.lighting.exposure;gl.outputColorSpace=THREE.SRGBColorSpace;}}
    fallback={null}>
    <LightingRig config={config} director={director}/><StageArchitecture rings={config.rings}/>
    <ModelBoundary onFailure={onFailure}><Suspense fallback={null}><ProductStage product={product} director={director} onReady={onReady} onFailure={onFailure} wireframe={wireframe} compact={compact} config={config}/></Suspense></ModelBoundary>
    <CameraRig director={director} api={api} compact={compact} onFailure={onFailure} config={config}/>
    <SceneTelemetry director={director} api={api}/>
    <QualityManager director={director} enabled={!eco} onSlow={onSlow}/>
  </Canvas>;
}
