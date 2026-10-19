/** Presentation helpers only. Never authorises a purchase or changes a cart. */
export const COMMERCE17 = Object.freeze({ version: 17, disclosureMs: 180, hoverMs: 240 });
export function categoryPatch(current, id, categories) {
  const allowed = new Set((Array.isArray(categories) ? categories : []).map(c => c.id));
  const clean = [...new Set((Array.isArray(current) ? current : []).filter(c => allowed.has(c)))];
  if (id === '') return { category: [], page: 1 };
  if (!allowed.has(id)) return null;
  return { category: clean.includes(id) ? clean.filter(c => c !== id) : [...clean, id], page: 1 };
}
export function countLabel(value) {
  return Number.isSafeInteger(value) && value >= 0 ? String(value) : '—';
}
export function displayPrice(product) {
  return product && (product.currency === undefined || product.currency === 'VND') &&
    Number.isSafeInteger(product.price) && product.price >= 0 && product.price <= 1_000_000_000
    ? product.price : null;
}
export function shopReturnFromLocation(location) {
  if (location?.pathname !== '/shop') return '/shop';
  const query = location.search;
  return typeof query === 'string' && query.startsWith('?') && query.length <= 4000 && !/[\r\n]/.test(query)
    ? `/shop${query}` : '/shop';
}
export function compactFitLabel(status, vehicleName = '') {
  if (status === 'compatible') return `${vehicleName || 'Selected vehicle'} · Demo match`;
  if (status === 'incompatible') return 'No match for selected vehicle';
  if (status === 'unselected') return 'Choose your NVX to check fit';
  return 'Fit not verified';
}
export function hashTargetsDisclosure(hash, id) {
  if (typeof hash !== 'string' || typeof id !== 'string' || !id) return false;
  try { return hash.startsWith('#') && decodeURIComponent(hash.slice(1)) === id; }
  catch { return false; }
}
