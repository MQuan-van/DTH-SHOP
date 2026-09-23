import { InputError } from './domain.mjs';
/** One Home-only switch restores the original showroom without changing commerce. */
export const BASE_CINEMATIC_CONFIG = {
  enabled: true,
  productId: 'apex-suspension',
  storyScreens: 3.2,
  scrubSeconds: 0.55,
  entranceSeconds: 1.15,
  settleRate: 11,
  pointerRadians: 0.045,
  loadTimeoutMs: 20000,
  maxDpr: 1.5,
  ecoDpr: 1,
  chapters: [
    { id: 'form', at: 0, label: 'Form', title: ['Beyond', 'the surface.'], note: 'A different perspective on your next build.' },
    { id: 'surface', at: 0.29, label: 'Surface', title: ['Every angle.', 'Every detail.'], note: 'Get closer to the spring, finish and silhouette.' },
    { id: 'assembly', at: 0.61, label: 'Assembly', title: ['One part.', 'Many perspectives.'], note: 'An illustrative assembly. Scroll to take it apart.' },
    { id: 'build', at: 1, label: 'Your build', title: ['Find your', 'next angle.'], note: 'Choose your vehicle. Explore the matching collection.' },
  ],
};

// Creative framing only. These are scene units, NOT dimensions/specifications.
export const STORY_FRAMES = [
  { at: 0, camera: [0, 0.35, 8.4], target: [0, 0, 0], position: [0.8, 0.10, 0], rotation: [-0.08, -0.50, -0.32], scale: 1.4, explode: 0 },
  { at: 0.15, camera: [0.7, 0.45, 7.5], target: [0.25, 0.1, 0], position: [0.8, 0.10, 0], rotation: [-0.06, -0.20, -0.19], scale: 1.4, explode: 0 },
  { at: 0.29, camera: [1.6, 0.7, 5.5], target: [0.75, 0.3, 0], position: [1.0, 0.02, 0], rotation: [0.02, 0.50, 0.12], scale: 1.4, explode: 0 },
  { at: 0.44, camera: [1.3, 0.8, 7.8], target: [0.15, 0.05, 0], position: [0.6, 0, 0], rotation: [0.04, 0.24, 0.05], scale: 1.4, explode: 0.4 },
  { at: 0.61, camera: [1.4, 0.65, 10.5], target: [0, 0, 0], position: [0.5, 0, 0], rotation: [0, 0.08, 0], scale: 1.4, explode: 1 },
  { at: 0.74, camera: [-0.8, 0.8, 10], target: [0, 0, 0], position: [0.5, 0, 0], rotation: [0, -0.16, 0], scale: 1.4, explode: 1 },
  { at: 0.9, camera: [-0.3, 0.35, 8.7], target: [0, 0, 0], position: [-0.7, 0.08, 0], rotation: [-0.06, -0.45, 0.25], scale: 1.4, explode: 0 },
  { at: 1, camera: [0, 0.3, 8.4], target: [0, 0, 0], position: [-0.9, 0.08, 0], rotation: [-0.06, -0.45, 0.25], scale: 1.4, explode: 0 },
];
export const INSPECT_FRAME = { camera: [0, 0.3, 8.6], target: [0, 0, 0], position: [0, 0, 0], rotation: [0, -0.4, -0.12], scale: 1.4, explode: 0 };

