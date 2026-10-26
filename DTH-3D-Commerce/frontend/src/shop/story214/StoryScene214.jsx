import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useStartupWebGL } from '../../experience/loader/StartupRenderContext.jsx';
import { hasWebGL } from '../../experience/interaction/useExperiencePolicy';
import { ASSET_LIMITS, fetchModelBytes, inspectGLB } from '../product/3d/modelValidation.mjs';
import { inspectProductGeometry } from '../product/3d/profileTransform.mjs';
import { presentationFromBounds21 } from '../presentation21/presentationMath21.mjs';
import { getPresentation21, defaultPresentation21, isPresentationModel21 } from '../../../../shared/productPresentation21.mjs';
import { STORY214, quality214 } from './story214.config.mjs';
import { camera214 } from './story214.logic.mjs';
import { createByteCache214, disposeStoryAsset214 } from './byteCache214.mjs';

class StoryBoundary214 extends Component {
  state={error:false};
  static getDerivedStateFromError(){return {error:true};}
  componentDidCatch(error){this.props.onError(error?.message||'The 3D renderer could not start.');}
  render(){return this.state.error?null:this.props.children;}
}
function Environment214({onError}) {
  const {gl,scene,invalidate}=useThree();
  useEffect(()=>{
    const previous=scene.environment,intensity=scene.environmentIntensity;
    let room,generator,target;
    const lost=e=>{e.preventDefault();onError('3D graphics were interrupted. Close other heavy 3D tabs, then retry.');};
    gl.domElement.addEventListener('webglcontextlost',lost);
    try {
      room=new RoomEnvironment();generator=new THREE.PMREMGenerator(gl);target=generator.fromScene(room,.04);
      scene.environment=target.texture;scene.environmentIntensity=.7;invalidate();
    } catch(e){onError(e.message||'Unable to prepare the 3D environment.');}
    finally{room?.dispose();generator?.dispose();}
    return()=>{gl.domElement.removeEventListener('webglcontextlost',lost);scene.environment=previous;scene.environmentIntensity=intensity;target?.dispose();};
  },[gl,scene,invalidate,onError]);
  // Fixed Original presentation; no customer-facing lighting controls or material rewrites.
  return <><ambientLight intensity={.28}/><hemisphereLight args={['#ffffff','#2b343b',.65]}/>
    <directionalLight position={[-4,5,5]} intensity={2}/><directionalLight position={[4,1,-3]} intensity={1.25}/></>;
}
function CameraRig214({clock,settings,motion,rig}) {
  const {camera,size,invalidate}=useThree();
  useEffect(()=>clock.subscribe(()=>{if(!document.hidden)invalidate();}),[clock,invalidate]);
  useEffect(()=>{const update=()=>{if(!document.hidden)invalidate();};document.addEventListener('visibilitychange',update);invalidate();return()=>document.removeEventListener('visibilitychange',update);},[invalidate]);
  useFrame(()=>{
    const frame=clock.read();if(frame.left<0)return;
    const pose=camera214(frame,settings[frame.left],settings[frame.right],size.width,size.height,motion);
    rig.current=pose;camera.up.set(0,1,0);camera.position.fromArray(pose.position);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  },-2);
  return null;
}
function Asset214({product,index,settings,cache,limits,clock,rig,onStatus}) {
  const [owned,setOwned]=useState(null),outer=useRef(null),{invalidate}=useThree();
  useEffect(()=>{
    let live=true,parsed=null;const controller=new AbortController();setOwned(null);
    const report=(state,error='',stats=null)=>{if(live)onStatus(product.id,{url:product.modelUrl,state,error,stats});};
    async function load(){
      if(!isPresentationModel21(product.modelUrl))throw new Error('This product has no supported local GLB. Open its details for product information.');
      report('loading');
      const bytes=await cache.get(product.modelUrl,{signal:controller.signal});if(!live)return;
      inspectGLB(bytes,limits);
      const manager=new THREE.LoadingManager();
      manager.setURLModifier(url=>{if(url.startsWith('blob:'))return url;throw new Error('External model resources are not allowed. Embed textures in the GLB.');});
      const loader=new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
      // Isolate compressed buffers from the raw-byte cache before parsing.
      parsed=await loader.parseAsync(bytes.slice().buffer,'');
      if(!live){disposeStoryAsset214(parsed);parsed=null;return;}
      const measured=inspectProductGeometry(parsed.scene,limits);
      setOwned({gltf:parsed,measured});report('prepared','',{bytes:bytes.byteLength,triangles:measured.triangles,vertices:measured.vertices});invalidate();
    }
    void load().catch(error=>{if(parsed){disposeStoryAsset214(parsed);parsed=null;}if(live&&error.name!=='AbortError')report('error',error.code==='size'?`This model exceeds the ${limits.bytes/1048576} MiB Story budget.`:(error.message||'Unable to load this model.'));});
    return()=>{live=false;controller.abort();disposeStoryAsset214(parsed);parsed=null;};
  },[product.id,product.modelUrl,cache,limits,invalidate,onStatus]);
  const fit=useMemo(()=>owned?presentationFromBounds21({min:owned.measured.box.min.toArray(),max:owned.measured.box.max.toArray()},owned.measured.normalization,settings):null,[owned,settings]);
  useEffect(()=>{invalidate();},[fit,invalidate]);
  useFrame(()=>{
    const group=outer.current,pose=rig.current;if(!group||!pose)return;
    const f=clock.read(),left=index===f.left,right=index===f.right&&f.right!==f.left;
    group.visible=left?(f.mix<.9999):right&&f.mix>.0001;if(!group.visible)return;
    const travel=left?pose.outgoing:pose.incoming,weight=left?1-f.mix:f.mix;
    group.position.set(pose.right[0]*travel,.12*(1-weight),pose.right[2]*travel);
    group.scale.setScalar(.94+.06*weight);
  },-1);
  if(!owned||!fit)return null;
  return <group ref={outer} visible={false}><group scale={fit.scale} rotation={fit.rotation} position={fit.center}>
    <group position={fit.offset}><primitive object={owned.gltf.scene} dispose={null}/></group>
  </group></group>;
}
function Pair214({products,clock,cache,limits,settings,motion,onStatus,retries}) {
  const [pair,setPair]=useState(()=>[clock.read().left,clock.read().right]),lastPair=useRef(pair),rig=useRef(null);
  useEffect(()=>{const update=f=>{if(lastPair.current[0]!==f.left||lastPair.current[1]!==f.right){lastPair.current=[f.left,f.right];setPair(lastPair.current);}};update(clock.read());return clock.subscribe(update);},[clock]);
  return <><CameraRig214 clock={clock} settings={settings} motion={motion} rig={rig}/>
    {[...new Set(pair)].filter(i=>i>=0&&products[i]).map(i=><Asset214 key={`${products[i].id}:${products[i].modelUrl}:${retries[products[i].id]||0}`}
      index={i} product={products[i]} settings={settings[i]} cache={cache} limits={limits} clock={clock} rig={rig} onStatus={onStatus}/>)}</>;
}
export default function StoryScene214({products,clock,compact,motion,onStatus,api}) {
  const q=quality214(compact),limits=useMemo(()=>({...ASSET_LIMITS,...q}),[q]);
  const [cache,setCache]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[retries,setRetries]=useState({});
  const {allow3D,capable}=useStartupWebGL(hasWebGL);
  const failed=useCallback(message=>setError(message||'Unable to display interactive 3D.'),[]);
  const settings=useMemo(()=>products.map(p=>getPresentation21(p)||defaultPresentation21(p.modelUrl)),[products]);
  useEffect(()=>{
    const pool=createByteCache214({maxBytes:STORY214.rawCacheMiB*1048576,maxEntries:STORY214.rawCacheEntries,concurrency:STORY214.maxConcurrentDownloads,
      load:async(url,signal)=>{
        const controller=new AbortController();let timedOut=false;
        const abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
        const timer=setTimeout(()=>{timedOut=true;controller.abort();},STORY214.loadingTimeoutMs);
        try{return await fetchModelBytes(url,{signal:controller.signal,maximum:limits.bytes});}
        catch(e){if(timedOut)throw new Error('Model download timed out. Check the connection and retry.');throw e;}
        finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
      }});
    setCache(pool);return()=>pool.close();
  },[limits]);
  useEffect(()=>{
    if(!api)return;
    api.current={retry(id){const p=products.find(p=>p.id===id);if(p)cache?.invalidate(p.modelUrl);setError('');setAttempt(n=>n+1);setRetries(r=>({...r,[id]:(r[id]||0)+1}));},stats:()=>cache?.stats()};
    return()=>{api.current=null;};
  },[api,cache,products]);
  return <div className="dth-story214-canvas" aria-label="Full-detail 3D product stage" data-quality={compact?'high':'ultra'}>
    {allow3D&&cache&&!error&&<StoryBoundary214 key={attempt} onError={failed}><Canvas dpr={[1,q.dpr]} frameloop="demand"
      camera={{position:[0,0,6],fov:36,near:.05,far:250}} gl={{antialias:true,alpha:true,powerPreference:'high-performance'}}
      onCreated={({gl})=>{gl.toneMapping=THREE.NeutralToneMapping;gl.toneMappingExposure=1;gl.outputColorSpace=THREE.SRGBColorSpace;}}>
      <Environment214 onError={failed}/><Suspense fallback={null}><Pair214 products={products} clock={clock} cache={cache} limits={limits} settings={settings} motion={motion} onStatus={onStatus} retries={retries}/></Suspense>
    </Canvas></StoryBoundary214>}
    {(error||capable===false)&&<div className="dth-story214-graphics-error" role="status"><p>{error||'Interactive 3D is unavailable in this browser.'}</p>
      {capable!==false&&<button type="button" onClick={()=>{setError('');setAttempt(n=>n+1);}}>Retry 3D</button>}</div>}
  </div>;
}
