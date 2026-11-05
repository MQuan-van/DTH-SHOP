import { Component, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useProfiledModel } from '../../shop/product/3d/useProfiledModel.js';
import { useProduct3DProfile } from '../../shop/product/3d/useProduct3DProfile.js';
import { presentationFromBounds21 } from '../../shop/presentation21/presentationMath21.mjs';
import { defaultPresentation21, getPresentation21 } from '../../../../shared/productPresentation21.mjs';
import { cameraPose245, pointer245, presentationCorners245, retainSample245, settlePointer245, stagePermission245 } from './camera245.logic.mjs';
import StudioArchitecture246 from '../access246/StudioArchitecture246.jsx';

class StageBoundary245 extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { this.props.onError(error?.message || 'Unable to prepare the 3D stage.'); }
  render() { return this.state.failed ? null : this.props.children; }
}
function Unsupported245({ onError }) {
  useEffect(() => { if (typeof WebGL2RenderingContext === 'undefined') onError('Interactive 3D is unavailable.'); }, [onError]);
  return null;
}

function StudioLight245({ onError }) {
  const { gl, scene, invalidate } = useThree();
  useLayoutEffect(() => {
    const previous = scene.environment, previousIntensity = scene.environmentIntensity;
    let target;
    const room = new RoomEnvironment(), generator = new THREE.PMREMGenerator(gl);
    try {
      target = generator.fromScene(room, .04);
      scene.environment = target.texture; scene.environmentIntensity = .58;
      invalidate();
    } finally { room.dispose(); generator.dispose(); }
    const lost = event => { event.preventDefault(); onError('The 3D view was interrupted.'); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', lost);
      scene.environment = previous; scene.environmentIntensity = previousIntensity; target?.dispose();
    };
  }, [gl, scene, invalidate, onError]);
  return <>
    <ambientLight intensity={.11}/>
    <hemisphereLight args={['#edf5ff', '#031024', .44]}/>
    <directionalLight position={[-4, 5, 5]} color="#f5f9ff" intensity={2.35}/>
    <directionalLight position={[4, 1, -3]} color="#559cff" intensity={1.05}/>
  </>;
}

function ProductStudy245({ product, policy, director, onReady, onError }) {
  const selection = useProduct3DProfile(product);
  const asset = useProfiledModel(product, selection, onError);
  const settings = useMemo(() => getPresentation21(product) || defaultPresentation21(product.modelUrl), [product.presentation3d, product.modelUrl]);
  const fit = useMemo(() => asset?.measured ? presentationFromBounds21({ min: asset.measured.box.min.toArray(), max: asset.measured.box.max.toArray() }, asset.measured.normalization, settings) : null, [asset, settings]);
  const framePoints = useMemo(() => asset?.measured && fit ? presentationCorners245({ min: asset.measured.box.min.toArray(), max: asset.measured.box.max.toArray() }, fit) : [], [asset, fit]);
  const { camera, gl, size, invalidate } = useThree();
  const latest = useRef({ policy, director }); latest.current = { policy, director };
  const runtime = useRef({ dirty: true, sample: null, pointer: { x: 0, y: 0 }, initialized: false, frames: 0 });

  useEffect(() => {
    const wake = () => { runtime.current.dirty = true; if (!latest.current.policy.hidden) invalidate(); };
    const offDirector = director.subscribe(wake);
    const offPointer = policy.subscribe?.(() => {
      if (stagePermission245(latest.current.policy, latest.current.director.state).move) wake();
    });
    return () => { offDirector(); offPointer?.(); };
  }, [director, policy.subscribe, invalidate]);
  useLayoutEffect(() => { runtime.current.dirty = true; invalidate(); }, [fit, size.width, size.height, policy.hidden, policy.paused, policy.motion, invalidate]);
  useEffect(() => {
    if (!asset?.scene || !fit) return;
    let alive = true, reported = false; const undo = [];
    asset.scene.traverse(object => {
      if (!object.isMesh) return;
      const old = object.onAfterRender;
      object.onAfterRender = function (...args) {
        old?.apply(this, args);
        if (!alive || reported || !runtime.current.initialized) return;
        reported = true;
        queueMicrotask(() => { if (alive) onReady(asset.report); });
      };
      undo.push(() => { object.onAfterRender = old; });
    });
    runtime.current.dirty = true; invalidate();
    return () => { alive = false; undo.forEach(restore => restore()); };
  }, [asset, fit, invalidate, onReady]);

  useFrame((_, delta) => {
    if (!fit) return;
    const { policy: currentPolicy, director: currentDirector } = latest.current;
    const state = currentDirector.state, runtimeState = runtime.current;
    const moving = stagePermission245(currentPolicy, state).move;
    runtimeState.frames += 1;
    gl.domElement.dataset.access245Frames = String(runtimeState.frames);
    let pending = false;
    if (moving) {
      const point = settlePointer245(runtimeState.pointer, pointer245(currentPolicy.pointer?.current), delta);
      runtimeState.pointer = point;
      runtimeState.sample = retainSample245(runtimeState.sample, state, point, true);
      pending = Boolean(state.active) || !point.settled;
    } else runtimeState.sample = retainSample245(runtimeState.sample, state, null, false);
    if (runtimeState.dirty || pending || !runtimeState.initialized) {
      const pose = cameraPose245(fit.camera.presets.front, { ...fit.camera, points: framePoints, width: size.width, height: size.height }, runtimeState.sample);
      camera.up.set(0, 1, 0); camera.fov = pose.fov; camera.near = pose.near; camera.far = pose.far;
      camera.position.fromArray(pose.position); camera.lookAt(...pose.target); camera.updateProjectionMatrix();
      runtimeState.dirty = false; runtimeState.initialized = true;
      gl.domElement.dataset.camera245Position = JSON.stringify(pose.position.map(n => +n.toFixed(5)));
      gl.domElement.dataset.camera245Target = JSON.stringify(pose.target.map(n => +n.toFixed(5)));
    }
    gl.domElement.dataset.access245Sleeping = String(!pending);
    if (pending && !currentPolicy.hidden) invalidate();
  }, -1);

  if (!asset || !fit) return null;
  // The profiled loader owns its decoded GLTF. Only its saved presentation wrapper is applied.
  return <>
    <StudioArchitecture246 fit={fit}/>
    <group scale={fit.scale} rotation={fit.rotation} position={fit.center}>
      <group position={fit.offset}><primitive object={asset.scene} dispose={null}/></group>
    </group>
  </>;
}

