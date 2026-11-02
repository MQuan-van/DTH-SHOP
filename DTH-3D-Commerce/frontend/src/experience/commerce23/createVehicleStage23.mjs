import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {KTX2Loader} from 'three/examples/jsm/loaders/KTX2Loader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {publicAsset,NVX_STAGE} from '../../shop/discovery174/nvx3d/nvx3d.config.mjs';
import {orbitFitBox23,mixPose23,clamp23,readGLBReport23,publicModelPath23,assetKey23,validateProfile23,isSystem23,labelLayout23} from './spatial23.logic.mjs';

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

/** Standalone Three renderer, consistent with the existing NVX implementation. Not nested in R3F. */
export function createVehicleStage23(host,{onStatus=()=>{},onProjection=()=>{},onMetadata=()=>{},onPicked=()=>{},compact=false}={}){
 let disposed=false,visible=true,broken=false,motion=true,interactive=false,blocked=false,authoring='',selectedSystem='';
 let frameId=0,last=0,width=1,height=1,epoch=0,controller=null,current=null,desired=null,profile=null,cameraTween=null,loading=false;
 let yawIdle=true,dirty=true,occlusionIndex=0,lastOcclusion=0,occlusionRemaining=0;const occlusion=new Map();
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,compact?1.25:1.75));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1;
 const canvas=renderer.domElement;canvas.dataset.spatialVehicle='23';canvas.setAttribute('aria-hidden','true');canvas.style.touchAction='pan-y';host.appendChild(canvas);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.01,250),controls=new OrbitControls(camera,canvas);
 controls.enablePan=false;controls.enableZoom=false;controls.enableDamping=true;controls.dampingFactor=.08;controls.rotateSpeed=.65;controls.minPolarAngle=.18;controls.maxPolarAngle=Math.PI-.18;controls.autoRotateSpeed=.45;controls.enabled=false;
 camera.position.set(6,3,7);controls.target.set(0,1,0);controls.update();
 scene.add(new THREE.HemisphereLight(0xffffff,0x536476,1.35));
 const key=new THREE.DirectionalLight(0xffffff,2.15);key.position.set(4,7,5);scene.add(key);
 const fill=new THREE.DirectionalLight(0xffffff,1.1);fill.position.set(-5,3,-3);scene.add(fill);
 let environment=null;
 try{const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);try{environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.8;}finally{room.dispose?.();pmrem.dispose();}}
 catch{/* Directional lights remain usable; no material edits as a fallback. */}
 const draco=new DRACOLoader().setDecoderPath(publicAsset('decoders/nvx3d/draco/'));
 const ktx2=new KTX2Loader().setTranscoderPath(publicAsset('decoders/nvx3d/basis/'));ktx2.detectSupport(renderer);
 let renderCount=0,renderCpu=0,renderCpuMax=0;
 const raycaster=new THREE.Raycaster(),v=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
 function status(phase,message='',extra={}){if(!disposed)onStatus({phase,message,id:desired?.id||null,...extra});}
 function active(){return !disposed&&!broken&&visible&&!document.hidden;}
 function schedule(){if(active()&&!frameId)frameId=requestAnimationFrame(frame);}
 function request(){dirty=true;schedule();}
 function snapshot(){const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);return {radius:s.radius,phi:s.phi,theta:s.theta,target:controls.target.toArray()};}
 function place(pose){controls.target.fromArray(pose.target);controls.cursor?.copy(controls.target);camera.position.copy(controls.target).add(v.setFromSphericalCoords(pose.radius,pose.phi,pose.theta));camera.lookAt(controls.target);camera.updateMatrixWorld();}
 function syncControls(){controls.autoRotate=false;controls.enableDamping=false;controls.update(0);controls.enableDamping=motion;controls.enabled=interactive&&!blocked&&!loading&&!cameraTween;canvas.style.touchAction=controls.enabled?'none':'pan-y';}
 function fullPose(){if(!current)return null;return orbitFitBox23({min:current.bounds.min.toArray(),max:current.bounds.max.toArray(),aspect:width/height,fov:camera.fov,theta:.86,phi:1.20,padding:1.12});}
 function move(pose,seconds=.75){if(!current||!pose)return;controls.autoRotate=false;controls.enabled=false;controls.enableDamping=false;controls.update(0);const start=snapshot();
  cameraTween=motion&&active()?{from:start,to:pose,elapsed:0,seconds}:null;if(!cameraTween){place(pose);syncControls();}request();}
 function reframe(initial=false){if(!current)return;const end=fullPose();controls.minDistance=Math.max(.35,current.radius*.22);controls.maxDistance=end.radius*2.5;
  if(initial||!selectedSystem&&!interactive){cameraTween=null;place(end);}else{const old=snapshot(),previous=current.fitDistance||end.radius;old.radius=clamp23(old.radius*end.radius/previous,controls.minDistance,controls.maxDistance);cameraTween=null;place(old);}
  current.fitDistance=end.radius;syncControls();occlusionRemaining=Object.keys(profile?.anchors||{}).length;request();}
 function resize(){if(disposed)return;const r=host.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));if(w===width&&h===height)return;width=w;height=h;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);reframe(false);request();}
 function updateLabels(now){
  if(!current||loading||!profile){onProjection([]);return;}
  current.root.updateMatrixWorld(true);camera.updateMatrixWorld();const entries=Object.entries(profile.anchors),points=[];
  if(entries.length&&occlusionRemaining>0&&now-lastOcclusion>100){lastOcclusion=now;occlusionRemaining--;const [id,a]=entries[(occlusionIndex++)%entries.length];
   const target=current.root.localToWorld(new THREE.Vector3(...a.point)),direction=target.clone().sub(camera.position),distance=direction.length();raycaster.set(camera.position,direction.normalize());raycaster.near=.01;raycaster.far=Math.max(.01,distance-.04);
   const hit=raycaster.intersectObjects(current.meshes,false)[0];occlusion.set(id,!hit);
  }
  for(const [id,a] of entries){const point=current.root.localToWorld(new THREE.Vector3(...a.point)),ndc=point.clone().project(camera);
   const facing=new THREE.Vector3(...a.normal).dot(camera.position.clone().sub(point))>-.02;
   const shown=ndc.z>=-1&&ndc.z<=1&&facing&&occlusion.get(id)===true&&!cameraTween;
   points.push({id,x:(ndc.x*.5+.5)*width,y:(-.5*ndc.y+.5)*height,visible:shown});
  }
  onProjection(labelLayout23(points,width,height));
 }
 function frame(now){
  frameId=0;if(!active()){last=0;return;}
  const dt=last?Math.min((now-last)/1000,.05):1/60;last=now;
  let changed=dirty,cameraChanged=false;dirty=false;
  if(cameraTween&&!blocked){
   cameraTween.elapsed+=dt;const p=cameraTween.elapsed/cameraTween.seconds;
   place(mixPose23(cameraTween.from,cameraTween.to,p));changed=true;cameraChanged=true;
   if(p>=1){cameraTween=null;syncControls();}
  }else if(current&&!loading&&!blocked){
   controls.autoRotate=motion&&yawIdle&&!interactive&&!selectedSystem&&!authoring;
   cameraChanged=controls.update(dt)===true;changed=cameraChanged||changed||controls.autoRotate;
  }
  if(cameraChanged)occlusionRemaining=Object.keys(profile?.anchors||{}).length;
  if(changed){try{const started=performance.now();renderer.render(scene,camera);const cost=performance.now()-started;renderCount++;renderCpu+=cost;renderCpuMax=Math.max(renderCpuMax,cost);}catch(e){broken=true;status('error',`3D rendering stopped: ${e.message}`,{fatal:true});return;}}
  if(changed||current&&profile&&!cameraTween&&!blocked&&occlusionRemaining>0)updateLabels(now);
  // Finite damping / occlusion work only. Merely enabling orbit is NOT a permanent loop.
  const moving=!!cameraTween||controls.autoRotate||cameraChanged;
  if(dirty||!blocked&&!loading&&current&&(moving||occlusionRemaining>0))schedule();
 }
 function clearModel(){if(!current)return;scene.remove(current.root);disposeModel(current.gltf);current=null;}
 async function select(spec){
  const key23=assetKey23(spec);if(desired&&assetKey23(desired)===key23&&(loading||current))return;
  const ticket=++epoch;controller?.abort();controller=new AbortController();const {signal}=controller;
  desired=spec;loading=true;profile=null;selectedSystem='';authoring='';occlusion.clear();occlusionRemaining=0;cameraTween=null;onProjection([]);controls.enabled=false;
  if(!spec?.file){clearModel();loading=false;status('unavailable',`The ${spec?.label||'vehicle'} model has not been supplied.`);request();return;}
  if(!publicModelPath23(spec.file)){clearModel();loading=false;status('error','Unsupported model URL.');request();return;}
  status('loading',`Opening ${spec.label||'vehicle'}…`);request();let gltf=null;
  const timeout=setTimeout(()=>controller?.signal===signal&&controller.abort(),NVX_STAGE.fetchTimeoutMs||90000);
  try{
   const url=publicAsset(spec.file),response=await fetch(url,{signal,credentials:'same-origin'}),bytes=await readBytes(response,signal,NVX_STAGE.maxModelBytes||128*1024*1024);
   const report=readGLBReport23(bytes);if(disposed||ticket!==epoch)return;
   const digest=await crypto.subtle.digest('SHA-256',bytes);const sha256=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
   if(disposed||ticket!==epoch)return;const manager=new THREE.LoadingManager(),errors=[];manager.onError=url=>errors.push(url);
   manager.setURLModifier(resource=>{if(resource.startsWith('blob:'))return resource;const u=new URL(resource,window.location.href);if(u.origin!==window.location.origin)throw Error('External GLB resources are not permitted.');return u.href;});
   const loader=new GLTFLoader(manager).setDRACOLoader(draco).setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
   gltf=await loader.parseAsync(bytes,new URL('.',new URL(url,location.href)).href);
   if(errors.length)throw Error('A texture or decoder is missing. Check local decoder/model files.');
   if(disposed||ticket!==epoch){disposeModel(gltf);gltf=null;return;}
   const next=prepare(gltf,spec);gltf=null;next.sha256=sha256;clearModel();current=next;scene.add(current.root);loading=false;yawIdle=true;reframe(true);
   status('ready','');onMetadata({spec,sha256,byteLength:report.bytes,bounds:{min:current.bounds.min.toArray(),max:current.bounds.max.toArray()},meshes:report.meshes,nodes:report.nodes});request();
  }catch(error){if(gltf)disposeModel(gltf);if(disposed||ticket!==epoch)return;clearModel();loading=false;status('error',error.name==='AbortError'?'The model timed out. Check the GLB and retry.':error.message);request();}
  finally{clearTimeout(timeout);}
 }
 function setProfile(value){let next=null;if(value){if(!current)throw Error('Load the model before applying a focus profile.');const checked=validateProfile23(value,current.spec,current.sha256);for(const a of Object.values(checked.anchors))if(!current.bounds.clone().expandByScalar(.05).containsPoint(new THREE.Vector3(...a.point)))throw Error('A focus point is outside this model.');next=checked;}profile=next;occlusion.clear();occlusionRemaining=Object.keys(profile?.anchors||{}).length;request();}
 function focus(id){selectedSystem=isSystem23(id)?id:'';yawIdle=!selectedSystem;authoring='';if(!current||loading)return false;
  const anchor=profile?.anchors?.[id];if(anchor){move(anchor.pose);return true;}move(fullPose());return false;}
 function reset(){selectedSystem='';authoring='';yawIdle=true;interactive=false;move(fullPose());request();}
 function command(action){if(!current||loading)return;const pose=snapshot();yawIdle=false;interactive=true;
  if(action==='reset'){reset();return;}if(action==='left'||action==='right')pose.theta+=(action==='left'?-1:1)*Math.PI/12;
  if(action==='in'||action==='out')pose.radius=clamp23(pose.radius*(action==='in'?.87:1.15),controls.minDistance,controls.maxDistance);move(pose,.35);}
 function setOptions(options={}){
  if('motion'in options)motion=!!options.motion;if('interactive'in options)interactive=!!options.interactive;if('blocked'in options)blocked=!!options.blocked;
  if('authoring'in options)authoring=isSystem23(options.authoring)?options.authoring:'';
  if(!motion&&cameraTween){place(cameraTween.to);cameraTween=null;}
  if(!cameraTween)syncControls();request();
 }
 let down=null;
 const pointerDown=e=>{if(e.isPrimary&&e.button===0)down={id:e.pointerId,x:e.clientX,y:e.clientY};};
 const pointerUp=e=>{const d=down;down=null;if(!d||e.pointerId!==d.id||Math.hypot(e.clientX-d.x,e.clientY-d.y)>5||!authoring||!current||loading||blocked||cameraTween)return;
  const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);raycaster.near=.01;raycaster.far=250;
  const hit=raycaster.intersectObjects(current.meshes,false)[0];if(!hit){onPicked(null);return;}
  const point=current.root.worldToLocal(hit.point.clone());normalMatrix.getNormalMatrix(hit.object.matrixWorld);const normal=(hit.face?.normal?.clone()||new THREE.Vector3(0,1,0)).applyMatrix3(normalMatrix).normalize();
  const offset=camera.position.clone().sub(hit.point),s=new THREE.Spherical().setFromVector3(offset);
  const pose={target:point.toArray(),radius:clamp23(offset.length()*.7,.6,40),phi:clamp23(s.phi,.18,Math.PI-.18),theta:s.theta};
  onPicked({id:authoring,point:point.toArray(),normal:normal.toArray(),pose});
 };
 const pointerCancel=()=>{down=null;};
 const start=()=>{cameraTween=null;yawIdle=false;request();};
 const change=()=>{occlusionRemaining=Object.keys(profile?.anchors||{}).length;request();};controls.addEventListener('start',start);controls.addEventListener('change',change);
 canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerCancel);
 const observer=new ResizeObserver(resize);observer.observe(host);
 const visibility=()=>{last=0;if(active())request();else{cancelAnimationFrame(frameId);frameId=0;}};document.addEventListener('visibilitychange',visibility);
 const contextLost=e=>{e.preventDefault();broken=true;cancelAnimationFrame(frameId);frameId=0;status('error','The browser lost its WebGL context. Retry 3D to continue.',{fatal:true});};canvas.addEventListener('webglcontextlost',contextLost);
 resize();request();
 return {select,focus,reset,command,setOptions,setProfile,metrics:()=>({kind:'Renderer counters and CPU submit time, NOT GPU frame time or physical fitment',renderCount,averageCpuSubmitMs:renderCount?renderCpu/renderCount:null,maxCpuSubmitMs:renderCpuMax,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,modelId:current?.spec.id||null,modelSha256:current?.sha256||null,profileAnchors:Object.keys(profile?.anchors||{}),mode:cameraTween?'transition':interactive?'orbit':selectedSystem?'focus':'auto'}),capture:()=>snapshot(),setVisible:value=>{visible=!!value;visibility();},
  retry(){const spec=desired;desired=null;return select(spec);},
  dispose(){if(disposed)return;disposed=true;epoch++;controller?.abort();cancelAnimationFrame(frameId);observer.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',pointerCancel);controls.removeEventListener('start',start);controls.removeEventListener('change',change);controls.dispose();clearModel();environment?.dispose();draco.dispose();ktx2.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();},
 };
}
