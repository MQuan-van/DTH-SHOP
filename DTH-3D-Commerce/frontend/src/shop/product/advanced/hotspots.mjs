import { STUDY, normalizeHotspot } from './study.logic.mjs';
/** Authored notes, not inferred geometry or installation instructions. */
export const APEX_PROFILE = Object.freeze({
  id: 'dth-demo-apex-suspension-study-v1',
  modelPath: '/models/dth-demo/apex-suspension.glb',
  geometrySHA256: '8db1013259722013446e61e8e8e084717f5a5b05cb13dd120e8f69e0502dee32',
  hotspots: Object.freeze([
    {id:'upper-mount',label:'Upper mount',position:[0.145,0.98,0.0494549386203289],text:'Illustrative upper mounting eye. The displayed shape does not establish bolt size, fit or load capacity.'},
    {id:'spring',label:'Spring',position:[0,0.0575,0.27346660007990264],text:'Explore the modelled coil and surrounding clearance visually. Spring rate and travel cannot be inferred from this demo geometry.'},
    {id:'reservoir',label:'Side reservoir',position:[0.34,0.41,0.14000000031458737],text:'Illustrative side cylinder in this asset. It is not a manufacturer-verified adjustment or servicing guide.'},
  ]),
});
export function profileForURL(url) {
  if(typeof url!=='string' || !/^\/models\/(?:[\w-]+\/)*[\w-]+\.glb(?:\?v=[\w-]{1,128})?$/.test(url))return null;
  return url.split('?')[0]===APEX_PROFILE.modelPath ? APEX_PROFILE : null;
}
/** Full geometry & authored world transforms are bound; matching filenames alone are insufficient. */
export async function fingerprintGeometry(root, digest=globalThis.crypto?.subtle) {
  if(!digest)return null;
  root.updateMatrixWorld(true);
  const parts=[];let count=0,triangles=0;
  root.traverse(node=>{
    if(!node.isMesh || node.userData?.dthStudyOverlay)return;
    const pos=node.geometry?.attributes?.position;
    if(!pos || pos.itemSize!==3 || node.isSkinnedMesh || node.isInstancedMesh || Object.keys(node.geometry.morphAttributes||{}).length){parts.push(null);return;}
    count+=pos.count;triangles+=(node.geometry.index?.count ?? pos.count)/3;
    if(count>STUDY.maxVertices || triangles>STUDY.maxTriangles)return;
    const vertices=[];
    for(let i=0;i<pos.count;i++)vertices.push(pos.getX(i),pos.getY(i),pos.getZ(i));
    const index=node.geometry.index;
    const indices=index ? Array.from({length:index.count},(_,i)=>index.getX(i)) : null;
    parts.push({name:node.name,matrix:node.matrixWorld.elements.slice(),vertices,indices});
  });
  if(!parts.length||parts.includes(null)||count>STUDY.maxVertices||triangles>STUDY.maxTriangles)return null;
  const bytes=new TextEncoder().encode(JSON.stringify(parts));
  const hash=await digest.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
}
export function resolveHotspots(profile, geometryHash, fit) {
  if(!profile || typeof geometryHash!=='string' || profile.geometrySHA256!==geometryHash || !Array.isArray(profile.hotspots) || profile.hotspots.length>STUDY.hotSpotLimit)return [];
  const result=[],ids=new Set();
  for(const item of profile.hotspots){
    if(!item)return [];
    const position=normalizeHotspot(item.position,fit);
    if(!item || !/^[a-z][a-z0-9-]{0,40}$/.test(item.id) || ids.has(item.id) || !position
      || typeof item.label!=='string'||!item.label||item.label.length>60 ||typeof item.text!=='string'||item.text.length>500)return [];
    ids.add(item.id);result.push({id:item.id,label:item.label,text:item.text,position});
  }
  return result;
}