export default function AccessStage245({ product, policy, director, onStatus }) {
  const identity = `${product.id}:${product.modelUrl}:${product.presentation3d?.revision || ''}`;
  const callbacks = useRef({ identity, onStatus }); callbacks.current = { identity, onStatus };
  const [result, setResult] = useState({ identity, status: 'loading' });
  const statusRef = useRef({ identity, status: 'loading' });
  if (statusRef.current.identity !== identity) statusRef.current = { identity, status: 'loading' };
  const status = result.identity === identity ? result.status : 'loading';
  const mounted = useRef(true);
  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const failed = useCallback(message => {
    if (!mounted.current || callbacks.current.identity !== identity) return;
    if (statusRef.current.status === 'error') return;
    statusRef.current = { identity, status: 'error' };
    setResult({ identity, status: 'error' }); callbacks.current.onStatus?.('error', message || 'Unable to prepare the product study.');
  }, [identity]);
  const ready = useCallback(report => {
    if (!mounted.current || callbacks.current.identity !== identity) return;
    if (statusRef.current.status !== 'loading') return;
    statusRef.current = { identity, status: 'ready' };
    setResult({ identity, status: 'ready' }); callbacks.current.onStatus?.('ready', report);
  }, [identity]);
  const mount = stagePermission245(policy, director.state).mount && status !== 'error';
  useEffect(() => {
    if (statusRef.current.identity === identity && statusRef.current.status === 'loading') callbacks.current.onStatus?.('loading', null);
  }, [identity]);
  useEffect(() => {
    if (!mount || status !== 'loading' || policy.hidden) return;
    const timer = setTimeout(() => failed('The 3D model took too long to load.'), 90000);
    return () => clearTimeout(timer);
  }, [mount, status, policy.hidden, failed]);
  return <div className="a245-stage" data-stage-state={status} data-stage-ready={status === 'ready'} aria-hidden="true">
    {mount && <div className="a245-stage-canvas"><StageBoundary245 key={identity} onError={failed}>
      <Canvas frameloop="demand" dpr={[1, 1.35]} camera={{ position: [0, 0, 6], fov: 36, near: .04, far: 100 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} fallback={<Unsupported245 onError={failed}/>}
        onCreated={({ gl }) => { gl.setClearColor(0, 0); gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1; gl.outputColorSpace = THREE.SRGBColorSpace; }}>
        <StudioLight245 onError={failed}/>
        <Suspense fallback={null}><ProductStudy245 key={identity} product={product} policy={policy} director={director} onReady={ready} onError={failed}/></Suspense>
      </Canvas>
    </StageBoundary245></div>}
  </div>;
}
