/** Explicit UI rehearsal, NOT authentication or a database. Only fictitious @dth.test identities and the public fixture password work. No passwords stored, no API requests. */
import { normalizeItems, quoteOrder, validateRegistration } from '../../../shared/domain.mjs';
import { orderQuery, vehiclePreference } from '../../../shared/account.mjs';
export const FLOW_EMAIL = 'demo@dth.test';
export const FLOW_PASSWORD = 'DthFlow2026!';
export const FLOW_STORAGE_KEY = 'dth.flow.rehearsal.v1';
const copy = value => structuredClone(value);
function fail(message, status = 400) { const e = new Error(message); e.status = status; throw e; }
export function createFlowSession({ catalog, storage, uuid = () => crypto.randomUUID(), now = () => new Date().toISOString() }) {
  const fresh = () => ({ version: 1, users: [{ id: 'flow-demo', email: FLOW_EMAIL, role: 'user', savedVehicleId: '', createdAt: now() }], session: '', orders: [] });
  let state;
  try {
    const raw = storage?.getItem(FLOW_STORAGE_KEY);
    if (raw?.length > 1500000) throw new Error('Oversized rehearsal state');
    const candidate = raw ? JSON.parse(raw) : null;
    if (candidate && (candidate.version !== 1 || !Array.isArray(candidate.users) || !Array.isArray(candidate.orders) || candidate.users.length > 50 || candidate.orders.length > 100)) throw new Error('Invalid rehearsal state');
    if (candidate && (!candidate.users.every(u => u && typeof u.id === 'string' && typeof u.email === 'string' && u.email.endsWith('@dth.test') && u.role === 'user') || !candidate.orders.every(o => o && typeof o.id === 'string' && typeof o.userId === 'string' && Array.isArray(o.lines) && Number.isSafeInteger(o.total)))) throw new Error('Invalid rehearsal documents');
    state = candidate || fresh();
  } catch { state = fresh(); }
  const persist = () => { try { storage?.setItem(FLOW_STORAGE_KEY, JSON.stringify(state)); } catch { /* memory-only fallback */ } };
  const user = () => state.users.find(u => u.id === state.session) || null;
  const member = () => user() || fail('Sign in to the demo account first.', 401);
  const publicOrder = order => { const { userId, idempotencyKey, fingerprint, ...result } = order; return copy(result); };
  function credentials(body) {
    const value = validateRegistration(body);
    if (!/^[a-z0-9][a-z0-9._+-]{0,48}@dth\.test$/.test(value.email)) fail('Flow demo: use a fictitious @dth.test email, not a real address.');
    if (value.password !== FLOW_PASSWORD) fail(`Demo credentials are incorrect. Use the published password ${FLOW_PASSWORD}.`, 401);
    return value;
  }
  function handle(path, options = {}) {
    const url = new URL(path, 'http://dth.invalid');
    if (url.origin !== 'http://dth.invalid') fail('Unknown rehearsal URL.', 404);
    const route = url.pathname, method = options.method || 'GET';
    let body = {};
    if (options.body) { try { body = JSON.parse(options.body); } catch { fail('Invalid JSON.'); } }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) fail('Invalid request body.');
    if (method === 'GET' && route === '/auth/me') return { user: copy(user()) };
    if (method === 'GET' && route === '/products') return { data: copy(catalog.products) };
    if (method === 'GET' && route === '/vehicles') return { data: copy(catalog.vehicles) };
    if (method === 'POST' && ['/auth/login', '/auth/register'].includes(route)) {
      const value = credentials(body);
      let current = state.users.find(u => u.email === value.email);
      if (route === '/auth/register') {
        if (current) fail('This demo email is already registered.', 409);
        if (state.users.length >= 50) fail('Rehearsal limit reached. Reset the demo tab.');
        current = { id: `flow-${uuid()}`, email: value.email, role: 'user', savedVehicleId: '', createdAt: now() };
        state.users.push(current);
      } else if (!current) fail('Demo credentials are incorrect. Register this fictitious email first.', 401);
      state.session = current.id; persist(); return { user: copy(current) };
    }
    if (method === 'POST' && route === '/auth/logout') { state.session = ''; persist(); return { success: true }; }
    if (method === 'PUT' && route === '/account/vehicle') {
      const current = member(), id = vehiclePreference(body);
      if (id && !catalog.vehicles.some(v => v.id === id)) fail('Choose a vehicle from the catalog.');
      current.savedVehicleId = id; persist(); return { user: copy(current) };
    }
    if (method === 'POST' && route === '/orders') {
      const current = member();
      if (body.demoAcknowledged !== true) fail('Confirm that this is a simulated order.');
      const items = normalizeItems(body.items), fingerprint = JSON.stringify(items);
      if (typeof body.idempotencyKey !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(body.idempotencyKey)) fail('Invalid request key.');
      const previous = state.orders.find(o => o.userId === current.id && o.idempotencyKey === body.idempotencyKey);
      if (previous) {
        if (previous.fingerprint !== fingerprint) fail('This request key belongs to a different bag.', 409);
        return { data: publicOrder(previous) };
      }
      const quote = quoteOrder(items, catalog.products, catalog.vehicles);
      if (!Number.isSafeInteger(body.expectedTotal) || quote.total !== body.expectedTotal) fail('The total changed. Review your bag again.', 409);
      if (state.orders.length >= 100) fail('Rehearsal limit reached. Reset the demo tab.');
      const order = { ...quote, id: `FLOW-${uuid().toUpperCase()}`, userId: current.id, fingerprint, idempotencyKey: body.idempotencyKey, createdAt: now(), status: 'flow-demo', demoOnly: true };
      state.orders.unshift(order); persist(); return { data: publicOrder(order) };
    }
    if (method === 'GET' && ['/account/orders', '/orders'].includes(route)) {
      const current = member();
      const { page, pageSize, search } = orderQuery(Object.fromEntries(url.searchParams));
      const q = search.toLowerCase();
      const rows = state.orders.filter(o => o.userId === current.id && (!q || o.id.toLowerCase().includes(q) || o.lines.some(l => l.name.toLowerCase().includes(q))));
      return { data: rows.slice((page - 1) * pageSize, page * pageSize).map(publicOrder), total: rows.length, page, pageSize };
    }
    if (method === 'GET' && /^\/(?:account\/)?orders\/[^/]+$/.test(route)) {
      const current = member(), id = decodeURIComponent(route.split('/').pop());
      const order = state.orders.find(o => o.userId === current.id && o.id === id);
      if (!order) fail('Order not found.', 404);
      return { data: publicOrder(order) };
    }
    if (method === 'DELETE' && route === '/auth/account') {
      const current = member();
      if (body.password !== FLOW_PASSWORD) fail('Demo credentials are incorrect.', 401);
      state.orders = state.orders.filter(o => o.userId !== current.id);
      state.users = state.users.filter(u => u.id !== current.id);
      state.session = ''; persist(); return { success: true };
    }
    fail('This action is not available in the flow rehearsal.', 404);
  }
  return { request: async (path, options) => copy(handle(path, options)), reset: () => { state = fresh(); persist(); } };
}
let instance;
export async function flowRequest(path, options) {
  if (!instance) {
    const catalog = (await import('../../../shared/catalog.json')).default;
    let storage;
    try { storage = window.sessionStorage; } catch { storage = null; }
    instance = createFlowSession({ catalog, storage });
  }
  return instance.request(path, options);
}
