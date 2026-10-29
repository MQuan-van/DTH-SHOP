import { Component, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useProduct3DProfile } from '../../shop/product/3d/useProduct3DProfile.js';
import { useProfiledModel, clearProfiledModelCache } from '../../shop/product/3d/useProfiledModel.js';
import { getPresentation21 } from '../../../../shared/productPresentation21.mjs';
import { cameraSample22H, damp22H, nextTurn22H } from './studio22h.logic.mjs';

class SceneBoundary22H extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { this.props.onError(error?.message || 'The 3D view could not start.'); }
  render() { return this.state.failed ? null : this.props.children; }
}
function Environment22H({ onError }) {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const previous = scene.environment, intensity = scene.environmentIntensity;
    let room, generator, target;
    const lost = event => { event.preventDefault(); onError('The graphics connection was interrupted. Retry the 3D view.'); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    try {
      room = new RoomEnvironment(); generator = new THREE.PMREMGenerator(gl);
      target = generator.fromScene(room, 0.04); scene.environment = target.texture;
      scene.environmentIntensity = 0.7; invalidate();
    } catch (error) { onError(error.message || 'Studio lighting could not start.'); }
    finally { room?.dispose(); generator?.dispose(); }
    return () => { gl.domElement.removeEventListener('webglcontextlost', lost); scene.environment = previous; scene.environmentIntensity = intensity; target?.dispose(); };
  }, [gl, scene, invalidate, onError]);
  // White lights preserve the authored finish. Blue atmosphere belongs to the background, not the material.
  return <><ambientLight intensity={0.28} /><hemisphereLight args={['#ffffff', '#293440', 0.65]} />
    <directionalLight position={[-4, 5, 5]} intensity={2} /><directionalLight position={[4, 1, -3]} intensity={1.25} /></>;
}
function Product22H({ product, director, api, onReady, onError }) {
  const selection = useProduct3DProfile(product), asset = useProfiledModel(product, selection, onError);
  const { camera, gl, size, invalidate } = useThree();
  const orbit = useRef(null), desired = useRef(null), moving = useRef(false), rendered = useRef(false);
  const angle = useRef(0), last = useRef({ view: '', serial: -1, inspect: false }), mounted = useRef(true);
  const settings = useMemo(() => getPresentation21(product), [product.presentation3d, product.modelUrl]);
  const fit = asset?.presentation;
  const bounds = useMemo(() => {
    if (!fit?.camera || !size.width || !size.height) return null;
    const c = fit.camera;
    return { front: c.presets.front, reference: c.referenceDistance, radius: c.radius, width: size.width, height: size.height, fov: c.fov };
  }, [fit, size.width, size.height]);
  const current = useRef({}); current.current = { bounds, fit, settings };
  const setPose = useCallback((immediate = false) => {
    const b = current.current.bounds, controls = orbit.current; if (!b || !controls) return;
    const s = cameraSample22H(b.front, b.reference, b.radius, b.width, b.height, b.fov, director.state.view);
    desired.current = s; angle.current = 0;
    controls.minDistance = s.minDistance; controls.maxDistance = s.maxDistance;
    camera.fov = b.fov; camera.near = Math.max(0.02, b.radius / 100); camera.far = Math.max(100, s.maxDistance * 4); camera.updateProjectionMatrix();
    if (immediate || !director.state.motion) { camera.position.fromArray(s.position); controls.target.fromArray(s.target); controls.update(0); moving.current = false; }
    else moving.current = true;
    invalidate();
  }, [camera, director, invalidate]);

  useEffect(() => {
    mounted.current = true;
    const controls = new OrbitControls(camera, gl.domElement); orbit.current = controls;
    controls.enablePan = false; controls.enableZoom = false; // Wheel belongs to page scroll, also in Inspect mode.
    controls.enableDamping = true; controls.dampingFactor = 0.12; controls.rotateSpeed = 0.7;
    controls.minPolarAngle = 0.22; controls.maxPolarAngle = Math.PI - 0.22; controls.autoRotate = false;
    controls.enabled = director.state.inspect && !director.state.blocked;
    const change = () => invalidate();
    const start = () => { moving.current = false; invalidate(); };
    controls.addEventListener('change', change); controls.addEventListener('start', start);
    const sync = state => {
      controls.enabled = state.inspect && state.active && !state.blocked && !document.hidden;
      if (last.current.view !== state.view || last.current.serial !== state.serial || (last.current.inspect && !state.inspect)) {
        setPose(!rendered.current);
      }
      last.current = { view: state.view, serial: state.serial, inspect: state.inspect };
      if (!document.hidden && state.active) invalidate();
    };
    const off = director.subscribe(sync); sync(director.state);
    api.current = { reset: () => director.set({ view: 'front', serial: director.state.serial + 1 }),
      zoom: factor => {
        if (!director.state.inspect || director.state.blocked || !desired.current) return;
        moving.current = false;
        const delta = camera.position.clone().sub(controls.target), distance = delta.length();
        const next = Math.max(controls.minDistance, Math.min(controls.maxDistance, distance * factor));
        if (distance > 0) camera.position.copy(controls.target).addScaledVector(delta, next / distance);
        controls.update(0); invalidate();
      } };
    const visible = () => sync(director.state); document.addEventListener('visibilitychange', visible);
    return () => { mounted.current = false; off(); document.removeEventListener('visibilitychange', visible); controls.removeEventListener('change', change); controls.removeEventListener('start', start); controls.dispose(); orbit.current = null; api.current = null; };
  }, [camera, gl, director, api, invalidate, setPose]);
  useLayoutEffect(() => {
    if (rendered.current && director.state.inspect) { invalidate(); return; }
    setPose(!rendered.current);
  }, [bounds, setPose, director, invalidate]);
  useEffect(() => {
    if (!asset?.scene) return undefined;
    let live = true, announced = false; const undo = [];
    asset.scene.traverse(object => {
      if (!object.isMesh) return;
      const previous = object.onAfterRender;
      object.onAfterRender = function (...args) {
        previous?.apply(this, args);
        if (live && !announced) { announced = true; rendered.current = true; queueMicrotask(() => { if (live && mounted.current) onReady(asset.report); }); }
      };
      undo.push(() => { object.onAfterRender = previous; });
    });
    invalidate();
    return () => { live = false; undo.forEach(fn => fn()); };
  }, [asset, invalidate, onReady]);
  useFrame((_, delta) => {
    const c = orbit.current, d = desired.current, state = director.state;
    if (!c || !d || !asset || !state.active || state.blocked || document.hidden) return;
    if (moving.current) {
      c.enabled = false;
      camera.position.x = damp22H(camera.position.x, d.position[0], delta);
      camera.position.y = damp22H(camera.position.y, d.position[1], delta);
      camera.position.z = damp22H(camera.position.z, d.position[2], delta);
      c.target.x = damp22H(c.target.x, d.target[0], delta);
      c.target.y = damp22H(c.target.y, d.target[1], delta);
      c.target.z = damp22H(c.target.z, d.target[2], delta);
      if (Math.hypot(camera.position.x-d.position[0],camera.position.y-d.position[1],camera.position.z-d.position[2]) < 0.001) {
        camera.position.fromArray(d.position); c.target.fromArray(d.target); moving.current = false; c.enabled = state.inspect;
      }
      c.update(Math.min(delta, 0.05)); invalidate(); return;
    }
    c.enabled = state.inspect;
    if (state.inspect) { if (c.update(Math.min(delta, 0.05))) invalidate(); return; }
    const spin = current.current.settings?.spin;
    const next = nextTurn22H(angle.current, delta, { ...state, motion: state.motion && spin?.enabled !== false, seconds: spin?.secondsPerTurn || 38 });
    if (next !== angle.current) {
      angle.current = next;
      const dx = d.position[0]-d.target[0], dz = d.position[2]-d.target[2], cos = Math.cos(next), sin = Math.sin(next);
      camera.position.set(d.target[0]+dx*cos+dz*sin, d.position[1], d.target[2]+dz*cos-dx*sin);
      camera.lookAt(c.target); invalidate();
    }
  }, -1);
  if (!asset || !fit) return null;
  return <group scale={fit.scale} rotation={fit.rotation} position={fit.center}>
    <group position={fit.offset}><primitive object={asset.scene} dispose={null} /></group>
  </group>;
}
export default function StudioScene22H({ product, director, api, dpr, allowed, capable, onStatus }) {
  const [attempt, setAttempt] = useState(0), [report, setReport] = useState({ key: '', state: 'loading', error: '' });
  const key = `${product.id}:${product.modelUrl}:${attempt}`;
  const status = report.key === key ? report.state : 'loading';
  const callback = useRef(onStatus); callback.current = onStatus;
  const loaded = useCallback(() => { setReport({ key, state: 'ready', error: '' }); callback.current?.('ready'); }, [key]);
  const failed = useCallback(message => { setReport({ key, state: 'error', error: message || 'The model could not load.' }); callback.current?.('error'); }, [key]);
  const failureRef = useRef(failed); failureRef.current = failed;
  const environmentFailed = useCallback(message => failureRef.current(message), []);
  useEffect(() => { callback.current?.('loading'); }, [key]);
  useEffect(() => {
    if (!allowed || capable === false || status !== 'loading') return undefined;
    const timer = setTimeout(() => failed('Loading took too long. Check your connection and retry.'), 90000);
    return () => clearTimeout(timer);
  }, [allowed, capable, status, failed]);
  function retry() { clearProfiledModelCache(product.modelUrl); setAttempt(n => n+1); }
  return <div className="a22-canvas" data-state={capable === false ? 'unavailable' : status} data-interactive={director.state.inspect}
    role="group" aria-label={`${product.name}: interactive 3D`} aria-busy={allowed && capable !== false && status === 'loading'}>
    {allowed && capable !== false && <SceneBoundary22H key={attempt} onError={failed}>
      <Canvas frameloop="demand" dpr={[1, dpr]} camera={{ position: [0, 0, 7], fov: 36, near: 0.05, far: 250 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1; gl.outputColorSpace = THREE.SRGBColorSpace; }}>
        <Environment22H onError={environmentFailed} />
        <SceneBoundary22H key={key} onError={failed}><Suspense fallback={null}>
          <Product22H product={product} director={director} api={api} onReady={loaded} onError={failed} />
        </Suspense></SceneBoundary22H>
      </Canvas>
    </SceneBoundary22H>}
    {(capable === false || status !== 'ready') && <div className="a22-load" role="status">
      {capable === false ? <p>3D is unavailable on this browser.</p> : status === 'error' ? <><p>{report.error}</p><button type="button" className="a22-button a22-outline" onClick={retry}>Retry 3D</button></> : <><span className="a22-load-mark" aria-hidden="true" /><p>Preparing your view</p></>}
    </div>}
  </div>;
}
