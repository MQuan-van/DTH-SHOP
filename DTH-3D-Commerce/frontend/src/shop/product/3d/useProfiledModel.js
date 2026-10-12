import { useEffect, useRef, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { LoadingManager } from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { bind3DProfile, modelPath } from '../../../../../shared/product3dProfile.mjs';
import { fetchModelBytes, inspectGLB, sha256Bytes, versionedModelURL } from './modelValidation.mjs';
import { inspectProductGeometry, resolvePresentation } from './profileTransform.mjs';

const rawCache=new Map();
export function clearProfiledModelCache(url){for(const key of rawCache.keys())if(modelPath(key)===modelPath(url))rawCache.delete(key);}
export function disposeProductAsset(gltf){
  if(!gltf)return;const geometry=new Set(),materials=new Set(),textures=new Set(),images=new Set();
  for(const root of gltf.scenes||[gltf.scene])root?.traverse(node=>{if(node.geometry)geometry.add(node.geometry);for(const m of Array.isArray(node.material)?node.material:node.material?[node.material]:[]){materials.add(m);Object.values(m).forEach(v=>{if(v?.isTexture)textures.add(v);});}});
  geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{if(t.image)images.add(t.image);t.dispose();});images.forEach(i=>i.close?.());
}
/** Raw bytes may be cached; decoded scenes/textures always belong to this mount. */
export function useProfiledModel(product,selection,onFailure) {
  const [asset,setAsset]=useState(null),failure=useRef(onFailure);failure.current=onFailure;
  useEffect(()=>{
    let live=true,owned=null;const controller=new AbortController();
    const manager=new LoadingManager();
    // GLTFLoader creates blob URLs for embedded images. No external resource requests.
    manager.setURLModifier(url=>{if(url.startsWith('blob:'))return url;throw new Error('External model resources are not allowed.');});
    const loader=new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
    async function run(){let parsed=null;
      try{
        const request=versionedModelURL(product.modelUrl,selection.candidate);
        let record=rawCache.get(request);
        if(!record){const bytes=await fetchModelBytes(request,{signal:controller.signal});const preflight=inspectGLB(bytes);const sha256=await sha256Bytes(bytes).catch(()=>null);record={bytes,preflight,sha256};}
        if(!live)return;
        // Default loader is not shared with Home or Story; their cache is untouched.
        parsed=await loader.parseAsync(record.bytes.buffer.slice(record.bytes.byteOffset,record.bytes.byteOffset+record.bytes.byteLength),'');
        if(!live){disposeProductAsset(parsed);return;}
        const measured=inspectProductGeometry(parsed.scene);
        const bound=selection.candidate?bind3DProfile(selection.candidate,product,record.sha256):{status:selection.status,profile:null,reason:selection.reason};
        const resolved=resolvePresentation(measured,bound);
        const report={status:resolved.status,reason:resolved.reason,profileId:resolved.profile?.profileId??null,version:resolved.profile?.version??null,
          provenance:resolved.profile?.provenance??null,sha256:record.sha256,byteLength:record.preflight.byteLength,
          triangles:measured.triangles,vertices:measured.vertices,textures:measured.textures,textureDimensions:record.preflight.textureDimensions,
          warnings:record.preflight.warnings,sourceBounds:resolved.presentation.sourceBounds};
        rawCache.delete(request);rawCache.set(request,record);while(rawCache.size>2)rawCache.delete(rawCache.keys().next().value);
        owned=parsed;setAsset({url:product.modelUrl,selection,scene:parsed.scene,presentation:resolved.presentation,profile:resolved.profile,report});
      }catch(error){if(parsed&&parsed!==owned)disposeProductAsset(parsed);if(live&&error.name!=='AbortError')failure.current(error.message||'Unable to prepare the model.');}
    }
    void run();return()=>{live=false;controller.abort();disposeProductAsset(owned);};
  },[product.id,product.modelUrl,selection]);
  return asset?.url===product.modelUrl&&asset.selection===selection?asset:null;
}
