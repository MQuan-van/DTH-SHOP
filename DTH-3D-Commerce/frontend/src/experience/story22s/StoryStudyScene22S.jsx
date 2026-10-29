import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useProfiledModel, clearProfiledModelCache } from '../../shop/product/3d/useProfiledModel.js';
import { useProduct3DProfile } from '../../shop/product/3d/useProduct3DProfile.js';
import { presentationFromBounds21, fitDistance21 } from '../../shop/presentation21/presentationMath21.mjs';
import { defaultPresentation21, getPresentation21 } from '../../../../shared/productPresentation21.mjs';
import { studyPose22S } from './story22s.logic.mjs';

class Boundary22S extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { this.props.onError(error?.message || 'Unable to start the 3D view.'); }
  render() { return this.state.failed ? null : this.props.children; }
}
function OriginalEnvironment22S({ onError }) {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const previous = scene.environment, previousIntensity = scene.environmentIntensity;
    let room, generator, environment;
    const lost = event => { event.preventDefault(); onError('3D graphics were interrupted. Retry the view.'); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    try {
      // Matches the existing Product Presentation view; no source material changes.
      room = new RoomEnvironment(); generator = new THREE.PMREMGenerator(gl);
      environment = generator.fromScene(room, 0.04);
      scene.environment = environment.texture; scene.environmentIntensity = 0.7; invalidate();
    } catch (error) { onError(error.message || 'Unable to prepare the 3D environment.'); }
    finally { room?.dispose(); generator?.dispose(); }
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', lost);
      scene.environment = previous; scene.environmentIntensity = previousIntensity; environment?.dispose();
    };
  }, [gl, scene, invalidate, onError]);
  return <>
    <ambientLight intensity={0.28} />
    <hemisphereLight args={['#ffffff', '#2b343b', 0.65]} />
    <directionalLight position={[-4, 5, 5]} intensity={2} />
    <directionalLight position={[4, 1, -3]} intensity={1.25} />
  </>;
}
function Model22S({ product, director, onReady, onError }) {
  const selection = useProduct3DProfile(product);
  const asset = useProfiledModel(product, selection, onError);
  const settings = useMemo(() => getPresentation21(product) || defaultPresentation21(product.modelUrl), [product.presentation3d, product.modelUrl]);
  const { camera, size, invalidate } = useThree();
  const dirty = useRef(true), rendered = useRef(false), poseSample = useRef(null);
  const fit = useMemo(() => asset?.measured ? presentationFromBounds21({
    min: asset.measured.box.min.toArray(), max: asset.measured.box.max.toArray(),
  }, asset.measured.normalization, settings) : null, [asset, settings]);
  useEffect(() => {
    if (asset && !asset.measured) onError('The product loader needs the saved-presentation update before Story 3D can run.');
  }, [asset, onError]);
  useEffect(() => {
    const update = state => { if (!document.hidden && !state.blocked && (state.active || !rendered.current)) { dirty.current = true; invalidate(); } };
    const off = director.subscribe(update);
    const visible = () => { if (!document.hidden) { dirty.current = true; invalidate(); } };
    document.addEventListener('visibilitychange', visible); dirty.current = true; invalidate();
    return () => { off(); document.removeEventListener('visibilitychange', visible); };
  }, [director, invalidate]);
  useEffect(() => { dirty.current = true; invalidate(); }, [fit, size.width, size.height, invalidate]);
  useEffect(() => {
    if (!asset?.scene) return undefined;
    let live = true, reported = false; const undo = [];
    asset.scene.traverse(object => {
      if (!object.isMesh) return;
      const previous = object.onAfterRender;
      object.onAfterRender = function (...args) {
        previous?.apply(this, args);
        if (live && !reported) { reported = true; rendered.current = true; queueMicrotask(() => { if (live) onReady(asset.report); }); }
      };
      undo.push(() => { object.onAfterRender = previous; });
    });
    dirty.current = true; invalidate();
    return () => { live = false; undo.forEach(fn => fn()); };
  }, [asset, invalidate, onReady]);
  useFrame(() => {
    if (!fit || !dirty.current || director.state.blocked || document.hidden) return;
    dirty.current = false;
    const front = fit.camera.presets.front;
    const ratio = fitDistance21(size.width, size.height, fit.camera.frameRadius, fit.camera.fov) / fit.camera.referenceDistance;
    const authored = Math.hypot(...front.position.map((value, i) => value - front.target[i]));
    const distance = Math.max(authored * ratio, fit.camera.radius * 1.9);
    // Pause freezes the last camera pose; an initially reduced-motion view stays still.
    if (director.state.motion || !poseSample.current) poseSample.current = { progress: director.state.progress, motion: director.state.motion };
    const pose = studyPose22S(front, distance, poseSample.current.progress, poseSample.current.motion);
    camera.up.set(0, 1, 0); camera.fov = fit.camera.fov;
    camera.position.fromArray(pose.position); camera.lookAt(...pose.target); camera.updateProjectionMatrix();
  }, -1);
  if (!asset || !fit) return null;
  // Only wrapper transforms change. The loader owns and disposes its parsed GLB.
  return <group scale={fit.scale} rotation={fit.rotation} position={fit.center}>
    <group position={fit.offset}><primitive object={asset.scene} dispose={null} /></group>
  </group>;
}
export default function StoryStudyScene22S({ product, director, compact, allowed = true, capable, onStatus }) {
  const [attempt, setAttempt] = useState(0), [status, setStatus] = useState('loading'), [error, setError] = useState('');
  const callbacks = useRef(onStatus); callbacks.current = onStatus;
  const failed = useCallback(message => { setError(message || 'Unable to display this model.'); setStatus('error'); callbacks.current?.('error'); }, []);
  const loaded = useCallback(() => { setStatus('ready'); setError(''); callbacks.current?.('ready'); }, []);
  useEffect(() => {
    if (!allowed || capable === false || status !== 'loading') return undefined;
    const timer = setTimeout(() => failed('The 3D model took too long to load. Retry the view.'), 90000);
    return () => clearTimeout(timer);
  }, [allowed, capable, status, attempt, failed]);
  const retry = () => { clearProfiledModelCache(product.modelUrl); setStatus('loading'); setError(''); setAttempt(n => n + 1); };
  return <div className="s22-model" data-quality={compact ? 'high' : 'ultra'} data-model-state={status}
    role="group" aria-label={`${product.name}: scroll-controlled 3D view`} aria-busy={allowed && capable !== false && status === 'loading'}>
    {allowed && capable !== false && status !== 'error' && <Boundary22S key={`${product.id}:${product.modelUrl}:${attempt}`} onError={failed}>
      <Canvas dpr={[1, compact ? 1.35 : 2]} frameloop="demand" camera={{ position: [0, 0, 6], fov: 36, near: 0.05, far: 250 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1; gl.outputColorSpace = THREE.SRGBColorSpace; }}>
        <OriginalEnvironment22S onError={failed} />
        <Suspense fallback={null}><Model22S product={product} director={director} onReady={loaded} onError={failed} /></Suspense>
      </Canvas>
    </Boundary22S>}
    {(status !== 'ready' || capable === false) && <div className="s22-model-status" role="status">
      <p>{capable === false ? 'Interactive 3D is unavailable in this browser.' : error || 'Preparing 3D'}</p>
      {status === 'error' && capable !== false && <button type="button" className="s22-button s22-button-outline" onClick={retry}><span>Retry 3D</span></button>}
    </div>}
  </div>;
}
