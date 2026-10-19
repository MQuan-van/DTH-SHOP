/** Versioned, data-only presentation contract. Never read by fitment, price or checkout. */
export const PROFILE_SCHEMA_VERSION = 1;
export const PROFILE_LIMITS = Object.freeze({ hotspots: 6, registry: 250, documentBytes: 32768 });
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const denied = new Set(['__proto__', 'constructor', 'prototype']);
const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
export const isLocalModelURL = value => typeof value === 'string' && /^\/models\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.glb(?:\?v=[A-Za-z0-9_-]{1,128})?$/.test(value);
export const modelPath = value => isLocalModelURL(value) ? value.split('?')[0] : null;

function object(input, keys, path) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) fail(path, 'expected a plain object');
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string' || denied.has(key) || !keys.includes(key)) fail(path, 'unknown field');
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!own(descriptor, 'value')) fail(`${path}.${key}`, 'accessors are not data');
  }
  for (const key of keys) if (!own(input, key)) fail(`${path}.${key}`, 'required');
  return input;
}
function num(value, low, high, path) { if (typeof value !== 'number' || !Number.isFinite(value) || value < low || value > high) fail(path, `expected a finite number in ${low}..${high}`); return value; }
function text(value, min, max, path) {
  if (typeof value !== 'string' || value.length < min || value.length > max || value.trim() !== value || /[\u0000-\u001f\u007f]/u.test(value)) fail(path, 'invalid text');
  return value;
}
function id(value, path) { text(value, 1, 80, path); if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) fail(path, 'use lowercase letters, digits and hyphens'); return value; }
function vector(value, bound, path) {
  if (!Array.isArray(value) || value.length !== 3 || Reflect.ownKeys(value).length !== 4) fail(path, 'expected exactly three numeric coordinates');
  return [0,1,2].map(i => { const d = Object.getOwnPropertyDescriptor(value, String(i)); if (!d || !own(d, 'value')) fail(path, 'invalid vector'); return num(d.value, -bound, bound, `${path}[${i}]`); });
}
function boolean(value, path) { if (typeof value !== 'boolean') fail(path, 'expected a boolean'); return value; }
function oneOf(value, values, path) { if (!values.includes(value)) fail(path, 'unsupported value'); return value; }
function pose(value, path) {
  object(value, ['position','target'], path);
  const position=vector(value.position,30,`${path}.position`),target=vector(value.target,4,`${path}.target`);
  if (Math.hypot(...position.map((n,i)=>n-target[i])) < .1) fail(path, 'camera cannot coincide with its target');
  return {position,target};
}
export function freezeProfile(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freezeProfile); Object.freeze(value); }
  return value;
}
export function validate3DProfile(input) {
  try {
    object(input,['schemaVersion','profileId','productId','version','asset','transform','camera','modes','hotspots','provenance'],'profile');
    if (input.schemaVersion !== PROFILE_SCHEMA_VERSION) fail('schemaVersion','unsupported profile schema');
    const profileId=id(input.profileId,'profileId'),productId=id(input.productId,'productId');
    const version=text(input.version,5,40,'version');
    if (!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(version)) fail('version','expected semantic version, e.g. 1.0.0');
    object(input.asset,['url','sha256'],'asset');
    const url=input.asset.url;
    if (!isLocalModelURL(url) || url.includes('?')) fail('asset.url','use an unversioned same-origin /models/...glb path');
    const sha256=text(input.asset.sha256,64,64,'asset.sha256');
    if (!/^[0-9a-f]{64}$/.test(sha256)) fail('asset.sha256','expected lowercase SHA-256 of GLB bytes');
    object(input.transform,['rotation','scale','offset'],'transform');
    const transform={rotation:vector(input.transform.rotation,Math.PI*2,'transform.rotation'),scale:num(input.transform.scale,.5,1.5,'transform.scale'),offset:vector(input.transform.offset,.5,'transform.offset')};
    object(input.camera,['fov','presets'],'camera');
    object(input.camera.presets,['front','side','rear','detail'],'camera.presets');
    const camera={fov:num(input.camera.fov,24,60,'camera.fov'),presets:Object.fromEntries(['front','side','rear','detail'].map(name=>[name,pose(input.camera.presets[name],`camera.presets.${name}`)]))};
    object(input.modes,['surface','technical','hotspots'],'modes');
    const modes=Object.fromEntries(['surface','technical','hotspots'].map(k=>[k,boolean(input.modes[k],`modes.${k}`)]));
    const entries=input.hotspots;
    if (!Array.isArray(entries)||entries.length>PROFILE_LIMITS.hotspots||Reflect.ownKeys(entries).length!==entries.length+1) fail('hotspots','expected at most six authored markers');
    for(let i=0;i<entries.length;i++){const descriptor=Object.getOwnPropertyDescriptor(entries,String(i));if(!descriptor||!own(descriptor,'value'))fail('hotspots','array accessors are not data');}
    const ids=new Set();
    const hotspots=Array.from(entries,(h,i)=>{
      const path=`hotspots[${i}]`;object(h,['id','label','description','position','focus'],path);
      const key=id(h.id,`${path}.id`);if(key.length>40||!/[a-z]/.test(key[0])||ids.has(key)) fail(path,'invalid or duplicate hotspot ID');ids.add(key);
      return {id:key,label:text(h.label,1,60,`${path}.label`),description:text(h.description,0,500,`${path}.description`),position:vector(h.position,1000000,`${path}.position`),focus:h.focus===null?null:pose(h.focus,`${path}.focus`)};
    });
    if(modes.hotspots && !hotspots.length) fail('modes.hotspots','cannot enable without authored markers');
    object(input.provenance,['source','tool','license','attribution','captureDate','optimized','purpose'],'provenance');
    const p=input.provenance;
    const provenance={source:oneOf(p.source,['demo','photogrammetry','ai-generated','manual','unknown'],'provenance.source'),tool:text(p.tool,0,100,'provenance.tool'),license:text(p.license,1,160,'provenance.license'),attribution:text(p.attribution,0,500,'provenance.attribution'),captureDate:p.captureDate,optimized:oneOf(p.optimized,[true,false,null],'provenance.optimized'),purpose:oneOf(p.purpose,['visualization-only'],'provenance.purpose')};
    if(p.captureDate!==null){if(typeof p.captureDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.captureDate)||!Number.isFinite(Date.parse(p.captureDate))||new Date(p.captureDate).toISOString().slice(0,10)!==p.captureDate)fail('provenance.captureDate','expected a real YYYY-MM-DD date or null');}
    return {ok:true,profile:freezeProfile({schemaVersion:1,profileId,productId,version,asset:{url,sha256},transform,camera,modes,hotspots,provenance}),errors:[]};
  } catch(error) { return {ok:false,profile:null,errors:[error.message || 'Invalid profile']}; }
}
export function parse3DProfile(source) {
  if(typeof source!=='string'||new TextEncoder().encode(source).byteLength>PROFILE_LIMITS.documentBytes) return {ok:false,profile:null,errors:['Profile document exceeds 32 KiB or is not text']};
  try{return validate3DProfile(JSON.parse(source));}catch{return {ok:false,profile:null,errors:['Profile is not valid JSON']};}
}
/** A matching filename is not enough; transforms and annotations require exact asset bytes. */
export function bind3DProfile(candidate, product, actualSHA256) {
  if(!candidate) return {status:'automatic',profile:null,reason:'No product profile; automatic framing.'};
  const parsed=validate3DProfile(candidate);
  if(!parsed.ok) return {status:'invalid-profile',profile:null,reason:'Invalid presentation profile; automatic framing.',details:parsed.errors};
  const p=parsed.profile;
  if(p.productId!==product?.id || p.asset.url!==modelPath(product?.modelUrl))return {status:'binding-mismatch',profile:null,reason:'Profile belongs to another product or model; automatic framing.'};
  if(typeof actualSHA256!=='string'||!/^[a-f0-9]{64}$/.test(actualSHA256))return {status:'unverified',profile:null,reason:'Asset identity could not be checked; automatic framing without annotations.'};
  if(actualSHA256!==p.asset.sha256)return {status:'asset-changed',profile:null,reason:'Model version differs from the profile; automatic framing without annotations.'};
  return {status:'profile',profile:p,reason:''};
}
