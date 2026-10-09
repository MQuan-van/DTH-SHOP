import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { quoteCart, cartQuoteFingerprint } from '../shared/cartQuote.mjs';
import { buildNVXDemoCatalog } from '../shared/nvx.mjs';
import { verifyCartQuoteResponse } from '../shared/cartQuoteResponse.mjs';
import { createFlowSession, FLOW_EMAIL, FLOW_PASSWORD } from '../frontend/src/shop/flowSession.mjs';
import { createCartState } from '../frontend/src/shop/cart/cartState.mjs';

const fixture = buildNVXDemoCatalog(JSON.parse(await readFile(new URL('../shared/catalog.json', import.meta.url), 'utf8')));
const product = fixture.products.find(p => p.active !== false && p.vehicleIds.length >= 2);
assert.ok(product, 'Use a real fixture part with two supported vehicles.');
const items = product.vehicleIds.slice(0, 2).map(vehicleId => ({ productId: product.id, vehicleId, quantity: 1 }));
const stamp = () => '2026-10-05T13:30:00.000Z';
const makeQuote = (source = 'api', data = fixture) => quoteCart(items, data.products, data.vehicles, { source, now: stamp });

test('quote response retains the same part for two different line vehicles', () => {
  const quote = makeQuote();
  assert.equal(verifyCartQuoteResponse(quote, items, 'api'), quote);
  assert.equal(quote.lines.length, 2);
  assert.notEqual(quote.lines[0].vehicleId, quote.lines[1].vehicleId);
  assert.equal(quote.total, 2 * product.price);
});

test('invalid business lines remain inspectable with no payable total', () => {
  const data = structuredClone(fixture);
  data.products.find(p => p.id === product.id).vehicleIds = [items[0].vehicleId];
  const quote = makeQuote('api', data);
  assert.equal(verifyCartQuoteResponse(quote, items, 'api').valid, false);
  assert.equal(quote.lines.length, 2);
  assert.equal(quote.lines.filter(line => line.status === 'incompatible').length, 1);
  assert.equal(quote.total, null);
});

test('reject quote responses that cannot describe the requested bag', async t => {
  const cases = {
    'wrong source': q => { q.source = 'flow'; },
    'wrong version': q => { q.version = 2; },
    'missing timestamp': q => { delete q.quotedAt; },
    'invalid timestamp': q => { q.quotedAt = 'yesterday'; },
    'wrong currency': q => { q.currency = 'USD'; },
    'unexpected inventory claim': q => { q.inventoryChecked = true; },
    'missing line': q => { q.lines.pop(); },
    'duplicate line replaces another vehicle': q => { q.lines[1] = structuredClone(q.lines[0]); },
    'wrong line quantity': q => { q.lines[0].quantity = 2; },
    'line total disagrees with unit price': q => { q.lines[0].lineTotal += 1; },
    'fractional money': q => { q.lines[0].unitPrice += 0.5; },
    'mismatched total': q => { q.total += 1; },
    'validity disagrees with lines': q => { q.valid = false; },
    'compatible line has no price': q => { q.lines[0].unitPrice = null; q.lines[0].lineTotal = null; },
    'different requested vehicle': q => { q.items[0].vehicleId = 'unrequested-vehicle'; },
  };
  for (const [name, mutate] of Object.entries(cases)) await t.test(name, () => {
    const quote = makeQuote(); mutate(quote);
    quote.fingerprint = cartQuoteFingerprint(quote);
    assert.throws(() => verifyCartQuoteResponse(quote, items, 'api'), /could not be verified/);
  });
  await t.test('damaged fingerprint', () => {
    const quote = makeQuote(); quote.fingerprint = 'different';
    assert.throws(() => verifyCartQuoteResponse(quote, items, 'api'), /could not be verified/);
  });
});

