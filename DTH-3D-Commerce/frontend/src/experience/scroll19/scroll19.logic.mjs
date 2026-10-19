/** Pure presentation math. No cart, API, model or persisted camera-schema writes. */
export const SCROLL19 = Object.freeze({
  version: '19A',
  scrubSeconds: 0.38,
  revealPixels: 30,
  compactRevealPixels: 14,
  copyPixels: 22,
  copyFadeFraction: 0.24,
  minStoryScreens: 2.2,
  maxStoryScreens: 4.2,
});
export const clamp = (value, low = 0, high = 1) =>
  Math.max(low, Math.min(high, Number.isFinite(value) ? value : low));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
export function storyDistance(stageHeight, screens) {
  const height = clamp(stageHeight, 1, 2400);
  return Math.round(height * clamp(screens, SCROLL19.minStoryScreens, SCROLL19.maxStoryScreens));
}
export function scrollTarget(start, end, progress) {
  const a = Number.isFinite(start) ? start : 0;
  const b = Number.isFinite(end) ? Math.max(a, end) : a;
  return Math.max(0, a + (b - a) * clamp(progress));
}
/** Both adjacent chapters are transparent at their shared midpoint. Reversible. */
export function copyPose(progress, chapters) {
  if (!Array.isArray(chapters) || !chapters.length) return { index: 0, opacity: 1, y: 0 };
  const points = chapters.map(c => c?.at);
  if (points.some((p, i) => !Number.isFinite(p) || p < 0 || p > 1 || (i > 0 && p <= points[i - 1]))) {
    return { index: 0, opacity: 1, y: 0 };
  }
  const p = clamp(progress);
  let index = 0;
  for (let i = 1; i < points.length; i++) {
    if (Math.abs(p - points[i]) < Math.abs(p - points[index])) index = i;
  }
  const left = index === 0 ? 0 : (points[index - 1] + points[index]) / 2;
  const right = index === points.length - 1 ? 1 : (points[index] + points[index + 1]) / 2;
  const width = Math.max(0.000001, right - left);
  const band = width * SCROLL19.copyFadeFraction;
  const incoming = index === 0 ? 1 : smooth((p - left) / band);
  const outgoing = index === points.length - 1 ? 1 : smooth((right - p) / band);
  return { index, opacity: Math.min(incoming, outgoing), y: SCROLL19.copyPixels * (outgoing - incoming) };
}
export function canWriteStory(state, hidden = false) {
  return !hidden && state?.active !== false && !state?.blocked && !state?.inspecting;
}
export function canStickMedia({ compact, mediaHeight, viewportHeight, headerHeight }) {
  return !compact && Number.isFinite(mediaHeight) && mediaHeight > 0 &&
    Number.isFinite(viewportHeight) && Number.isFinite(headerHeight) &&
    mediaHeight <= viewportHeight - headerHeight - 28;
}