/** Data only: no executable scripts, shader strings or arbitrary remote URLs. */
export const EXPERIENCE_SCHEMA_VERSION = 1;
export const EXPERIENCE_KEY = 'home';
export const MAX_EXPERIENCE_HISTORY = 20;
export const FRAME_NAMES = ['Form', 'Approach', 'Surface', 'Separation', 'Assembly', 'Orbit', 'Reassemble', 'Your build'];
export const PART_LABELS = { spring: 'Spring', reservoir: 'Reservoir', upperMount: 'Upper mount' };
export function makeExperiencePreset(preset = 'studio') {
  if (!['studio', 'detail', 'assembly'].includes(preset)) throw new InputError('Unknown scene preset.');
  const config = structuredClone({
    ...BASE_CINEMATIC_CONFIG, schemaVersion: EXPERIENCE_SCHEMA_VERSION, preset,
    modelUrl: '/models/dth-demo/apex-suspension.glb', returnSeconds: 0.65, rings: true, maxExplode: 1,
    controls: { rotateSpeed: 1.35, zoomSpeed: 0.8 },
    lighting: { exposure: 1, environment: 0.7, key: 2.2, rim: 1.1, azimuth: 0 }, frames: STORY_FRAMES,
  });
  if (preset === 'detail') { config.lighting.key = 2.5; config.lighting.environment = 0.55; config.scrubSeconds = 0.4; }
  if (preset === 'assembly') { config.storyScreens = 3.7; config.frames[3].explode = 0.65; config.frames[6].explode = 0.3; }
  return config;
}
export const DEFAULT_EXPERIENCE = makeExperiencePreset();
const bounded = (value, min, max, label) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new InputError(`${label} must be a number between ${min} and ${max}.`);
  return Math.round(value * 1e6) / 1e6;
};
function object(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) throw new InputError(`${label} contains unsupported fields.`);
}
function text(value, max, label, empty = false) {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) throw new InputError(`${label} is missing or too long.`);
  return value.trim();
}
function bool(value, label) { if (typeof value !== 'boolean') throw new InputError(`${label} must be true or false.`); return value; }
function vector(value, min, max, label) {
  if (!Array.isArray(value) || value.length !== 3) throw new InputError(`${label} needs three coordinates.`);
  return value.map(n => bounded(n, min, max, label));
}
export function validateExperience(input) {
  object(input, Object.keys(DEFAULT_EXPERIENCE), 'Experience');
  if (input.schemaVersion !== EXPERIENCE_SCHEMA_VERSION) throw new InputError('Unsupported experience schema version.');
  if (!['studio','detail','assembly'].includes(input.preset)) throw new InputError('Unknown scene preset.');
  const productId = text(input.productId, 80, 'Product ID');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productId)) throw new InputError('Invalid product ID.');
  const modelUrl = text(input.modelUrl, 200, 'Model path');
  if (!/^\/models\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.glb$/.test(modelUrl)) throw new InputError('Use a GLB in the local models directory.');
  object(input.controls, ['rotateSpeed','zoomSpeed'], 'Controls');
  object(input.lighting, ['exposure','environment','key','rim','azimuth'], 'Lighting');
  const limits = {storyScreens:[1.5,5],scrubSeconds:[0,1],entranceSeconds:[0,1.5],settleRate:[5,20],pointerRadians:[0,0.08],loadTimeoutMs:[5000,30000],maxDpr:[1,1.75],ecoDpr:[1,1],returnSeconds:[0.2,1.2],maxExplode:[0,1]};
  const result = { schemaVersion:1, enabled:bool(input.enabled,'Enabled'), preset:input.preset, productId, modelUrl, rings:bool(input.rings,'Rings') };
  for (const [key,[min,max]] of Object.entries(limits)) result[key] = bounded(input[key],min,max,key);
  result.controls = {rotateSpeed:bounded(input.controls.rotateSpeed,0.25,3,'Drag sensitivity'),zoomSpeed:bounded(input.controls.zoomSpeed,0.25,2,'Zoom sensitivity')};
  result.lighting = {exposure:bounded(input.lighting.exposure,0.6,1.3,'Exposure'),environment:bounded(input.lighting.environment,0.2,1.2,'Environment'),key:bounded(input.lighting.key,0.5,4,'Key light'),rim:bounded(input.lighting.rim,0,2,'Rim light'),azimuth:bounded(input.lighting.azimuth,-90,90,'Light azimuth')};
  if (!Array.isArray(input.frames) || input.frames.length !== STORY_FRAMES.length) throw new InputError('Eight camera keyframes are required.');
  result.frames = input.frames.map((f,i) => {
    object(f,['at','camera','target','position','rotation','scale','explode'],`Frame ${i+1}`);
    if (f.at !== STORY_FRAMES[i].at) throw new InputError('Keyframe timeline positions are fixed in schema 1.');
    const camera=vector(f.camera,-18,18,'Camera'),target=vector(f.target,-4,4,'Camera target');
    const distance=Math.hypot(...camera.map((v,j)=>v-target[j]));
    if (distance<4.5 || distance>20) throw new InputError('Camera distance must be between 4.5 and 20 scene units.');
    return {at:f.at,camera,target,position:vector(f.position,-2.5,2.5,'Product position'),rotation:vector(f.rotation,-Math.PI,Math.PI,'Product rotation'),scale:bounded(f.scale,0.6,1.6,'Product scale'),explode:bounded(f.explode,0,1,'Separation')};
  });
  // Endpoint safety alone is insufficient: interpolation must not pass through the target.
  for(let i=1;i<result.frames.length;i++) {
    const a=result.frames[i-1],b=result.frames[i],x=a.camera.map((v,j)=>v-a.target[j]),d=b.camera.map((v,j)=>v-b.target[j]-x[j]);
    const dd=d.reduce((sum,v)=>sum+v*v,0),t=dd?Math.max(0,Math.min(1,-x.reduce((sum,v,j)=>sum+v*d[j],0)/dd)):0;
    if(Math.hypot(...x.map((v,j)=>v+t*d[j]))<3.5) throw new InputError('Adjacent camera views cross the target. Use a closer angle instead.');
  }
  if (!Array.isArray(input.chapters)||input.chapters.length!==4) throw new InputError('Four story chapters are required.');
  result.chapters=input.chapters.map((c,i)=>{
    object(c,['id','at','label','title','note'],'Chapter');const base=BASE_CINEMATIC_CONFIG.chapters[i];
    if(c.id!==base.id||c.at!==base.at)throw new InputError('Chapter identities and timeline positions are fixed.');
    if(!Array.isArray(c.title)||c.title.length!==2)throw new InputError('Each heading uses two lines.');
    return {id:base.id,at:base.at,label:text(c.label,24,'Chapter label'),title:c.title.map(t=>text(t,28,'Heading line')),note:text(c.note,130,'Chapter description',true)};
  });return result;
}
export function expectedRevision(value) { if(!Number.isSafeInteger(value)||value<0)throw new InputError('A current revision number is required.');return value; }
