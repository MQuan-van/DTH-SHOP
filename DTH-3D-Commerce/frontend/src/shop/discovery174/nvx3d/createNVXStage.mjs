import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { NVX_STAGE as CONFIG, publicAsset } from './nvx3d.config.mjs';
import { clamp, easeInCubic, easeOutCubic, fitDistance, validateGLB } from './nvx3d.logic.mjs';

function disposeGLTF(gltf) {
  if (!gltf) return;
  const geometries = new Set(), materials = new Set(), textures = new Set(), images = new Set();
  for (const scene of gltf.scenes || [gltf.scene]) scene?.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
    object.skeleton?.dispose?.();
  });
  geometries.forEach(value => value.dispose());
  materials.forEach(value => value.dispose());
  textures.forEach(value => {
    if (value.image) images.add(value.image);
    value.dispose();
  });
  images.forEach(value => value.close?.());
}

function prepareModel(gltf, spec) {
  // Do not rewrite materials, flatten meshes, or clone a skinned scene incorrectly.
  const orientation = new THREE.Group();
  orientation.rotation.fromArray([...(spec.rotation || [0, 0, 0]), 'XYZ']);
  orientation.add(gltf.scene);
  orientation.updateMatrixWorld(true);
  let meshCount = 0;
  orientation.traverse(object => {
    if (object.isMesh) meshCount++;
    // Use the studio lighting, not an arbitrary light exported with the asset.
    if (object.isLight) object.visible = false;
  });
  const box = new THREE.Box3().setFromObject(orientation);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z);
  if (!meshCount || box.isEmpty() || !Number.isFinite(largest) || largest <= 0) {
    throw new Error('The GLB contains no visible mesh with valid bounds.');
  }
  const scale = CONFIG.normalizedSize / largest;
  const root = new THREE.Group();
  orientation.scale.setScalar(scale);
  orientation.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  root.add(orientation);
  const dimensions = size.multiplyScalar(scale);
  return { gltf, root, dimensions, radius: dimensions.length() / 2, spec };
}

