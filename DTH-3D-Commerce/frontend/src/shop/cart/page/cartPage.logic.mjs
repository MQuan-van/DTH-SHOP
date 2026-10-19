import { normalizeItems, quoteOrder, fitment, CATEGORIES } from '../../../../../shared/domain.mjs';
import { describeBag, lineKey, validCartPrice, CART_LIMITS } from '../cart.logic.mjs';

export const productPath = product => product?.active !== false && typeof product?.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug)
  ? `/products/${product.slug}` : null;
export const payloadSignature = items => {
  try { return items.length ? JSON.stringify(normalizeItems(items)) : '[]'; } catch { return ''; }
};
export const actorKey = (mode, user) => `${mode}:${user?.id || (mode === 'preview' ? 'local' : 'guest')}`;
export function matchingPartsPath(product) {
  const params = new URLSearchParams({ fit: 'match' });
  if (CATEGORIES.includes(product?.category)) params.set('category', product.category);
  return `/shop?${params}`;
}

/** Uses the same catalog rules as the drawer. This is NOT a fresh server quote. */
export function inspectCartPage(bag, data, options = {}) {
  const view = describeBag(bag, data, options);
  let inputError = '', quote = null;
  try {
    if (!Array.isArray(bag)) throw new Error('Saved bag is invalid. Remove the affected items before reviewing.');
    if (bag.length) {
      normalizeItems(bag);
      if (!view.needsReview) quote = quoteOrder(bag, data.products, data.vehicles);
    }
  } catch (e) { inputError = e.message; }
  const lines = view.lines.map(row => ({ ...row,
    href: productPath(row.product),
    status: options.loading ? 'loading' : options.error ? 'catalog-error' : !row.product || row.product.active === false ? 'unavailable'
      : !validCartPrice(row.product.price) ? 'price-unavailable' : row.match,
    vehicle: data?.vehicles?.find(v => v?.id === row.vehicleId),
    vehicleOptions: Array.isArray(data?.vehicles) && row.product?.active !== false && row.product ? data.vehicles.filter(v =>
      v && typeof v.id === 'string' && fitment(row.product, v.id, data.vehicles).status === 'compatible') : [],
  }));
  const blocked = Boolean(inputError || view.needsReview || options.loading || options.error);
  return { ...view, lines, inputError, blocked, quote: blocked ? null : quote,
    subtotal: blocked ? null : view.subtotal, canReview: !blocked && lines.length > 0 && !!quote,
    issueCount: lines.filter(row => row.issue).length,
    vehicleCount: new Set(lines.map(row => row.vehicleId)).size,
  };
}

/** Acknowledgement belongs to exact displayed prices, line vehicles, quantities AND account. */
export function reviewSignature(actor, view) {
  if (!view.canReview || !view.quote) return '';
  return JSON.stringify([actor, view.quote,
    [...view.lines].sort((a,b) => a.key.localeCompare(b.key)).map(row => [row.key, row.name, row.vehicleLabel, row.unitPrice, row.quantity])]);
}
export function rememberPrices(view) {
  return view.lines.filter(row => comparablePrice(row.unitPrice)).map(row => ({ key: row.key, name: row.name, unitPrice: row.unitPrice }));
}
// A checked API quote can legitimately contain a zero-price demo item.
const comparablePrice = value => Number.isSafeInteger(value) && value >= 0 && value <= CART_LIMITS.maxPrice;
export function reviewedPriceChanges(previous, view) {
  const map = new Map((Array.isArray(previous) ? previous : []).map(row => [row.key, row]));
  return view.lines.flatMap(row => {
    const old = map.get(row.key);
    return old && comparablePrice(row.unitPrice) && comparablePrice(old.unitPrice) && old.unitPrice !== row.unitPrice
      ? [{ key: row.key, name: row.name, before: old.unitPrice, after: row.unitPrice }] : [];
  });
}

/** Explicit per-line vehicle change; never reads or modifies the global selected vehicle. */
export function retargetCartLine(bag, productId, oldVehicleId, nextVehicleId, data) {
  const reject = message => ({ ok: false, message });
  try {
    const clean = normalizeItems(bag);
    const index = clean.findIndex(i => i.productId === productId && i.vehicleId === oldVehicleId);
    if (index < 0) return reject('This bag line no longer exists.');
    if (nextVehicleId === oldVehicleId) return { ok: true, bag: clean, key: lineKey(productId, oldVehicleId), unchanged: true };
    const product = data.products.find(p => p?.id === productId && p.active !== false);
    if (!product || !validCartPrice(product.price)) return reject('This part is unavailable or its catalog price is invalid.');
    if (fitment(product, nextVehicleId, data.vehicles).status !== 'compatible') return reject('Choose a vehicle listed in this part’s demo mapping.');
    const destination = clean.find(i => i.productId === productId && i.vehicleId === nextVehicleId);
    if ((destination?.quantity || 0) + clean[index].quantity > CART_LIMITS.quantity)
      return reject('Combining these lines would exceed 10 items for this product and vehicle. Nothing was changed.');
    const next = clean.filter((_, i) => i !== index);
    if (destination) {
      const at = next.findIndex(i => i.productId === productId && i.vehicleId === nextVehicleId);
      next[at] = { ...next[at], quantity: next[at].quantity + clean[index].quantity };
    } else next.splice(index, 0, { ...clean[index], vehicleId: nextVehicleId });
    return { ok: true, bag: next, key: lineKey(productId, nextVehicleId), merged: !!destination };
  } catch (e) { return reject(e.message || 'Could not update this line.'); }
}