test('Flow quotes before login and reads current fixture values without placing an order', async () => {
  const catalog = structuredClone(fixture), writes = [];
  const flow = createFlowSession({ catalog, now: stamp, storage: { getItem: () => null, setItem: (...args) => writes.push(args) } });
  const before = (await flow.request('/cart/quote', { method: 'POST', body: JSON.stringify({ items }) })).data;
  catalog.products.find(p => p.id === product.id).price += 100;
  const after = (await flow.request('/cart/quote', { method: 'POST', body: JSON.stringify({ items }) })).data;
  assert.equal(before.source, 'flow');
  assert.equal(after.total, before.total + 200);
  assert.notEqual(before.fingerprint, after.fingerprint);
  assert.equal(writes.length, 0);
  assert.equal((await flow.request('/auth/me')).user, null);
});

test('Flow checkout rechecks reviewed facts and retains an idempotent successful order', async () => {
  const catalog = structuredClone(fixture);
  const flow = createFlowSession({ catalog, now: stamp, uuid: () => '12345678-1234-1234-1234-123456789012' });
  await flow.request('/auth/login', { method: 'POST', body: JSON.stringify({ email: FLOW_EMAIL, password: FLOW_PASSWORD }) });
  const quote = (await flow.request('/cart/quote', { method: 'POST', body: JSON.stringify({ items }) })).data;
  const request = { items, idempotencyKey: 'flow-step13-2-order', demoAcknowledged: true, expectedTotal: quote.total, expectedQuoteFingerprint: quote.fingerprint };
  catalog.vehicles.find(v => v.id === items[0].vehicleId).model += ' revised';
  await assert.rejects(flow.request('/orders', { method: 'POST', body: JSON.stringify(request) }), error => error.status === 409);
  const fresh = (await flow.request('/cart/quote', { method: 'POST', body: JSON.stringify({ items }) })).data;
  request.expectedQuoteFingerprint = fresh.fingerprint;
  const order = (await flow.request('/orders', { method: 'POST', body: JSON.stringify(request) })).data;
  assert.equal(order.quotedAt, stamp());
  assert.equal(order.quoteFingerprint, fresh.fingerprint);
  assert.ok(order.lines.some(line => line.vehicleLabel.includes('revised')));
  catalog.products.find(p => p.id === product.id).active = false;
  const replay = (await flow.request('/orders', { method: 'POST', body: JSON.stringify(request) })).data;
  assert.equal(replay.id, order.id);
  assert.deepEqual(replay.lines, order.lines);
  assert.equal((await flow.request('/orders')).data.length, 1);
});

test('transaction revision detects A to B to A before React renders', () => {
  const state = createCartState(items);
  const before = state.getSnapshot();
  const changed = state.quantity(product.id, items[0].vehicleId, 2, fixture);
  assert.equal(changed.ok, true);
  state.replace(items);
  assert.deepEqual(state.getSnapshot().bag, before.bag);
  assert.equal(state.getSnapshot().revision, before.revision + 2);
  state.replace(items);
  assert.equal(state.getSnapshot().revision, before.revision + 2, 'unchanged replacement does not invalidate a quote');
  assert.equal(state.quantity(product.id, items[0].vehicleId, -1, fixture).ok, false);
  assert.equal(state.getSnapshot().revision, before.revision + 2, 'rejected mutation keeps the revision');
});

