import { STORY214 } from './story214.config.mjs';
const finite = (v, fallback = 0) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
export const clamp214 = (v, lo, hi) => Math.max(lo, Math.min(hi, finite(v, lo)));
export function smooth214(start, end, value) {
  const p = clamp214((value - start) / (end - start), 0, 1); return p*p*(3-2*p);
}
/** A pure function of scroll POSITION. Reversing never accumulates another rotation. */
export function frame214(position, count, motion = true) {
  const total = Number.isSafeInteger(count) && count > 0 ? count : 0;
  if (!total) return { position: 0, left: -1, right: -1, primary: -1, mix: 0, hold: 0 };
  const p = clamp214(position, 0, total - 1), left = Math.floor(p), right = Math.min(total - 1, left + 1);
  const segment = p - left, mix = right === left ? 0 : smooth214(STORY214.travelStart, STORY214.travelEnd, segment);
  const primary = mix >= .5 ? right : left;
  if (!motion) return { position: p, left: primary, right: primary, primary, mix: 0, hold: 0 };
  return { position: p, left, right, primary, mix, hold: clamp214(segment/STORY214.travelStart, 0, 1) };
}
export function isStoryView214(input) {
  const p = new URLSearchParams(input);
  if (p.get('view') === 'story') return true;
  if (p.get('view') === 'grid') return false;
  // Keep existing explicit layout bookmarks usable. Otherwise Story is the default.
  return !['grid','wide','compact'].includes(p.get('layout'));
}
export function setShopView214(input, view) {
  if (!['story','grid'].includes(view)) throw new TypeError('Unknown shop view.');
  const p=new URLSearchParams(input);p.set('mode','shop');p.set('view',view);
  if(view==='story'){p.delete('layout');p.delete('page');} else if(!p.has('layout'))p.set('layout','grid');
  return p;
}
export function returnToChapter214(input, id) {
  const p=new URLSearchParams(input);p.set('mode','shop');p.set('view','story');p.delete('layout');
  if(typeof id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)&&id.length<=80)p.set('chapter',id);
  return '/shop?'+p.toString();
}
const rad = n => n*Math.PI/180;
const lerp = (a,b,p) => a+(b-a)*p;
function baseCamera(settings, index, hold, moving) {
  const camera=settings?.camera||{}, scale=finite(settings?.scale,1);
  const off=Array.isArray(settings?.offset)?settings.offset:[0,0,0];
  const radius=1.35*scale+Math.hypot(...off.map(n=>finite(n)));
  const accent=[0,-9,11][index%3]||0;
  return {yaw:rad(finite(camera.yawDeg,16)+(moving ? accent - 10 + 22*hold : 0)),
    pitch:rad(clamp214(finite(camera.pitchDeg,5)+(moving ? 3*(1-hold) : 0),-60,60)),
    zoom:clamp214(finite(camera.zoom,1),.7,1.25)*(moving ? lerp(.97,1.035,hold) : 1),radius};
}
/** Camera moves, not authored mesh orientation. Same pose at the same scroll position. */
export function camera214(frame, leftSettings, rightSettings, width, height, motion=true) {
  const a=baseCamera(leftSettings,Math.max(0,frame.left),frame.hold,motion);
  const b=baseCamera(rightSettings,Math.max(0,frame.right),0,motion);
  const fov=36, vertical=rad(fov),aspect=Math.max(1,width)/Math.max(1,height);
  const horizontal=2*Math.atan(Math.tan(vertical/2)*aspect);
  const envelope=Math.max(a.radius,b.radius),factor=1.16/Math.sin(Math.min(vertical,horizontal)/2);
  const shortest=Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw));
  const mix=frame.mix,yaw=a.yaw+shortest*mix,pitch=lerp(a.pitch,b.pitch,mix);
  const distance=lerp(Math.max(1.35*factor/a.zoom,a.radius*1.65),Math.max(1.35*factor/b.zoom,b.radius*1.65),mix);
  const right=[Math.cos(yaw),0,-Math.sin(yaw)];
  // Far enough to take both product bounding spheres fully outside the canvas.
  const travel=distance*Math.tan(horizontal/2)+envelope*2.15;
  return {fov,position:[Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance],
    right,travel,outgoing:-travel*mix,incoming:travel*(1-mix),envelope};
}
export function createStoryClock214(count, motion=true) {
  let current=frame214(0,count,motion), listeners=new Set();
  return {read:()=>current,
    set(position){current=frame214(position,count,motion);for(const f of [...listeners])f(current);return current;},
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    clear(){listeners.clear();},get subscriberCount(){return listeners.size;}};
}
export function chapterIndex214(products, candidate) {
  const index=products.findIndex(p=>p.id===candidate);return index<0?0:index;
}
