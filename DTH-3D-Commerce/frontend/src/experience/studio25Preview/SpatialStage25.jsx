import { Component, Suspense, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useProduct3DProfile } from '../../shop/product/3d/useProduct3DProfile.js';
import { useProfiledModel, clearProfiledModelCache } from '../../shop/product/3d/useProfiledModel.js';
import { galleryKey24 } from '../galleryDemo24/gallery-demo.logic.mjs';
import ShelfCapture25 from './ShelfCapture25.jsx';
import { describeProduct25 } from './shelf-capture25.logic.mjs';
import { allowIdleOrbit25, createTravel25, guardCamera25, idleOrbitAngle25, nearestResident25, projectPoint25, residents25, scenePermitted25, station25, stationPose25 } from './spatial-stage25.logic.mjs';

class StageBoundary25 extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { this.props.onError(error?.message || 'Unable to render this 3D view.'); }
  render() { return this.state.failed ? null : this.props.children; }
}
function createRegistry25() {
  const listeners = new Set();
  return { entries: new Map(), errors: new Map(), subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, notify() { for (const fn of listeners) fn(); } };
}
function Lighting25({ onError }) {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const previous = scene.environment, intensity = scene.environmentIntensity;
    let target, room, pmrem;
    const lost = event => { event.preventDefault(); onError('The graphics connection was lost. Retry the 3D view.'); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    try {
      room = new RoomEnvironment(); pmrem = new THREE.PMREMGenerator(gl); target = pmrem.fromScene(room, .04);
      scene.environment = target.texture; scene.environmentIntensity = .72; invalidate();
    } catch (error) { onError(error.message || 'Studio lighting is unavailable.'); }
    finally { room?.dispose(); pmrem?.dispose(); }
    return () => { gl.domElement.removeEventListener('webglcontextlost', lost); scene.environment = previous; scene.environmentIntensity = intensity; target?.dispose(); };
  }, [gl, scene, invalidate, onError]);
  return <><ambientLight intensity={.24} /><hemisphereLight args={['#ffffff', '#34414d', .68]} />
    <directionalLight position={[-4, 6, 6]} intensity={2.1} /><directionalLight position={[4, 1, -4]} intensity={1.15} /></>;
}
/** Each parsed original scene is owned and disposed by the existing bounded product hook. */
function ProductStation25({ product, station, identity, registry }) {
  const failed = useCallback(message => { registry.errors.set(product.id, { identity, message }); registry.notify(); }, [registry, product.id, identity]);
  const selection = useProduct3DProfile(product), asset = useProfiledModel(product, selection, failed), root = useRef(null);
  const { invalidate } = useThree(), fit = asset?.presentation;
  const descriptor = useMemo(() => describeProduct25(asset, product), [asset, product]);
  useLayoutEffect(() => {
    if (!asset || !descriptor || !root.current) return;
    const group = root.current, meshes = [], undo = [];
    group.updateMatrixWorld(true);
    const entry = { id: product.id, identity, posterKey: galleryKey24(product), asset, descriptor, station: [...station], center: descriptor.center.map((n, i) => n + station[i]), radius: descriptor.radius, root: group, meshes, rendered: false };
    asset.scene.traverse(node => {
      if (!node.isMesh) return;
      let visible = true; for (let p = node; p; p = p.parent) if (!p.visible) visible = false;
      if (visible) meshes.push(node);
      const previous = node.onAfterRender;
      const after = function (...args) {
        previous?.apply(this, args);
        if (!entry.rendered) { entry.rendered = true; invalidate(); }
      };
      node.onAfterRender = after; undo.push(() => { if (node.onAfterRender === after) node.onAfterRender = previous; });
    });
    registry.errors.delete(product.id); registry.entries.set(product.id, entry); registry.notify(); invalidate();
    return () => { undo.forEach(fn => fn()); if (registry.entries.get(product.id) === entry) registry.entries.delete(product.id); registry.notify(); };
  }, [asset, descriptor, identity, product.id, registry, station, invalidate]);
  return <group ref={root} position={station}>
    {asset && fit && <group position={fit.center} rotation={fit.rotation} scale={fit.scale}>
      <group position={fit.offset}><primitive object={asset.scene} dispose={null} /></group>
    </group>}
  </group>;
}
// A price-only catalog refresh must not dispose/reparse an unchanged decoded asset.
// The parent retains the current StoreProvider record for all commerce information.
const StableProductStation25 = memo(ProductStation25, (previous, next) =>
  previous.identity === next.identity && previous.station === next.station && previous.registry === next.registry);
