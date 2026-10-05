import catalog from '../../../shared/catalog.json';
import { normalizeItems, quoteOrder } from '../../../shared/domain.mjs';
import { quoteCart } from '../../../shared/cartQuote.mjs';
import { verifyCartQuoteResponse } from '../../../shared/cartQuoteResponse.mjs';
import { normalizeCheckoutDetails } from '../../../shared/checkout.mjs';
export const MODE = import.meta.env.VITE_STORE_MODE || 'preview';
if (!['preview', 'flow', 'api'].includes(MODE)) throw new Error('VITE_STORE_MODE must be preview, flow or api.');
export const PREVIEW = MODE === 'preview';
export const FLOW = MODE === 'flow';
const base = (import.meta.env.VITE_SHOP_API_URL || '/api/shop').replace(/\/$/, '');
let csrf = '';
let authGeneration = 0;
function sessionChanged() {
  const error = new Error('Your session changed while this request was running. Please try again.');
  error.status = 409; return error;
}
async function request(path, options = {}, generation = authGeneration) {
  // API failures NEVER enable the rehearsal adapter.
  if (FLOW) return (await import('./flowSession.mjs')).flowRequest(path, options);
  if (PREVIEW) throw new Error('This action requires flow or API mode.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${base}${path}`, {
      ...options, credentials: 'include', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...options.headers },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(result.message || `API error (${response.status}).`); error.status = response.status; throw error; }
    if (typeof result?.csrf === 'string' && result.csrf && generation === authGeneration) csrf = result.csrf;
    return result;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The API timed out. Check that the backend is running.');
    throw error;
  } finally { clearTimeout(timer); }
}
export async function loadCatalog() {
  if (PREVIEW || FLOW) return structuredClone(catalog);
  const [products, vehicles] = await Promise.all([request('/products'), request('/vehicles')]);
  if (!Array.isArray(products.data) || !Array.isArray(vehicles.data)) throw new Error('The catalog response could not be read.');
  return { products: products.data, vehicles: vehicles.data };
}
export async function requestCartQuote(items) {
  const clean = normalizeItems(items);
  const result = PREVIEW
    ? quoteCart(clean, catalog.products, catalog.vehicles, { source: 'preview' })
    : (await request('/cart/quote', { method: 'POST', body: JSON.stringify({ items: clean }) })).data;
  return verifyCartQuoteResponse(result, clean, MODE);
}
export async function currentUser() {
  if (PREVIEW) return null;
  const generation = authGeneration;
  const result = await request('/auth/me', {}, generation);
  // StoreProvider guards the user snapshot separately. A stale auth/me response
  // must also be prevented from erasing the new session's API-layer CSRF token.
  if (generation === authGeneration) csrf = result.csrf || '';
  return result.user;
}
export async function authenticate(mode, credentials) {
  if (!['login', 'register'].includes(mode)) throw new Error('Unknown authentication action.');
  const generation = ++authGeneration;
  const result = await request(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(credentials) }, generation);
  if (generation !== authGeneration) throw sessionChanged();
  if (!result.user?.id || typeof result.user.email !== 'string') throw new Error('The account response could not be verified. Refresh and try again.');
  return result.user;
}
export async function logout() {
  const generation = ++authGeneration;
  if (!PREVIEW) { try { await request('/auth/logout', { method: 'POST', body: '{}' }, generation); } catch (e) { if (e.status !== 401) throw e; } }
  if (generation !== authGeneration) throw sessionChanged();
  csrf = '';
}
export async function createOrder(items, idempotencyKey, acknowledged, data, displayedTotal, expectedQuoteFingerprint, checkoutDetails) {
  if (acknowledged !== true) throw new Error('Confirm that this is a simulated order.');
  const checkout = checkoutDetails === undefined ? undefined : normalizeCheckoutDetails(checkoutDetails);
  if (expectedQuoteFingerprint !== undefined) {
    const clean = normalizeItems(items);
    if (typeof expectedQuoteFingerprint !== 'string' || !expectedQuoteFingerprint
      || expectedQuoteFingerprint.length > 24000 || !Number.isSafeInteger(displayedTotal) || displayedTotal < 0) {
      const error = new Error('Review the current cart quote before placing this order.'); error.status = 409; throw error;
    }
    if (PREVIEW) {
      const fresh = quoteCart(clean, catalog.products, catalog.vehicles, { source: 'preview' });
      if (!fresh.valid || fresh.fingerprint !== expectedQuoteFingerprint || fresh.total !== displayedTotal) {
        const error = new Error('The local catalog changed. Check the bag again before placing this simulated order.'); error.status = 409; throw error;
      }
      return { ...quoteOrder(clean, catalog.products, catalog.vehicles),
        lines: fresh.lines.map(({ status, issue, ...line }) => line),
        quotedAt: fresh.quotedAt, quoteFingerprint: fresh.fingerprint, checkout: checkout || null,
        id: `LOCAL-${idempotencyKey.slice(0, 8).toUpperCase()}`, createdAt: new Date().toISOString(), status: 'local-preview', demoOnly: true };
    }
    // The review used a fresh quote. An older browser catalog must not replace
    // those prices or reject a valid new total before the server sees it.
    const result = await request('/orders', { method: 'POST', body: JSON.stringify({
      items: clean, idempotencyKey, expectedTotal: displayedTotal, expectedQuoteFingerprint, checkout, demoAcknowledged: true,
    }) });
    if (!result.data?.id || !Array.isArray(result.data.lines)) throw new Error('Confirmation could not be read. Keep this bag and retry or check your account.');
    return result.data;
  }
  // Retain compatibility for the existing inline cart and older callers.
  const quote = quoteOrder(items, data.products, data.vehicles);
  const expectedTotal = displayedTotal ?? quote.total;
  if (!Number.isSafeInteger(expectedTotal) || expectedTotal !== quote.total) { const e = new Error('The bag changed. Review the total again.'); e.status = 409; throw e; }
  if (PREVIEW) return { ...quote, checkout: checkout || null, id: `LOCAL-${idempotencyKey.slice(0, 8).toUpperCase()}`, createdAt: new Date().toISOString(), status: 'local-preview', demoOnly: true };
  const result = await request('/orders', { method: 'POST', body: JSON.stringify({ items, idempotencyKey, expectedTotal, checkout, demoAcknowledged: true }) });
  if (!result.data?.id || !Array.isArray(result.data.lines)) throw new Error('Confirmation could not be read. Keep this bag and retry or check your account.');
  return result.data;
}
export async function loadOrder(id) {
  const order = (await request(`/orders/${encodeURIComponent(id)}`)).data;
  if (order?.id !== id || !Array.isArray(order.lines)) throw new Error('The saved order response could not be read. Try again.');
  return order;
}
export async function loadOrders() { return PREVIEW ? [] : (await request('/orders')).data; }
export async function deleteAccount(password) {
  const generation = ++authGeneration;
  await request('/auth/account', { method: 'DELETE', body: JSON.stringify({ password }) }, generation);
  if (generation !== authGeneration) throw sessionChanged();
  csrf = '';
}
export async function saveProduct(product) { return (await request(`/admin/products/${encodeURIComponent(product.id)}`, { method: 'PUT', body: JSON.stringify(product) })).data; }
export async function loadAdminProducts() { return (await request('/admin/products')).data; }
export async function saveAccountVehicle(vehicleId) { return (await request('/account/vehicle', { method: 'PUT', body: JSON.stringify({ vehicleId }) })).user; }
export async function loadAccountOrders({ page = 1, search = '' } = {}) { return request(`/account/orders?${new URLSearchParams({ page: String(page), q: search })}`); }
export async function loadAccountOrder(id) { return (await request(`/account/orders/${encodeURIComponent(id)}`)).data; }
export const studioUrl = path => `${base}${path}`;
export async function studioRequest(path, options={}) {
  if (MODE !== 'api') throw new Error('Admin and live support require API mode.');
  return request(path, options);
}
