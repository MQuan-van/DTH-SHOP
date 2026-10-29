/** Story-only presentation. Never writes catalog, assets, accounts or checkout data. */
export const STORY22S = Object.freeze({
  version: '22S.1',
  preferredProducts: Object.freeze(['x1r-gtr', 'x1r-red', 'apex-suspension']),
  photoNames: Object.freeze(['lineup', 'crew']),
  scrubSeconds: 0.55,
  openingHold: 0.16,
  closingHold: 0.72,
  compactBreakpoint: 820,
});
const finite = (n, fallback = 0) => typeof n === 'number' && Number.isFinite(n) ? n : fallback;
export const clamp22S = (n, min = 0, max = 1) => Math.max(min, Math.min(max, finite(n, min)));
export const smooth22S = n => { const p = clamp22S(n); return p * p * (3 - 2 * p); };
export const validId22S = id => typeof id === 'string' && id.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
export const localModel22S = url => typeof url === 'string' && /^\/models\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.glb(?:\?v=[A-Za-z0-9_-]{1,128})?$/.test(url);
export function productLink22S(product) {
  const id = validId22S(product?.slug) ? product.slug : validId22S(product?.id) ? product.id : '';
  return id ? `/products/${id}` : '/shop';
}
export function selectStoryProduct22S(products = []) {
  const usable = Array.isArray(products) ? products.filter(p => p && p.active !== false && validId22S(p.id) && localModel22S(p.modelUrl)) : [];
  for (const id of STORY22S.preferredProducts) { const p = usable.find(item => item.id === id); if (p) return p; }
  return usable.find(p => p.featured === true) || usable[0] || null;
}
export function photo22S(name) {
  const safe = STORY22S.photoNames.includes(name) ? name : 'lineup';
  return Object.freeze({
    src: `/story/ride-journal/${safe}-1536.webp`,
    srcSet: `/story/ride-journal/${safe}-768.webp 768w, /story/ride-journal/${safe}-1536.webp 1536w`,
    alt: safe === 'crew' ? 'The DTH scooters photographed together on the street.' : 'A diagonal lineup of personalised scooters.',
  });
}
/** Hold at both ends; position, not elapsed time, owns the camera. */
export function sampleStudy22S(progress, motion = true) {
  const p = clamp22S(progress);
  const t = smooth22S((p - STORY22S.openingHold) / (STORY22S.closingHold - STORY22S.openingHold));
  const cross = smooth22S((p - 0.43) / 0.18);
  return {
    progress: p, detail: p >= 0.52, blend: cross,
    yawOffset: motion ? (-0.18 + 0.65 * t) : 0,
    pitchOffset: motion ? 0.055 * Math.sin(Math.PI * t) : 0,
    distanceFactor: motion ? 1.08 - 0.22 * t : 1.08,
    targetY: motion ? 0.09 * Math.sin(Math.PI * t) : 0,
    formAlpha: 1 - cross, detailAlpha: cross,
    formY: motion ? -22 * cross : 0,
    detailY: motion ? 22 * (1 - cross) : 0,
  };
}
export function createStoryDirector22S() {
  const state = { progress: 0, active: false, blocked: false, motion: true };
  const listeners = new Set();
  return {
    state,
    set(patch) {
      let changed = false;
      if (Object.hasOwn(patch, 'progress')) {
        const value = clamp22S(patch.progress);
        if (value !== state.progress) { state.progress = value; changed = true; }
      }
      for (const key of ['active', 'blocked', 'motion']) if (typeof patch[key] === 'boolean' && patch[key] !== state[key]) {
        state[key] = patch[key]; changed = true;
      }
      if (changed) for (const listener of [...listeners]) listener(state);
      return state;
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('A Story listener must be a function.');
      listeners.add(listener); return () => listeners.delete(listener);
    },
    get listenerCount() { return listeners.size; },
  };
}
/** Equivalent positions can be tested without WebGL. Preserves the authored front direction. */
export function studyPose22S(front, fittedDistance, progress, motion = true) {
  const sample = sampleStudy22S(progress, motion);
  const target = Array.isArray(front?.target) && front.target.length === 3 ? front.target.map(n => finite(n)) : [0, 0, 0];
  const position = Array.isArray(front?.position) && front.position.length === 3 ? front.position.map(n => finite(n)) : [0, 0, 6];
  const vector = position.map((n, i) => n - target[i]), length = Math.max(0.0001, Math.hypot(...vector));
  const yaw = Math.atan2(vector[0], vector[2]) + sample.yawOffset;
  const pitch = clamp22S(Math.asin(clamp22S(vector[1] / length, -1, 1)) + sample.pitchOffset, -1.15, 1.15);
  const distance = Math.max(0.5, finite(fittedDistance, length)) * sample.distanceFactor;
  target[1] += sample.targetY;
  return {
    position: [target[0] + Math.sin(yaw) * Math.cos(pitch) * distance,
      target[1] + Math.sin(pitch) * distance, target[2] + Math.cos(yaw) * Math.cos(pitch) * distance],
    target,
  };
}
