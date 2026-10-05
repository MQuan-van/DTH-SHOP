import { CATEGORIES } from '../../../../../shared/domain.mjs';
import { explainFitment } from '../../catalog/fitment/fitment.logic.mjs';
import { safeShopReturn, validPrice } from '../productDecision.logic.mjs';

export const RECOMMENDATION_LIMIT = 4;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const array = value => Array.isArray(value) ? value : [];
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const validKey = value => typeof value === 'string' && value.length <= 80 && slugPattern.test(value);
const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const limitOf = value => Number.isSafeInteger(value) ? Math.min(RECOMMENDATION_LIMIT, Math.max(1, value)) : RECOMMENDATION_LIMIT;

/** A linkable catalog item. Price is VND, never coerced from strings. */
export function isRecommendationProduct(product) {
  return !!(record(product) && validKey(product.id) && validKey(product.slug)
    && typeof product.name === 'string' && product.name.trim().length > 0
    && product.name.length <= 200 && CATEGORIES.includes(product.category)
    && product.active !== false && validPrice(product.price)
    && (product.currency === undefined || product.currency === 'VND'));
}

/** Explicit merchandising order, NOT a quality/safety/popularity score. */
export function rankRecommendations(items, currentPrice) {
  const anchor = validPrice(currentPrice) ? currentPrice : null;
  return [...items].sort((a, b) => Number(b.featured === true) - Number(a.featured === true)
    || (anchor === null ? 0 : Math.abs(a.price - anchor) - Math.abs(b.price - anchor))
    || compareText(a.name.trim().toLowerCase(), b.name.trim().toLowerCase())
    || compareText(a.id, b.id));
}

/**
 * Read-only selector. Never mutates catalog/vehicle/cart, never inspects GLB.
 * Missing vehicle => no suggestions. Unknown product mapping is not a mismatch.
 * All returned candidates must independently match the selected demo vehicle.
 */
export function selectProductRecommendations({ currentProduct, products, vehicles, vehicleId, limit = RECOMMENDATION_LIMIT } = {}) {
  const vehicleRows = array(vehicles).filter(record);
  const vehicleMatches = typeof vehicleId === 'string' && vehicleId
    ? vehicleRows.filter(vehicle => vehicle.id === vehicleId) : [];
  const base = { mode: 'unselected', matchStatus: 'unselected', vehicle: null,
    category: CATEGORIES.includes(currentProduct?.category) ? currentProduct.category : null,
    items: [], candidateCount: 0 };
  if (!vehicleId) return base;
  if (vehicleMatches.length !== 1) return { ...base, mode: 'unknown-vehicle', matchStatus: 'unknown' };
  const vehicle = vehicleMatches[0];
  if (!record(currentProduct) || !validKey(currentProduct.id) || !validKey(currentProduct.slug) || currentProduct.active === false || !base.category) {
    return { ...base, vehicle, mode: 'unavailable', matchStatus: 'unknown' };
  }
  const matchStatus = explainFitment(currentProduct, vehicleId, vehicleRows).status;
  const mode = matchStatus === 'compatible' ? 'build' : matchStatus === 'incompatible' ? 'alternatives' : 'unknown';
  const rows = array(products).filter(record);
  // Ambiguous routes/IDs are excluded entirely, not deduplicated arbitrarily.
  const ids = new Map(), slugs = new Map();
  for (const row of rows) {
    if (typeof row.id === 'string') ids.set(row.id, (ids.get(row.id) || 0) + 1);
    if (typeof row.slug === 'string') slugs.set(row.slug, (slugs.get(row.slug) || 0) + 1);
  }
  const candidates = rows.filter(row => isRecommendationProduct(row)
    && row.id !== currentProduct.id && row.slug !== currentProduct.slug
    && ids.get(row.id) === 1 && slugs.get(row.slug) === 1
    && (mode === 'build' ? row.category !== base.category : row.category === base.category)
    && explainFitment(row, vehicleId, vehicleRows).status === 'compatible');
  let items;
  if (mode === 'build') {
    // Rank within each category; never compare a brake price against a wheel
    // price to decide which category deserves to be shown first.
    items = CATEGORIES.filter(category => category !== base.category)
      .map(category => rankRecommendations(candidates.filter(item => item.category === category), currentProduct.price)[0])
      .filter(Boolean).slice(0, limitOf(limit));
  } else items = rankRecommendations(candidates, currentProduct.price).slice(0, limitOf(limit));
  return { ...base, mode, matchStatus, vehicle, items, candidateCount: candidates.length };
}

/** Shop state is kept through product-to-product links; no stale vehicle override. */
export function recommendationLinkState(fromShop) {
  return { fromShop: safeShopReturn(fromShop) };
}
export function recommendationProductHref(product) {
  return validKey(product?.slug) ? `/products/${product.slug}` : null;
}

/** Explicit alternative search. Original Shop filters remain in the Back link. */
export function recommendationBrowseHref(mode, category) {
  if (!['build', 'alternatives', 'unknown'].includes(mode)) return '/shop';
  const params = new URLSearchParams({ fit: 'match' });
  if (mode !== 'build' && CATEGORIES.includes(category)) params.set('category', category);
  return `/shop?${params.toString()}`;
}

export function recommendationSignature(result) {
  return JSON.stringify([result.mode, result.vehicle?.id || '', result.category,
    result.items.map(item => [item.id, item.slug, item.price, item.name, item.imageUrl, item.finish])]);
}

export function recommendationTilt(x, y, width, height) {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return { x: 0, y: 0 };
  const clamp = n => Math.max(-1, Math.min(1, n));
  return { x: -clamp(y / height * 2 - 1) * 3, y: clamp(x / width * 2 - 1) * 4 };
}
