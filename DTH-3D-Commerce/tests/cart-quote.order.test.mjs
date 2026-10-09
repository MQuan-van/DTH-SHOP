/** Real application middleware and HTTP; Mongoose operations use in-memory doubles, never a database. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from '../backend/commerce/app.mjs';
import { Product, Vehicle, User, Session, Order } from '../backend/commerce/models.mjs';
import { supportModels } from '../backend/commerce/support/models.mjs';
import { digest } from '../backend/commerce/security.mjs';

test('Quote and order routes preserve review facts, security middleware and idempotency', async t => {
  const token = 'a'.repeat(64);
  const csrf = 'test-csrf-token';
  const origin = 'http://127.0.0.1:5000';
  const user = { _id: '507f191e810c19729de860ea', email: 'quote@example.test', role: 'customer', disabled: false };
  const state = {
    products: [
      { id: 'part-a', name: 'Part A', price: 100_000, currency: 'VND', active: true, vehicleIds: ['yamaha-nvx-v1'] },
      { id: 'part-b', name: 'Part B', price: 200_000, currency: 'VND', active: true, vehicleIds: ['yamaha-nvx-v2'] },
    ],
    vehicles: [
      { id: 'yamaha-nvx-v1', make: 'Yamaha', model: 'NVX V1', demoOnly: true },
      { id: 'yamaha-nvx-v2', make: 'Yamaha', model: 'NVX V2', demoOnly: true },
    ],
    orders: [], catalogReads: 0, sessionReads: 0,
  };
  for (const model of supportModels) t.mock.method(model, 'init', async () => model);
  for (const [model, name] of [[Product, 'products'], [Vehicle, 'vehicles']]) {
    t.mock.method(model, 'find', query => {
      state.catalogReads++;
      return {
        select() { return this; },
        async lean() { return structuredClone(state[name].filter(row => query.id.$in.includes(row.id))); },
      };
    });
  }
  t.mock.method(Session, 'findOne', async query => {
    state.sessionReads++;
    return query.tokenHash === digest(token) ? { _id: '507f191e810c19729de860eb', userId: user._id, csrf } : null;
  });
  t.mock.method(User, 'findOne', async query => String(query._id) === user._id ? user : null);
  t.mock.method(Order, 'findOne', query => ({
    async lean() {
      return structuredClone(state.orders.find(order => String(order.userId) === String(query.userId)
        && (query.idempotencyKey ? order.idempotencyKey === query.idempotencyKey : order.id === query.id)) || null);
    },
  }));
  t.mock.method(Order, 'create', async record => {
    // Apply the real schema to verify that snapshots survive Mongoose's field
    // filtering/casting, without connecting or issuing a database write.
    const document = new Order({ ...record, createdAt: new Date() });
    await document.validate();
    const stored = JSON.parse(JSON.stringify(document.toObject()));
    state.orders.push(stored);
    return stored;
  });
  const app = await makeApp();
  const server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/shop`;
  async function request(path, body, { authenticated = false, headers = {}, raw = false } = {}) {
    const response = await fetch(base + path, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json',
        ...(authenticated ? { Cookie: `dth_commerce_session=${token}`, 'X-CSRF-Token': csrf } : {}), ...headers },
      body: raw ? body : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }
  const items = [
    { productId: 'part-a', vehicleId: 'yamaha-nvx-v1', quantity: 1 },
    { productId: 'part-b', vehicleId: 'yamaha-nvx-v2', quantity: 1 },
  ];
  let reviewed;
  await t.test('Guest quote has no session lookup and does not create an order', async () => {
    const response = await request('/cart/quote', { items });
    assert.equal(response.status, 200);
    reviewed = response.body.data;
    assert.equal(reviewed.valid, true);
    assert.equal(reviewed.total, 300_000);
    assert.equal(state.sessionReads, 0);
    assert.equal(state.orders.length, 0);
  });
  await t.test('Quote endpoint inherits Origin, JSON type and body-size protections', async () => {
    const before = state.catalogReads;
    assert.equal((await request('/cart/quote', { items }, { headers: { Origin: 'https://untrusted.example' } })).status, 403);
    assert.equal((await request('/cart/quote', { items }, { headers: { Origin: '' } })).status, 403);
    assert.equal((await request('/cart/quote', { items }, { headers: { 'Content-Type': 'text/plain' } })).status, 415);
    assert.equal((await request('/cart/quote', '{invalid', { raw: true })).status, 400);
    assert.equal((await request('/cart/quote', { items, padding: 'x'.repeat(33_000) })).status, 413);
    assert.equal(state.catalogReads, before);
    assert.equal(state.orders.length, 0);
  });
  const bodyFor = (quote, key) => ({
    items, idempotencyKey: key, demoAcknowledged: true,
    expectedTotal: quote.total, expectedQuoteFingerprint: quote.fingerprint,
  });
  await t.test('Creating an order still requires authentication and CSRF', async () => {
    const body = bodyFor(reviewed, 'review-security');
    assert.equal((await request('/orders', body)).status, 401);
    assert.equal((await request('/orders', body, { authenticated: true, headers: { 'X-CSRF-Token': '' } })).status, 403);
    assert.equal(state.orders.length, 0);
  });
  await t.test('Offsetting line-price changes are rejected even when the total is unchanged', async () => {
    state.products[0].price += 20_000;
    state.products[1].price -= 20_000;
    const response = await request('/orders', bodyFor(reviewed, 'review-prices-a'), { authenticated: true });
    assert.equal(response.status, 409);
    assert.match(response.body.message, /review/i);
    assert.equal(state.orders.length, 0);
  });
  let savedBody, savedOrder;
  await t.test('A fresh reviewed quote saves price and vehicle-label snapshots', async () => {
    reviewed = (await request('/cart/quote', { items })).body.data;
    savedBody = bodyFor(reviewed, 'review-prices-b');
    const response = await request('/orders', savedBody, { authenticated: true });
    assert.equal(response.status, 201);
    savedOrder = response.body.data;
    assert.equal(savedOrder.total, 300_000);
    assert.equal(savedOrder.quoteFingerprint, reviewed.fingerprint);
    assert.ok(Number.isFinite(Date.parse(savedOrder.quotedAt)));
    assert.deepEqual(savedOrder.lines.map(line => line.vehicleLabel), reviewed.lines.map(line => line.vehicleLabel));
    assert.deepEqual(savedOrder.lines.map(line => line.unitPrice), [120_000, 180_000]);
    assert.equal(state.orders.length, 1);
    assert.equal(state.orders[0].quoteFingerprint, reviewed.fingerprint);
    assert.equal(state.orders[0].quotedAt, savedOrder.quotedAt);
  });
  await t.test('A persisted idempotent replay returns the receipt before catalog revalidation', async () => {
    state.products[0].active = false;
    state.products[1].price = 900_000;
    const before = state.catalogReads;
    const replay = await request('/orders', savedBody, { authenticated: true });
    assert.equal(replay.status, 200);
    assert.deepEqual(replay.body.data, savedOrder);
    assert.equal(state.catalogReads, before);
    assert.equal(state.orders.length, 1);
    const changedItems = { ...savedBody, items: [{ ...items[0], quantity: 2 }, items[1]] };
    assert.equal((await request('/orders', changedItems, { authenticated: true })).status, 409);
    assert.equal(state.orders.length, 1);
  });
  await t.test('A product becoming unavailable blocks a new order after review', async () => {
    const response = await request('/orders', bodyFor(reviewed, 'review-unavailable'), { authenticated: true });
    assert.equal(response.status, 409);
    assert.match(response.body.message, /available/i);
    assert.equal(state.orders.length, 1);
    state.products[0].active = true;
    state.products[1].price = 180_000;
  });
  await t.test('A vehicle-label change also requires the customer to review again', async () => {
    reviewed = (await request('/cart/quote', { items })).body.data;
    state.vehicles[0].model = 'NVX updated';
    const response = await request('/orders', bodyFor(reviewed, 'review-vehicle'), { authenticated: true });
    assert.equal(response.status, 409);
    assert.equal(state.orders.length, 1);
  });
  await t.test('Malformed fingerprints fail, while legacy clients keep expected-total protection', async () => {
    reviewed = (await request('/cart/quote', { items })).body.data;
    const malformed = { ...bodyFor(reviewed, 'review-malformed'), expectedQuoteFingerprint: { fingerprint: reviewed.fingerprint } };
    assert.equal((await request('/orders', malformed, { authenticated: true })).status, 400);
    const legacy = { ...bodyFor(reviewed, 'review-legacy') };
    delete legacy.expectedQuoteFingerprint;
    assert.equal((await request('/orders', { ...legacy, expectedTotal: 1 }, { authenticated: true })).status, 409);
    assert.equal(state.orders.length, 1);
    const accepted = await request('/orders', legacy, { authenticated: true });
    assert.equal(accepted.status, 201);
    assert.equal(accepted.body.data.total, reviewed.total);
    assert.equal(accepted.body.data.quoteFingerprint, reviewed.fingerprint);
    assert.equal(state.orders.length, 2);
  });
});