/** At most two surface raycasts per anchor acquisition, never on pointermove. */
function visibleSurface25(entry, camera, raycaster) {
  if (!entry?.meshes?.length) return null;
  entry.root.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  const origin = camera.position.clone(), aim = new THREE.Vector3(...entry.center);
  raycaster.set(origin, aim.clone().sub(origin).normalize());
  let hit = raycaster.intersectObjects(entry.meshes, false)[0];
  if (!hit) {
    // A pair/coil may have an empty centre. Sample actual triangle centroids, not a fake mount.
    let best = null, score = Infinity; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (const mesh of entry.meshes.slice(0, 8)) {
      const position = mesh.geometry?.attributes?.position, index = mesh.geometry?.index;
      if (!position) continue;
      const triangles = Math.floor((index?.count || position.count) / 3), step = Math.max(1, Math.floor(triangles / 64));
      for (let triangle = 0, samples = 0; triangle < triangles && samples < 64; triangle += step, samples++) {
        const offset = triangle * 3, id = n => index ? index.getX(offset + n) : offset + n;
        a.fromBufferAttribute(position, id(0)); b.fromBufferAttribute(position, id(1)); c.fromBufferAttribute(position, id(2));
        a.add(b).add(c).multiplyScalar(1 / 3).applyMatrix4(mesh.matrixWorld);
        const next = a.distanceToSquared(aim);
        if (next < score) { score = next; best = a.clone(); }
      }
    }
    if (best) { raycaster.set(origin, best.sub(origin).normalize()); hit = raycaster.intersectObjects(entry.meshes, false)[0]; }
  }
  if (!hit) return null;
  const normal = hit.face?.normal ? hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize() : origin.clone().sub(hit.point).normalize();
  if (normal.dot(origin.clone().sub(hit.point)) < 0) normal.negate();
  return { point: hit.point.clone(), normal };
}
function Director25({ selectedId, identity, registry, callbacks, apiRef, retry, options }) {
  const { camera, gl, size, invalidate } = useThree(), engine = useRef(null), latest = useRef({});
  latest.current = { selectedId, identity, options, size, retry };
  useLayoutEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement), raycaster = new THREE.Raycaster();
    const upAxis = new THREE.Vector3(0, 1, 0), idleOffset = new THREE.Vector3(), idleTarget = new THREE.Vector3(), projectedPoint = new THREE.Vector3(), viewOffset = new THREE.Vector3();
    controls.enablePan = false; controls.enableZoom = false; controls.autoRotate = false; controls.enableDamping = true; controls.dampingFactor = .11;
    controls.minPolarAngle = .25; controls.maxPolarAngle = Math.PI - .25; controls.rotateSpeed = .68; controls.enabled = false;
    const st = { phase: 'loading', id: '', identity: '', displayId: '', started: '', travel: null, elapsed: 0, base: null, anchor: null, anchorAttempted: false, anchorCooldown: 0, inspect: false, paused: false, drag: false, idle: 0, lastProjection: '', alive: true };
    const failed = () => latest.current.options.failureRef.current === true;
    const permitted = () => scenePermitted25({ ...latest.current.options, hidden: document.hidden, failed: failed() });
    const pose = () => ({ position: camera.position.toArray(), target: controls.target.toArray(), fov: camera.fov });
    const write = p => {
      controls.enableDamping = false; controls.update(0); camera.position.fromArray(p.position); controls.target.fromArray(p.target); camera.lookAt(controls.target); camera.updateMatrixWorld(true);
      if (Number.isFinite(p.fov) && camera.fov !== p.fov) { camera.fov = p.fov; camera.updateProjectionMatrix(); }
      controls.minDistance = (registry.entries.get(st.id)?.radius || 1.35) * 1.55;
      controls.maxDistance = (st.base?.distance || 8) * 1.8;
    };
    const report = (phase, displayId = st.displayId, message = '') => {
      const signature = `${phase}:${st.id}:${displayId}:${message}`;
      st.phase = phase; st.displayId = displayId;
      if (st.signature === signature) return; st.signature = signature;
      callbacks.current.status({ phase, productId: st.id, displayProductId: displayId || st.id, message });
    };
    const hideAnchor = () => { if (st.lastProjection !== 'hidden') { st.lastProjection = 'hidden'; callbacks.current.anchor({ x: 0, y: 0, visible: false, productId: st.displayId || st.id }); } };
    function begin(entry, seconds = 1.18) {
      if (failed()) return;
      const { width, height } = latest.current.size;
      const to = stationPose25(entry.descriptor, entry.station, width, height);
      camera.near = Math.max(.005, entry.radius / 250); camera.far = Math.max(200, entry.station[0] + 100); camera.updateProjectionMatrix();
      st.base = to; st.elapsed = 0; st.anchor = null; st.anchorAttempted = false; st.idle = 0; st.inspect = false; controls.enabled = false; gl.domElement.style.touchAction = 'pan-y';
      const spheres = [...registry.entries.values()].map(e => ({ center: e.center, radius: e.radius }));
      st.travel = createTravel25(pose(), to, { seconds, spheres, reduced: latest.current.options.reduced });
      // Retain the current product's copy during travel. Incoming identity commits only on first-draw + arrival.
      st.started = st.identity; report('transition', st.displayId || entry.id); hideAnchor(); invalidate();
    }
    function reconcile() {
      if (!st.alive || !st.id || failed()) return;
      const failure = registry.errors.get(st.id);
      if (failure?.identity === st.identity) { st.travel = null; controls.enabled = false; gl.domElement.style.touchAction = 'pan-y'; report('error', st.displayId, failure.message); hideAnchor(); return; }
      const entry = registry.entries.get(st.id);
      if (entry?.identity === st.identity && st.started !== st.identity) begin(entry, st.displayId ? 1.18 : .72);
    }
    function request(id, key) {
      if (failed()) return;
      const nearest = id ? nearestResident25([...registry.entries.values()], camera.position.toArray(), st.displayId) : '';
      st.id = id; st.identity = key; st.started = ''; st.travel = null; st.inspect = false; st.anchor = null; st.anchorAttempted = false; controls.enabled = false; gl.domElement.style.touchAction = 'pan-y';
      callbacks.current.residents(residents25(nearest, id)); report(id ? 'loading' : 'empty', nearest || id); hideAnchor(); reconcile(); invalidate();
    }
    function reset() { const entry = registry.entries.get(st.id); if (entry?.identity === st.identity) begin(entry, .60); }
    function zoom(factor) {
      if (!permitted() || st.phase !== 'ready' || !Number.isFinite(factor) || factor <= 0) return;
      st.inspect = true; const entry = registry.entries.get(st.id), offset = camera.position.clone().sub(controls.target);
      const length = THREE.MathUtils.clamp(offset.length() * factor, entry.radius * 1.6, st.base.distance * 1.8);
      offset.setLength(length); camera.position.copy(controls.target).add(offset);
      camera.position.fromArray(guardCamera25(camera.position.toArray(), [entry])); camera.lookAt(controls.target); st.anchor = null; st.anchorAttempted = false; invalidate();
    }
    function orbit(amount) {
      if (!permitted() || st.phase !== 'ready' || !Number.isFinite(amount)) return;
      st.inspect = true; const offset = camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), amount);
      camera.position.copy(controls.target).add(offset); st.anchor = null; st.anchorAttempted = false; invalidate();
    }
    const publicAPI = { reset, zoom, orbit, rotate: orbit,
      setInspect(value) { if (!permitted() || st.phase !== 'ready') return; st.inspect = value === true; st.anchor = null; st.anchorAttempted = false; if (!st.inspect) reset(); else invalidate(); },
      pauseRotation(value) { st.paused = value === true; invalidate(); }, retry: () => latest.current.retry(),
    };
    apiRef.current = publicAPI;
    const change = () => { if (permitted()) invalidate(); };
    const start = () => { st.drag = true; hideAnchor(); };
    const end = () => { st.drag = false; st.anchor = null; st.anchorAttempted = false; if (permitted()) invalidate(); };
    controls.addEventListener('change', change); controls.addEventListener('start', start); controls.addEventListener('end', end);
    const suspend = () => { controls.enabled = false; st.drag = false; gl.domElement.style.touchAction = 'pan-y'; hideAnchor(); };
    const visible = () => { if (!permitted()) suspend(); else { controls.enabled = st.inspect && st.phase === 'ready'; gl.domElement.style.touchAction = controls.enabled ? 'none' : 'pan-y'; invalidate(); } };
    document.addEventListener('visibilitychange', visible);
    const canvas = gl.domElement; canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Original product 3D. Use inspection controls to rotate and zoom.');
    const keys = event => {
      if (!permitted() || !st.inspect || st.phase !== 'ready') return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); orbit((event.key === 'ArrowLeft' ? -1 : 1) * Math.PI / 12); }
      else if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(.88); }
      else if (event.key === '-') { event.preventDefault(); zoom(1.14); }
      else if (event.key === 'Escape') { event.preventDefault(); reset(); }
    };
    canvas.addEventListener('keydown', keys);
    const unsubscribe = registry.subscribe(reconcile);
    engine.current = {
      request, reconcile, hideAnchor, suspend,
      resize() {
        const entry = registry.entries.get(st.id); if (!entry || entry.identity !== st.identity) return;
        if (st.phase === 'ready' || st.travel) begin(entry, .48);
      },
      tick(delta) {
        if (!permitted()) { controls.enabled = false; gl.domElement.style.touchAction = 'pan-y'; return; }
        const entry = registry.entries.get(st.id); if (!entry || entry.identity !== st.identity) return;
        const reduced = latest.current.options.reduced, dt = Math.min(Math.max(delta, 0), .05);
        if (st.travel) {
          st.elapsed += dt;
          const next = st.travel.sample(reduced ? st.travel.seconds : st.elapsed); write(next);
          if (next.done) st.travel = null;
          invalidate();
        } else if (st.phase === 'transition') {
          if (!entry.rendered) { invalidate(); return; }
          st.anchor = visibleSurface25(entry, camera, raycaster); st.anchorAttempted = true; report('ready', st.id); callbacks.current.residents([st.id]); invalidate();
        } else if (st.phase === 'ready') {
          controls.enabled = st.inspect && !latest.current.options.blocked; canvas.style.touchAction = controls.enabled ? 'none' : 'pan-y';
          if (controls.enabled) {
            controls.enableDamping = !reduced; const changed = controls.update(dt);
            camera.position.fromArray(guardCamera25(camera.position.toArray(), [entry])); if (changed) invalidate();
          } else if (st.base && allowIdleOrbit25({ paused: st.paused, reduced, orbitDisabled: latest.current.options.orbitDisabled, inspect: st.inspect, spinEnabled: entry.descriptor.spinEnabled })) {
            st.idle += dt;
            idleTarget.fromArray(st.base.target); idleOffset.fromArray(st.base.position).sub(idleTarget);
            idleOffset.applyAxisAngle(upAxis, idleOrbitAngle25(st.idle, entry.descriptor.spinSeconds));
            camera.position.copy(idleTarget).add(idleOffset); camera.lookAt(controls.target); camera.updateMatrixWorld(true); invalidate();
          }
          // As a full orbit reaches the rear, reacquire a real front-facing surface.
          // Bound retries; never raycast the full model on every animation frame.
          st.anchorCooldown = Math.max(0, st.anchorCooldown - dt);
          if (st.anchor && !st.drag && st.anchorCooldown === 0 && st.anchor.normal.dot(viewOffset.copy(camera.position).sub(st.anchor.point)) <= 0) {
            st.anchor = null; st.anchorAttempted = false; st.anchorCooldown = .5;
          }
          if (!st.anchor && !st.drag && !st.anchorAttempted) { st.anchor = visibleSurface25(entry, camera, raycaster); st.anchorAttempted = true; }
        }
        if (st.phase !== 'ready' || st.travel || st.drag || !st.anchor) { hideAnchor(); return; }
        camera.updateMatrixWorld(true);
        projectedPoint.copy(st.anchor.point).project(camera); viewOffset.copy(camera.position).sub(st.anchor.point);
        const facing = st.anchor.normal.dot(viewOffset) > 0;
        const next = { ...projectPoint25(projectedPoint.toArray(), latest.current.size.width, latest.current.size.height, { facing }), productId: st.id };
        const signature = `${Math.round(next.x * 4)}:${Math.round(next.y * 4)}:${next.visible}:${next.productId}`;
        if (signature !== st.lastProjection) { st.lastProjection = signature; callbacks.current.anchor(next); }
        if (import.meta.env.VITE_EXPERIENCE_TESTS === 'true') {
          canvas.dataset.spatialCamera25 = JSON.stringify({ ...pose(), phase: st.phase, productId: st.id });
        }
      },
    };
    invalidate();
    return () => {
      st.alive = false; unsubscribe(); document.removeEventListener('visibilitychange', visible); canvas.removeEventListener('keydown', keys);
      controls.removeEventListener('change', change); controls.removeEventListener('start', start); controls.removeEventListener('end', end); controls.dispose();
      if (apiRef.current === publicAPI) apiRef.current = null; engine.current = null;
    };
  }, [camera, gl, registry, callbacks, apiRef, invalidate]);
  useLayoutEffect(() => { engine.current?.request(selectedId, identity); }, [selectedId, identity]);
  const previousSize = useRef('');
  useLayoutEffect(() => {
    const key = `${size.width}:${size.height}`; if (previousSize.current && previousSize.current !== key) engine.current?.resize(); previousSize.current = key;
  }, [size.width, size.height]);
  useLayoutEffect(() => { if (!options.active || options.blocked) engine.current?.suspend(); else invalidate(); }, [options.active, options.blocked, options.reduced, options.orbitDisabled, invalidate]);
  useFrame((_, delta) => engine.current?.tick(delta), -1);
  return null;
}

