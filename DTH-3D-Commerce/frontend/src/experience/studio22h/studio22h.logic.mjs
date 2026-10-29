/** Studio 22H.1. Presentation-only helpers. Never mutate a catalog record. */
export const STUDIO_CATEGORIES = Object.freeze([
  Object.freeze({ id: 'suspension', label: 'Suspension' }),
  Object.freeze({ id: 'wheels', label: 'Wheels' }),
  Object.freeze({ id: 'brakes', label: 'Brakes' }),
  Object.freeze({ id: 'exhausts', label: 'Exhausts' }),
  Object.freeze({ id: 'mirrors', label: 'Mirrors' }),
]);
const categoryIds = new Set(STUDIO_CATEGORIES.map(c => c.id));
const slug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;
export const finite22H = (value, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
export const clamp22H = (v, lo, hi) => Math.max(lo, Math.min(hi, finite22H(v, lo)));
export function productHref22H(product) { return slug(product?.slug) ? `/products/${product.slug}` : ''; }
export function modelPath22H(url) {
  if (typeof url !== 'string' || url.length > 512) return '';
  const pathname = url.split(/[?#]/, 1)[0];
  return /^\/models\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.glb$/.test(pathname) ? pathname : '';
}
export function catalog22H(products) {
  const seen = new Set();
  return (Array.isArray(products) ? products : []).filter(p => {
    if (!p || p.active === false || !slug(p.id) || !categoryIds.has(p.category) || !productHref22H(p) || seen.has(p.id)) return false;
    seen.add(p.id); return true;
  });
}
export function playable22H(products) { return catalog22H(products).filter(p => modelPath22H(p.modelUrl)); }
export function choose22H(products, requested, configured) {
  const list = playable22H(products);
  return list.find(p => p.id === requested) || list.find(p => p.id === configured)
    || list.find(p => p.featured === true) || list[0] || null;
}
export function gallery22H(products, currentId, max = 3) {
  const list = catalog22H(products);
  const sorted = [...list.filter(p => p.featured === true), ...list.filter(p => p.featured !== true)];
  const others = sorted.filter(p => p.id !== currentId), current = sorted.find(p => p.id === currentId);
  return [...others, ...(current ? [current] : [])].slice(0, Math.max(0, Math.min(6, Math.trunc(finite22H(max, 3)))));
}
export function boundProduct22H(product, binding) {
  if (!product) return null;
  if (typeof binding?.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(binding.sha256)
    || product.modelUrl !== binding.modelUrl) return product;
  const modelUrl = `${product.modelUrl.split('?')[0]}?v=${binding.sha256}`;
  const stored = product.presentation3d;
  // The shared validator binds settings to the exact URL. Retarget only an already
  // matching presentation in this view-only copy, never the store or database.
  const presentation3d = stored?.settings?.assetUrl === product.modelUrl
    ? { ...stored, settings: { ...stored.settings, assetUrl: modelUrl } } : stored;
  return { ...product, modelUrl, ...(stored ? { presentation3d } : {}) };
}
export function categoryName22H(id) { return STUDIO_CATEGORIES.find(c => c.id === id)?.label || 'Parts'; }
export function swatch22H(value) { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '#8abdd1'; }
export function quality22H({ compact = false, saveData = false, requested = 'ultra' } = {}) {
  // Pixel budget only. No polygon reduction, material substitution, or texture resizing.
  if (saveData) return 1;
  if (requested === 'high' || compact) return 1.5;
  return 2;
}
export function cameraSample22H(front, referenceDistance, radius, width, height, fov, view = 'front') {
  if (!front || ![front.position, front.target].every(a => Array.isArray(a) && a.length === 3 && a.every(Number.isFinite))) throw new TypeError('Invalid presentation camera.');
  if (![referenceDistance, radius, width, height, fov].every(n => Number.isFinite(n) && n > 0) || fov >= 120) throw new TypeError('Invalid scene bounds.');
  const delta = front.position.map((n, i) => n - front.target[i]);
  const authored = Math.hypot(...delta);
  if (authored < 1e-6) throw new TypeError('Camera overlaps its target.');
  const vertical = fov * Math.PI / 360, horizontal = Math.atan(Math.tan(vertical) * width / height);
  const frame = radius / Math.sin(Math.min(vertical, horizontal)) * 1.11;
  const ratio = Math.max(0.7, authored / referenceDistance);
  const zoom = view === 'detail' ? 0.83 : 1;
  const distance = Math.max(frame * ratio * zoom, radius * 1.65);
  const yaw = Math.atan2(delta[0], delta[2]) + (view === 'rear' ? Math.PI : 0);
  const pitch = Math.asin(clamp22H(delta[1] / authored, -1, 1));
  return { position: [Math.sin(yaw)*Math.cos(pitch)*distance+front.target[0], Math.sin(pitch)*distance+front.target[1], Math.cos(yaw)*Math.cos(pitch)*distance+front.target[2]],
    target: front.target.slice(), distance, minDistance: radius*1.5, maxDistance: Math.max(frame*2.2, radius*3) };
}
/** Exponential damping is independent of refresh rate. Clamp tab-resume deltas. */
export function damp22H(current, target, delta, rate = 9) {
  return current + (target-current)*(1-Math.exp(-rate*clamp22H(delta,0,0.05)));
}
export function nextTurn22H(angle, delta, { active, motion, blocked, inspect, seconds = 32 } = {}) {
  if (!active || !motion || blocked || inspect) return angle;
  return angle + clamp22H(delta, 0, 0.05) * Math.PI * 2 / clamp22H(seconds, 12, 120);
}
export function createDirector22H() {
  const state = { motion: true, active: true, blocked: false, inspect: false, view: 'front', serial: 0 };
  const listeners = new Set();
  return { state, set(patch = {}) {
    let changed = false;
    for (const key of ['motion','active','blocked','inspect']) if (typeof patch[key] === 'boolean' && patch[key] !== state[key]) { state[key] = patch[key]; changed = true; }
    if (['front','detail','rear'].includes(patch.view) && patch.view !== state.view) { state.view = patch.view; changed = true; }
    if (Number.isSafeInteger(patch.serial) && patch.serial >= 0 && patch.serial !== state.serial) { state.serial = patch.serial; changed = true; }
    if (changed) [...listeners].forEach(fn => fn(state));
  }, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, get listenerCount() { return listeners.size; } };
}
