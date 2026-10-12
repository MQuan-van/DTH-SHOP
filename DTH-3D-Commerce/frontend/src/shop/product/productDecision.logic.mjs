import { quoteOrder } from '../../../../shared/domain.mjs';
import { explainFitment, matchingQuery } from '../catalog/fitment/fitment.logic.mjs';

export const PRODUCT_VIEW = Object.freeze({
  radius: 1.35, fov: 36, padding: 1.16, maxDpr: 1.5,
  secondsPerTurn: 32, transitionSeconds: 0.48, timeoutMs: 18000,
});
export const CATEGORY_LABELS = Object.freeze({
  suspension: 'Suspension', wheels: 'Wheels', exhausts: 'Exhausts',
  mirrors: 'Mirrors', brakes: 'Brakes',
});
const list = value => Array.isArray(value) ? value : [];
export const validPrice = value => Number.isSafeInteger(value) && value > 0 && value <= 1000000000;
export const validAccent = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '#647888';
export function safeShopReturn(source) {
  if (typeof source !== 'string' || source.length > 4096 || /[\\\u0000-\u0020\u007f]/u.test(source)) return '/shop';
  try {
    const url = new URL(source, 'https://dth.invalid');
    if (!source.startsWith('/shop') || url.origin !== 'https://dth.invalid' || url.pathname !== '/shop') return '/shop';
    return `/shop${url.search}`;
  } catch { return '/shop'; }
}
export function matchingPartsHref(source) {
  const safe = safeShopReturn(source);
  return `/shop?${matchingQuery(safe.split('?')[1] || '').toString()}`;
}
export function validModelUrl(value) {
  // Same-origin GLB only. Meshopt and uncompressed GLB use the existing owned loader.
  return typeof value === 'string' && /^\/models\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.glb(?:\?v=[a-zA-Z0-9_-]{1,128})?$/.test(value);
}
export function productSpecs(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value).filter(([key, v]) => key && ['string', 'number', 'boolean'].includes(typeof v))
    .map(([key, v]) => [key, String(v)]);
}
export function purchaseState(product, vehicleId, vehicles, bag) {
  const match = explainFitment(product, vehicleId, vehicles);
  const items = list(bag);
  const lines = items.filter(item => item?.productId === product?.id && item?.vehicleId === vehicleId);
  const damaged = lines.some(item => !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 10);
  const inBag = damaged ? 10 : lines.reduce((n, item) => n + item.quantity, 0);
  const remaining = Math.max(0, 10 - inBag);
  const full = lines.length === 0 && items.length >= 20;
  const available = !!product && product.active !== false;
  const priceOK = validPrice(product?.price);
  const canAdd = available && match.canAdd && priceOK && remaining > 0 && !full && !damaged;
  let reason = '';
  if (!available) reason = 'This product is no longer available.';
  else if (!priceOK) reason = 'Price unavailable. Please check the catalog again.';
  else if (!match.canAdd) reason = match.detail;
  else if (damaged) reason = 'Review this item in your bag before continuing.';
  else if (full) reason = 'Demo bag limit reached: 20 product/vehicle lines.';
  else if (!remaining) reason = 'Demo limit reached: 10 of this part for this vehicle.';
  return { match, inBag, remaining, full, available, priceOK, canAdd, reason };
}
export function validatePurchase({ product, products, vehicleId, vehicles, bag, quantity }) {
  const current = list(products).find(item => item?.id === product?.id && item.active !== false);
  const state = purchaseState(current, vehicleId, vehicles, bag);
  if (!state.canAdd) throw new Error(state.reason || 'Choose a matching demo vehicle.');
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > state.remaining) {
    throw new Error('Choose a valid quantity within the demo bag limit.');
  }
  // The same domain rule as checkout, not a compatibility verdict from the 3D mesh.
  const quote = quoteOrder([{ productId: current.id, vehicleId, quantity }], list(products), list(vehicles));
  return { product: current, quantity, vehicleId, quote };
}
