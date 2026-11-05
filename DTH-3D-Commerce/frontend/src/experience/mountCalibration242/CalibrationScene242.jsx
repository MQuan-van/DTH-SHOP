import { Component, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { sha256Bytes } from '../../shop/product/3d/modelValidation.mjs';
import { inspectProductGeometry } from '../../shop/product/3d/profileTransform.mjs';
import { vehicleDisplayFrame234 } from '../mounting234/assembly234.mjs';
import { PART_LIMITS242, IDENTITY_ATTACHMENT242, applyAttachment242, attachmentFromObject242, calibrationFocusBox242, createGhost242, disposeCalibrationGLTF242, fetchCalibrationAsset242 } from './scene242.logic.mjs';

class CalibrationBoundary242 extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error){this.props.onError(error?.message||'The calibration viewport could not start.');}
  render(){return this.state.failed?null:this.props.children;}
}

function CalibrationContent242({ latest, engineRef, attempt }) {
  const {camera,gl,scene,invalidate,size}=useThree(), asset=useRef(null);
  const vehicle=latest.current.vehicle,product=latest.current.product;
  const orientationKey=JSON.stringify(vehicle.rotationXYZ||[0,0,0]);
  useLayoutEffect(()=>{
    let alive=true,drag=null,cancelling=false,hidden=document.hidden,inView=true,broken=false,pointer=null;
    // TransformControls must receive pointerdown first, so it can lock Orbit before that event reaches it.
    const transform=new TransformControls(camera,gl.domElement),orbit=new OrbitControls(camera,gl.domElement),helper=transform.getHelper();
    transform.setSize(.8);transform.setSpace('local');transform.enabled=false;
    orbit.enableDamping=false;orbit.autoRotate=false;orbit.enabled=false;orbit.enablePan=true;orbit.maxDistance=100;orbit.minDistance=.005;
    scene.add(helper);const canvas=gl.domElement;canvas.tabIndex=0;
    canvas.setAttribute('aria-label','NVX V2 and TTX calibration viewport. Drag the gizmo to edit the part; drag elsewhere to orbit.');
    const permitted=()=>alive&&!broken&&!hidden&&inView&&!latest.current.blocked;
    const request=()=>{if(permitted())invalidate();};
    function sync(){const ready=!!asset.current;orbit.enabled=ready&&permitted()&&!drag;transform.enabled=ready&&permitted()&&latest.current.partVisible!==false;helper.visible=transform.enabled;canvas.style.touchAction=orbit.enabled||transform.enabled?'none':'pan-y';}
    function cancelDrag(){
      if(!drag)return false;
      const previous=drag;cancelling=true;
      transform.enabled=true;transform.reset();applyAttachment242(asset.current.attachment,previous);
      drag=null;
      // Public disconnect/connect clears TransformControls' temporary move listener, retaining listener order.
      transform.disconnect();orbit.disconnect();transform.dragging=false;transform.axis=null;
      try{if(pointer!==null&&canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);}catch{/* Pointer cancellation may already release it. */}
      transform.connect(canvas);orbit.connect(canvas);cancelling=false;pointer=null;
      if(alive)latest.current.onDragCancel?.();sync();request();return true;
    }
    function fit(view='overview'){
      const entry=asset.current;if(!entry||!permitted()||drag)return false;
      const box=calibrationFocusBox242(entry,view);
      if(box.isEmpty())return false;
      const sphere=box.getBoundingSphere(new THREE.Sphere()),radius=Math.max(sphere.radius,.005);
      const vfov=camera.fov*Math.PI/360,hfov=Math.atan(Math.tan(vfov)*Math.max(camera.aspect,.01));
      const distance=radius*1.18/Math.sin(Math.min(vfov,hfov));
      const direction=new THREE.Vector3(...(view==='left'?[-1,.2,0]:view==='right'?[1,.2,0]:view==='rear'?[0,.2,-1]:[1,.45,1])).normalize();
      orbit.target.copy(sphere.center);camera.position.copy(sphere.center).addScaledVector(direction,distance);
      camera.near=Math.max(.0001,Math.min(.01,radius/200));camera.far=Math.max(200,distance*8);camera.updateProjectionMatrix();camera.lookAt(orbit.target);
      orbit.maxDistance=Math.max(50,distance*5);orbit.minDistance=Math.max(.001,radius*.08);orbit.update();request();return true;
    }
    const changed=()=>{if(!permitted())return;request();};
    const dragging=event=>{
      if(cancelling)return;
      if(event.value){
        if(!permitted()||!asset.current)return;
        drag=attachmentFromObject242(asset.current.attachment);latest.current.onDragStart?.();
      }else if(drag){drag=null;latest.current.onDragEnd?.();}
      sync();request();
    };
    const objectChanged=()=>{
      if(!asset.current||cancelling||!drag)return;
      try{
        const pose=attachmentFromObject242(asset.current.attachment,transform.getMode()==='scale'?transform.axis:'XYZ');
        // Clamp every scale handle to the same positive scalar before invalidating a visible frame.
        applyAttachment242(asset.current.attachment,pose);latest.current.onTransform?.(pose);request();
      }catch{cancelDrag();}
    };
    transform.addEventListener('dragging-changed',dragging);transform.addEventListener('objectChange',objectChanged);transform.addEventListener('change',changed);
    orbit.addEventListener('change',changed);
    const pointerDown=event=>{pointer=event.pointerId;};
    const pointerCancelled=()=>cancelDrag();
    const lostCapture=()=>queueMicrotask(()=>{if(alive&&drag)cancelDrag();});
    const blurred=()=>cancelDrag();
    const visibility=()=>{hidden=document.hidden;if(hidden)cancelDrag();sync();request();};
    const key=event=>{
      if(event.key!=='Escape'||event.target?.closest?.('input,textarea,select,[contenteditable=true]'))return;
      if(cancelDrag()){event.preventDefault();event.stopPropagation();}
    };
    const contextLost=event=>{event.preventDefault();broken=true;cancelDrag();sync();latest.current.onStatus?.({phase:'error',message:'The graphics connection was lost. Retry the calibration viewport.'});};
    canvas.addEventListener('pointerdown',pointerDown,true);canvas.addEventListener('pointercancel',pointerCancelled);canvas.addEventListener('lostpointercapture',lostCapture);canvas.addEventListener('keydown',key);
    canvas.addEventListener('webglcontextlost',contextLost);window.addEventListener('blur',blurred);document.addEventListener('visibilitychange',visibility);
    const observer=new IntersectionObserver(entries=>{inView=entries.some(entry=>entry.isIntersecting);if(!inView)cancelDrag();sync();request();},{threshold:.01});observer.observe(canvas);
    let environment=null;const previousEnvironment=scene.environment,previousIntensity=scene.environmentIntensity;
    try{const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(gl);try{environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.8;}finally{room.dispose();pmrem.dispose();}}
    catch{/* Hemisphere and directional lights remain available without environment generation. */}
    const api={camera:fit,cancelDrag,
      setAsset(entry){cancelDrag();asset.current=entry;if(entry){transform.attach(entry.attachment);applyAttachment242(entry.attachment,latest.current.attachment||IDENTITY_ATTACHMENT242);fit();}else transform.detach();sync();request();},
      update(){const mode=['translate','rotate','scale'].includes(latest.current.mode)?latest.current.mode:'translate';if(drag&&(latest.current.blocked||latest.current.partVisible===false||transform.getMode()!==mode))cancelDrag();transform.setMode(mode);
        if(asset.current){if(!drag)applyAttachment242(asset.current.attachment,latest.current.attachment||IDENTITY_ATTACHMENT242);asset.current.attachment.visible=latest.current.partVisible!==false;asset.current.ghost.set(latest.current.ghost===true);}sync();request();},
      tick(){const entry=asset.current;if(!permitted()||!entry||entry.reported)return;if(entry.vehicleDrawn&&(entry.partDrawn||latest.current.partVisible===false)){entry.reported=true;latest.current.onStatus?.({phase:'ready',message:'Both bound GLBs are ready for visual calibration.'});}},
    };
    engineRef.current=api;sync();request();
    return()=>{
      cancelDrag();alive=false;observer.disconnect();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',blurred);
      canvas.removeEventListener('pointerdown',pointerDown,true);canvas.removeEventListener('pointercancel',pointerCancelled);canvas.removeEventListener('lostpointercapture',lostCapture);canvas.removeEventListener('keydown',key);canvas.removeEventListener('webglcontextlost',contextLost);
      transform.removeEventListener('dragging-changed',dragging);transform.removeEventListener('objectChange',objectChanged);transform.removeEventListener('change',changed);orbit.removeEventListener('change',changed);
      transform.detach();scene.remove(helper);transform.dispose();orbit.dispose();scene.environment=previousEnvironment;scene.environmentIntensity=previousIntensity;environment?.dispose();
      if(engineRef.current===api)engineRef.current=null;asset.current=null;canvas.style.touchAction='';
    };
  },[camera,gl,scene,invalidate,engineRef,latest]);

  useEffect(()=>{
    let live=true,ownedVehicle=null,ownedPart=null,entry=null;const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),90000),undos=[];
    latest.current.onStatus?.({phase:'loading',message:'Loading and hashing the bound NVX V2 and Ohlins TTX GLBs…'});
    engineRef.current?.setAsset(null);
    const manager=new THREE.LoadingManager();manager.setURLModifier(url=>{if(url.startsWith('blob:'))return url;throw new Error('External GLB resources are not allowed in calibration.');});
    const loader=new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
    async function parse(url,kind){
      const bytes=await fetchCalibrationAsset242(url,kind,{signal:controller.signal});
      const hash=await sha256Bytes(bytes);if(!hash)throw new Error('SHA-256 is unavailable. Use localhost or a secure context.');
      if(!live||controller.signal.aborted)throw new DOMException('Aborted','AbortError');
      const buffer=bytes.byteOffset===0&&bytes.byteLength===bytes.buffer.byteLength?bytes.buffer:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
      const gltf=await loader.parseAsync(buffer,'');
      if(!live||controller.signal.aborted){disposeCalibrationGLTF242(gltf);throw new DOMException('Aborted','AbortError');}
      return {gltf,hash};
    }
    async function run(){
      try{
        const v=await parse(vehicle.assetUrl,'vehicle');ownedVehicle=v.gltf;
        latest.current.onStatus?.({phase:'loading',message:'Vehicle verified. Preparing the original TTX assembly…'});
        const p=await parse(product.modelUrl,'product');ownedPart=p.gltf;
        inspectProductGeometry(ownedPart.scene,PART_LIMITS242);
        const sourceBounds=new THREE.Box3().setFromObject(ownedVehicle.scene,true);
        const rotation=vehicle.rotationXYZ||[0,0,0],oriented=new THREE.Group();oriented.rotation.set(...rotation,'XYZ');oriented.add(ownedVehicle.scene);oriented.updateMatrixWorld(true);
        const bounds=new THREE.Box3().setFromObject(oriented,true);
        const frame=vehicleDisplayFrame234({orientedBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},rotationXYZ:rotation});
        oriented.remove(ownedVehicle.scene);
        const display=new THREE.Group(),attachment=new THREE.Group();display.name='Calibration common vehicle display frame';attachment.name='TTX whole-asset attachment source frame';
        display.matrix.fromArray(frame.matrix);display.matrixAutoUpdate=false;display.add(ownedVehicle.scene,attachment);attachment.add(ownedPart.scene);
        const ghost=createGhost242(ownedVehicle.scene);
        entry={display,attachment,vehicleRoot:ownedVehicle.scene,ghost,vehicleDrawn:false,partDrawn:false,reported:false};
        const mark=(root,key)=>root.traverse(object=>{if(!object.isMesh)return;const previous=object.onAfterRender;const after=function(...args){previous?.apply(this,args);if(!entry[key]){entry[key]=true;invalidate();}};object.onAfterRender=after;undos.push(()=>{if(object.onAfterRender===after)object.onAfterRender=previous;});});
        mark(ownedVehicle.scene,'vehicleDrawn');mark(ownedPart.scene,'partDrawn');
        if(!live)return;
        scene.add(display);engineRef.current?.setAsset(entry);engineRef.current?.update();
        const counts=new Map();ownedVehicle.scene.traverse(object=>{const index=ownedVehicle.parser.associations.get(object)?.nodes;if(Number.isSafeInteger(index))counts.set(index,(counts.get(index)||0)+1);});
        const nodeIndices=[...counts].filter(([,count])=>count===1).map(([index])=>index).sort((a,b)=>a-b);
        const json=ownedVehicle.parser.json,primitives=(json.meshes||[]).reduce((sum,mesh)=>sum+(mesh.primitives?.length||0),0);
        latest.current.onReady?.({vehicle:{id:vehicle.id,assetUrl:vehicle.assetUrl,sha256:v.hash,rotationXYZ:[...rotation]},product:{id:product.id,assetUrl:product.modelUrl,sha256:p.hash,category:product.category},nodeIndices,
          normalizationRevision:'normalized-stage-4-v1',orientationRevision:'nvx-config-v1',stockClassification:primitives===1?'merged':'indeterminate',sourceVehicleBounds:{min:sourceBounds.min.toArray(),max:sourceBounds.max.toArray()},orientedVehicleBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},displayFrame:frame});
        latest.current.onStatus?.({phase:'preparing',message:'Preparing the first frame of both original GLBs…'});invalidate();
      }catch(error){
        if(live){engineRef.current?.setAsset(null);latest.current.onStatus?.({phase:'error',message:error.name==='AbortError'?'The model load timed out. Check the GLB files and retry.':error.message||'The calibration models could not load.'});}
        if(entry){scene.remove(entry.display);entry.ghost.dispose();entry=null;}undos.splice(0).forEach(undo=>undo());
        disposeCalibrationGLTF242(ownedVehicle);disposeCalibrationGLTF242(ownedPart);ownedVehicle=null;ownedPart=null;
      }finally{clearTimeout(timeout);}
    }
    void run();
    return()=>{live=false;controller.abort();clearTimeout(timeout);engineRef.current?.setAsset(null);if(entry){scene.remove(entry.display);entry.ghost.dispose();}undos.forEach(undo=>undo());disposeCalibrationGLTF242(ownedVehicle);disposeCalibrationGLTF242(ownedPart);};
  },[vehicle.id,vehicle.assetUrl,orientationKey,product.id,product.modelUrl,attempt,scene,engineRef,invalidate,latest]);
  useLayoutEffect(()=>{engineRef.current?.update();},[latest.current.attachment,latest.current.mode,latest.current.partVisible,latest.current.ghost,latest.current.blocked,engineRef]);
  useLayoutEffect(()=>{if(asset.current)engineRef.current?.camera('overview');},[size.width,size.height,engineRef]);
  useFrame(()=>engineRef.current?.tick(),-1);
  return <><ambientLight intensity={.35}/><hemisphereLight args={['#ffffff','#647483',1.15]}/><directionalLight position={[4,7,5]} intensity={2.6}/><directionalLight position={[-4,3,-4]} intensity={1.1}/>
    <gridHelper visible={latest.current.grid!==false} args={[10,20,'#9aafbd','#d5dfe5']} position={[0,-.015,0]}/><axesHelper visible={latest.current.axes!==false} args={[2]}/></>;
}

export default function CalibrationScene242(props){
  const latest=useRef(props),engine=useRef(null);latest.current=props;
  const [attempt,setAttempt]=useState(0),localApi=useRef(null),api=props.apiRef||localApi;
  const retry=useCallback(()=>setAttempt(value=>value+1),[]);
  const fail=useCallback(message=>latest.current.onStatus?.({phase:'error',message}),[]);
  useLayoutEffect(()=>{const facade={camera:view=>engine.current?.camera(view),cancelDrag:()=>engine.current?.cancelDrag(),retry};api.current=facade;return()=>{if(api.current===facade)api.current=null;};},[api,retry]);
  return <div className="mc242-canvas" style={{width:'100%',height:'100%',position:'relative'}} data-mount-calibration-canvas="true">
    <CalibrationBoundary242 key={attempt} onError={fail}><Canvas key={attempt} frameloop="demand" dpr={[1,1.25]} camera={{fov:36,position:[6,4,6],near:.001,far:250}}
      gl={{alpha:true,antialias:true,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.NeutralToneMapping;gl.toneMappingExposure=1;}}>
      <CalibrationContent242 latest={latest} engineRef={engine} attempt={attempt}/>
    </Canvas></CalibrationBoundary242>
  </div>;
}
