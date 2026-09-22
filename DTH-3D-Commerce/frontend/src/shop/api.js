import catalog from '../../../shared/catalog.json';
import { quoteOrder } from '../../../shared/domain.mjs';

const mode = import.meta.env.VITE_STORE_MODE || 'preview';
if (!['preview', 'api'].includes(mode)) throw new Error('VITE_STORE_MODE must be preview or api.');
export const PREVIEW = mode === 'preview';
const base = (import.meta.env.VITE_SHOP_API_URL || '/api/shop').replace(/\/$/, '');
let csrf = '';
async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${base}${path}`, {
      ...options, credentials: 'include', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...options.headers },
    });
    const result = await response.json().catch(() => ({}));
    // if (!response.ok) throw new Error(result.message || `API error (${response.status}).`);
    if (!response.ok) {
      const error = new Error(
        result.message || `API error (${response.status}).`
      );

      error.status = response.status;
      throw error;
    }
    if (result.csrf) csrf = result.csrf;
    return result;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The API timed out. Check that the backend is running.');
    throw error;
  } finally { clearTimeout(timer); }
}
export async function loadCatalog() {
  if (PREVIEW) return structuredClone(catalog);
  // Never silently turn an API/database failure into mock success.
  const [products, vehicles] = await Promise.all([request('/products'), request('/vehicles')]);
  return { products: products.data, vehicles: vehicles.data };
}
export async function currentUser() {
  if (PREVIEW) return null;
  const result = await request('/auth/me');
  csrf = result.csrf || '';
  return result.user;
}
export async function authenticate(mode, credentials) {
  if (PREVIEW) throw new Error('Accounts are available in API mode only. No password is stored in preview mode.');
  if (!['login', 'register'].includes(mode)) throw new Error('Unknown authentication action.');
  const result = await request(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(credentials) });
  if (!result.user?.id || typeof result.user.email !== 'string') throw new Error('The account response could not be verified. Refresh and try again.');
  return result.user;
}
export async function logout() {
  if (!PREVIEW) {
    try { await request('/auth/logout', { method: 'POST', body: '{}' }); }
    catch (error) { if (error.status !== 401) throw error; }
  }
  csrf = '';
}
export async function createOrder(
  items,
  idempotencyKey,
  acknowledged,
  data,
  displayedTotal
) {
  if (acknowledged !== true) {
    throw new Error('Confirm that this is a simulated order.');
  }

  const quote = quoteOrder(
    items,
    data.products,
    data.vehicles
  );

  const expectedTotal = displayedTotal ?? quote.total;

  if (
    !Number.isSafeInteger(expectedTotal) ||
    expectedTotal !== quote.total
  ) {
    const error = new Error(
      'The bag changed. Review the total again.'
    );

    error.status = 409;
    throw error;
  }

  if (PREVIEW) {
    return {
      ...quote,
      id: `LOCAL-${idempotencyKey.slice(0, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: 'local-preview',
      demoOnly: true,
    };
  }

  const result = await request('/orders', {
    method: 'POST',
    body: JSON.stringify({
      items,
      idempotencyKey,
      expectedTotal,
      demoAcknowledged: true,
    }),
  });

  if (
    !result.data?.id ||
    !Array.isArray(result.data.lines)
  ) {
    throw new Error(
      'Confirmation could not be read. Keep this bag and retry or check your account.'
    );
  }

  return result.data;
}

export async function loadOrder(id) {
  if (PREVIEW) {
    throw new Error(
      'Local preview orders are not saved to the API.'
    );
  }

  const order = (
    await request(`/orders/${encodeURIComponent(id)}`)
  ).data;

  if (
    order?.id !== id ||
    !Array.isArray(order.lines)
  ) {
    throw new Error(
      'The saved order response could not be read. Try again.'
    );
  }

  return order;
}
export async function loadOrders() { return PREVIEW ? [] : (await request('/orders')).data; }
export async function deleteAccount(password) {
  await request('/auth/account', { method: 'DELETE', body: JSON.stringify({ password }) }); csrf = '';
}
export async function saveProduct(product) {
  return (await request(`/admin/products/${encodeURIComponent(product.id)}`, { method: 'PUT', body: JSON.stringify(product) })).data;
}

export async function loadAdminProducts() { return (await request('/admin/products')).data; }

export async function saveAccountVehicle(vehicleId) {
  if (PREVIEW) throw new Error('Saved vehicles require API mode.');
  return (await request('/account/vehicle', { method: 'PUT', body: JSON.stringify({ vehicleId }) })).user;
}
export async function loadAccountOrders({ page = 1, search = '' } = {}) {
  if (PREVIEW) throw new Error('Order history requires API mode.');
  const query = new URLSearchParams({ page: String(page), q: search });
  return request(`/account/orders?${query}`);
}
export async function loadAccountOrder(id) {
  if (PREVIEW) throw new Error('Saved orders require API mode.');
  return (await request(`/account/orders/${encodeURIComponent(id)}`)).data;
}
