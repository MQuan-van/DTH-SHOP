import * as THREE from 'three';
import { PRODUCT_VIEW } from '../productDecision.logic.mjs';
import { frameDistance, sphereNormalization } from '../inspection.logic.mjs';
import { ASSET_LIMITS, AssetValidationError } from './modelValidation.mjs';

/** Runtime geometry checks complement preflight; they do not certify real-world measurements. */
export function inspectProductGeometry(root) {
  let meshes=0,vertices=0,triangles=0;const textures=new Set();
  root.updateMatrixWorld(true);
  root.traverse(node=>{
    if(!node.isMesh || node.userData?.dthStudyOverlay)return;
    const g=node.geometry,p=g?.attributes?.position;
    if(!p || p.itemSize!==3 || node.isSkinnedMesh || node.isInstancedMesh || Object.keys(g.morphAttributes||{}).length)throw new AssetValidationError('geometry','Use a static product model with ordinary triangle meshes.');
    meshes++;vertices+=p.count;triangles+=(g.index?.count??p.count)/3;
    if(meshes>ASSET_LIMITS.meshes||vertices>ASSET_LIMITS.vertices||triangles>ASSET_LIMITS.triangles)throw new AssetValidationError('complexity','Decoded geometry exceeds the product-viewer budget.');
    for(let i=0;i<p.count;i++)if(![p.getX(i),p.getY(i),p.getZ(i)].every(n=>Number.isFinite(n)&&Math.abs(n)<=1e9))throw new AssetValidationError('geometry','Model contains invalid vertex coordinates.');
    if(g.index)for(let i=0;i<g.index.count;i++){const n=g.index.getX(i);if(!Number.isSafeInteger(n)||n<0||n>=p.count)throw new AssetValidationError('geometry','Model contains an invalid triangle index.');}
    if(!node.matrixWorld.elements.every(Number.isFinite)||Math.abs(node.matrixWorld.determinant())<1e-30)throw new AssetValidationError('transform','Model has a singular or invalid authored transform.');
    const mats=Array.isArray(node.material)?node.material:[node.material];
    if(mats.some(m=>!m?.isMaterial))throw new AssetValidationError('material','Model is missing a material.');
    mats.forEach(m=>Object.values(m).forEach(v=>{if(v?.isTexture)textures.add(v);}));
  });
  if(!meshes||!vertices||!Number.isInteger(triangles))throw new AssetValidationError('geometry','No usable triangle meshes.');
  let pixels=0;for(const texture of textures){const image=texture.image;if(!image)continue;const w=image.width,h=image.height;
    if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0||w>ASSET_LIMITS.textureEdge||h>ASSET_LIMITS.textureEdge)throw new AssetValidationError('texture-size','Texture dimensions exceed the product budget.');pixels+=w*h;}
  if(pixels>ASSET_LIMITS.texturePixels)throw new AssetValidationError('texture-memory','Decoded textures exceed the pixel budget.');
  const box=new THREE.Box3().setFromObject(root,true),sphere=box.getBoundingSphere(new THREE.Sphere());
  if(box.isEmpty()||!Number.isFinite(sphere.radius)||sphere.radius<1e-9||sphere.radius>1e9)throw new AssetValidationError('bounds','Model does not have usable finite bounds.');
  const normalization=sphereNormalization(sphere.center.toArray(),sphere.radius);
  return {box,sphere,normalization,meshes,vertices,triangles,textures:textures.size};
}
const asPosition=(theta,phi,r,center)=>[r*Math.sin(phi)*Math.sin(theta)+center[0],r*Math.cos(phi)+center[1],r*Math.sin(phi)*Math.cos(theta)+center[2]];
export function automaticCamera(radius=PRODUCT_VIEW.radius,center=[0,0,0],fov=PRODUCT_VIEW.fov) {
  const d=frameDistance(800,600,radius,fov);
  return {radius,center:center.slice(),fov,referenceDistance:d,presets:{
    front:{position:asPosition(.28,Math.PI/2-.08,d,center),target:center.slice()},
    side:{position:asPosition(Math.PI/2,Math.PI/2,d,center),target:center.slice()},
    rear:{position:asPosition(Math.PI,Math.PI/2-.08,d,center),target:center.slice()},
    detail:{position:asPosition(.28,Math.PI/2-.16,d*.76,center),target:center.slice()},
  }};
}
export function validateCameraPose(pose,camera) {
  if(!pose || ![pose.position,pose.target].every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)))throw new Error('Invalid camera coordinates.');
  const delta=pose.position.map((v,i)=>v-pose.target[i]),distance=Math.hypot(...delta),offset=Math.hypot(...pose.target.map((v,i)=>v-camera.center[i]));
  const clearance=camera.radius*(2.05/1.35),phi=Math.acos(Math.max(-1,Math.min(1,delta[1]/distance)));
  if(offset>camera.radius*.8||distance<clearance+offset||distance>camera.referenceDistance*1.9||phi<.18||phi>Math.PI-.18)throw new Error('Profile camera is outside safe framing limits.');
  return {position:pose.position.slice(),target:pose.target.slice()};
}
/** Source coordinates include authored glTF node transforms, before this view's normalization. */
export function makePresentation(measured,profile=null) {
  const n=measured.normalization,rotation=profile?.transform.rotation??[0,0,0],factor=profile?.transform.scale??1,center=profile?.transform.offset??[0,0,0];
  const scale=n.scale*factor,radius=PRODUCT_VIEW.radius*factor;
  const matrix=new THREE.Matrix4().makeTranslation(...center)
    .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation,'XYZ')))
    .multiply(new THREE.Matrix4().makeScale(scale,scale,scale))
    .multiply(new THREE.Matrix4().makeTranslation(...n.offset));
  const transformed=measured.box.clone().applyMatrix4(matrix);
  const camera=automaticCamera(radius,center,profile?.camera.fov??PRODUCT_VIEW.fov);
  if(profile)for(const name of ['front','side','rear','detail'])camera.presets[name]=validateCameraPose(profile.camera.presets[name],camera);
  const hotspots=[];
  if(profile?.modes.hotspots)for(const h of profile.hotspots){
    const position=new THREE.Vector3(...h.position).applyMatrix4(matrix).toArray();
    if(!position.every(Number.isFinite)||Math.hypot(...position.map((v,i)=>v-center[i]))>radius*1.025)throw new Error('An authored hotspot lies outside this model.');
    hotspots.push({id:h.id,label:h.label,text:h.description,position,focus:h.focus===null?null:validateCameraPose(h.focus,camera)});
  }
  return {scale,offset:n.offset.slice(),rotation:rotation.slice(),center:center.slice(),radius,camera,hotspots,
    heightRange:[transformed.min.y,Math.max(transformed.max.y-transformed.min.y,.00001)],
    sourceBounds:{min:measured.box.min.toArray(),max:measured.box.max.toArray()},matrix:matrix.toArray()};
}
export function resolvePresentation(measured,binding) {
  if(binding.profile){try{return {...binding,presentation:makePresentation(measured,binding.profile)};}catch(error){return {status:'spatial-profile-invalid',profile:null,reason:'Profile coordinates are not safe for this asset; using automatic framing without annotations.',details:[error.message],presentation:makePresentation(measured)};}}
  return {...binding,presentation:makePresentation(measured)};
}
