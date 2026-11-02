import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {KTX2Loader} from 'three/examples/jsm/loaders/KTX2Loader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {publicAsset,NVX_STAGE} from '../../shop/discovery174/nvx3d/nvx3d.config.mjs';
import {orbitFitBox23,mixPose23,clamp23,readGLBReport23,publicModelPath23,assetKey23,isSystem23} from '../commerce23/spatial23.logic.mjs';

function disposeModel(gltf){
 if(!gltf)return;const geo=new Set(),mats=new Set(),tex=new Set(),images=new Set();
 for(const scene of gltf.scenes||[gltf.scene])scene?.traverse(o=>{if(o.geometry)geo.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){mats.add(m);Object.values(m).forEach(t=>{if(t?.isTexture)tex.add(t);});}o.skeleton?.dispose?.();});
 geo.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());tex.forEach(t=>{if(t.image)images.add(t.image);t.dispose();});images.forEach(i=>i.close?.());
}
function prepare(gltf,spec){
 const orientation=new THREE.Group();orientation.rotation.fromArray([...(spec.rotation||[0,0,0]),'XYZ']);orientation.add(gltf.scene);orientation.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(orientation),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 const longest=Math.max(size.x,size.y,size.z);if(box.isEmpty()||!Number.isFinite(longest)||longest<=1e-8)throw Error('The model has no usable bounds.');
 const scale=4/longest;orientation.scale.setScalar(scale);orientation.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
 const root=new THREE.Group();root.add(orientation);root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root),meshes=[];
 root.traverse(o=>{if(o.isLight)o.visible=false;if(o.isMesh)meshes.push(o);});if(!meshes.length)throw Error('The GLB has no visible meshes.');
 return {root,gltf,bounds,meshes,spec,radius:bounds.getBoundingSphere(new THREE.Sphere()).radius};
}
async function readBytes(response,signal,limit){
 if(!response.ok)throw Error(`Model request failed (HTTP ${response.status}).`);
 const length=Number(response.headers.get('content-length'));if(length>limit)throw Error('Model exceeds the existing NVX byte limit.');
 if(!response.body){const data=await response.arrayBuffer();if(data.byteLength>limit)throw Error('Model exceeds the existing NVX byte limit.');return data;}
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){if(signal.aborted)throw new DOMException('Aborted','AbortError');const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error('Model exceeds the existing NVX byte limit.');chunks.push(value);}}
 catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
 const out=new Uint8Array(size);let at=0;for(const c of chunks){out.set(c,at);at+=c.length;}return out.buffer;
}

import { validateProfile233, slot233, resolveSlot233, layout233, visibleCache233, pickSlot233, isClick233, focusPose233, journey233, mixPose233, posePosition233 } from './hotspots233.logic.mjs';

