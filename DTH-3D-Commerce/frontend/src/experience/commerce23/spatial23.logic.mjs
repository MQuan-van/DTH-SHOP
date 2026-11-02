/** Spatial Commerce 23.1. Pure presentation math; no catalogue mutation or fitment inference. */
export const SYSTEMS23 = Object.freeze([
  {id:'suspension',label:'Suspension',short:'Suspension'},
  {id:'wheels',label:'Wheels',short:'Wheels'},
  {id:'brakes',label:'Brakes',short:'Brakes'},
  {id:'exhausts',label:'Exhaust',short:'Exhaust'},
  {id:'mirrors',label:'Mirrors',short:'Mirrors'},
].map(Object.freeze));
export const isSystem23 = id => SYSTEMS23.some(s=>s.id===id);
export const clamp23=(v,a,b)=>Number.isFinite(v)?Math.min(b,Math.max(a,v)):a;
export const smooth23=v=>{const t=clamp23(v,0,1);return t*t*(3-2*t);};
export const shortAngle23=(a,b)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a));
const vector=v=>Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n));
export function mixPose23(a,b,t){
  t=smooth23(t);const mix=(x,y)=>x+(y-x)*t;
  return {radius:mix(a.radius,b.radius),phi:mix(a.phi,b.phi),theta:mix(a.theta,shortAngle23(a.theta,b.theta)),target:a.target.map((v,i)=>mix(v,b.target[i]))};
}
export function boundsCorners23(min,max){
  if(!vector(min)||!vector(max)||min.some((v,i)=>v>max[i]))throw Error('Invalid model bounds.');
  return [0,1].flatMap(x=>[0,1].flatMap(y=>[0,1].map(z=>[x?max[0]:min[0],y?max[1]:min[1],z?max[2]:min[2]])));
}
/** Fits actual box corners, not an oversized sphere. Direction is camera-target. */
export function fitBox23({min,max,aspect,fov=35,theta=.75,phi=1.16,padding=1.12,target}){
  if(![aspect,fov,theta,phi,padding].every(Number.isFinite)||aspect<=0||fov<15||fov>80||phi<=.05||phi>=Math.PI-.05||padding<1)throw Error('Invalid framing input.');
  const corners=boundsCorners23(min,max),center=target||min.map((v,i)=>(v+max[i])/2);
  if(!vector(center))throw Error('Invalid camera target.');
  const forward=[Math.sin(phi)*Math.sin(theta),Math.cos(phi),Math.sin(phi)*Math.cos(theta)];
  const right=[Math.cos(theta),0,-Math.sin(theta)];
  const up=[-Math.cos(phi)*Math.sin(theta),Math.sin(phi),-Math.cos(phi)*Math.cos(theta)];
  const tanV=Math.tan(fov*Math.PI/360),tanH=tanV*aspect;
  let distance=.05;
  for(const c of corners){const p=c.map((v,i)=>v-center[i]);const dot=v=>p.reduce((n,x,i)=>n+x*v[i],0);const z=dot(forward);distance=Math.max(distance,z+Math.abs(dot(right))*padding/tanH,z+Math.abs(dot(up))*padding/tanV);}
  return {target:[...center],radius:distance+.05,phi,theta};
}
/** Full-view idle orbit fits the entire yaw sweep, not just the initial angle. */
export function orbitFitBox23(options){
 const base=fitBox23(options);let radius=base.radius;
 for(let i=0;i<48;i++)radius=Math.max(radius,fitBox23({...options,theta:i*Math.PI/24}).radius);
 return {...base,radius:radius*1.005};
}
export function accountPose23({radius,height,dimensions,aspect,fov=35,mode='overview'}){
  if(!vector(dimensions)||dimensions.some(n=>n<=0))throw Error('Account dimensions are unavailable.');
  const [x,y,z]=dimensions;
  return orbitFitBox23({min:[-x/2,0,-z/2],max:[x/2,y,z/2],aspect,fov,theta:Math.PI*(mode==='vehicle'?.32:.24),phi:Math.PI*.395,padding:1.14});
}
export function nav23(path='/',search=''){
  if(path==='/')return 'studio';if(path.startsWith('/story'))return 'story';
  if(path==='/build'||(path.startsWith('/shop')&&new URLSearchParams(search).get('mode')==='build'))return 'build';
  if(/^\/(shop|products)(\/|$)/.test(path))return 'shop';if(/^\/account(\/|$)/.test(path))return 'account';return '';
}
export function safeProductHref23(p){const id=p?.slug||p?.id;return typeof id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)&&id.length<=80?`/products/${id}`:null;}
export function estimate23(products){if(!Array.isArray(products)||products.some(p=>!Number.isSafeInteger(p?.price)||p.price<1||p.price>1e9))return null;const total=products.reduce((n,p)=>n+p.price,0);return Number.isSafeInteger(total)?total:null;}
export function publicModelPath23(file){
  if(typeof file!=='string')return null;
  if(/^models\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.glb$/.test(file))return file;
  if(/^api\/shop\/ai-assets\/models\/v[123]\.glb\?rev=[a-f0-9-]{36}$/.test(file))return file;
  return null;
}
export function assetKey23(spec){return spec?`${spec.id}|${spec.file||''}|${(spec.rotation||[0,0,0]).join(',')}`:'';}
export function emptyProfile23(spec,sha256){
  if(!/^yamaha-nvx-v[123]$/.test(spec?.id)||!publicModelPath23(spec?.file)||!/^[a-f0-9]{64}$/.test(sha256))throw Error('Cannot author an unidentified model.');
  return {schemaVersion:1,vehicleId:spec.id,assetFile:spec.file,sha256,rotation:[...(spec.rotation||[0,0,0])],coordinateSpace:'normalized-stage-4-v1',anchors:{}};
}
/** Public read-only focus profile. Authored points bind to exact GLB bytes and orientation. */
export function validateProfile23(value,spec,sha256){
  const fail=()=>{throw Error('Focus profile does not match this GLB. Re-author the points for this model.');};
  if(!value||typeof value!=='object'||Array.isArray(value)||value.schemaVersion!==1||value.coordinateSpace!=='normalized-stage-4-v1'||value.vehicleId!==spec?.id||value.assetFile!==spec?.file||value.sha256!==sha256||!/^[a-f0-9]{64}$/.test(sha256))fail();
  if(!vector(value.rotation)||value.rotation.some((v,i)=>v!==(spec.rotation||[0,0,0])[i]))fail();
  if(!value.anchors||typeof value.anchors!=='object'||Array.isArray(value.anchors)||Object.keys(value.anchors).length>5)fail();
  const result=emptyProfile23(spec,sha256);
  for(const [id,a] of Object.entries(value.anchors)){
    if(!isSystem23(id)||!a||!vector(a.point)||a.point.some(n=>Math.abs(n)>8)||!vector(a.normal)||Math.hypot(...a.normal)<.5||Math.hypot(...a.normal)>1.5)fail();
    const p=a.pose;if(!p||!vector(p.target)||p.target.some(n=>Math.abs(n)>8)||![p.radius,p.theta,p.phi].every(Number.isFinite)||p.radius<.3||p.radius>40||p.phi<.12||p.phi>Math.PI-.12||Math.abs(p.theta)>100)fail();
    result.anchors[id]={point:[...a.point],normal:[...a.normal],pose:{target:[...p.target],radius:p.radius,theta:p.theta,phi:p.phi}};
  }
  return result;
}
export function focusProfilePath23(spec){return /^yamaha-nvx-v[123]$/.test(spec?.id)?`models/nvx/focus/${spec.id}.json`:null;}
export function profileDownloadName23(id){return /^yamaha-nvx-v[123]$/.test(id)?`${id}.json`:null;}
/** Limit labels to the visible stage. The renderer provides visibility/occlusion decisions. */
export function labelLayout23(points,width,height){
  if(![width,height].every(Number.isFinite)||width<180||height<160)return [];
  const margin=18,gap=58,minY=68,maxY=Math.max(minY,height-108),center=width/2;
  const used=points.filter(p=>p.visible&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height).slice(0,5);
  const result=[];
  for(const side of ['left','right']){
    const items=used.filter(p=>(p.x<center?'left':'right')===side).sort((a,b)=>a.y-b.y);
    const allowedGap=items.length>1?Math.min(gap,(maxY-minY)/(items.length-1)):gap;
    let last=minY-allowedGap;
    for(let i=0;i<items.length;i++){
      const p=items[i],remaining=items.length-1-i;
      const y=clamp23(Math.max(p.y,last+allowedGap),minY,maxY-remaining*allowedGap);last=y;
      const lx=side==='left'?margin:width-margin;
      result.push({...p,side,labelX:lx,labelY:y,path:`M ${p.x.toFixed(1)} ${p.y.toFixed(1)} L ${((p.x+lx)/2).toFixed(1)} ${y.toFixed(1)} L ${lx.toFixed(1)} ${y.toFixed(1)}`});
    }
  }
  return result;
}
export function readGLBReport23(input){
  const b=input instanceof Uint8Array?input:new Uint8Array(input);
  if(b.length<20)throw Error('GLB is incomplete.');const d=new DataView(b.buffer,b.byteOffset,b.byteLength);
  if(d.getUint32(0,true)!==0x46546c67||d.getUint32(4,true)!==2||d.getUint32(8,true)!==b.byteLength)throw Error('Not a complete GLB 2.0 file. A Git LFS pointer is not a model.');
  const n=d.getUint32(12,true);if(d.getUint32(16,true)!==0x4e4f534a||n<2||n>16*1024*1024||20+n>b.length)throw Error('Invalid GLB JSON chunk.');
  const j=JSON.parse(new TextDecoder().decode(b.subarray(20,20+n)).trim());
  return {bytes:b.length,nodes:(j.nodes||[]).map((o,i)=>({index:i,name:o.name||'',mesh:o.mesh??null})),meshes:(j.meshes||[]).map((o,i)=>({index:i,name:o.name||'',primitives:(o.primitives||[]).length})),materials:(j.materials||[]).map(o=>o.name||''),extensions:j.extensionsUsed||[]};
}
