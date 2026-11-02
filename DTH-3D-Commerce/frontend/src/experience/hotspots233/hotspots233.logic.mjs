import { assetKey23, emptyProfile23, validateProfile23, clamp23, shortAngle23 } from '../commerce23/spatial23.logic.mjs';

export const STEP233 = '23.3';
export const SLOTS233 = Object.freeze([
  ['suspension-rear','suspension','Rear suspension'],
  ['suspension-front','suspension','Front suspension'],
  ['wheels-front','wheels','Front wheel'], ['wheels-rear','wheels','Rear wheel'],
  ['brakes-front','brakes','Front brake'], ['brakes-rear','brakes','Rear brake'],
  ['exhaust','exhausts','Exhaust'], ['mirror-left','mirrors','Left mirror'], ['mirror-right','mirrors','Right mirror'],
  // Legacy category-level anchors retain their original meaning. A generic wheel is NOT relabelled front/rear.
  ['suspension','suspension','Suspension'], ['wheels','wheels','Wheels'], ['brakes','brakes','Brakes'],
  ['exhausts','exhausts','Exhaust'], ['mirrors','mirrors','Mirrors'],
].map(([id,category,label])=>Object.freeze({id,category,label})));
export const slot233 = id => SLOTS233.find(s=>s.id===id) || null;
export const vector233 = v => Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n));
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const fail=message=>{throw new Error(message);};
export const emptyProfile233=(spec,hash)=>({...emptyProfile23(spec,hash),schemaVersion:2});

/** Pure, defensive parser. It never writes data or guesses an anatomical/mechanical point. */
export function validateProfile233(input,spec,hash,{bounds}={}) {
  if(input?.schemaVersion===1) {
    const old=validateProfile23(input,spec,hash);
    input={...old,schemaVersion:2,anchors:Object.fromEntries(Object.entries(old.anchors).map(([id,a])=>[id,{...a,pickRadius:.18,viewAspect:1.5,confirmed:true}]))};
  }
  const base=emptyProfile233(spec,hash);
  if(!input||Array.isArray(input)||input.schemaVersion!==2||input.coordinateSpace!==base.coordinateSpace||input.vehicleId!==spec.id||input.assetFile!==spec.file||input.sha256!==hash||!vector233(input.rotation)||input.rotation.some((n,i)=>n!==base.rotation[i])) fail('Profile identity does not match this exact GLB and orientation.');
  if(!input.anchors||typeof input.anchors!=='object'||Array.isArray(input.anchors)||Object.keys(input.anchors).length>14) fail('Invalid hotspot collection.');
  if(bounds&&(!vector233(bounds.min)||!vector233(bounds.max)||bounds.min.some((n,i)=>n>bounds.max[i])))fail('Invalid model bounds.');
  for(const [id,a] of Object.entries(input.anchors)) {
    if(!slot233(id)||!a||a.confirmed!==true||!vector233(a.point)||a.point.some(n=>Math.abs(n)>8)||!vector233(a.normal))fail('A hotspot is invalid or has not been confirmed.');
    const length=Math.hypot(...a.normal);
    if(length<.5||length>1.5)fail('Invalid surface normal.');
    if(bounds&&a.point.some((n,i)=>n<bounds.min[i]-.025||n>bounds.max[i]+.025))fail('A hotspot lies outside the loaded model.');
    const p=a.pose;
    if(!p||!vector233(p.target)||p.target.some(n=>Math.abs(n)>8)||![p.radius,p.phi,p.theta].every(n=>typeof n==='number'&&Number.isFinite(n))||p.radius<.3||p.radius>40||p.phi<.12||p.phi>Math.PI-.12||Math.abs(p.theta)>100)fail('Invalid camera pose.');
    const radius=a.pickRadius??.18,aspect=a.viewAspect??1.5;
    if(!Number.isFinite(radius)||radius<.05||radius>.55||!Number.isFinite(aspect)||aspect<.2||aspect>6)fail('Invalid selection radius or authoring viewport.');
    base.anchors[id]={point:[...a.point],normal:a.normal.map(n=>n/length),pose:{target:[...p.target],radius:p.radius,phi:p.phi,theta:p.theta},pickRadius:radius,viewAspect:aspect,confirmed:true};
  }
  return base;
}
export function resolveSlot233(profile,category,preferred='') {
  if(profile?.anchors?.[preferred]&&slot233(preferred)?.category===category)return preferred;
  return SLOTS233.find(s=>s.category===category&&profile?.anchors?.[s.id])?.id || '';
}
/** Match a real visible surface hit to an authored neighbourhood, not to a guessed mesh name. */
export function pickSlot233(point,profile,visibleIds) {
  if(!vector233(point))return null;
  const visible=new Set(visibleIds||[]);
  const choices=Object.entries(profile?.anchors||{}).filter(([id])=>visible.has(id)).map(([id,a])=>({id,score:distance(point,a.point)/a.pickRadius})).filter(a=>a.score<=1).sort((a,b)=>a.score-b.score);
  if(!choices.length)return null;
  if(choices[1]&&choices[0].score>.82*choices[1].score)return null; // ambiguous overlap: use the explicit labels
  return choices[0].id;
}
export function isClick233(down,up) {
  return !!down&&!!up&&down.id===up.id&&down.primary!==false&&up.primary!==false&&down.button===0&&Math.hypot(up.x-down.x,up.y-down.y)<=6&&up.time-down.time>=0&&up.time-down.time<=700;
}
export function focusPose233(anchor,aspect) {
  if(!anchor||!Number.isFinite(aspect)||aspect<=0)throw Error('Invalid focus input.');
  const factor=Math.max(1,Math.min(2.5,anchor.viewAspect/aspect));
  return {...anchor.pose,target:[...anchor.pose.target],radius:Math.min(40,anchor.pose.radius*factor)};
}
export function posePosition233(p) {return [p.target[0]+p.radius*Math.sin(p.phi)*Math.sin(p.theta),p.target[1]+p.radius*Math.cos(p.phi),p.target[2]+p.radius*Math.sin(p.phi)*Math.cos(p.theta)];}
export function mixPose233(a,b,t) {
  t=clamp23(t,0,1); const e=t*t*t*(t*(t*6-15)+10),mix=(x,y)=>x+(y-x)*e;
  return {radius:mix(a.radius,b.radius),phi:mix(a.phi,b.phi),theta:mix(a.theta,shortAngle23(a.theta,b.theta)),target:a.target.map((n,i)=>mix(n,b.target[i]))};
}
/** Retreat/orbit/approach: avoids a direct camera shortcut through the centre of the vehicle.
 * Does not certify collision-free paths for arbitrary geometry; the engine ray-checks each sampled step.
 */
