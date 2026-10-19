import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useProfiledModel, clearProfiledModelCache } from './3d/useProfiledModel';
import { PRODUCT_VIEW } from './productDecision.logic.mjs';
import { frameDistance } from './inspection.logic.mjs';
import { createProfileInspection } from './3d/profileCamera.mjs';
import { createStudyClock } from './advanced/study.logic.mjs';
import { attachStudyEffects } from './advanced/studyShaders.mjs';


export { clearProfiledModelCache as clearProductModel };
const demoRGB = [[215,245,92],[165,174,183],[37,43,51],[22,25,29],[232,124,70],[125,176,203],[200,187,165],[125,163,177]];
function Asset({ product, onReady, onFailure, onCapabilities, onProgress, mode, effectCommand, motion, active, markerRoot, study, profileSelection, onAssetReport }) {
  const asset = useProfiledModel(product, profileSelection, onFailure);
  const scene = asset?.scene;
  const { gl, camera, size, invalidate } = useThree();
  const [fit, setFit] = useState(null);
  const rig = useRef(null), options = useRef({});
  options.current = { mode, motion, active, onCapabilities, onProgress };
  useLayoutEffect(() => {
    if (!scene || !asset) return;
    const presentation = asset.presentation;
    const profile = asset.profile;
    let live = true, reported = false;
    const callbacks = [], originals = new Map();
    const previousError = gl.debug.onShaderError;
    let diagnostic;
    try {
      // Bounds, profile identity and positions were validated before mounting this scene.
      // Do not remeasure an asset already parented under normalized transforms.
      onAssetReport(asset.report);
      let meshes = 0;
      scene.traverse(object => {
        if (!object.isMesh || !object.geometry?.attributes?.position?.count) return;
        meshes++;
        const previous = object.onAfterRender;
        object.onAfterRender = function (...args) {
          previous?.apply(this, args);
          if (!reported && live) { reported = true; queueMicrotask(() => { if (live) onReady(); }); }
        };
        callbacks.push(() => { object.onAfterRender = previous; });
        const known = /^\/models\/dth-demo\/(apex|vector|touring|studio)-(suspension|wheels|exhausts|mirrors|brakes)\.glb$/.test(product.modelUrl);
        if (!known) return;
        for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
          if (!mat?.color || mat.map || originals.has(mat)) continue;
          const rgb = demoRGB.find(values => ['r','g','b'].every((key, i) => Math.abs(mat.color[key] - values[i] / 255) < 1e-6));
          if (rgb) { originals.set(mat, mat.color.clone()); mat.color.setRGB(...rgb.map(v => v / 255), THREE.SRGBColorSpace); }
        }
      });
      if (!meshes) throw new Error('No renderable meshes.');
      const wantsEffects = !profile || profile.modes.surface || profile.modes.technical;
      const effects = wantsEffects ? attachStudyEffects(scene, presentation.heightRange)
        : {available:false,reason:'Optional study modes disabled in this product profile.',dispose(){}};
      rig.current = { effects, hotspots: presentation.hotspots,
        capabilities: { effects: effects.available,
          surface: effects.available && (!profile || profile.modes.surface),
          technical: effects.available && (!profile || profile.modes.technical),
          hotspots: presentation.hotspots, camera: presentation.camera, reason: effects.reason },
        reportTime:0, projectionTime:0, lastProgress:-1 };
      options.current.onCapabilities(rig.current.capabilities);
      diagnostic = (...args) => {
        previousError?.(...args);
        queueMicrotask(() => {
          if (!live || !rig.current?.effects.available) return;
          rig.current.effects.dispose();
          rig.current.effects = { available:false, dispose(){} };
          rig.current.capabilities = {...rig.current.capabilities, effects:false, surface:false, technical:false, reason:'Optional study shader unavailable. Ordinary 3D still works.'};
          options.current.onCapabilities(rig.current.capabilities); study.current.mode('explore', {}, false); invalidate();
        });
      };
      gl.debug.onShaderError = diagnostic;
      setFit(presentation); invalidate();
    } catch (error) { onFailure(error.message || 'Unable to prepare product presentation.'); }
    return () => {
      live = false; rig.current?.effects.dispose(); rig.current = null;
      if(gl.debug.onShaderError === diagnostic) gl.debug.onShaderError = previousError;
      callbacks.forEach(fn => fn()); originals.forEach((color, mat) => mat.color.copy(color));
    };
  }, [scene, asset, product.modelUrl, onReady, onFailure, onAssetReport, gl, invalidate, study]);
  useEffect(() => {
    if (!rig.current) return;
    study.current.mode(mode, rig.current.capabilities, motion);
    if (!motion) study.current.settle();
    if (mode !== 'hotspots') markerRoot.current?.querySelectorAll('[data-hotspot]').forEach(n => { n.hidden = true; });
    invalidate();
  }, [mode, motion, fit, invalidate, study, markerRoot]);
  useEffect(() => {
    if (!effectCommand || !rig.current) return;
    if(effectCommand.type === 'replay') study.current.replay(motion);
    if(effectCommand.type === 'scrub') study.current.scrub(effectCommand.value);
    invalidate();
  }, [effectCommand, invalidate, study]);
  const scratch = useRef({ point:new THREE.Vector3(), projected:new THREE.Vector3(), direction:new THREE.Vector3(), ray:new THREE.Raycaster() });
  useFrame((_, delta) => {
    const r = rig.current;
    if (!r) return;
    const state = study.current.tick(delta, {active, motion});
    r.effects.update?.(state);
    r.reportTime += Math.min(Math.max(delta, 0), .05);
    if (r.reportTime >= .10 || (!state.busy && r.lastProgress !== state.progress)) {
      r.reportTime = 0; r.lastProgress = state.progress; options.current.onProgress(state.progress);
    }
    if(active && state.busy) invalidate();
    r.projectionTime += Math.min(Math.max(delta, 0), .05);
    if(mode === 'hotspots' && active && markerRoot.current && (r.projectionTime >= .06 || !state.busy)) {
      r.projectionTime = 0;
      const {point,projected,direction,ray} = scratch.current;
      scene.updateWorldMatrix(true,true);camera.updateMatrixWorld();
      for(const hot of r.hotspots) {
        const node=markerRoot.current.querySelector(`[data-hotspot="${hot.id}"]`); if(!node)continue;
        point.fromArray(hot.position); projected.copy(point).project(camera);
        const distance=point.distanceTo(camera.position); direction.copy(point).sub(camera.position).normalize();
        ray.set(camera.position,direction);ray.near=.01;ray.far=distance+.025;
        const hit=ray.intersectObject(scene,true)[0];
        const visible=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.94&&Math.abs(projected.y)<.94&&(!hit||hit.distance>=distance-.035);
        node.hidden=!visible;
        node.style.left=`${(projected.x*.5+.5)*size.width}px`;
        node.style.top=`${(-projected.y*.5+.5)*size.height}px`;
      }
    }
  });
  if (!scene || !fit) return null;
  return <group scale={fit.scale} rotation={fit.rotation} position={fit.center}><group position={fit.offset}><primitive object={scene} dispose={null}/></group></group>;
}
function Lighting({ onFailure, study, lightAngle }) {
  const { gl, scene, invalidate } = useThree();
  const lamp=useRef(null);
  useEffect(()=>invalidate(),[lightAngle,invalidate]);
  useFrame(() => { if(!lamp.current)return;const surface=study.current.read().surface;const angle=(Number.isFinite(lightAngle)?lightAngle:0)*Math.PI/180;lamp.current.position.set(-4+Math.sin(angle)*5,5,5+Math.cos(angle)*surface);lamp.current.intensity=2+surface*.35; });
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
    } catch (error) { onFailure(error.message || 'Unable to prepare product presentation.'); }
    finally { room?.dispose(); generator?.dispose(); }
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', lost);
      scene.environment = prior; scene.environmentIntensity = priorIntensity; target?.dispose();
    };
  }, [gl, scene, invalidate, onFailure]);
  return <><ambientLight intensity={.28}/><hemisphereLight args={['#ffffff','#2b343b',.65]}/>
    <directionalLight ref={lamp} position={[-4,5,5]} intensity={2}/><directionalLight position={[4,1,-3]} intensity={1.25}/></>;
}
function Controls({ api, active, ready, motion, spin, inspect, onManual, capabilities }) {
  const { gl, camera, size, invalidate } = useThree();
  const control = useRef(null), controller = useRef(createProfileInspection(frameDistance(800,600)));
  const appliedProfile = useRef(null);
  const flags = useRef({}), dragging = useRef(false), applying = useRef(false);
  flags.current = { active, ready, motion, spin, inspect, capabilities };
  const apply = () => {
    if (!control.current) return;
    const pose = controller.current.read();
    applying.current = true;
    control.current.target.fromArray(controller.current.readTarget());
    camera.position.setFromSpherical(new THREE.Spherical(pose.radius, pose.phi, pose.theta)).add(control.current.target);
    camera.lookAt(control.current.target); control.current.update(); camera.updateMatrixWorld();
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
      const hotspot = name && typeof name === 'object' && name.type === 'hotspot' ? state.capabilities.hotspots.find(item => item.id === name.id) : null;
      const accepted = hotspot ? controller.current.focus(hotspot.position, state.active && state.ready, hotspot.focus) : controller.current.command(name, state.active && state.ready);
      if (!accepted) return false;
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
    const settings = capabilities.camera;
    if (settings && appliedProfile.current !== settings) {
      controller.current.configure(settings);
      appliedProfile.current = settings;
    }
    camera.fov = settings?.fov ?? PRODUCT_VIEW.fov;
    camera.updateProjectionMatrix();
    controller.current.reframe(frameDistance(size.width, size.height, settings?.radius ?? PRODUCT_VIEW.radius, camera.fov));
    const range = controller.current.limits();
    if (control.current) { control.current.minDistance = range.min; control.current.maxDistance = range.max; }
    applyRef.current(); invalidate();
  }, [size.width, size.height, capabilities.camera, camera, invalidate]);
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
  }, -1);
  return null;
}
export default function ProductDecisionScene(props) {
  const study=useRef(createStudyClock());
  return <Canvas dpr={[1, props.eco ? 1 : PRODUCT_VIEW.maxDpr]} frameloop="demand"
    camera={{ position:[0,0,6], fov:PRODUCT_VIEW.fov, near:.05, far:250 }}
    gl={{ antialias:true, alpha:true, powerPreference:'default' }}
    onCreated={({gl}) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1; gl.outputColorSpace = THREE.SRGBColorSpace; }}>
    <Lighting onFailure={props.onFailure} study={study} lightAngle={props.lightAngle}/>
    <Suspense fallback={null}><Asset {...props} study={study}/></Suspense>
    <Controls {...props}/>
  </Canvas>;
}