function createShadow() {
  // A small procedural contact shadow, not a network HDR or a postprocessing pass.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 5, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(19,42,54,0.22)');
  gradient.addColorStop(0.45, 'rgba(19,42,54,0.10)');
  gradient.addColorStop(1, 'rgba(19,42,54,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.012;
  mesh.visible = false;
  return { mesh, dispose() { mesh.geometry.dispose(); material.dispose(); texture.dispose(); } };
}

/** One renderer per mounted Build stage. Selecting a vehicle never recreates it. */
export function createNVXStage(host, { onStatus = () => {}, compact = false } = {}) {
  let disposed = false, contextBroken = false, raf = 0, lastTime = 0, dirty = true, inView = true;
  let motion = true, autoRotate = true, generation = 0, controller = null;
  let current = null, pending = null, transition = null, desired = null;
  let lastFit = 0, width = 0, height = 0, status = { phase: 'idle' };
  let manualHoldUntil = 0;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1 : CONFIG.maxDpr));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.nvxCanvas = 'true';
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CONFIG.cameraFov, 1, 0.01, 250);
  camera.position.set(7, 3, 8);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.8;
  controls.panSpeed = 0.6;
  controls.minPolarAngle = Math.PI * 0.14;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.maxTargetRadius = 1.25;
  controls.autoRotateSpeed = CONFIG.autoRotateSpeed;
  controls.enabled = false;
  const hemi = new THREE.HemisphereLight(0xf4faff, 0xb0b6ba, 1.4);
  const key = new THREE.DirectionalLight(0xffffff, 2.7);
  key.position.set(4, 7, 6);
  const rim = new THREE.DirectionalLight(0xd9edff, 1.3);
  rim.position.set(-5, 4, -4);
  scene.add(hemi, key, rim);
  const shadow = createShadow();
  scene.add(shadow.mesh);
  let environment = null;
  try {
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.8;
    room.dispose?.();
    pmrem.dispose();
  } catch (error) {
    // Directional/hemisphere lights still permit inspection if PMREM fails.
    console.warn('[NVX 3D] Studio reflections unavailable:', error);
  }
  const draco = new DRACOLoader().setDecoderPath(publicAsset('decoders/nvx3d/draco/'));
  const ktx2 = new KTX2Loader().setTranscoderPath(publicAsset('decoders/nvx3d/basis/'));
  ktx2.detectSupport(renderer);

  function emit(next) {
    if (disposed) return;
    status = { ...next, id: desired?.id || null };
    onStatus(status);
  }
  function visible() { return inView && !document.hidden && !disposed && !contextBroken; }
  function request() {
    dirty = true;
    if (!raf && visible()) raf = requestAnimationFrame(frame);
  }
  function fit(reset) {
    if (!current || !width || !height) return;
    const distance = fitDistance(current.radius, camera.fov, camera.aspect, CONFIG.fitPadding);
    controls.minDistance = Math.max(current.radius * 0.55, 0.6);
    controls.maxDistance = distance * 2.6;
    if (reset || !lastFit) {
      controls.target.set(0, current.dimensions.y / 2, 0);
      controls.cursor.copy(controls.target);
      const offset = new THREE.Vector3().setFromSphericalCoords(distance, CONFIG.cameraPolar, CONFIG.cameraAzimuth);
      camera.position.copy(controls.target).add(offset);
    } else {
      const offset = camera.position.clone().sub(controls.target);
      offset.setLength(clamp(offset.length() * distance / lastFit, controls.minDistance, controls.maxDistance));
      camera.position.copy(controls.target).add(offset);
    }
    lastFit = distance;
    controls.autoRotate = false;
    // Flush old damping deltas before setting the new inspection state.
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = motion;
    controls.saveState();
    request();
  }
  function resize() {
    if (disposed) return;
    const rect = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
    if (w === width && h === height) return;
    width = w; height = h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    fit(false);
    request();
  }
  function removeCurrent() {
    if (!current) return;
    scene.remove(current.root);
    disposeGLTF(current.gltf);
    current = null;
    shadow.mesh.visible = false;
    controls.enabled = false;
  }
  function settleEntry() {
    if (!current) return;
    current.root.position.set(0, 0, 0);
    current.root.rotation.y = 0;
    current.root.scale.setScalar(1);
    transition = null;
    controls.enabled = true;
    shadow.mesh.material.opacity = 1;
    emit({ phase: 'ready', message: 'Live 3D preview' });
  }
  function enterPending() {
    if (current || transition || !pending || disposed) return;
    const item = pending;
    pending = null;
    if (item.kind !== 'asset') {
      emit({ phase: item.kind === 'empty' ? 'unavailable' : 'error', message: item.message });
      request();
      return;
    }
    current = item.asset;
    scene.add(current.root);
    shadow.mesh.scale.set(Math.max(current.dimensions.x * 1.6, 2), Math.max(current.dimensions.z * 1.6, 2), 1);
    shadow.mesh.visible = true;
    fit(true);
    if (motion) {
      const direction = desired.direction;
      current.root.position.x = direction * 5.5;
      current.root.rotation.y = direction * 0.9;
      current.root.scale.setScalar(0.91);
      transition = { kind: 'enter', elapsed: 0, duration: CONFIG.enterSeconds, direction };
      emit({ phase: 'transition', message: 'Opening 3D preview' });
    } else settleEntry();
    request();
  }
  function exitCurrent(direction) {
    controls.enabled = false;
    if (!current) { transition = null; return; }
    if (!motion || !visible()) {
      transition = null;
      removeCurrent();
      return;
    }
    transition = {
      kind: 'exit', elapsed: 0, duration: CONFIG.exitSeconds, direction,
      x: current.root.position.x, yaw: current.root.rotation.y, scale: current.root.scale.x,
    };
  }
  function advance(dt) {
    if (!transition || !current) return;
    const t = transition;
    t.elapsed += dt;
    const p = clamp(t.elapsed / t.duration, 0, 1);
    if (t.kind === 'exit') {
      const e = easeInCubic(p);
      current.root.position.x = THREE.MathUtils.lerp(t.x, -t.direction * 5.5, e);
      current.root.rotation.y = THREE.MathUtils.lerp(t.yaw, -t.direction * 0.9, e);
      current.root.scale.setScalar(THREE.MathUtils.lerp(t.scale, 0.91, e));
      shadow.mesh.material.opacity = 1 - e;
      if (p === 1) { transition = null; removeCurrent(); enterPending(); }
    } else {
      const e = easeOutCubic(p);
      current.root.position.x = t.direction * 5.5 * (1 - e);
      current.root.rotation.y = t.direction * 0.9 * (1 - e);
      current.root.scale.setScalar(0.91 + 0.09 * e);
      shadow.mesh.material.opacity = e;
      if (p === 1) settleEntry();
    }
  }
  function frame(now) {
    raf = 0;
    if (!visible()) { lastTime = 0; return; }
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime = now;
    const wasDirty = dirty;
    dirty = false;
    const wasTransition = !!transition;
    advance(dt);
    controls.autoRotate = !!(current && !transition && motion && autoRotate && now >= manualHoldUntil);
    const changed = controls.enabled ? controls.update(dt) : false;
    try {
      if (wasDirty || changed || wasTransition || controls.autoRotate) renderer.render(scene, camera);
    } catch (error) {
      controls.enabled = false;
      autoRotate = false;
      transition = null;
      emit({ phase: 'error', message: `3D rendering stopped: ${error.message}` });
      return;
    }
    // Demand rendering: no permanent RAF loop when paused/offscreen.
    if (changed || transition || controls.autoRotate || dirty || (motion && autoRotate && current)) request();
  }
  function startInteraction() { manualHoldUntil = performance.now() + 2500; request(); }
  function endInteraction() { manualHoldUntil = performance.now() + 2500; request(); }
  controls.addEventListener('change', request);
  controls.addEventListener('start', startInteraction);
  controls.addEventListener('end', endInteraction);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  function onVisibility() { lastTime = 0; if (visible()) request(); else { cancelAnimationFrame(raf); raf = 0; } }
  document.addEventListener('visibilitychange', onVisibility);
  function contextLost(event) {
    event.preventDefault();
    contextBroken = true;
    cancelAnimationFrame(raf); raf = 0;
    autoRotate = false; controls.enabled = false;
    emit({ phase: 'error', fatal: true, message: 'The browser lost the 3D context. Use Retry 3D to recreate it.' });
  }
  canvas.addEventListener('webglcontextlost', contextLost);

  async function select(spec, direction = 1) {
    if (disposed) return;
    const ticket = ++generation;
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    if (pending?.kind === 'asset') disposeGLTF(pending.asset.gltf);
    pending = null;
    desired = { ...spec, direction: Math.sign(direction) || 1 };
    emit({ phase: spec.file ? 'loading' : 'transition', message: spec.file ? `Loading ${spec.label}…` : 'Changing version…' });
    exitCurrent(desired.direction);
    request();
    if (!spec.file) {
      pending = { kind: 'empty', message: `The ${spec.label} 3D model has not been supplied yet.` };
      enterPending();
      return;
    }
    const url = publicAsset(spec.file);
    let gltf = null;
    const timeout = setTimeout(() => controller?.signal === signal && controller.abort(), CONFIG.fetchTimeoutMs);
    try {
      const response = await fetch(url, { signal, credentials: 'same-origin' });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      if (Number(response.headers.get('content-length')) > CONFIG.maxModelBytes) {
        throw new Error('The model exceeds the 128 MiB safety limit. Optimize it or adjust maxModelBytes.');
      }
      const bytes = await response.arrayBuffer();
      validateGLB(bytes, CONFIG.maxModelBytes);
      if (disposed || generation !== ticket) return;
      clearTimeout(timeout);
      const resourceErrors = [];
      const manager = new THREE.LoadingManager();
      manager.onError = resource => resourceErrors.push(resource);
      const loader = new GLTFLoader(manager).setDRACOLoader(draco).setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
      gltf = await loader.parseAsync(bytes, new URL('.', new URL(url, window.location.href)).href);
      if (resourceErrors.length) throw new Error(`Missing model resources: ${resourceErrors.join(', ')}`);
      if (disposed || generation !== ticket) { disposeGLTF(gltf); return; }
      const asset = prepareModel(gltf, spec);
      pending = { kind: 'asset', asset };
      gltf = null; // Ownership transfers to the stage, not a global GLTF cache.
      enterPending();
    } catch (error) {
      if (gltf) disposeGLTF(gltf);
      if (disposed || generation !== ticket) return;
      pending = {
        kind: 'error', message: error.name === 'AbortError'
          ? 'The model download timed out. Check the file size and server, then retry.'
          : `${error.message}. Check the GLB path, textures and local decoders.`,
      };
      enterPending();
    } finally { clearTimeout(timeout); }
  }
  function setOptions(options = {}) {
    motion = options.motion !== false;
    autoRotate = options.autoRotate !== false;
    controls.enableDamping = motion;
    if (!motion && transition) {
      if (transition.kind === 'exit') { transition = null; removeCurrent(); enterPending(); }
      else settleEntry();
    }
    if (!transition && current) shadow.mesh.material.opacity = 1;
    request();
  }
  function command(name) {
    if (!current || transition) return;
    manualHoldUntil = performance.now() + 2500;
    controls.autoRotate = false;
    if (name === 'reset') fit(true);
    else {
      const offset = camera.position.clone().sub(controls.target);
      if (name === 'left' || name === 'right') offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), (name === 'left' ? -1 : 1) * Math.PI / 12);
      if (name === 'in' || name === 'out') offset.setLength(clamp(offset.length() * (name === 'in' ? 0.84 : 1.19), controls.minDistance, controls.maxDistance));
      camera.position.copy(controls.target).add(offset);
      controls.update();
      request();
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true; generation++;
    controller?.abort();
    cancelAnimationFrame(raf);
    observer.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.removeEventListener('webglcontextlost', contextLost);
    controls.removeEventListener('change', request);
    controls.removeEventListener('start', startInteraction);
    controls.removeEventListener('end', endInteraction);
    controls.dispose();
    if (pending?.kind === 'asset') disposeGLTF(pending.asset.gltf);
    pending = null; transition = null;
    removeCurrent();
    shadow.dispose();
    environment?.dispose();
    draco.dispose(); ktx2.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }
  resize();
  return {
    select, setOptions, command, dispose,
    setVisible(value) { inView = !!value; onVisibility(); },
  };
}
