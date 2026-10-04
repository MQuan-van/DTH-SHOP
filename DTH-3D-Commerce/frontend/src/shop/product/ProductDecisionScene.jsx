import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useOwnedModel, clearOwnedModelCache } from '../../experience/world/useOwnedModel';
import { PRODUCT_VIEW } from './productDecision.logic.mjs';
import { createInspection, frameDistance, sphereNormalization } from './inspection.logic.mjs';

export { clearOwnedModelCache as clearProductModel };
const demoRGB = [[215,245,92],[165,174,183],[37,43,51],[22,25,29],[232,124,70],[125,176,203],[200,187,165],[125,163,177]];
function Asset({ product, onReady, onFailure }) {
  const scene = useOwnedModel(product.modelUrl, onFailure);
  const { invalidate } = useThree();
  const [fit, setFit] = useState(null);
  useLayoutEffect(() => {
    if (!scene) return;
    let live = true, reported = false;
    const callbacks = [], originals = new Map();
    try {
      scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(scene);
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const normalization = sphereNormalization(sphere.center.toArray(), sphere.radius);
      let meshes = 0;
      scene.traverse(object => {
        if (!object.isMesh || !object.geometry?.attributes?.position?.count) return;
        meshes++;
        const previous = object.onAfterRender;
        object.onAfterRender = function (...args) {
          previous?.apply(this, args);
          if (!reported && live) {
            reported = true;
            queueMicrotask(() => { if (live) onReady(); });
          }
        };
        callbacks.push(() => { object.onAfterRender = previous; });
        // Only repair the known untextured legacy palette, never recolour a new scanned asset.
        const known = /^\/models\/dth-demo\/(apex|vector|touring|studio)-(suspension|wheels|exhausts|mirrors|brakes)\.glb$/.test(product.modelUrl);
        if (!known) return;
        for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
          if (!mat?.color || mat.map || originals.has(mat)) continue;
          const rgb = demoRGB.find(values => ['r','g','b'].every((key, i) => Math.abs(mat.color[key] - values[i] / 255) < 1e-6));
          if (rgb) { originals.set(mat, mat.color.clone()); mat.color.setRGB(...rgb.map(v => v / 255), THREE.SRGBColorSpace); }
        }
      });
      if (!meshes) throw new Error('No renderable meshes.');
      setFit(normalization); invalidate();
    } catch { onFailure(); }
    return () => { live = false; callbacks.forEach(fn => fn()); originals.forEach((color, mat) => mat.color.copy(color)); };
  }, [scene, product.modelUrl, onReady, onFailure, invalidate]);
  if (!scene || !fit) return null;
  return <group scale={fit.scale}><group position={fit.offset}><primitive object={scene} dispose={null}/></group></group>;
}
function Lighting({ onFailure }) {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const prior = scene.environment, priorIntensity = scene.environmentIntensity;
    let room, generator, target;
    const lost = event => { event.preventDefault(); onFailure(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    try {
      room = new RoomEnvironment(); generator = new THREE.PMREMGenerator(gl);
      target = generator.fromScene(room, .04);
      scene.environment = target.texture; scene.environmentIntensity = .7;
      invalidate();
    } catch { onFailure(); }
    finally { room?.dispose(); generator?.dispose(); }
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', lost);
      scene.environment = prior; scene.environmentIntensity = priorIntensity; target?.dispose();
    };
  }, [gl, scene, invalidate, onFailure]);
  return <><ambientLight intensity={.28}/><hemisphereLight args={['#ffffff','#2b343b',.65]}/>
    <directionalLight position={[-4,5,5]} intensity={2}/><directionalLight position={[4,1,-3]} intensity={1.25}/></>;
}
function Controls({ api, active, ready, motion, spin, inspect, onManual }) {
  const { gl, camera, size, invalidate } = useThree();
  const control = useRef(null), controller = useRef(createInspection(frameDistance(800,600)));
  const flags = useRef({}), dragging = useRef(false), applying = useRef(false);
  flags.current = { active, ready, motion, spin, inspect };
  const apply = () => {
    if (!control.current) return;
    const pose = controller.current.read();
    applying.current = true;
    camera.position.setFromSpherical(new THREE.Spherical(pose.radius, pose.phi, pose.theta));
    camera.lookAt(0,0,0); control.current.update();
    applying.current = false;
  };
  const applyRef = useRef(apply); applyRef.current = apply;
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    orbit.enablePan = false; orbit.enableZoom = false; orbit.enableDamping = false;
    orbit.minPolarAngle = .18; orbit.maxPolarAngle = Math.PI - .18; orbit.rotateSpeed = .9;
    orbit.autoRotate = false; orbit.target.set(0,0,0);
    const readCamera = () => {
      const s = new THREE.Spherical().setFromVector3(camera.position.clone().sub(orbit.target));
      controller.current.sync({ theta: s.theta, phi: s.phi, radius: s.radius });
    };
    const start = () => { dragging.current = true; readCamera(); onManual(); };
    const change = () => { if (!applying.current) readCamera(); invalidate(); };
    const end = () => { dragging.current = false; readCamera(); invalidate(); };
    orbit.addEventListener('start', start); orbit.addEventListener('change', change); orbit.addEventListener('end', end);
    control.current = orbit; applyRef.current();
    api.current = name => {
      const state = flags.current;
      if (!controller.current.command(name, state.active && state.ready)) return false;
      onManual();
      if (!state.motion) controller.current.settle();
      invalidate(); return true;
    };
    return () => {
      orbit.removeEventListener('start',start); orbit.removeEventListener('change',change); orbit.removeEventListener('end',end);
      orbit.dispose(); control.current = null; api.current = null; controller.current.cancel(); dragging.current = false;
    };
  }, [camera, gl, api, invalidate, onManual]);
  useLayoutEffect(() => {
    controller.current.reframe(frameDistance(size.width, size.height));
    const range = controller.current.limits();
    if (control.current) { control.current.minDistance = range.min; control.current.maxDistance = range.max; }
    applyRef.current(); invalidate();
  }, [size.width, size.height, invalidate]);
  useEffect(() => {
    if (control.current) control.current.enabled = active && ready && inspect;
    gl.domElement.style.touchAction = inspect && active ? 'none' : 'pan-y';
    if (!active) { controller.current.cancel(); dragging.current = false; }
    if (!motion) controller.current.settle();
    invalidate();
  }, [active, ready, inspect, motion, spin, gl, invalidate]);
  useFrame((_, delta) => {
    const s = flags.current;
    if (!s.active || !s.ready || dragging.current) return;
    controller.current.tick(delta, { enabled: s.active, motion: s.motion, spin: s.spin && !s.inspect });
    applyRef.current();
    if (controller.current.moving || (s.spin && s.motion && !s.inspect)) invalidate();
  });
  return null;
}
export default function ProductDecisionScene(props) {
  return <Canvas dpr={[1, props.eco ? 1 : PRODUCT_VIEW.maxDpr]} frameloop="demand"
    camera={{ position:[0,0,6], fov:PRODUCT_VIEW.fov, near:.05, far:250 }}
    gl={{ antialias:true, alpha:true, powerPreference:'default' }}
    onCreated={({gl}) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1; gl.outputColorSpace = THREE.SRGBColorSpace; }}>
    <Lighting onFailure={props.onFailure}/>
    <Suspense fallback={null}><Asset product={props.product} onReady={props.onReady} onFailure={props.onFailure}/></Suspense>
    <Controls {...props}/>
  </Canvas>;
}
