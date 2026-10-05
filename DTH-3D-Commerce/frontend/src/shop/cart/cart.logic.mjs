import { fitment } from '../../../../shared/domain.mjs';

export const CART_LIMITS = Object.freeze({ lines: 20, quantity: 10, maxPrice: 1000000000 });
const idOK = value => typeof value === 'string' && /^[a-z0-9-]{1,80}$/.test(value);
export const lineKey = (productId, vehicleId) => `${productId}:${vehicleId}`;
export const validCartPrice = n => Number.isSafeInteger(n) && n > 0 && n <= CART_LIMITS.maxPrice;
const failure = message => ({ ok: false, message });

/** Storage schema deliberately stays {productId, vehicleId, quantity}. No client price authority. */
export function normalizeBag(input) {
  if (!Array.isArray(input)) return [];
  const lines = new Map();
  for (const item of input) {
    if (!item || !idOK(item.productId) || !idOK(item.vehicleId) || !Number.isSafeInteger(item.quantity)
      || item.quantity < 1 || item.quantity > CART_LIMITS.quantity) continue;
    const key = lineKey(item.productId, item.vehicleId), previous = lines.get(key);
    if (previous) previous.quantity = Math.min(CART_LIMITS.quantity, previous.quantity + item.quantity);
    else if (lines.size < CART_LIMITS.lines) lines.set(key, { productId: item.productId, vehicleId: item.vehicleId, quantity: item.quantity });
  }
  return [...lines.values()];
}
function catalogRecord(productId, vehicleId, data) {
  const products = Array.isArray(data?.products) ? data.products : [];
  const vehicles = Array.isArray(data?.vehicles) ? data.vehicles.filter(v => v && typeof v.id === 'string') : [];
  const product = products.find(p => p?.id === productId);
  if (!product || product.active === false) return failure('This part is no longer available. Review your bag.');
  if (!validCartPrice(product.price)) return failure('A valid catalog price is required before adding this part.');
  if (fitment(product, vehicleId, vehicles).status !== 'compatible') return failure('Choose a matching demo vehicle before adding this part.');
  return { ok: true, product };
}
export function addBagLine(bag, productId, vehicleId, quantity, data) {
  if (!idOK(productId) || !idOK(vehicleId)) return failure('Choose a product and a matching demo vehicle.');
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > CART_LIMITS.quantity) return failure('Choose a quantity from 1 to 10.');
  const checked = catalogRecord(productId, vehicleId, data);
  if (!checked.ok) return checked;
  const clean = normalizeBag(bag), key = lineKey(productId, vehicleId);
  const existing = clean.find(i => lineKey(i.productId, i.vehicleId) === key);
  if ((!existing && clean.length >= CART_LIMITS.lines) || (existing?.quantity || 0) + quantity > CART_LIMITS.quantity)
    return failure('Demo bag limit reached (20 lines, 10 per part/vehicle).');
  const next = existing ? clean.map(i => lineKey(i.productId, i.vehicleId) === key ? { ...i, quantity: i.quantity + quantity } : i)
    : [...clean, { productId, vehicleId, quantity }];
  return { ok: true, bag: next, key, quantity, name: typeof checked.product.name === 'string' ? checked.product.name : productId };
}
export function changeBagQuantity(bag, productId, vehicleId, quantity, data) {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > CART_LIMITS.quantity) return failure('Quantity must be a whole number from 1 to 10.');
  const key = lineKey(productId, vehicleId), clean = normalizeBag(bag), item = clean.find(i => lineKey(i.productId, i.vehicleId) === key);
  if (!item) return failure('This bag line no longer exists.');
  // Invalidated items may be reduced or removed, never increased.
  if (quantity > item.quantity) { const checked = catalogRecord(productId, vehicleId, data); if (!checked.ok) return checked; }
  return { ok: true, bag: clean.map(i => lineKey(i.productId, i.vehicleId) === key ? { ...i, quantity } : i), key };
}
export function removeBagLine(bag, productId, vehicleId) {
  const key = lineKey(productId, vehicleId), clean = normalizeBag(bag);
  if (!clean.some(i => lineKey(i.productId, i.vehicleId) === key)) return failure('This bag line has already been removed.');
  return { ok: true, bag: clean.filter(i => lineKey(i.productId, i.vehicleId) !== key), key };
}
export function describeBag(bag, data, { loading = false, error = '' } = {}) {
  const products = Array.isArray(data?.products) ? data.products : [], vehicles = Array.isArray(data?.vehicles) ? data.vehicles.filter(v => v && typeof v.id === 'string') : [];
  const lines = normalizeBag(bag).map(item => {
    const product = products.find(p => p?.id === item.productId), vehicle = vehicles.find(v => v?.id === item.vehicleId);
    const match = product ? fitment(product, item.vehicleId, vehicles).status : 'unknown';
    const priceOK = validCartPrice(product?.price), available = !!product && product.active !== false;
    let issue = '';
    if (loading) issue = 'Catalog is loading. Review before checkout.';
    else if (error) issue = 'Catalog unavailable. Try again on the bag page.';
    else if (!available) issue = 'Product unavailable';
    else if (!priceOK) issue = 'Price unavailable';
    else if (match === 'incompatible') issue = 'No match in demo data';
    else if (match !== 'compatible') issue = 'Compatibility not established';
    return { ...item, key: lineKey(item.productId, item.vehicleId), product, name: typeof product?.name === 'string' ? product.name : item.productId,
      vehicleLabel: vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.year}` : `Saved vehicle: ${item.vehicleId} (not in catalog)`,
      match, issue, unitPrice: priceOK ? product.price : null, lineTotal: priceOK ? product.price * item.quantity : null,
      canIncrease: !issue && item.quantity < CART_LIMITS.quantity };
  });
  const needsReview = lines.some(i => i.issue), count = lines.reduce((n, i) => n + i.quantity, 0);
  return { lines, count, needsReview, subtotal: needsReview ? null : lines.reduce((n, i) => n + i.lineTotal, 0) };
}