/** One renderer owned by this stage. No global cache of decoded scenes; materials stay untouched. */
export function createHotspotStage233(host, {
  onStatus=()=>{},onProjection=()=>{},onMetadata=()=>{},onPicked=()=>{},onSelect=()=>{},onView=()=>{},compact=false,
}={}) {
  let disposed=false,visible=true,broken=false,motion=true,interactive=false,blocked=false,authoring='';
  let frameId=0,last=0,width=1,height=1,epoch=0,controller=null,current=null,desired=null,profile=null,journey=null,loading=false;
  let activeSlot='',auto=true,dirty=true,occlusionIndex=0,lastOcclusion=0,pendingOcclusion=0,sideMemory={};
  let visibleIds=[],lastNotice='',note='',down=null;const occlusion=new Map();
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,compact?1.25:1.75));
  renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1;
  const canvas=renderer.domElement;canvas.dataset.spatialVehicle='23.3';canvas.setAttribute('aria-hidden','true');canvas.style.touchAction='pan-y';host.appendChild(canvas);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.01,250),controls=new OrbitControls(camera,canvas);
  controls.enablePan=false;controls.enableZoom=false;controls.enableDamping=true;controls.dampingFactor=.08;controls.rotateSpeed=.65;
  controls.minPolarAngle=.18;controls.maxPolarAngle=Math.PI-.18;controls.autoRotateSpeed=.45;controls.enabled=false;
  camera.position.set(6,3,7);controls.target.set(0,1,0);controls.update();
  scene.add(new THREE.HemisphereLight(0xffffff,0x536476,1.35));
  const key=new THREE.DirectionalLight(0xffffff,2.15);key.position.set(4,7,5);scene.add(key);
  const fill=new THREE.DirectionalLight(0xffffff,1.1);fill.position.set(-5,3,-3);scene.add(fill);
  let environment=null;
  try {const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);try{environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.8;}finally{room.dispose?.();pmrem.dispose();}}catch{ /* Keep the original materials and use neutral direct light. */ }
  const draco=new DRACOLoader().setDecoderPath(publicAsset('decoders/nvx3d/draco/'));
  const ktx2=new KTX2Loader().setTranscoderPath(publicAsset('decoders/nvx3d/basis/'));
  try{ktx2.detectSupport(renderer);}catch(error){draco.dispose();ktx2.dispose();environment?.dispose();controls.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();throw error;}
  const ray=new THREE.Raycaster(),tmp=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
  let renders=0,cpuTotal=0,cpuMax=0,rayTests=0,rayCpuMax=0;
  const bounds=()=>current?{min:current.bounds.min.toArray(),max:current.bounds.max.toArray()}:null;
  function status(phase,message='',extra={}){if(!disposed)onStatus({phase,message,id:desired?.id||null,key:assetKey23(desired),...extra});}
  function announce(message) {
    if(message!==undefined)note=message;message=note;
    const mode=blocked?'blocked':loading?'loading':journey?'transition':authoring?'marking':interactive?'orbit':activeSlot?'focus':'auto';
    const signature=`${mode}:${activeSlot}:${message}`;if(signature===lastNotice)return;lastNotice=signature;
    onView({mode,slot:activeSlot,message});
  }
  const active=()=>!disposed&&!broken&&visible&&!document.hidden;
  function schedule(){if(active()&&!frameId)frameId=requestAnimationFrame(frame);}
  function request(){dirty=true;schedule();}
  function snapshot(){const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);return{radius:s.radius,phi:s.phi,theta:s.theta,target:controls.target.toArray()};}
  function place(p){controls.target.fromArray(p.target);controls.cursor?.copy(controls.target);camera.position.copy(controls.target).add(tmp.setFromSphericalCoords(p.radius,p.phi,p.theta));camera.lookAt(controls.target);camera.updateMatrixWorld();}
  function syncControls(){
    const p=snapshot();controls.autoRotate=false;controls.enableDamping=false;controls.update(0);place(p);controls.update(0);
    controls.enableDamping=motion;controls.enabled=interactive&&!blocked&&!loading&&!journey;
    canvas.style.touchAction=controls.enabled?'none':'pan-y';announce();
  }
  function fullPose(){return current?orbitFitBox23({...bounds(),aspect:width/height,fov:camera.fov,theta:.86,phi:1.20,padding:1.12}):null;}
  function hits(){
    const meshes=current?.meshes.filter(m=>{
      let p=m;while(p){if(!p.visible)return false;p=p.parent;}
      return Array.isArray(m.material)?m.material.some(x=>x.visible!==false&&x.opacity!==0):m.material?.visible!==false&&m.material?.opacity!==0;
    })||[];
    const start=performance.now();const list=ray.intersectObjects(meshes,false);rayTests++;rayCpuMax=Math.max(rayCpuMax,performance.now()-start);return list;
  }
  function segmentClear(a,b) {
    const start=new THREE.Vector3(...a),delta=new THREE.Vector3(...b).sub(start),length=delta.length();if(length<.025)return true;
    ray.set(start,delta.normalize());ray.near=.015;ray.far=Math.max(.016,length-.015);
    return !hits().length;
  }
  function move(pose,{guided=false,seconds=.42}={}) {
    if(!current||loading||blocked||!pose)return false;
    announce('');controls.autoRotate=false;controls.enabled=false;const from=snapshot();
    let legs=guided?journey233(from,pose,bounds()):[{to:pose,seconds}];
    if(guided) {
      // The middle leg orbits outside the model's bounding sphere. Check straight retreat/approach legs.
      const p0=posePosition233(from),p1=posePosition233(legs[0].to),p2=posePosition233(legs[1].to),p3=posePosition233(pose);
      if(!segmentClear(p0,p1)||!segmentClear(p2,p3)){journey=null;auto=false;interactive=true;syncControls();announce('The camera path is obstructed. Rotate the vehicle, or re-author this angle.');request();return false;}
      legs=legs.map((leg,i)=>({...leg,linear:i!==1}));
    }
    journey=motion&&active()?{legs,index:0,from,elapsed:0}:null;
    if(!journey){place(pose);syncControls();}
    occlusion.clear();pendingOcclusion=Object.keys(profile?.anchors||{}).length;announce();request();return true;
  }
  function advance(dt) {
    if(!journey)return;const j=journey,leg=j.legs[j.index];j.elapsed+=dt;const t=Math.min(1,j.elapsed/leg.seconds);
    if(leg.linear){
      const e=t*t*t*(t*(t*6-15)+10),a=posePosition233(j.from),b=posePosition233(leg.to);
      controls.target.fromArray(j.from.target.map((n,i)=>n+(leg.to.target[i]-n)*e));
      camera.position.fromArray(a.map((n,i)=>n+(b[i]-n)*e));camera.lookAt(controls.target);camera.updateMatrixWorld();
    }else place(mixPose233(j.from,leg.to,t));
    if(t>=1){if(++j.index===j.legs.length){journey=null;syncControls();}else{j.from=snapshot();j.elapsed=0;}}
  }
  function resize(){
    if(disposed)return;const rect=host.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));if(w===width&&h===height)return;
    const oldAspect=width/height,wasJourney=!!journey;width=w;height=h;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
    if(current){const p=fullPose();controls.minDistance=Math.max(.35,current.radius*.22);controls.maxDistance=p.radius*2.6;
      if(!interactive&&!activeSlot){journey=null;place(p);}
      else if(activeSlot&&!interactive&&profile?.anchors[activeSlot]){const to=focusPose233(profile.anchors[activeSlot],camera.aspect);journey=null;if(wasJourney)move(to,{guided:true});else place(to);}
      else {journey=null;const q=snapshot();q.radius=clamp23(q.radius*Math.max(.65,Math.min(1.7,oldAspect/camera.aspect)),controls.minDistance,controls.maxDistance);place(q);}
      syncControls();
    }
    occlusion.clear();pendingOcclusion=Object.keys(profile?.anchors||{}).length;request();
  }
  function projections(now) {
    if(!current||loading||!profile||blocked||journey||authoring){visibleIds=[];onProjection([]);return;}
    current.root.updateMatrixWorld(true);camera.updateMatrixWorld();
    // Prioritize one facing point per category, then extras; never raycast all 14 slots every tick.
    const candidates=Object.entries(profile.anchors).filter(([id,a])=>{
      if(activeSlot&&id!==activeSlot)return false;
      const point=current.root.localToWorld(new THREE.Vector3(...a.point)),ndc=point.clone().project(camera);
      const normal=new THREE.Vector3(...a.normal).transformDirection(current.root.matrixWorld);
      return ndc.z>=-1&&ndc.z<=1&&Math.abs(ndc.x)<=1&&Math.abs(ndc.y)<=1&&normal.dot(camera.position.clone().sub(point).normalize())>-.02;
    });
    const categories=new Set(),prioritized=[],extras=[];
    for(const pair of candidates){const cat=slot233(pair[0]).category;if(categories.has(cat))extras.push(pair);else{categories.add(cat);prioritized.push(pair);}}
    const entries=[...prioritized,...extras].slice(0,6);
    if(!entries.length)pendingOcclusion=0;
    if(entries.length&&now-lastOcclusion>=65){
      lastOcclusion=now;const [id,a]=entries[(occlusionIndex++)%entries.length];pendingOcclusion=Math.max(0,pendingOcclusion-1);
      const point=current.root.localToWorld(new THREE.Vector3(...a.point)),direction=point.clone().sub(camera.position),d=direction.length();
      const normal=new THREE.Vector3(...a.normal).transformDirection(current.root.matrixWorld),facing=normal.dot(camera.position.clone().sub(point).normalize())>-.02;
      const ndc=point.clone().project(camera);let show=false;
      if(facing&&d>.03&&ndc.z>=-1&&ndc.z<=1&&Math.abs(ndc.x)<=1&&Math.abs(ndc.y)<=1){ray.set(camera.position,direction.normalize());ray.near=.01;ray.far=Math.max(.011,d-.018);show=!hits().length;}
      occlusion.set(id,{visible:show,camera:camera.position.toArray(),time:now});
    }
    const points=entries.map(([id,a])=>{const point=current.root.localToWorld(new THREE.Vector3(...a.point)),ndc=point.clone().project(camera);return{id,x:(ndc.x*.5+.5)*width,y:(.5-.5*ndc.y)*height,visible:ndc.z>=-1&&ndc.z<=1&&visibleCache233(occlusion.get(id),camera.position.toArray(),now)};});
    const layout=layout233(points,width,height,{active:activeSlot,previousSides:sideMemory});
    for(const p of layout)sideMemory[p.id]=p.side;
    visibleIds=layout.map(p=>p.id);onProjection(layout);
  }
  function frame(now){
    frameId=0;if(!active()){last=0;return;}const dt=last?Math.min((now-last)/1000,.05):1/60;last=now;
    let changed=dirty,moved=false;dirty=false;
    if(journey&&!blocked){advance(dt);changed=true;moved=true;}
    else if(current&&!loading&&!blocked){controls.autoRotate=motion&&auto&&!interactive&&!activeSlot&&!authoring;moved=controls.update(dt)===true;changed=changed||moved||controls.autoRotate;}
    if(moved)pendingOcclusion=Object.keys(profile?.anchors||{}).length;
    if(changed){try{const start=performance.now();renderer.render(scene,camera);const cost=performance.now()-start;renders++;cpuTotal+=cost;cpuMax=Math.max(cpuMax,cost);}catch(e){broken=true;status('error',`Rendering stopped: ${e.message}`,{fatal:true});return;}}
    if(changed||pendingOcclusion>0)projections(now);
    if(dirty||(!blocked&&!loading&&current&&(journey||controls.autoRotate||moved||pendingOcclusion>0)))schedule();
  }
  function clearModel(){if(!current)return;scene.remove(current.root);disposeModel(current.gltf);current=null;}
  async function select(spec){
    if(desired&&assetKey23(desired)===assetKey23(spec)&&(loading||current))return;
    const ticket=++epoch;controller?.abort();controller=new AbortController();const {signal}=controller;
    desired=spec;loading=true;profile=null;activeSlot='';authoring='';journey=null;visibleIds=[];occlusion.clear();pendingOcclusion=0;sideMemory={};onProjection([]);controls.enabled=false;
    if(!spec?.file||!publicModelPath23(spec.file)){clearModel();loading=false;status(spec?.file?'error':'unavailable',spec?.file?'Unsupported model URL.':`The ${spec?.label||'vehicle'} model has not been supplied.`);request();return;}
    status('loading',`Opening ${spec.label||'vehicle'}…`);request();let gltf=null;
    const timeout=setTimeout(()=>{if(controller?.signal===signal)controller.abort();},NVX_STAGE.fetchTimeoutMs||90000);
    try{
      const url=publicAsset(spec.file),response=await fetch(url,{signal,credentials:'same-origin'}),bytes=await readBytes(response,signal,NVX_STAGE.maxModelBytes||128*1024*1024);
      const report=readGLBReport23(bytes);if(disposed||ticket!==epoch)return;
      if(!crypto?.subtle)throw Error('Secure context required for model fingerprinting. Use localhost or HTTPS.');
      const hash=await crypto.subtle.digest('SHA-256',bytes),sha256=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
      if(disposed||ticket!==epoch)return;const manager=new THREE.LoadingManager(),errors=[];manager.onError=resource=>errors.push(resource);
      manager.setURLModifier(resource=>{if(resource.startsWith('blob:'))return resource;const u=new URL(resource,window.location.href);if(u.origin!==window.location.origin)throw Error('External model resources are not permitted.');return u.href;});
      const loader=new GLTFLoader(manager).setDRACOLoader(draco).setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
      gltf=await loader.parseAsync(bytes,new URL('.',new URL(url,location.href)).href);
      if(errors.length)throw Error('Missing texture or decoder. Check local model resources.');
      if(disposed||ticket!==epoch){disposeModel(gltf);gltf=null;return;}
      const next=prepare(gltf,spec);gltf=null;next.sha256=sha256;clearModel();current=next;scene.add(current.root);loading=false;auto=true;interactive=false;
      const p=fullPose();controls.minDistance=Math.max(.35,current.radius*.22);controls.maxDistance=p.radius*2.6;place(p);syncControls();
      status('ready');onMetadata({spec,sha256,byteLength:report.bytes,bounds:bounds(),meshes:report.meshes,nodes:report.nodes});request();
    }catch(e){if(gltf)disposeModel(gltf);if(disposed||ticket!==epoch)return;clearModel();loading=false;status('error',e.name==='AbortError'?'Model request timed out. Retry 3D.':e.message);request();}
    finally{clearTimeout(timeout);}
  }
  function setProfile(value){
    if(value&&!current)throw Error('Load the vehicle before applying hotspots.');
    profile=value?validateProfile233(value,current.spec,current.sha256,{bounds:bounds()}):null;
    if(activeSlot&&!profile?.anchors[activeSlot])activeSlot='';
    occlusion.clear();pendingOcclusion=Object.keys(profile?.anchors||{}).length;request();return profile;
  }
  function focus(id){
    const found=profile?.anchors[id]?id:resolveSlot233(profile,id,activeSlot);activeSlot=found;authoring='';auto=false;interactive=false;
    if(!found){journey=null;syncControls();announce('A precise view has not been authored for this part. The catalogue remains available.');request();return false;}
    return move(focusPose233(profile.anchors[found],camera.aspect),{guided:true});
  }
  function reset(){authoring='';activeSlot='';auto=true;interactive=false;move(fullPose(),{guided:true});request();}
  function command(action){if(!current||loading||blocked)return;if(action==='reset'){reset();return;}const p=snapshot();auto=false;interactive=true;
    if(action==='left'||action==='right')p.theta+=(action==='left'?-1:1)*Math.PI/12;
    if(action==='in'||action==='out')p.radius=clamp23(p.radius*(action==='in'?.87:1.15),controls.minDistance,controls.maxDistance);
    move(p,{seconds:.28});
  }
  function setOptions(options={}){
    const takeControl=('interactive' in options)&&options.interactive&&!interactive;
    if(takeControl&&journey){journey=null;auto=false;}
    if('motion'in options)motion=!!options.motion;if('interactive'in options)interactive=!!options.interactive;if('blocked'in options){if(blocked&&!options.blocked)pendingOcclusion=Object.keys(profile?.anchors||{}).length;blocked=!!options.blocked;}
    if('authoring'in options)authoring=slot233(options.authoring)?options.authoring:'';
    if(!motion&&journey){place(journey.legs.at(-1).to);journey=null;}
    if(!journey)syncControls();if(blocked)onProjection([]);request();
  }
  const pointerDown=e=>{if(e.isPrimary&&e.button===0&&!blocked)down={id:e.pointerId,x:e.clientX,y:e.clientY,time:e.timeStamp,button:e.button,primary:e.isPrimary};};
  const pointerUp=e=>{
    const d=down;down=null;const up={id:e.pointerId,x:e.clientX,y:e.clientY,time:e.timeStamp,primary:e.isPrimary};
    if(!isClick233(d,up)||!current||loading||blocked||journey)return;
    const rect=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);ray.near=.01;ray.far=250;
    const hit=hits()[0];if(!hit){if(authoring)onPicked(null);return;}
    const point=current.root.worldToLocal(hit.point.clone());
    if(authoring){normalMatrix.getNormalMatrix(hit.object.matrixWorld);const normal=(hit.face?.normal?.clone()||new THREE.Vector3(0,1,0)).applyMatrix3(normalMatrix).normalize();
      const inv=new THREE.Matrix4().copy(current.root.matrixWorld).invert();normal.transformDirection(inv);
      const offset=camera.position.clone().sub(hit.point),s=new THREE.Spherical().setFromVector3(offset);
      onPicked({id:authoring,point:point.toArray(),normal:normal.toArray(),pose:{target:point.toArray(),radius:clamp23(offset.length()*.85,.6,40),phi:clamp23(s.phi,.18,Math.PI-.18),theta:s.theta},viewAspect:width/height,pickRadius:.18});
    }else {const id=pickSlot233(point,profile,visibleIds);if(id)onSelect(id,slot233(id).category);}
  };
  const cancel=()=>{down=null;};
  const start=()=>{journey=null;auto=false;request();announce('');};
  const change=()=>{pendingOcclusion=Object.keys(profile?.anchors||{}).length;request();};
  controls.addEventListener('start',start);controls.addEventListener('change',change);
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',cancel);
  const observer=new ResizeObserver(resize);observer.observe(host);
  const visibility=()=>{last=0;if(active())request();else{cancelAnimationFrame(frameId);frameId=0;}};
  document.addEventListener('visibilitychange',visibility);
  const lost=e=>{e.preventDefault();broken=true;cancelAnimationFrame(frameId);frameId=0;status('error','WebGL context lost. Retry 3D.',{fatal:true});};canvas.addEventListener('webglcontextlost',lost);
  resize();request();
  return {select,focus,reset,command,setOptions,setProfile,capture:()=>snapshot(),
    previewPose:p=>{auto=false;interactive=true;return move(p,{guided:true});},
    metrics:()=>({step:'23.3',mode:journey?'transition':interactive?'orbit':activeSlot?'focus':'auto',slot:activeSlot,modelId:current?.spec.id||null,modelSha256:current?.sha256||null,renderCount:renders,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,averageCpuSubmitMs:renders?cpuTotal/renders:null,maxCpuSubmitMs:cpuMax,rayTests,maxRaycastCpuMs:rayCpuMax,anchors:Object.keys(profile?.anchors||{}),note:'CPU submission/raycast timing, not measured GPU frame time or physical compatibility.'}),
    setVisible:value=>{if(!visible&&value)pendingOcclusion=Object.keys(profile?.anchors||{}).length;visible=!!value;visibility();},
    dispose(){if(disposed)return;disposed=true;epoch++;controller?.abort();cancelAnimationFrame(frameId);observer.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',cancel);controls.removeEventListener('start',start);controls.removeEventListener('change',change);controls.dispose();clearModel();environment?.dispose();draco.dispose();ktx2.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();},
  };
}
