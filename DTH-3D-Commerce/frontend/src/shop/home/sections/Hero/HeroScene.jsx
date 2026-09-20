import { forwardRef, Suspense, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Procedural studio environment: no external HDRI/CDN download. */
function StudioLighting({ settings }) {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const previous = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromScene(room, 0.04);
    scene.environment = target.texture;
    scene.environmentIntensity = settings.environmentIntensity;
    room.dispose(); pmrem.dispose(); invalidate();
    return () => { scene.environment = previous; scene.environmentIntensity = previousIntensity; target.dispose(); };
  }, [gl, scene, invalidate, settings.environmentIntensity]);
  return <>
    <ambientLight intensity={0.7} />
    <hemisphereLight args={['#f3f6ef', '#182129', 1.25]} />
    <directionalLight position={[-3, 5, 5]} intensity={settings.keyIntensity} color="#ffffff" />
    <directionalLight position={[3, 1, -2]} intensity={settings.rimIntensity} color="#daefa9" />
    <directionalLight position={[-4, -1, -3]} intensity={2} color="#7eadd6" />
  </>;
}
function ModelRig({ product, exhibit, settings, active, motionEnabled, inspect, wireframe, onReady, rig }) {
  const { scene } = useGLTF(product.modelUrl);
  const { invalidate } = useThree();
  const elapsed = useRef(0), phase = useRef(0), introFinished = useRef(!motionEnabled);
  const model = useMemo(() => {
    const copy = scene.clone(true);
    const materials = new Map();
    copy.traverse(object => {
      if (!object.isMesh) return;
      const clone = material => {
        if (!materials.has(material.uuid)) materials.set(material.uuid, material.clone());
        return materials.get(material.uuid);
      };
      object.material = Array.isArray(object.material) ? object.material.map(clone) : clone(object.material);
    });
    copy.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(copy);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const scale = exhibit.modelSize / (Math.max(size.x, size.y, size.z) || 1);
    return { copy, center, scale, materials: [...materials.values()] };
  }, [scene, exhibit.modelSize]);
  useEffect(() => {
    model.materials.forEach(material => { material.wireframe = wireframe; material.needsUpdate = true; });
    invalidate();
  }, [model, wireframe, invalidate]);
  useEffect(() => {
    onReady(); invalidate();
    return () => { model.materials.forEach(material => material.dispose()); };
  }, [model, onReady, invalidate]);
  useEffect(() => {
    if (!motionEnabled || inspect) { introFinished.current = true; }
    invalidate();
  }, [motionEnabled, inspect, invalidate]);
  useFrame((_, delta) => {
    const group = rig.current;
    if (!group || !active || !motionEnabled || inspect) return;
    const dt = Math.min(delta, 0.05); // Do not jump after a background-tab pause.
    if (!introFinished.current) {
      elapsed.current += dt;
      const progress = Math.min(1, elapsed.current * 1000 / Math.max(1, settings.entranceMs));
      const ease = 1 - Math.pow(1 - progress, 3);
      group.rotation.y = exhibit.rotation[1] + settings.entranceTurn * (1 - ease);
      group.position.y = -0.12 * (1 - ease);
      if (progress === 1) introFinished.current = true;
    } else {
      phase.current += dt;
      group.rotation.y += dt * settings.autoRotateSpeed;
      group.position.y = Math.sin(phase.current * settings.floatSpeed) * settings.floatAmplitude;
    }
  });
  return <group ref={rig} rotation={exhibit.rotation}>
    <group scale={model.scale}>
      <group position={[-model.center.x, -model.center.y, -model.center.z]}>
        <primitive object={model.copy} dispose={null} />
      </group>
    </group>
  </group>;
}
function Controls({ apiRef, settings, inspect, active, rig, exhibit }) {
  const controls = useRef(null);
  const { camera, invalidate } = useThree();
  useImperativeHandle(apiRef, () => ({
    reset() {
      camera.position.fromArray(settings.camera);
      if (rig.current) { rig.current.rotation.set(...exhibit.rotation); rig.current.position.set(0, 0, 0); }
      controls.current?.target.set(0, 0, 0);
      controls.current?.update(); invalidate();
    },
    turn(angle) {
      if (!inspect || !controls.current) return;
      const control = controls.current;
      const offset = camera.position.clone().sub(control.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      camera.position.copy(control.target).add(offset); control.update(); invalidate();
    },
    zoom(factor) {
      if (!inspect || !controls.current) return;
      const control = controls.current;
      const offset = camera.position.clone().sub(control.target);
      offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, settings.minDistance, settings.maxDistance));
      camera.position.copy(control.target).add(offset); control.update(); invalidate();
    },
  }), [camera, exhibit, settings, inspect, invalidate, rig]);
  return <OrbitControls ref={controls} makeDefault enabled={inspect && active}
    enableZoom={inspect && active} enableRotate={inspect && active} enablePan={false}
    enableDamping={false} minDistance={settings.minDistance} maxDistance={settings.maxDistance}
    minPolarAngle={0.2} maxPolarAngle={Math.PI - 0.2} />;
}
function ContextLifecycle({ onFailure }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = event => { event.preventDefault(); onFailure(); };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, onFailure]);
  return null;
}
function NoWebGL({ onFailure }) { useEffect(() => onFailure(), [onFailure]); return null; }
const HeroScene = forwardRef(function HeroScene({ product, exhibit, settings, active, motionEnabled, inspect, wireframe, onReady, onFailure }, apiRef) {
  const rig = useRef(null);
  return <Canvas key={product.modelUrl} dpr={[1, settings.maxDpr]}
    camera={{ position: settings.camera, fov: settings.fov, near: 0.1, far: 40 }}
    frameloop={active && motionEnabled && !inspect ? 'always' : 'demand'}
    gl={{ alpha: true, antialias: true, powerPreference: 'default' }}
    onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = settings.exposure; }}
    fallback={<NoWebGL onFailure={onFailure} />}>
    <ContextLifecycle onFailure={onFailure} />
    <StudioLighting settings={settings} />
    <Suspense fallback={null}>
      <ModelRig key={product.modelUrl} product={product} exhibit={exhibit} settings={settings} active={active}
        motionEnabled={motionEnabled} inspect={inspect} wireframe={wireframe} onReady={onReady} rig={rig} />
    </Suspense>
    <Controls apiRef={apiRef} settings={settings} inspect={inspect} active={active} exhibit={exhibit} rig={rig} />
  </Canvas>;
});
export default HeroScene;
