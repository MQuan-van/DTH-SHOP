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
export function chapterAt(progress) {
  const p = clamp01(progress);
  const chapters = CINEMATIC_CONFIG.chapters;
  return chapters.reduce((nearest, chapter, i) => Math.abs(p - chapter.at) < Math.abs(p - chapters[nearest].at) ? i : nearest, 0);
}
export function damp(current, target, dt, rate = CINEMATIC_CONFIG.settleRate) {
  return mix(current, target, 1 - Math.exp(-rate * Math.min(0.05, Math.max(0, dt))));
}
/** An imperative signal: scroll never causes React updates at display-frame frequency. */
export function createDirector() {
  const listeners = new Set();
  const state = { progress: 0, reveal: 1, pointerX: 0, pointerY: 0, inspecting: false, manualExplode: 0, motion: true, active: true };
  return {
    state,
    set(patch) { Object.assign(state, patch); listeners.forEach(fn => fn()); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