let adapterSequence = 0;
async function loadAdapter(mode) {
  const result = await build({ entryPoints: [fileURLToPath(new URL('../frontend/src/shop/api.js', import.meta.url))],
    bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
    define: { 'import.meta.env': JSON.stringify({ VITE_STORE_MODE: mode }) } });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text + `\n// isolated adapter ${++adapterSequence}`).toString('base64')}`);
}

test('late auth/me cannot erase or replace a newer login CSRF token', async t => {
  for (const oldToken of ['', 'old-session-token']) await t.test(oldToken ? 'stale signed-in response' : 'stale guest response', async () => {
    const api = await loadAdapter('api'), originalFetch = globalThis.fetch;
    let release, orderHeaders;
    const quote = makeQuote();
    globalThis.fetch = async (url, options) => {
      if (url.endsWith('/auth/me')) return new Promise(resolve => {
        release = () => resolve(new Response(JSON.stringify({ user: null, csrf: oldToken }), { status: 200 }));
      });
      if (url.endsWith('/auth/login')) return new Response(JSON.stringify({ user: { id: 'fresh-user', email: 'qa@dth.test' }, csrf: 'new-session-token' }), { status: 200 });
      if (url.endsWith('/orders')) {
        orderHeaders = options.headers;
        return new Response(JSON.stringify({ data: { id: 'DTH-CSRF-13-2', lines: quote.lines, total: quote.total } }), { status: 200 });
      }
      throw new Error('Unexpected test request');
    };
    try {
      const pending = api.currentUser();
      await api.authenticate('login', { email: 'qa@dth.test', password: 'test-only-password' });
      release(); await pending;
      await api.createOrder(items, 'csrf-order-key', true, fixture, quote.total, quote.fingerprint);
      assert.equal(orderHeaders['X-CSRF-Token'], 'new-session-token');
    } finally { globalThis.fetch = originalFetch; }
  });
});

test('late auth/me cannot restore the old CSRF token after logout', async () => {
  const api = await loadAdapter('api'), originalFetch = globalThis.fetch;
  let release, quoteHeaders;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/me')) return new Promise(resolve => {
      release = () => resolve(new Response(JSON.stringify({ user: null, csrf: 'old-token' }), { status: 200 }));
    });
    if (url.endsWith('/auth/logout')) return new Response('{}', { status: 200 });
    if (url.endsWith('/cart/quote')) {
      quoteHeaders = options.headers;
      return new Response(JSON.stringify({ data: makeQuote() }), { status: 200 });
    }
    throw new Error('Unexpected test request');
  };
  try {
    const pending = api.currentUser();
    await api.logout(); release(); await pending;
    await api.requestCartQuote(items);
    assert.equal(quoteHeaders['X-CSRF-Token'], undefined);
  } finally { globalThis.fetch = originalFetch; }
});

test('API adapter sends identifiers only and checkout uses a fresh total despite stale local data', async () => {
  const api = await loadAdapter('api'), calls = [], originalFetch = globalThis.fetch;
  const catalog = structuredClone(fixture);
  catalog.products.find(p => p.id === product.id).price += 500;
  const quote = makeQuote('api', catalog);
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body); calls.push({ url, body });
    return new Response(JSON.stringify({ data: url.endsWith('/cart/quote') ? quote
      : { id: 'DTH-TEST-13-2', lines: quote.lines, total: quote.total } }), { status: 200 });
  };
  try {
    const checked = await api.requestCartQuote(items.map(item => ({ ...item, price: 1, active: true })));
    assert.equal(checked.total, quote.total);
    assert.equal(calls[0].url, '/api/shop/cart/quote');
    assert.ok(calls[0].body.items.every(item => !('price' in item) && !('active' in item)));
    const order = await api.createOrder(items, 'fresh-order-key', true, fixture, quote.total, quote.fingerprint);
    assert.equal(order.total, quote.total);
    assert.equal(calls[1].body.expectedTotal, quote.total);
    assert.equal(calls[1].body.expectedQuoteFingerprint, quote.fingerprint);
  } finally { globalThis.fetch = originalFetch; }
});

test('API failures do not fall back to Flow or a browser estimate', async () => {
  const api = await loadAdapter('api'), originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Catalog unavailable' }), { status: 503 });
  try {
    await assert.rejects(api.requestCartQuote(items), error => error.status === 503 && /Catalog unavailable/.test(error.message));
  } finally { globalThis.fetch = originalFetch; }
});

test('API adapter refuses a Flow response labelled as the API result', async () => {
  const api = await loadAdapter('api'), originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ data: makeQuote('flow') }), { status: 200 });
  try { await assert.rejects(api.requestCartQuote(items), /could not be verified/); }
  finally { globalThis.fetch = originalFetch; }
});

test('Preview quote remains explicitly local and never calls the API', async () => {
  const api = await loadAdapter('preview'), originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Preview must not fetch'); };
  try {
    const quote = await api.requestCartQuote(items);
    assert.equal(quote.source, 'preview');
    assert.equal(quote.inventoryChecked, false);
    const order = await api.createOrder(items, 'preview-order-key', true, fixture, quote.total, quote.fingerprint);
    assert.equal(order.total, quote.total);
    assert.equal(order.quoteFingerprint, quote.fingerprint);
  } finally { globalThis.fetch = originalFetch; }
});
