import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useOwnedModel } from '../world/useOwnedModel';
import { createProductRig } from '../world/apexRig.mjs';
import { STORY_HERO, advanceStoryTurn, fitStoryDistance } from './storyHero.config.mjs';
import { createSurfaceEngine } from './effects/surfaceMotion.mjs';
import { attachSurfaceEffects } from './effects/surfaceShaders.mjs';

function Environment({ onFailure }) {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    let room, generator, environment;
    const previous = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    try {
      room = new RoomEnvironment();
      generator = new THREE.PMREMGenerator(gl);
      environment = generator.fromScene(room, 0.04);
      scene.environment = environment.texture;
      scene.environmentIntensity = 0.8;
      invalidate();
    } catch {
      onFailure();
    } finally {
      room?.dispose(); generator?.dispose();
    }
    return () => {
      scene.environment = previous;
      scene.environmentIntensity = previousIntensity;
      environment?.dispose();
    };
  }, [gl, scene, invalidate, onFailure]);
  return <>
    <ambientLight intensity={0.18} />
    <directionalLight position={[-4, 5, 5]} intensity={2.5} />
    <directionalLight position={[4, 2, -3]} intensity={1.2} />
    <hemisphereLight args={['#ffffff', '#536471', 0.28]} />
  </>;
}

function Stage({ radius }) {
  const floorY = -radius - 0.18;
  return <group name="dth-story-stationary-stage">
    <mesh position={[0, 0, -radius * 0.42]}>
      <ringGeometry args={[radius * 1.04, radius * 1.04 + 0.005, 144]} />
      <meshBasicMaterial color="#7eabb7" transparent opacity={0.40} side={THREE.DoubleSide} />
    </mesh>
    <group position={[0, floorY, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.58, 1]}>
      <mesh>
        <circleGeometry args={[radius * 1.04, 96]} />
        <shaderMaterial transparent depthWrite={false}
          vertexShader={'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'}
          fragmentShader={'varying vec2 vUv;void main(){float r=length((vUv-.5)*2.);float a=(1.-smoothstep(.0,1.,r))*.17;gl_FragColor=vec4(.04,.09,.12,a);}'} />
      </mesh>
      <mesh position={[0, 0, 0.006]}>
        <ringGeometry args={[radius * 1.04, radius * 1.04 + 0.006, 144]} />
        <meshBasicMaterial color="#6da7b3" transparent opacity={0.62} side={THREE.DoubleSide} />
      </mesh>
    </group>
  </group>;
}

