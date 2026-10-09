/** Discovery presentation state only. Product/price/fitment authority stays in the existing catalog. */
export const MODES = Object.freeze(['explore', 'shop', 'build']);
export const LAYOUTS = Object.freeze(['grid', 'wide', 'compact']);
export const NVX_IDS = Object.freeze(['yamaha-nvx-v1', 'yamaha-nvx-v2', 'yamaha-nvx-v3']);
const PRODUCT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATALOG_KEYS = ['q', 'category', 'max', 'sort', 'page', 'fit'];
const copy = value => new URLSearchParams(value);

export function readDiscovery(input, defaultMode = 'shop') {
  const params = copy(input);
  const requested = params.get('mode');
  // Old bookmarked/search/filter URLs continue to open the fast catalog.
  const mode = MODES.includes(requested) ? requested
    : requested !== null || CATALOG_KEYS.some(key => params.has(key)) ? 'shop' : MODES.includes(defaultMode) ? defaultMode : 'shop';
  const candidate = params.get('spotlight') || '';
  return {
    mode,
    layout: LAYOUTS.includes(params.get('layout')) ? params.get('layout') : 'grid',
    spotlight: candidate.length <= 80 && PRODUCT_ID.test(candidate) ? candidate : '',
  };
}
export function changeMode(input, mode) {
  if (!MODES.includes(mode)) throw new TypeError('Unknown discovery mode.');
  const next = copy(input);
  next.set('mode', mode);
  return next;
}
export function changeLayout(input, layout) {
  if (!LAYOUTS.includes(layout)) throw new TypeError('Unknown catalog layout.');
  const next = copy(input); next.set('mode', 'shop'); next.set('layout', layout); return next;
}
export function changeSpotlight(input, id) {
  if (typeof id !== 'string' || id.length > 80 || !PRODUCT_ID.test(id)) throw new TypeError('Invalid product ID.');
  const next = copy(input); next.set('spotlight', id); return next;
}
export function discoveryHref(input) {
  const query = copy(input).toString(); return `/shop${query ? `?${query}` : ''}`;
}
export function selectSpotlight(products, requested) {
  const active = (Array.isArray(products) ? products : []).filter(product => product && product.active !== false);
  return active.find(product => product.id === requested) || active.find(product => product.featured) || active[0] || null;
}
export function nvxChoices(vehicles) {
  return NVX_IDS.map(id => (Array.isArray(vehicles) ? vehicles : []).find(vehicle => vehicle?.id === id)).filter(Boolean);
}
export function buildProducts(products, vehicles, vehicleId) {
  if (!NVX_IDS.includes(vehicleId) || !nvxChoices(vehicles).some(vehicle => vehicle.id === vehicleId)) return [];
  return (Array.isArray(products) ? products : []).filter(product => product && product.active !== false
    && Array.isArray(product.vehicleIds) && product.vehicleIds.every(id => typeof id === 'string' && id) && product.vehicleIds.includes(vehicleId));
}
export function clampQuantity(quantity, remaining) {
  const limit = Number.isSafeInteger(remaining) ? Math.max(0, Math.min(10, remaining)) : 0;
  const value = Number.isSafeInteger(quantity) ? quantity : 1;
  return Math.max(1, Math.min(Math.max(1, limit), value));
}
export function buildContextKey(userId, vehicleId) { return `${typeof userId === 'string' ? userId : 'guest'}:${vehicleId || ''}`; }
export function sanitizeDraft(draft, products, vehicles, vehicleId) {
  const eligible = buildProducts(products, vehicles, vehicleId);
  const seen = new Set();
  return (Array.isArray(draft) ? draft : []).map(id => eligible.find(product => product.id === id))
    .filter(product => product && !seen.has(product.category) && seen.add(product.category)).slice(0, 5);
}
export function pinProduct(draft, product, eligible) {
  if (!product || !eligible.some(item => item.id === product.id)) return [...draft];
  const byId = new Map(eligible.map(item => [item.id, item]));
  return [...draft.filter(id => byId.has(id) && byId.get(id).category !== product.category), product.id].slice(0, 5);
}