export default function SpatialStage25({ products = [], selectedId = '', reduced = false, orbitDisabled = false, active = true, blocked = false, onStatus, onAnchor, apiRef, shelfProducts = [], onShelfPoster }) {
  const registry = useMemo(createRegistry25, []), stations = useRef(new Map()), nextStation = useRef(0), latest = useRef({});
  latest.current = { products, selectedId, onStatus, onAnchor };
  const [residents, setResidents] = useState(() => selectedId ? [selectedId] : []), [attempts, setAttempts] = useState({}), [canvasEpoch, setCanvasEpoch] = useState(0), [fatalError, setFatalError] = useState(false);
  const [status, setStatus] = useState({ phase: 'loading', productId: selectedId, displayProductId: selectedId }), fatal = useRef(false), displayed = useRef(selectedId);
  displayed.current = status.displayProductId;
  const localAPI = useRef(null), api = apiRef || localAPI, directorAPI = useRef(null);
  for (const product of products) if (!stations.current.has(product.id)) stations.current.set(product.id, station25(nextStation.current++));
  const selected = products.find(product => product.id === selectedId), identity = `${galleryKey24(selected)}:${attempts[selectedId] || 0}`;
  const callbacks = useRef({});
  callbacks.current = {
    status(value) { setStatus(value); latest.current.onStatus?.(value); },
    anchor(value) { latest.current.onAnchor?.(value); },
    residents(value) { setResidents(previous => previous.join('|') === value.join('|') ? previous : value); },
  };
  const retry = useCallback(() => {
    const product = latest.current.products.find(p => p.id === latest.current.selectedId); if (!product) return;
    clearProfiledModelCache(product.modelUrl); registry.errors.delete(product.id);
    setAttempts(previous => ({ ...previous, [product.id]: (previous[product.id] || 0) + 1 }));
    if (fatal.current) { fatal.current = false; setFatalError(false); setCanvasEpoch(n => n + 1); }
  }, [registry]);
  const failed = useCallback(message => {
    fatal.current = true; setFatalError(true); callbacks.current.status({ phase: 'error', productId: latest.current.selectedId, displayProductId: displayed.current || latest.current.selectedId, message });
    callbacks.current.anchor({ x: 0, y: 0, visible: false, productId: displayed.current || latest.current.selectedId });
  }, []);
  useLayoutEffect(() => {
    // Retry survives a fatal Canvas/error-boundary teardown; all camera methods stay delegated.
    const facade = { retry, reset: () => directorAPI.current?.reset(), zoom: n => directorAPI.current?.zoom(n),
      orbit: n => directorAPI.current?.orbit(n), rotate: n => directorAPI.current?.rotate(n),
      setInspect: value => directorAPI.current?.setInspect(value), pauseRotation: value => directorAPI.current?.pauseRotation(value) };
    api.current = facade;
    return () => { if (api.current === facade) api.current = null; };
  }, [api, retry]);
  useEffect(() => {
    if (status.phase !== 'loading' || !active || !selected) return;
    const timer = setTimeout(() => {
      registry.errors.set(selected.id, { identity, message: 'The original 3D model is taking too long. Retry this product.' }); registry.notify();
    }, 90000);
    return () => clearTimeout(timer);
  }, [active, status.phase, selected?.id, identity, registry]);
  const options = { reduced, active: active && !fatalError, blocked, orbitDisabled, failureRef: fatal };
  const captureAllowed = !fatalError && !blocked && !orbitDisabled && residents.length <= 1 && status.productId === selectedId
    && (status.phase === 'error' || (status.phase === 'ready' && status.displayProductId === selectedId));
  return <div className="s25-stage-canvas" data-phase={status.phase} data-resident-count={residents.length} data-display-product={status.displayProductId} role="group" aria-label="Original 3D gallery" aria-busy={status.phase === 'loading'} style={{ width: '100%', height: '100%', position: 'relative' }}>
    <StageBoundary25 key={canvasEpoch} onError={failed}>
      <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, .8, 8], fov: 36, near: .005, far: 250 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1; gl.outputColorSpace = THREE.SRGBColorSpace; }}>
        <Lighting25 onError={failed} />
        <Director25 selectedId={selected?.id || ''} identity={identity} registry={registry} callbacks={callbacks} apiRef={directorAPI} retry={retry} options={options} />
        {residents.map(id => products.find(product => product.id === id)).filter(Boolean).map(product => {
          const key = `${galleryKey24(product)}:${attempts[product.id] || 0}`;
          const failure = message => { registry.errors.set(product.id, { identity: key, message }); registry.notify(); };
          return <StageBoundary25 key={key} onError={failure}><Suspense fallback={null}>
            <StableProductStation25 product={product} station={stations.current.get(product.id)} identity={key} registry={registry} />
          </Suspense></StageBoundary25>;
        })}
        {onShelfPoster && <ShelfCapture25 products={shelfProducts} registry={registry} allowed={captureAllowed} onPoster={onShelfPoster} />}
      </Canvas>
    </StageBoundary25>
  </div>;
}