function Product({ product, signal, surface, compact, frameRef, onReady, onFailure }) {
  const raw = useOwnedModel(product.modelUrl, onFailure);
  const [presentation, setPresentation] = useState(null);
  const turn = useRef(null), phase = useRef(0), reset = useRef(0);
  const warmFrames = useRef(0), reported = useRef(false);
  const { camera, size, gl, invalidate } = useThree();

  useLayoutEffect(() => {
    if (!raw) return;
    let rig, effects;
    try {
      // Reuse the project's material correction for the known test asset.
      // Its parsed model belongs to this mount, not to Home / Product Detail.
      rig = createProductRig(raw, new URL(product.modelUrl, window.location.href).pathname);
      rig.root.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(rig.root, true);
      const dimensions = bounds.getSize(new THREE.Vector3());
      const largest = Math.max(dimensions.x, dimensions.y, dimensions.z);
      if (!Number.isFinite(largest) || largest < 1e-6) throw new Error('Empty model');
      const centre = bounds.getCenter(new THREE.Vector3());
      const factor = STORY_HERO.modelSize / largest;
      const radius = dimensions.length() * factor / 2;
      const pivot = new THREE.Group();
      const normalised = new THREE.Group();
      normalised.add(rig.root);
      normalised.position.copy(centre).multiplyScalar(-1);
      pivot.add(normalised);
      pivot.scale.setScalar(factor);
      // Pose lives inside the spinning, centred pivot, never on the stage.
      pivot.rotation.set(...STORY_HERO.rotation);
      pivot.updateMatrixWorld(true);
      const framed = new THREE.Box3().setFromObject(pivot, true);
      const engine = createSurfaceEngine();
      effects = attachSurfaceEffects(rig.root, engine, [framed.min.y, framed.max.y - framed.min.y]);
      surface.supported(Boolean(effects));
      setPresentation({ root: pivot, radius, engine, effects });
      phase.current = 0; reset.current = signal.state.resetSerial;
      warmFrames.current = 0; reported.current = false;
      invalidate();
    } catch {
      effects?.dispose(); rig?.dispose(); onFailure();
    }
    return () => { effects?.dispose(); rig?.dispose(); };
  }, [raw, product.modelUrl, signal, surface, invalidate, onFailure]);

  useLayoutEffect(() => {
    if (!presentation || !size.width || !size.height) return;
    const distance = fitStoryDistance(size.width / size.height, presentation.radius);
    camera.fov = STORY_HERO.cameraFov;
    camera.position.set(0, 0, distance);
    camera.near = 0.1;
    camera.far = Math.max(50, distance + presentation.radius * 8);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [presentation, camera, size.width, size.height, invalidate]);

  useEffect(() => {
    if (!presentation) return;
    const engine = presentation.engine;
    const element = frameRef?.current || gl.domElement.parentElement;
    if (!element) return;
    const move = event => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      const gate = signal.state;
      if (compact || !gate.motion || !gate.active || gate.blocked || surface.getSnapshot().mode !== 'reveal') return;
      const rect = gl.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) { engine.leave(); return; }
      engine.move(x * 2 - 1, 1 - y * 2);
      invalidate();
    };
    const leave = () => { engine.leave(); invalidate(); };
    const clear = () => { engine.clear(); invalidate(); };
    const sync = () => {
      const gate = signal.state;
      if (!gate.motion || !gate.active || gate.blocked) engine.clear();
      invalidate();
    };
    const stopSignal = signal.subscribe(sync);
    const stopSurface = surface.subscribe(() => { engine.clear(); invalidate(); });
    element.addEventListener('pointermove', move, { passive: true });
    element.addEventListener('pointerleave', leave, { passive: true });
    element.addEventListener('pointercancel', clear, { passive: true });
    window.addEventListener('blur', clear);
    return () => {
      stopSignal(); stopSurface();
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', leave);
      element.removeEventListener('pointercancel', clear);
      window.removeEventListener('blur', clear);
      engine.clear();
    };
  }, [presentation, frameRef, signal, surface, compact, gl, invalidate]);

  useEffect(() => { presentation?.engine.clear(); }, [presentation, size.width, size.height]);

  useFrame((_, delta) => {
    if (!presentation || !turn.current) return;
    const state = signal.state;
    if (reset.current !== state.resetSerial) {
      reset.current = state.resetSerial; phase.current = 0;
    }
    const previous = phase.current;
    const settings = surface.getSnapshot();
    // Hold the pose in reveal/scan mode. The pointer changes the MASK, not the camera.
    const isFull = !settings.supported || (settings.mode === 'surface' && presentation.engine.state.level >= .999);
    phase.current = advanceStoryTurn(previous, delta, { ...state, motion: state.motion && isFull });
    turn.current.rotation.y = phase.current;

    // Two completed frames precede the ready notification. No fake progress.
    if (!reported.current) {
      if (warmFrames.current >= 2) { reported.current = true; presentation.engine.start(); onReady(); }
      warmFrames.current += 1;
      invalidate();
    }
    const effectState = presentation.engine.step(delta,
      { ...state, pointerAllowed: !compact }, settings, size.width / Math.max(1, size.height));
    presentation.effects?.update(effectState, size.width / Math.max(1, size.height));
    if (effectState.needsFrame || phase.current !== previous) invalidate();
    if (import.meta.env.VITE_EXPERIENCE_TESTS === 'true') {
      gl.domElement.dataset.storySurfaceLevel = String(effectState.level);
      gl.domElement.dataset.storySurfaceMode = effectState.mode;
      gl.domElement.dataset.storySurfacePace = String(effectState.pace);
      gl.domElement.dataset.storySurfaceTime = String(effectState.time);
      gl.domElement.dataset.storyPhase = String(phase.current);
      gl.domElement.dataset.storyBlocked = String(state.blocked);
      gl.domElement.dataset.storyActive = String(state.active);
      gl.domElement.dataset.storyCamera = JSON.stringify(camera.position.toArray());
      gl.domElement.dataset.storyRadius = String(presentation.radius);
      gl.domElement.dataset.storyListeners = String(signal.listenerCount);
    }
  });

  if (!presentation) return null;
  return <>
    <group ref={turn} name="dth-story-centred-turntable">
      <primitive object={presentation.root} dispose={null} />
    </group>
    <Stage radius={presentation.radius} />
  </>;
}

function Lifecycle({ signal, onFailure }) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    const stop = signal.subscribe(invalidate);
    const contextLost = event => { event.preventDefault(); onFailure(); };
    gl.domElement.addEventListener('webglcontextlost', contextLost);
    invalidate();
    return () => {
      stop(); gl.domElement.removeEventListener('webglcontextlost', contextLost);
    };
  }, [gl, signal, invalidate, onFailure]);
  return null;
}

export default function StorySurfaceScene({ product, signal, surface, frameRef, onReady, onFailure, compact }) {
  const failed = useRef(false);
  const fail = useCallback(() => { failed.current = true; onFailure(); }, [onFailure]);
  const ready = useCallback(() => { if (!failed.current) onReady(); }, [onReady]);
  return <Canvas
    frameloop="demand"
    dpr={[1, compact ? 1.25 : STORY_HERO.maxDpr]}
    camera={{ position: [0, 0, 9], fov: STORY_HERO.cameraFov, near: 0.1, far: 50 }}
    gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
    fallback={<span>3D unavailable</span>}
    onCreated={({ gl }) => {
      gl.toneMapping = THREE.NeutralToneMapping;
      gl.toneMappingExposure = 1;
      gl.outputColorSpace = THREE.SRGBColorSpace;
      let shaderFailed = false;
      gl.debug.onShaderError = () => {
        if (shaderFailed) return;
        shaderFailed = true;
        failed.current = true;
        console.error('DTH Story surface shader could not compile. Switching to image view.');
        queueMicrotask(fail);
      };
    }}
  >
    <Environment onFailure={fail} />
    <Product product={product} signal={signal} surface={surface} compact={compact} frameRef={frameRef} onReady={ready} onFailure={fail} />
    <Lifecycle signal={signal} onFailure={fail} />
  </Canvas>;
}
