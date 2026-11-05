import { Component, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { LOGO_MESHES } from '../access181/logo.mesh.mjs';
import { SCENE243, lightStudyPose243, logoPosterPath243, logoSurfaces243, pointerTarget243, scenePermission243, settlePointer243 } from './scene243.logic.mjs';

const POSTER_PATH = logoPosterPath243(LOGO_MESHES);
const BASE_ROTATION = [.4, -.45, -.5];

class SceneBoundary243 extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function CanvasFallback243({ onFailure }) {
  const node = useRef(null);
  useEffect(() => {
    // Fiber mounts fallback DOM inside <canvas> on healthy browsers too. Do not fail unconditionally.
    const canvas = node.current?.parentElement;
    if (!canvas || typeof canvas.getContext !== 'function' || typeof WebGL2RenderingContext === 'undefined') onFailure();
  }, [onFailure]);
  return <span ref={node}>DTH brand study</span>;
}

function LogoStudy243({ policy, focusing, busy, onReady, onFailure }) {
  const { gl, scene, camera, invalidate, size } = useThree();
  const sculpture = useRef(null), strip = useRef(null), fill = useRef(null);
  const latest = useRef({ policy, focusing, busy });
  latest.current = { policy, focusing, busy };
  const flow = useRef({ pointer: { x: 0, y: 0 }, sweep: 0, entered: false, ready: false, frames: 0 });
  useLayoutEffect(() => {
    const parent = sculpture.current;
    if (!parent) return;
    const data = logoSurfaces243(LOGO_MESHES), result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    result.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
    for (const group of data.groups) result.addGroup(group.start, group.count, group.materialIndex);
    result.computeBoundingSphere();
    const materials = [
      new THREE.MeshStandardMaterial({ color: '#8fa6b7', metalness: .88, roughness: .32 }),
      new THREE.MeshStandardMaterial({ color: '#bed8e8', metalness: .9, roughness: .21 }),
      new THREE.MeshStandardMaterial({ color: '#0b2538', metalness: .58, roughness: .38 }),
    ];
    const mesh = new THREE.Mesh(result, materials);
    mesh.onAfterRender = () => {
      const state = flow.current;
      if (!state.ready) { state.ready = true; onReady(); }
    };
    parent.add(mesh);
    invalidate();
    // Effect-owned resources are recreated for StrictMode replay, never memoized after disposal.
    return () => {
      parent.remove(mesh);
      mesh.onAfterRender = () => {};
      result.dispose(); materials.forEach(material => material.dispose());
    };
  }, [invalidate, onReady]);

  useLayoutEffect(() => {
    // Three r184's init allocates new shared LUTs on every call. Initialize once, retaining other scenes' uniforms.
    if (!THREE.UniformsLib.LTC_FLOAT_1) RectAreaLightUniformsLib.init();
    const room = new RoomEnvironment(), generator = new THREE.PMREMGenerator(gl);
    let target;
    try {
      target = generator.fromScene(room, .035, .1, 60);
      scene.environment = target.texture;
      scene.environmentIntensity = .6;
    } finally { room.dispose(); generator.dispose(); }
    return () => { scene.environment = null; target?.dispose(); };
  }, [gl, scene]);
  useLayoutEffect(() => {
    // A single fixed camera; resizing changes projection only, never the authored viewpoint.
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);
    camera.fov = size.width / Math.max(size.height, 1) < .65 ? 40 : 35;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, size.width, size.height]);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.tabIndex = -1;
    const lost = event => { event.preventDefault(); onFailure(); };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, onFailure]);
  useEffect(() => policy.subscribe?.(() => {
    const now = latest.current;
    if (scenePermission243(now.policy, now).run) invalidate();
  }), [policy.subscribe, invalidate]);
  useEffect(() => {
    const running = scenePermission243(policy, { focusing, busy }).run;
    gl.domElement.dataset.a243Running = String(running);
    // Pausing parks the current pose. It does not start a return-to-origin animation.
    if (!policy.hidden) invalidate();
  }, [policy.motion, policy.hidden, policy.paused, policy.reduced, focusing, busy, gl, invalidate]);

  useFrame((_, delta) => {
    const current = latest.current, motion = scenePermission243(current.policy, current).run;
    const state = flow.current;
    state.frames += 1;
    gl.domElement.dataset.a243Frames = String(state.frames);
    if (!state.entered) { state.entered = true; state.sweep = motion ? 0 : SCENE243.sweepSeconds; }
    let continueWork = false;
    if (motion) {
      const target = pointerTarget243(current.policy.pointer?.current);
      const next = settlePointer243(state.pointer, target, delta);
      state.pointer = next;
      state.sweep = Math.min(SCENE243.sweepSeconds, state.sweep + Math.min(Math.max(delta, 0), .05));
      continueWork = !next.settled || state.sweep < SCENE243.sweepSeconds;
    } else state.sweep = SCENE243.sweepSeconds;
    const pose = lightStudyPose243(state.pointer, state.sweep / SCENE243.sweepSeconds);
    if (sculpture.current) sculpture.current.rotation.set(BASE_ROTATION[0] + pose.tiltX, BASE_ROTATION[1] + pose.tiltY, BASE_ROTATION[2]);
    if (strip.current) {
      strip.current.position.set(pose.lightX, pose.lightY, pose.lightZ);
      strip.current.lookAt(0, 0, 0);
      strip.current.intensity = focusing || busy ? 6 : 10;
    }
    if (fill.current) fill.current.lookAt(0, 0, 0);
    gl.domElement.dataset.a243Sleeping = String(!continueWork);
    if (continueWork && !current.policy.hidden) invalidate();
  });

  return <>
    <hemisphereLight args={['#edf8ff', '#17384a', .45]} />
    <rectAreaLight ref={fill} args={['#ffffff', 4.2, 7, 2]} position={[1, 3.7, 4]} />
    <rectAreaLight ref={strip} args={['#287cff', 10, .65, 7]} position={[-3.8, -2.7, 2.4]} />
    <directionalLight color="#cae9ff" intensity={.5} position={[-3, -2, 3]} />
    <group ref={sculpture} position={[-.12, .03, 0]} rotation={BASE_ROTATION}/>
  </>;
}

