import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useProfiledModel } from '../product/3d/useProfiledModel';
import { useProduct3DProfile } from '../product/3d/useProduct3DProfile';
import { frameDistance } from '../product/inspection.logic.mjs';
import { defaultPresentation21, getPresentation21, isPresentationModel21 } from '../../../../shared/productPresentation21.mjs';
import { presentationFromBounds21, capturedCamera21 } from './presentationMath21.mjs';
import './presentation21.css';

class Boundary21 extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error){this.props.onFailure(error?.message||'Unable to display the 3D model.');}
  render(){return this.state.failed?null:this.props.children;}
}
function Environment21({onFailure}) {
  const {gl,scene,invalidate}=useThree();
  useEffect(()=>{
    const previous=scene.environment,intensity=scene.environmentIntensity;
    let room,generator,target;
    const lost=event=>{event.preventDefault();onFailure('WebGL context was lost. Retry after closing other heavy 3D tabs.');};
    gl.domElement.addEventListener('webglcontextlost',lost);
    try{room=new RoomEnvironment();generator=new THREE.PMREMGenerator(gl);target=generator.fromScene(room,.04);scene.environment=target.texture;scene.environmentIntensity=.7;invalidate();}
    catch(error){onFailure(error.message||'Unable to prepare the environment.');}
    finally{room?.dispose();generator?.dispose();}
    return()=>{gl.domElement.removeEventListener('webglcontextlost',lost);scene.environment=previous;scene.environmentIntensity=intensity;target?.dispose();};
  },[gl,scene,invalidate,onFailure]);
  return <><ambientLight intensity={.28}/><hemisphereLight args={['#ffffff','#2b343b',.65]}/><directionalLight position={[-4,5,5]} intensity={2}/><directionalLight position={[4,1,-3]} intensity={1.25}/></>;
}
function Camera21({fit,settings,motion,interactive,api,resetToken}) {
  const {gl,camera,size,invalidate}=useThree(),ref=useRef(null),paused=useRef(false);
  const flags=useRef({});flags.current={motion,spin:settings.spin.enabled,seconds:settings.spin.secondsPerTurn};
  const distance=frameDistance(size.width,size.height,fit.camera.frameRadius,fit.camera.fov);
  const reset=useCallback(()=>{
    const orbit=ref.current;if(!orbit)return;
    const front=fit.camera.presets.front,ratio=distance/fit.camera.referenceDistance;
    camera.up.set(0,1,0);camera.fov=fit.camera.fov;camera.updateProjectionMatrix();
    orbit.target.fromArray(front.target);camera.position.fromArray(front.position).sub(orbit.target).multiplyScalar(ratio).add(orbit.target);
    orbit.minDistance=Math.max(fit.camera.radius*1.55,distance*.57);orbit.maxDistance=Math.max(orbit.minDistance,distance*1.9);
    orbit.autoRotate=false;orbit.update(0);orbit.saveState();paused.current=false;invalidate();
  },[camera,distance,fit.camera,invalidate]);
  const resetRef=useRef(reset);resetRef.current=reset;
  useEffect(()=>{
    const orbit=new OrbitControls(camera,gl.domElement);ref.current=orbit;
    orbit.enabled=interactive;orbit.enablePan=false;orbit.enableZoom=interactive;orbit.enableDamping=false;
    orbit.minPolarAngle=THREE.MathUtils.degToRad(25);orbit.maxPolarAngle=THREE.MathUtils.degToRad(155);
    orbit.rotateSpeed=.8;orbit.zoomSpeed=.8;
    const start=()=>{paused.current=true;orbit.autoRotate=false;};const change=()=>invalidate();
    orbit.addEventListener('start',start);orbit.addEventListener('change',change);resetRef.current();
    if(api)api.current={reset:()=>resetRef.current(),capture:()=>capturedCamera21(camera.position.toArray(),orbit.target.toArray(),frameDistance(size.width,size.height,1.35,36)),resume:()=>{paused.current=false;invalidate();}};
    return()=>{if(api)api.current=null;orbit.removeEventListener('start',start);orbit.removeEventListener('change',change);orbit.dispose();ref.current=null;};
  },[camera,gl,interactive,api,invalidate,size.width,size.height]);
  // Editing an orientation/offset does not reload the GLB. Camera changes intentionally reset the view.
  useEffect(()=>{resetRef.current();},[settings.camera.yawDeg,settings.camera.pitchDeg,settings.camera.zoom,settings.scale,size.width,size.height,resetToken]);
  useEffect(()=>{paused.current=false;invalidate();},[settings.spin.enabled,settings.spin.secondsPerTurn,motion,invalidate]);
  useFrame((_,dt)=>{
    const orbit=ref.current;if(!orbit)return;const f=flags.current;
    orbit.autoRotate=!!(f.motion&&f.spin&&!paused.current);orbit.autoRotateSpeed=60/f.seconds;
    if(orbit.autoRotate){orbit.update(Math.min(dt,.05));invalidate();}
  });
  return null;
}
function Body21({product,settings,onReady,onFailure,motion,interactive,api,resetToken}) {
  // Stable loader identity. Unsaved slider edits MUST NOT parse the million-triangle GLB again.
  const base=useMemo(()=>({...product,presentation3d:undefined}),[product.id,product.modelUrl]);
  const selection=useProduct3DProfile(base),asset=useProfiledModel(base,selection,onFailure);
  const {invalidate}=useThree();
  const fit=useMemo(()=>{
    if(!asset?.measured)return null;
    return presentationFromBounds21({min:asset.measured.box.min.toArray(),max:asset.measured.box.max.toArray()},asset.measured.normalization,settings,frameDistance);
  },[asset,settings]);
  useEffect(()=>{
    if(!asset?.scene)return;let live=true,reported=false;const undo=[];
    asset.scene.traverse(node=>{if(!node.isMesh)return;const prior=node.onAfterRender;
      node.onAfterRender=function(...args){prior?.apply(this,args);if(live&&!reported){reported=true;queueMicrotask(()=>{if(live)onReady(asset.report);});}};
      undo.push(()=>{node.onAfterRender=prior;});});invalidate();
    return()=>{live=false;undo.forEach(fn=>fn());};
  },[asset,onReady,invalidate]);
  useEffect(()=>{invalidate();},[fit,invalidate]);
  if(!asset||!fit)return null;
  return <><group scale={fit.scale} rotation={fit.rotation} position={fit.center}><group position={fit.offset}><primitive object={asset.scene} dispose={null}/></group></group>
    <Camera21 fit={fit} settings={settings} motion={motion} interactive={interactive} api={api} resetToken={resetToken}/></>;
}
export default function ProductPresentationPreview21({product,settings:input,motion=true,interactive=true,api,onReady,onError,resetToken=0}) {
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[hidden,setHidden]=useState(()=>document.hidden),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const callbacks=useRef({onReady,onError});callbacks.current={onReady,onError};
  const settings=useMemo(()=>input||getPresentation21(product)||defaultPresentation21(product.modelUrl),[input,product.presentation3d,product.modelUrl]);
  const loaded=useCallback(report=>{setReady(true);callbacks.current.onReady?.(report);},[]);
  const failed=useCallback(message=>{setReady(false);setError(message||'Unable to display this model.');callbacks.current.onError?.(message);},[]);
  useEffect(()=>{setReady(false);setError('');},[product.id,product.modelUrl]);
  useEffect(()=>{const update=()=>setHidden(document.hidden),m=matchMedia('(prefers-reduced-motion: reduce)'),motionChanged=()=>setReduced(m.matches);
    document.addEventListener('visibilitychange',update);m.addEventListener('change',motionChanged);return()=>{document.removeEventListener('visibilitychange',update);m.removeEventListener('change',motionChanged);};},[]);
  const valid=isPresentationModel21(product.modelUrl),show=valid&&!error;
  useEffect(()=>{if(!show||ready)return;const t=setTimeout(()=>failed('The 3D model took too long to load. Check the model and retry.'),60000);return()=>clearTimeout(t);},[show,ready,attempt,failed]);
  return <div className={`dth-presentation-view21 ${interactive?'is-editor':'is-card'}`} data-ready={ready} role="group" aria-label={`${product.name}: 3D preview`}>
    {show&&<Boundary21 key={`${product.modelUrl}:${attempt}`} onFailure={failed}><Canvas dpr={[1,interactive?1.5:1]} frameloop="demand" camera={{position:[0,0,6],fov:36,near:.05,far:250}}
      gl={{antialias:true,alpha:true,powerPreference:'default'}} onCreated={({gl})=>{gl.toneMapping=THREE.NeutralToneMapping;gl.toneMappingExposure=1;gl.outputColorSpace=THREE.SRGBColorSpace;}}>
      <Environment21 onFailure={failed}/><Suspense fallback={null}><Body21 product={product} settings={settings} motion={motion&&!hidden&&!reduced} interactive={interactive} onReady={loaded} onFailure={failed} api={api} resetToken={resetToken}/></Suspense>
    </Canvas></Boundary21>}
    {(!ready||!valid)&&<div className="dth-presentation-overlay21" role="status"><span>{error||(!valid?'This product has no supported GLB URL.':'Preparing interactive 3D…')}</span>
      {interactive&&error&&<button type="button" onClick={()=>{setError('');setReady(false);setAttempt(n=>n+1);}}>Retry 3D</button>}</div>}
  </div>;
}
