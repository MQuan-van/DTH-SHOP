import { CATEGORIES, fitment } from '../../../../shared/domain.mjs';

export function getPriceCeiling(products, step = 50000) {
  const prices = products.filter(p => p.active !== false && Number.isFinite(p.price) && p.price >= 0).map(p => p.price);
  return Math.max(step, Math.ceil(Math.max(0, ...prices) / step) * step);
}
export function readShopQuery(input, ceiling) {
  const params = new URLSearchParams(input);
  const categories = [...new Set(params.getAll('category').flatMap(v => v.split(',')))].filter(v => CATEGORIES.includes(v));
  const rawMax = params.get('max');
  const number = rawMax !== null && rawMax.trim() !== '' ? Number(rawMax) : NaN;
  const maxPrice = Number.isFinite(number) ? Math.min(ceiling, Math.max(0, Math.floor(number))) : ceiling;
  const rawPage = Number(params.get('page'));
  return {
    search: (params.get('q') || '').trim().slice(0, 160),
    categories,
    maxPrice,
    sort: ['featured', 'price-low', 'price-high', 'name'].includes(params.get('sort')) ? params.get('sort') : 'featured',
    fit: params.get('fit') === 'all' ? 'all' : 'match',
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}
export function patchShopQuery(input, patch) {
  const next = new URLSearchParams(input);
  for (const [key, value] of Object.entries(patch)) {
    next.delete(key);
    if (Array.isArray(value)) value.forEach(v => next.append(key, String(v)));
    else if (value !== '' && value !== null && value !== undefined) next.set(key, String(value));
  }
  if (!Object.hasOwn(patch, 'page')) next.delete('page');
  return next;
}
export function resetShopFilters(input) {
  const next = new URLSearchParams(input);
  // Deliberately keep vehicle state, fit mode, sort and unrelated URL keys.
  ['q', 'category', 'max', 'page'].forEach(key => next.delete(key));
  return next;
}
export function selectShopProducts(products, vehicles, vehicleId, query, { ignoreCategories = false } = {}) {
  const terms = query.search.toLowerCase().split(/\s+/u).filter(Boolean);
  const items = products.filter(p => {
    if (p.active === false || !Number.isFinite(p.price) || p.price < 0 || p.price > query.maxPrice) return false;
    if (!ignoreCategories && query.categories.length && !query.categories.includes(p.category)) return false;
    const haystack = `${p.name || ''} ${p.category || ''} ${p.finish || ''} ${p.id || ''}`.toLowerCase();
    if (!terms.every(term => haystack.includes(term))) return false;
    return query.fit !== 'match' || !vehicleId || fitment(p, vehicleId, vehicles).status === 'compatible';
  });
  const tie = (a, b) => String(a.name).localeCompare(String(b.name), 'en') || String(a.id).localeCompare(String(b.id), 'en');
  items.sort((a, b) => {
    if (query.sort === 'price-low') return a.price - b.price || tie(a, b);
    if (query.sort === 'price-high') return b.price - a.price || tie(a, b);
    if (query.sort === 'name') return tie(a, b);
    return Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || tie(a, b);
  });
  return items;
}
export function paginateProducts(items, requestedPage, size = 9) {
  const pageSize = Number.isSafeInteger(size) && size > 0 ? size : 9;
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(pages, Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1));
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pages, from: items.length ? start + 1 : 0, to: Math.min(start + pageSize, items.length), total: items.length };
}
export function previewSource(product, useDemoCutouts = true) {
  const original = `/previews/dth-demo/${product.id}.png`;
  if (useDemoCutouts && /^(apex|vector|touring|studio)-(suspension|wheels|exhausts|mirrors|brakes)$/.test(product.id)
    && product.imageUrl === original && product.modelUrl === `/models/dth-demo/${product.id}.glb`) {
    return `/previews/shop-motion/${product.id}.png`;
  }
  return product.imageUrl;
}
export function describeFit(product, vehicleId, vehicles) {
  const result = fitment(product, vehicleId, vehicles);
  const labels = { compatible: 'Fits selected demo vehicle', incompatible: 'No match in demo dataset', unknown: 'Compatibility not established', unselected: 'Select a vehicle to check fit' };
  return { ...result, label: labels[result.status] || labels.unknown };
}
export function clampZoom(value, maximum = 2) {
  return Math.round(Math.max(1, Math.min(Math.max(1, maximum), value)) * 100) / 100;
}