export default function MachinedScene243({ policy, focusing = false, busy = false }) {
  const id = useId().replaceAll(':', ''), [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const onReady = useCallback(() => { if (mounted.current) setReady(true); }, []);
  const onFailure = useCallback(() => { if (mounted.current) { setReady(false); setFailed(true); } }, []);
  const permission = scenePermission243(policy, { focusing, busy });
  const mount = permission.mount && !failed;
  useEffect(() => { if (!mount) setReady(false); }, [mount]);
  useEffect(() => {
    if (!mount || ready || policy.hidden) return;
    const timer = setTimeout(onFailure, 12000);
    return () => clearTimeout(timer);
  }, [mount, ready, policy.hidden, onFailure]);
  return <div className="a243-scene" data-scene-ready={ready && mount} data-scene-state={failed ? 'unavailable' : !mount ? 'poster' : ready ? 'ready' : 'loading'} aria-hidden="true">
    <svg className="a243-scene-poster" viewBox="0 0 720 860" fill="none" focusable="false">
      <defs>
        <linearGradient id={`${id}-metal`} x1="-2.5" y1="-.4" x2="2.5" y2=".5" gradientUnits="userSpaceOnUse"><stop stopColor="#bccdd9"/><stop offset=".3" stopColor="#829aab"/><stop offset=".53" stopColor="#e7f2f9"/><stop offset=".7" stopColor="#74ace0"/><stop offset="1" stopColor="#b8cfdf"/></linearGradient>
        <linearGradient id={`${id}-edge`} x1="-2" y1="0" x2="2" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#16374d"/><stop offset=".55" stopColor="#287cff"/><stop offset="1" stopColor="#143247"/></linearGradient>
      </defs>
      <g transform="translate(345 430) rotate(-28.6) scale(120)">
        <path d={POSTER_PATH} fill={`url(#${id}-edge)`} transform="translate(-.09 .2)"/>
        <path d={POSTER_PATH} fill={`url(#${id}-metal)`}/>
      </g>
    </svg>
    {mount && <div className="a243-scene-canvas"><SceneBoundary243 onFailure={onFailure}><Canvas
      frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0, 8], fov: 35, near: .1, far: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} fallback={<CanvasFallback243 onFailure={onFailure}/>}
      onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.toneMappingExposure = .95; }}
    ><LogoStudy243 policy={policy} focusing={focusing} busy={busy} onReady={onReady} onFailure={onFailure}/></Canvas></SceneBoundary243></div>}
  </div>;
}
