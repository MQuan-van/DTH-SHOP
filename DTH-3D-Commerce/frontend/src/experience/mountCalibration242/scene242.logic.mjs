import { ASSET_LIMITS, inspectGLB } from '../../shop/product/3d/modelValidation.mjs';
import { validateGLB } from '../../shop/discovery174/nvx3d/nvx3d.logic.mjs';
import { NVX_STAGE } from '../../shop/discovery174/nvx3d/nvx3d.config.mjs';
import { Box3 } from 'three';

// Match the existing high-fidelity product policy, without changing its global defaults.
export const PART_LIMITS242 = Object.freeze({ ...ASSET_LIMITS, bytes:64*1024*1024,
  decodedBytes:256*1024*1024, vertices:2_000_000, triangles:1_500_000 });
export const IDENTITY_ATTACHMENT242 = Object.freeze({position:Object.freeze([0,0,0]),quaternion:Object.freeze([0,0,0,1]),scale:1});
export function approvedAsset242(url, kind) {
  if (typeof url !== 'string') return false;
  if (kind === 'vehicle') return url === '/models/nvx/nvx-v2.glb' || /^\/api\/shop\/ai-assets\/models\/v2\.glb\?rev=[a-f0-9-]{36}$/.test(url);
  return kind === 'product' && /^\/models\/(?:[\w-]+\/)*[\w-]+\.glb(?:\?v=[a-f0-9]{64})?$/.test(url);
}
export async function fetchCalibrationAsset242(url, kind, {signal,fetcher=globalThis.fetch}={}) {
  if (!approvedAsset242(url,kind)) throw new Error('This workspace accepts only the bound NVX V2 and local product GLB paths.');
  const maximum = kind === 'vehicle' ? NVX_STAGE.maxModelBytes : PART_LIMITS242.bytes;
  const response = await fetcher(url,{signal,credentials:'same-origin',redirect:'error',cache:'no-cache'});
  if (!response.ok) throw new Error(`${kind === 'vehicle' ? 'Vehicle' : 'Part'} GLB request failed (${response.status}).`);
  const rejectSize = async () => { try{await response.body?.cancel?.();}catch{/* The stream may already be closed. */}throw new Error(`${kind} GLB exceeds its ${maximum/(1024*1024)} MiB resource limit.`); };
  if (Number(response.headers.get('content-length')) > maximum) return rejectSize();
  let bytes;
  if (response.body?.getReader) {
    const reader=response.body.getReader(),chunks=[];let count=0;
    let complete=false;
    try {
      while(true) { if(signal?.aborted) throw new DOMException('Aborted','AbortError'); const next=await reader.read();if(next.done){complete=true;break;}
        count+=next.value.byteLength; if(count>maximum){await reader.cancel();throw new Error(`${kind} GLB exceeds its ${maximum/(1024*1024)} MiB resource limit.`);}chunks.push(next.value); }
    } finally { if(!complete)try{await reader.cancel();}catch{/* Preserve the original fetch error. */}reader.releaseLock(); }
    bytes=new Uint8Array(count);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  } else { bytes=new Uint8Array(await response.arrayBuffer());if(bytes.byteLength>maximum) return rejectSize(); }
  inspectCalibrationAsset242(bytes,kind);
  return bytes;
}
export function inspectCalibrationAsset242(bytes,kind) {
  if (!(bytes instanceof Uint8Array)) bytes=new Uint8Array(bytes);
  if (new TextDecoder().decode(bytes.subarray(0,100)).startsWith('version https://git-lfs.github.com/spec/v1')) throw new Error('This model is a Git LFS pointer. Download the actual GLB with git lfs pull.');
  const maximum=kind==='vehicle'?NVX_STAGE.maxModelBytes:PART_LIMITS242.bytes;
  const buffer=bytes.byteOffset===0&&bytes.byteLength===bytes.buffer.byteLength?bytes.buffer:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  validateGLB(buffer,maximum);
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),length=view.getUint32(12,true);
  if (length>ASSET_LIMITS.jsonBytes) throw new Error('The GLB JSON exceeds the existing bounded metadata policy.');
  let json;
  try { json=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(20,20+length)).trimEnd()); }
  catch { throw new Error('The GLB JSON is unreadable.'); }
  if(json.asset?.version!=='2.0' || !Array.isArray(json.nodes) || !json.nodes.length || json.nodes.length>ASSET_LIMITS.nodes) throw new Error('The GLB has no supported bounded node hierarchy.');
  if ((json.buffers||[]).some(value=>value.uri!==undefined) || (json.images||[]).some(value=>value.uri!==undefined)) throw new Error('Calibration models must embed their buffers and textures. External asset URLs are not loaded.');
  // Product policy is unchanged; the vehicle retains its separate NVX byte policy.
  if(kind==='product') inspectGLB(bytes,PART_LIMITS242);
  return json;
}
export function attachmentFromObject242(object, scaleAxis='XYZ') {
  const axis=['X','Y','Z'].includes(scaleAxis)?scaleAxis.toLowerCase():'x';
  const scale=Math.max(1e-6,Math.min(1e6,object.scale[axis]));
  const position=object.position.toArray(),quaternion=object.quaternion.toArray();
  if(!position.every(value=>Number.isFinite(value)&&Math.abs(value)<=1e6)||!quaternion.every(Number.isFinite)||!Number.isFinite(scale)) throw new Error('The gizmo produced an invalid attachment transform.');
  const length=Math.hypot(...quaternion);if(length<1e-12)throw new Error('Attachment rotation is invalid.');
  return {position,quaternion:quaternion.map(value=>value/length),scale};
}
export function applyAttachment242(object,pose=IDENTITY_ATTACHMENT242) {
  object.position.fromArray(pose.position);object.quaternion.fromArray(pose.quaternion);object.scale.setScalar(pose.scale);object.updateMatrixWorld(true);
}
/** Camera framing reads displayed bounds; it never edits a saved attachment pose. */
export function calibrationFocusBox242(entry,view='overview') {
  entry.display.updateMatrixWorld(true);
  return new Box3().setFromObject(view==='part'?entry.attachment:entry.vehicleRoot,true);
}
export function createGhost242(root) {
  const originals=[],clones=new Map();let enabled=false,disposed=false;
  root.traverse(object=>{if(!object.isMesh)return;originals.push([object,object.material]);});
  function set(value) {
    if(disposed||enabled===(value===true))return;enabled=value===true;
    for(const [object,material]of originals) {
      const ghost=source=>{if(!clones.has(source)){const clone=source.clone();clone.transparent=true;clone.opacity=Math.min(source.opacity,.23);clone.depthWrite=false;clone.needsUpdate=true;clones.set(source,clone);}return clones.get(source);};
      object.material=enabled?(Array.isArray(material)?material.map(ghost):ghost(material)):material;
    }
  }
  return {set,dispose(){if(disposed)return;set(false);disposed=true;for(const material of clones.values())material.dispose();clones.clear();}};
}
/** Only exclusively decoded scenes from this workspace are passed here. */
const releasedGLTF242=new WeakSet();
export function disposeCalibrationGLTF242(gltf) {
  if(!gltf||releasedGLTF242.has(gltf))return;releasedGLTF242.add(gltf);
  const geometry=new Set(),materials=new Set(),textures=new Set(),images=new Set(),skeletons=new Set();
  for(const root of gltf?.scenes||[gltf?.scene])root?.traverse(object=>{
    if(object.geometry)geometry.add(object.geometry);if(object.skeleton)skeletons.add(object.skeleton);
    for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}
  });
  geometry.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());skeletons.forEach(value=>value.dispose());
  textures.forEach(value=>{if(value.image)images.add(value.image);value.dispose();});images.forEach(value=>value.close?.());
}
