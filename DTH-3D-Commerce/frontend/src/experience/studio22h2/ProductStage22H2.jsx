import { Component, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useProduct3DProfile } from '../../shop/product/3d/useProduct3DProfile.js';
import { useProfiledModel, clearProfiledModelCache } from '../../shop/product/3d/useProfiledModel.js';
import { getPresentation21 } from '../../../../shared/productPresentation21.mjs';
import { createCamera22H2, position22H2 } from './studio22h2.logic.mjs';

class Boundary22H2 extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { this.props.onError(error?.message || 'Unable to start 3D.'); }
  render() { return this.state.failed ? null : this.props.children; }
}
function Lighting22H2({ onError }) {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const previous = scene.environment, intensity = scene.environmentIntensity;
    let room, pmrem, target;
    const lost = e => { e.preventDefault(); onError('Graphics connection lost. Close other 3D tabs, then retry.'); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    try {
      room = new RoomEnvironment(); pmrem = new THREE.PMREMGenerator(gl); target = pmrem.fromScene(room, 0.04);
      scene.environment = target.texture; scene.environmentIntensity = 0.7; invalidate();
    } catch (e) { onError(e.message || 'Unable to create the studio environment.'); }
    finally { room?.dispose(); pmrem?.dispose(); }
    return () => { gl.domElement.removeEventListener('webglcontextlost', lost); scene.environment = previous; scene.environmentIntensity = intensity; target?.dispose(); };
  }, [gl, scene, invalidate, onError]);
  // Authored GLB materials are untouched. Neutral white illumination, not coloured tinting.
  return <><ambientLight intensity={0.28} /><hemisphereLight args={['#ffffff', '#293440', 0.65]} />
    <directionalLight position={[-4, 5, 5]} intensity={2} /><directionalLight position={[4, 1, -3]} intensity={1.25} /></>;
}
function Body22H2({ product, signal, api, onReady, onError, onPicked }) {
  const selection = useProduct3DProfile(product), asset = useProfiledModel(product, selection, onError);
  const { camera, gl, size, invalidate } = useThree();
  const controlsRef = useRef(null), machineRef = useRef(null), metadata = useRef(null), meshes = useRef([]);
  const latest = useRef({}); latest.current = { onReady, onPicked, size };
  const settings = useMemo(() => getPresentation21(product), [product.modelUrl, product.presentation3d]);
  const fit = asset?.presentation;
  const descriptor = useMemo(() => {
    if (!asset?.measured?.box || !fit) return null;
    const matrix = new THREE.Matrix4().makeTranslation(...fit.center)
      .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...fit.rotation, 'XYZ')))
      .multiply(new THREE.Matrix4().makeScale(fit.scale, fit.scale, fit.scale))
      .multiply(new THREE.Matrix4().makeTranslation(...fit.offset));
    const sphere = asset.measured.box.clone().applyMatrix4(matrix).getBoundingSphere(new THREE.Sphere());
    if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) return null;
    return { center: sphere.center.toArray(), radius: sphere.radius, front: fit.camera?.presets?.front, fov: fit.camera?.fov || 36 };
  }, [asset, fit]);
  const writePose = useCallback(() => {
    const machine = machineRef.current, controls = controlsRef.current;
    if (!machine || !controls) return;
    const snapshot = machine.read(), limits = machine.limits();
    // Flush old damping before applying a scripted pose; OrbitControls never fights the timeline.
    controls.enableDamping = false; controls.autoRotate = false; controls.update(0);
    controls.minDistance = limits.min; controls.maxDistance = limits.max;
    camera.position.fromArray(snapshot.position); controls.target.fromArray(snapshot.target); controls.update(0);
    controls.enableDamping = snapshot.mode === 'orbit' && !signal.state.reduced;
  }, [camera, signal]);
  useLayoutEffect(() => {
    if (!descriptor || !size.width || !size.height) return;
    const machine = createCamera22H2(descriptor, size.width, size.height, descriptor.front,
      { fov: descriptor.fov, reduced: signal.state.reduced, seconds: settings?.spin?.secondsPerTurn || 38 });
    metadata.current = descriptor; machineRef.current = machine;
    if (signal.state.mode !== 'overview') machine.mode(signal.state.mode);
    camera.fov = descriptor.fov; camera.near = Math.max(0.005, descriptor.radius / 250);
    camera.far = Math.max(100, machine.limits().max * 6); camera.updateProjectionMatrix();
    writePose(); invalidate();
    return () => { if (machineRef.current === machine) machineRef.current = null; };
    // Size changes are deliberately handled below without recreating the controller.
  }, [descriptor, settings, camera, signal, writePose, invalidate]);
  useLayoutEffect(() => {
    if (!machineRef.current || !size.width || !size.height) return;
    camera.aspect = size.width / size.height; camera.updateProjectionMatrix();
    machineRef.current.resize(size.width, size.height); writePose(); invalidate();
  }, [size.width, size.height, camera, writePose, invalidate]);

  useEffect(() => {
    const canvas = gl.domElement, controls = new OrbitControls(camera, canvas); controlsRef.current = controls;
    controls.enablePan = false; controls.enableZoom = false; controls.autoRotate = false;
    controls.enableDamping = true; controls.dampingFactor = 0.12; controls.rotateSpeed = 0.72;
    controls.minPolarAngle = 0.28; controls.maxPolarAngle = Math.PI - 0.28;
    let prevMode = '', prevSerial = -1, start = null;
    const permitted = () => signal.state.active && !signal.state.blocked && !document.hidden;
    const sync = state => {
      const machine = machineRef.current;
      if (machine) {
        if (prevMode === 'orbit') machine.absorb(camera.position.toArray(), controls.target.toArray());
        machine.setReduced(state.reduced);
        if (state.mode !== prevMode || state.serial !== prevSerial) {
          controls.enableDamping = false; controls.update(0);
          machine.mode(state.mode);
        }
      }
      writePose();
      prevMode = state.mode; prevSerial = state.serial;
      controls.enabled = permitted() && state.mode === 'orbit' && !machine?.read().moving;
      canvas.style.touchAction = controls.enabled ? 'none' : 'pan-y';
      if (permitted()) invalidate();
    };
    const change = () => { if (permitted()) invalidate(); };
    const interaction = () => {
      const machine = machineRef.current;
      if (machine && signal.state.mode === 'orbit') machine.absorb(camera.position.toArray(), controls.target.toArray());
    };
    controls.addEventListener('change', change); controls.addEventListener('start', interaction);
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    const down = e => { if (signal.state.mode === 'pick' && permitted() && e.button === 0 && e.isPrimary) start = { x: e.clientX, y: e.clientY, id: e.pointerId }; };
    const cancel = () => { start = null; };
    const up = e => {
      const press = start; start = null;
      const machine = machineRef.current;
      if (!press || press.id !== e.pointerId || !machine || signal.state.mode !== 'pick' || !permitted() || Math.hypot(e.clientX - press.x, e.clientY - press.y) > 7) return;
      const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
      pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, 1 - (e.clientY - rect.top) / rect.height * 2);
      camera.updateMatrixWorld(); raycaster.setFromCamera(pointer, camera);
      // Raycast ONLY on intentional click/tap, not on pointermove of a million-triangle model.
      const hit = raycaster.intersectObjects(meshes.current, false)[0];
      if (!hit) { latest.current.onPicked?.(false); return; }
      try { machine.focus(hit.point.toArray()); latest.current.onPicked?.(true); invalidate(); }
      catch { latest.current.onPicked?.(false); }
    };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('pointerleave', cancel);
    const visible = () => sync(signal.state); document.addEventListener('visibilitychange', visible);
    const unsubscribe = signal.subscribe(sync);
    api.current = {
      reset: () => { signal.set({ mode: 'overview', serial: signal.state.serial + 1 }); },
      zoom: factor => { if (permitted() && machineRef.current?.zoom(factor)) invalidate(); },
      rotate: amount => { if (permitted() && machineRef.current?.rotate(amount)) invalidate(); },
      centerDetail: () => { if (permitted() && signal.state.mode === 'pick' && metadata.current) { machineRef.current?.focus(metadata.current.center); latest.current.onPicked?.(true); invalidate(); } },
    };
    sync(signal.state); writePose();
    return () => {
      unsubscribe(); document.removeEventListener('visibilitychange', visible);
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('pointerleave', cancel);
      controls.removeEventListener('change', change); controls.removeEventListener('start', interaction);
      controls.dispose(); controlsRef.current = null; api.current = null;
    };
  }, [camera, gl, signal, api, invalidate, writePose]);
  useEffect(() => {
    if (!asset?.scene) return;
    let live = true, announced = false; const undo = [], visibleMeshes = [];
    asset.scene.traverse(node => {
      if (!node.isMesh) return;
      let visible = true; for (let parent = node; parent; parent = parent.parent) if (!parent.visible) visible = false;
      if (visible) visibleMeshes.push(node);
      const previous = node.onAfterRender;
      node.onAfterRender = function (...args) {
        previous?.apply(this, args);
        if (!announced && live) { announced = true; queueMicrotask(() => { if (live) latest.current.onReady?.(asset.report); }); }
      };
      undo.push(() => { node.onAfterRender = previous; });
    });
    meshes.current = visibleMeshes; writePose(); invalidate();
    return () => { live = false; meshes.current = []; undo.forEach(fn => fn()); };
  }, [asset, invalidate, writePose]);
  useFrame((_, delta) => {
    const machine = machineRef.current, controls = controlsRef.current, state = signal.state;
    if (!machine || !controls || !asset || !state.active || state.blocked || document.hidden) { if (controls) controls.enabled = false; return; }
    const snapshot = machine.read();
    controls.enabled = snapshot.mode === 'orbit' && !snapshot.moving;
    let changing = false;
    if (controls.enabled) {
      controls.enableDamping = !state.reduced;
      changing = !!controls.update(Math.min(delta, 0.05));
      machine.absorb(camera.position.toArray(), controls.target.toArray());
      // Enforce hull clearance even after manual rotation/zoom around an off-centre focus.
      const safe = machine.read(); camera.position.fromArray(safe.position); controls.minDistance = machine.limits().min;
    } else if (machine.tick(delta, true)) { writePose(); changing = true; }
    if (changing) invalidate();
    if (import.meta.env.VITE_EXPERIENCE_TESTS === 'true') {
      const s = machine.read(); gl.domElement.dataset.studioCamera = JSON.stringify(s);
      gl.domElement.dataset.studioBounds = JSON.stringify(metadata.current);
    }
  }, -1);
  if (!asset || !fit) return null;
  return <group scale={fit.scale} rotation={fit.rotation} position={fit.center}>
    <group position={fit.offset}><primitive object={asset.scene} dispose={null} /></group>
  </group>;
}
export default function ProductStage22H2({ product, signal, api, active, reduced, mode, onStatus, onPicked }) {
  const [attempt, setAttempt] = useState(0), [report, setReport] = useState({ key: '', state: 'loading', error: '' });
  const key = `${product.id}:${product.modelUrl}:${attempt}`;
  const status = report.key === key ? report.state : 'loading';
  const callback = useRef({ onStatus, onPicked, key }); callback.current = { onStatus, onPicked, key };
  const loaded = useCallback(() => {
    if (callback.current.key !== key) return;
    setReport({ key, state: 'ready', error: '' }); callback.current.onStatus?.('ready');
  }, [key]);
  const failed = useCallback(message => {
    if (callback.current.key !== key) return;
    setReport({ key, state: 'error', error: message || 'Unable to load the 3D view.' }); callback.current.onStatus?.('error');
  }, [key]);
  const failure = useRef(failed); failure.current = failed;
  const environmentFailed = useCallback(message => failure.current(message), []);
  const picked = useCallback(hit => callback.current.onPicked?.(hit), []);
  useEffect(() => { callback.current.onStatus?.('loading'); }, [key]);
  useEffect(() => {
    if (status !== 'loading' || !active) return;
    const timer = setTimeout(() => failed('3D loading timed out. Check the GLB and retry.'), 90000); return () => clearTimeout(timer);
  }, [active, status, attempt, failed]);
  function retry() { clearProfiledModelCache(product.modelUrl); setAttempt(n => n + 1); }
  return <div className="s222-canvas" data-state={status} data-mode={mode} aria-label={`${product.name}: 3D model`} role="group" aria-busy={status === 'loading'}>
    {status !== 'error' && <Boundary22H2 key={attempt} onError={failed}>
      <Canvas frameloop="demand" dpr={[1, reduced ? 1.5 : 2]} camera={{ position: [0, 0, 8], fov: 36, near: 0.01, far: 200 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1; gl.outputColorSpace = THREE.SRGBColorSpace;
        }}>
        <Lighting22H2 onError={environmentFailed} />
        <Boundary22H2 key={key} onError={failed}><Suspense fallback={null}>
          <Body22H2 key={key} product={product} signal={signal} api={api} onReady={loaded} onError={failed} onPicked={picked} />
        </Suspense></Boundary22H2>
      </Canvas>
    </Boundary22H2>}
    {status !== 'ready' && <div className="s222-loading" role="status">
      {status === 'error' ? <><strong>3D view unavailable</strong><p>{report.error}</p><button type="button" className="s222-button s222-ghost" onClick={retry}>Retry 3D</button></>
        : <><i aria-hidden="true" /><span>Loading original 3D</span></>}
    </div>}
  </div>;
}