export function journey233(from,to,bounds) {
  if(!bounds||!vector233(bounds.min)||!vector233(bounds.max))throw Error('Missing journey bounds.');
  const center=bounds.min.map((n,i)=>(n+bounds.max[i])/2),radius=distance(bounds.min,bounds.max)/2;
  const toCentered=p=>{const pos=posePosition233(p),o=pos.map((n,i)=>n-center[i]),r=Math.hypot(...o);return{target:[...center],radius:r,phi:Math.acos(clamp23(o[1]/Math.max(r,1e-8),-1,1)),theta:Math.atan2(o[0],o[2])};};
  const a=toCentered(from),b=toCentered(to),safe=Math.max(radius*1.25+.15,a.radius,b.radius);
  return [{to:{...a,radius:safe},seconds:.20},{to:{...b,radius:safe},seconds:.38},{to,seconds:.28}];
}
/** Deterministic layout, stable side with hysteresis; labels end on the edge nearest the anchor. */
export function layout233(points,width,height,{active='',previousSides={}}={}) {
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<240||height<210)return [];
  const small=width<600,labelWidth=small?112:140,margin=12,top=56,bottom=Math.max(top,height-100),gap=small?48:56;
  let list=points.filter(p=>p.visible&&slot233(p.id)&&[p.x,p.y].every(Number.isFinite)&&p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height).map(p=>({...p}));
  if(active&&list.some(p=>p.id===active))list=list.filter(p=>p.id===active);
  if(small&&list.length>3)list=list.slice(0,3); // the separate keyboard selector always exposes every authored point
  const result=[];
  for(const side of ['left','right']) {
    const items=list.filter(p=>{const previous=previousSides[p.id];p.side=(previous&&Math.abs(p.x-width/2)<48)?previous:p.x<width/2?'left':'right';return p.side===side;}).sort((a,b)=>a.y-b.y||a.id.localeCompare(b.id));
    const available=Math.max(1,Math.floor((bottom-top)/gap)+1),shown=items.slice(0,available);
    let last=top-gap;
    for(let i=0;i<shown.length;i++) {
      const p=shown[i],y=clamp23(Math.max(p.y,last+gap),top,bottom-(shown.length-1-i)*gap),x=side==='left'?margin:width-margin-labelWidth;
      last=y;const endX=side==='left'?x+labelWidth:x,bendX=side==='left'?endX+16:endX-16;
      result.push({...p,labelX:x,labelY:y,labelWidth,path:`M ${p.x.toFixed(2)} ${p.y.toFixed(2)} L ${bendX.toFixed(2)} ${y.toFixed(2)} L ${endX.toFixed(2)} ${y.toFixed(2)}`});
    }
  }
  return result;
}
export function visibleCache233(sample,position,now){return !!sample?.visible&&vector233(sample.camera)&&Number.isFinite(sample.time)&&vector233(position)&&now-sample.time>=0&&now-sample.time<=650&&distance(sample.camera,position)<=.16;}
export function profileStoreKey233(spec,hash){return `dth-focus233:${assetKey23(spec)}:${hash}`;}
