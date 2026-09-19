import { Component, Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure?.(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function Model({ url, onReady }) {
  const { scene } = useGLTF(url);
  const [normalized] = useState(() => {
    const copy = scene.clone(true);
    const box = new THREE.Box3().setFromObject(copy);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const max = Math.max(size.x, size.y, size.z) || 1;
    copy.position.sub(center); copy.scale.multiplyScalar(2.45 / max);
    // Center before scale through an outer group; shared materials stay immutable.
    copy.position.multiplyScalar(2.45 / max);
    copy.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
    return copy;
  });
  useEffect(() => { onReady(); }, [onReady]);
  return <primitive object={normalized} dispose={null} />;
}
function supported() {
  try { const canvas = document.createElement('canvas'); const gl = canvas.getContext('webgl2'); if (!gl) return false; gl.getExtension('WEBGL_lose_context')?.loseContext(); return true; } catch { return false; }
}
export default function Viewer3D({ product, hero = false }) {
  const controls = useRef(null), wrapper = useRef(null);
  const [capable] = useState(supported), [visible, setVisible] = useState(true), [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false), [auto, setAuto] = useState(false), [manualImage, setManualImage] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setReduced(media.matches); if (media.matches) setAuto(false); };
    update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    let intersecting = true;
    const update = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; update(); }, { threshold: .05 });
    if (wrapper.current) observer.observe(wrapper.current);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, []);
  const fallback = !capable || failed || manualImage;
  function turn(amount) {
    const c = controls.current; if (!c) return;
    const offset = c.object.position.clone().sub(c.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), amount);
    c.object.position.copy(c.target).add(offset); c.update();
  }
  function zoom(factor) {
    const c = controls.current; if (!c) return;
    const offset = c.object.position.clone().sub(c.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, 2.3, 7));
    c.object.position.copy(c.target).add(offset); c.update();
  }
  const still = <img className="dth-model-still" src={product.imageUrl} alt={`${product.name}: illustrative ${product.category} model in ${product.finish}. Not a manufacturer model.`} />;
  return <section className={`dth-viewer ${hero ? 'dth-viewer-hero' : ''}`} ref={wrapper} aria-label={`${product.name} interactive 3D inspection`}>
    <div className="dth-viewer-top"><span className="dth-live">{fallback ? 'STATIC PREVIEW' : 'INTERACTIVE 3D'}</span><span>ILLUSTRATIVE MODEL</span></div>
    <div className="dth-canvas-wrap" aria-hidden="true">
      {fallback ? still : <SceneBoundary key={product.id} fallback={still} onFailure={() => setFailed(true)}>
        <Canvas shadows dpr={[1, 1.5]} camera={{ position: [3.2, 1.2, 4.1], fov: 39, near: .1, far: 50 }}
          frameloop={auto && visible && !reduced ? 'always' : 'demand'}
          gl={{ antialias: true, alpha: true, powerPreference: 'default' }} fallback={still}
          onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', () => setFailed(true), { once: true }); }}>
          <ambientLight intensity={1.7} />
          <hemisphereLight args={['#ffffff', '#5b6572', 2.4]} />
          <directionalLight position={[3, 5, 4]} intensity={5} castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-3, 1, -3]} intensity={4} color="#d8ecff" />
          <Suspense fallback={null}><Model key={product.modelUrl} url={product.modelUrl} onReady={() => setReady(true)} /></Suspense>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.38, 0]} receiveShadow><planeGeometry args={[30, 30]} /><shadowMaterial transparent opacity={.32} /></mesh>
          <OrbitControls ref={controls} makeDefault enablePan={false} minDistance={2.3} maxDistance={7} minPolarAngle={.08} maxPolarAngle={Math.PI-.08} autoRotate={auto && visible && !reduced} autoRotateSpeed={.8} enableDamping dampingFactor={.12} />
        </Canvas>
      </SceneBoundary>}
      {!fallback && !ready && <div className="dth-scene-loading">Loading model…</div>}
    </div>
    <div className="dth-viewer-bottom"><span>{fallback ? '3D unavailable or disabled. Product details remain accessible.' : 'Drag to rotate · Scroll / pinch to zoom'}</span><span>GLB / WEBGL</span></div>
    <div className="dth-viewer-controls" aria-label="3D keyboard-accessible controls">
      <button disabled={fallback || !ready} onClick={() => turn(-.3)} aria-label="Rotate model left">↶</button>
      <button disabled={fallback || !ready} onClick={() => turn(.3)} aria-label="Rotate model right">↷</button>
      <button disabled={fallback || !ready} onClick={() => zoom(.86)} aria-label="Zoom in">＋</button>
      <button disabled={fallback || !ready} onClick={() => zoom(1.16)} aria-label="Zoom out">−</button>
      <button disabled={fallback || !ready} onClick={() => { controls.current?.reset(); setAuto(false); }}>Reset</button>
      <button disabled={fallback || !ready || reduced} aria-pressed={auto} onClick={() => setAuto(a => !a)}>{auto ? 'Pause' : 'Auto'}</button>
      {capable && !failed && <button aria-pressed={manualImage} onClick={() => { setManualImage(v => !v); setReady(false); }}>{manualImage ? 'View 3D' : 'Image'}</button>}
    </div>
  </section>;
}
