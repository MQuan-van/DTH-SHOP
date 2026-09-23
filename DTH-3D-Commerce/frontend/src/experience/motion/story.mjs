import { STORY_FRAMES, CINEMATIC_CONFIG } from './motion.config.mjs';
export const clamp01 = value => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const mix = (a, b, t) => a + (b - a) * t;
export const smooth = t => t * t * (3 - 2 * t);
export function sampleStory(progress, frames = STORY_FRAMES) {
  const p = clamp01(progress);
  let i = 0;
  while (i < frames.length - 2 && p > frames[i + 1].at) i++;
  const a = frames[i], b = frames[i + 1];
  const t = smooth(clamp01((p - a.at) / (b.at - a.at)));
  const value = key => a[key].map((x, j) => mix(x, b[key][j], t));
  return { camera: value('camera'), target: value('target'), position: value('position'), rotation: value('rotation'), scale: mix(a.scale, b.scale, t), explode: mix(a.explode, b.explode, t) };
}
export function chapterAt(progress, chapters = CINEMATIC_CONFIG.chapters) {
  const p = clamp01(progress);
  return chapters.reduce((nearest, chapter, i) => Math.abs(p - chapter.at) < Math.abs(p - chapters[nearest].at) ? i : nearest, 0);
}
export function damp(current, target, dt, rate = CINEMATIC_CONFIG.settleRate) {
  return mix(current, target, 1 - Math.exp(-rate * Math.min(0.05, Math.max(0, dt))));
}
/** One owner for the camera. Frame snapshots are read-only observations, not commands. */
export function createDirector() {
  const listeners = new Set();
  const state = { progress:0,reveal:1,pointerX:0,pointerY:0,mode:'story',inspecting:false,manualExplode:0,selectedPart:'',lightAngle:0,resetSerial:0,motion:true,active:true,blocked:false,pose:null };
  return {
    state,
    set(patch) {
      const next={...patch};
      if('inspecting' in next && next.inspecting!==state.inspecting)next.mode=next.inspecting?'inspect':'returning';
      if(next.mode&&!['story','inspect','returning'].includes(next.mode))throw new Error('Unknown motion owner');
      if('progress' in next)next.progress=clamp01(next.progress);
      if('manualExplode' in next)next.manualExplode=clamp01(next.manualExplode);
      const changed=Object.keys(next).some(key=>state[key]!==next[key]);
      Object.assign(state,next);if(changed)listeners.forEach(fn=>fn());
    },
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    get listenerCount(){return listeners.size;},
  };
}
