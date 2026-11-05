import { Component, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Vector2 } from 'three';
import { FIELD244, FIELD_FRAGMENT244, FIELD_VERTEX244, fieldPermission244, fieldTarget244, settleField244 } from './lightField244.logic.mjs';

class FieldBoundary244 extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function Unsupported244({ onFailure }) {
  useEffect(() => { if (typeof WebGL2RenderingContext === 'undefined') onFailure(); }, [onFailure]);
  return null;
}

function SilkField244({ policy, focusing, busy, onReady, onFailure }) {
  const { gl, invalidate, size } = useThree();
  const latest = useRef({ policy, focusing, busy });
  latest.current = { policy, focusing, busy };
  const uniforms = useRef({ uPointer: { value: new Vector2() }, uAspect: { value: 1 }, uEntry: { value: 1 } });
  const flow = useRef({ point: { x: 0, y: 0 }, entry: 0, entered: false, ready: false, frames: 0 });
  useEffect(() => {
    uniforms.current.uAspect.value = size.width / Math.max(size.height, 1);
    invalidate();
  }, [size.width, size.height, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.tabIndex = -1;
    const lost = event => { event.preventDefault(); onFailure(); };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, onFailure]);
  useLayoutEffect(() => {
    const previous = gl.debug.onShaderError;
    const failed = (...args) => {
      if (previous) previous(...args);
      else console.error('DTH light field shader failed to compile.');
      onFailure();
    };
    gl.debug.onShaderError = failed;
    return () => { if (gl.debug.onShaderError === failed) gl.debug.onShaderError = previous; };
  }, [gl, onFailure]);
  useEffect(() => policy.subscribe?.(() => {
    const current = latest.current;
    if (fieldPermission244(current.policy, current).run) invalidate();
  }), [policy.subscribe, invalidate]);
  useEffect(() => {
    gl.domElement.dataset.fieldRunning = String(fieldPermission244(policy, { focusing, busy }).run);
    if (!policy.hidden) invalidate();
  }, [policy.motion, policy.hidden, policy.paused, policy.reduced, focusing, busy, gl, invalidate]);
  useFrame((_, delta) => {
    const current = latest.current, running = fieldPermission244(current.policy, current).run;
    const state = flow.current;
    state.frames += 1;
    gl.domElement.dataset.fieldFrames = String(state.frames);
    if (!state.entered) { state.entered = true; state.entry = running ? 0 : FIELD244.entrySeconds; }
    let pending = false;
    if (running) {
      const next = settleField244(state.point, fieldTarget244(current.policy.pointer?.current), delta);
      state.point = next;
      state.entry = Math.min(FIELD244.entrySeconds, state.entry + Math.min(Math.max(delta, 0), .05));
      pending = !next.settled || state.entry < FIELD244.entrySeconds;
    } else state.entry = FIELD244.entrySeconds;
    uniforms.current.uPointer.value.set(state.point.x, state.point.y);
    uniforms.current.uEntry.value = state.entry / FIELD244.entrySeconds;
    gl.domElement.dataset.fieldSleeping = String(!pending);
    if (pending && !current.policy.hidden) invalidate();
  });
  return <mesh frustumCulled={false} onAfterRender={() => {
    if (!flow.current.ready) { flow.current.ready = true; onReady(); }
  }}>
    <planeGeometry args={[2, 2]} />
    <shaderMaterial uniforms={uniforms.current} vertexShader={FIELD_VERTEX244} fragmentShader={FIELD_FRAGMENT244}
      toneMapped={false} depthTest={false} depthWrite={false}/>
  </mesh>;
}

export default function LightField244({ policy, focusing = false, busy = false }) {
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const onReady = useCallback(() => { if (mounted.current) setReady(true); }, []);
  const onFailure = useCallback(() => { if (mounted.current) { setReady(false); setFailed(true); } }, []);
  const mount = fieldPermission244(policy, { focusing, busy }).mount && !failed;
  useEffect(() => { if (!mount) setReady(false); }, [mount]);
  useEffect(() => {
    if (!mount || ready || policy.hidden) return;
    const timer = setTimeout(onFailure, 12000);
    return () => clearTimeout(timer);
  }, [mount, ready, policy.hidden, onFailure]);
  return <div className="a244-lightfield" aria-hidden="true" data-field-ready={mount && ready}
    data-field-state={failed ? 'unavailable' : !mount ? 'still' : ready ? 'ready' : 'loading'}>
    {mount && <div className="a244-lightfield-canvas"><FieldBoundary244 onFailure={onFailure}>
      <Canvas frameloop="demand" dpr={[1, 1.25]} gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
        camera={{ position: [0, 0, 1], near: .1, far: 2 }} fallback={<Unsupported244 onFailure={onFailure}/>}>
        <SilkField244 policy={policy} focusing={focusing} busy={busy} onReady={onReady} onFailure={onFailure}/>
      </Canvas>
    </FieldBoundary244></div>}
  </div>;
}
