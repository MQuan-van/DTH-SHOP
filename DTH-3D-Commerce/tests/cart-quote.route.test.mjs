/** Real HTTP and Express routing; catalog models are read-only test doubles. */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { installCart } from '../backend/commerce/cart/routes.mjs';
import { InputError } from '../shared/domain.mjs';
import { cartQuoteFingerprint } from '../shared/cartQuote.mjs';

async function fixture(t) {
  const state = {
    products: [
      { id: 'shared-part', name: 'Shared part', price: 125_000, currency: 'VND', active: true, vehicleIds: ['bike-a', 'bike-b'] },
      { id: 'inactive-part', name: 'Retired part', price: 90_000, currency: 'VND', active: false, vehicleIds: ['bike-a'] },
    ],
    vehicles: [
      { id: 'bike-a', make: 'Yamaha', model: 'NVX', year: 2024 },
      { id: 'bike-b', make: 'Honda', model: 'SH', year: 2023 },
    ],
    reads: [],
    writes: 0,
    failNextRead: false,
  };
  const model = name => ({
    find(query) {
      state.reads.push({ name, query: structuredClone(query) });
      return {
        select() { return this; },
        async lean() {
          if (state.failNextRead) { state.failNextRead = false; throw new Error('Catalog unavailable'); }
          return structuredClone(state[name].filter(row => query.id.$in.includes(row.id)));
        },
      };
    },
    async create() { state.writes++; throw new Error('Quotes cannot create records.'); },
    async updateOne() { state.writes++; throw new Error('Quotes cannot update records.'); },
    async deleteOne() { state.writes++; throw new Error('Quotes cannot delete records.'); },
  });
  const app = express();
  app.use(express.json({ limit: '32kb' }));
  const router = express.Router();
  installCart(router, { Product: model('products'), Vehicle: model('vehicles') });
  app.use('/api/shop', router);
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.status(error instanceof InputError ? error.status : 500).json({ message: error.message });
  });
  const server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  async function quote(body) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/shop/cart/quote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return { status: response.status, headers: response.headers, body: await response.json() };
  }
  return { state, quote };
}

test('Public quote route reads only requested catalog IDs and retains each selected vehicle', async t => {
  const { state, quote } = await fixture(t);
  const items = [
    { productId: 'shared-part', vehicleId: 'bike-b', quantity: 2, unitPrice: 1, lineTotal: 2 },
    { productId: 'shared-part', vehicleId: 'bike-a', quantity: 1 },
  ];
  const result = await quote({ items, total: 3, currency: 'USD', inventoryChecked: true });
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(result.body.data.source, 'api');
  assert.equal(result.body.data.valid, true);
  assert.equal(result.body.data.total, 375_000);
  assert.equal(result.body.data.inventoryChecked, false);
  assert.ok(Number.isFinite(Date.parse(result.body.data.quotedAt)));
  assert.deepEqual(result.body.data.lines.map(line => [line.vehicleId, line.quantity, line.lineTotal]), [
    ['bike-a', 1, 125_000], ['bike-b', 2, 250_000],
  ]);
  assert.equal(result.body.data.fingerprint, cartQuoteFingerprint(result.body.data));
  assert.deepEqual(state.reads, [
    { name: 'products', query: { id: { $in: ['shared-part'] } } },
    { name: 'vehicles', query: { id: { $in: ['bike-a', 'bike-b'] } } },
  ]);
  assert.equal(state.writes, 0);
});

test('Repeated quotes read fresh records and return invalid business lines without hiding them', async t => {
  const { state, quote } = await fixture(t);
  const body = { items: [
    { productId: 'shared-part', vehicleId: 'bike-a', quantity: 2 },
    { productId: 'inactive-part', vehicleId: 'bike-a', quantity: 1 },
  ] };
  const initial = await quote(body);
  assert.equal(initial.status, 200);
  assert.equal(initial.body.data.valid, false);
  assert.equal(initial.body.data.total, null);
  assert.equal(initial.body.data.subtotal, null);
  assert.equal(initial.body.data.lines.length, 2);
  assert.equal(initial.body.data.lines.find(line => line.productId === 'inactive-part').status, 'unavailable');
  state.products[0].price = 140_000;
  state.products[1].active = true;
  const refreshed = await quote(body);
  assert.equal(refreshed.status, 200);
  assert.equal(refreshed.body.data.valid, true);
  assert.equal(refreshed.body.data.total, 370_000);
  assert.notEqual(refreshed.body.data.fingerprint, initial.body.data.fingerprint);
  assert.equal(state.reads.length, 4);
  assert.equal(state.writes, 0);
});

test('Malformed cart inputs fail before any database query', async t => {
  const { state, quote } = await fixture(t);
  const item = { productId: 'shared-part', vehicleId: 'bike-a', quantity: 1 };
  const invalidBodies = [
    {}, { items: [] }, { items: 'not-an-array' },
    { items: [{ ...item, productId: { $ne: '' } }] },
    { items: [{ ...item, vehicleId: { $in: ['bike-a'] } }] },
    { items: [{ ...item, quantity: '1' }] },
    { items: [{ ...item, quantity: 0 }] },
    { items: [{ ...item, quantity: 1.5 }] },
    { items: [{ ...item, quantity: 11 }] },
    { items: [{ ...item, quantity: 6 }, { ...item, quantity: 5 }] },
    { items: Array.from({ length: 21 }, () => ({ ...item })) },
  ];
  for (const body of invalidBodies) {
    const result = await quote(body);
    assert.equal(result.status, 400);
    assert.equal(result.body.data, undefined);
  }
  assert.equal(state.reads.length, 0);
  assert.equal(state.writes, 0);
});

test('A catalog read failure does not return a stale or preview quote', async t => {
  const { state, quote } = await fixture(t);
  const body = { items: [{ productId: 'shared-part', vehicleId: 'bike-a', quantity: 1 }] };
  assert.equal((await quote(body)).status, 200);
  state.failNextRead = true;
  const failed = await quote(body);
  assert.equal(failed.status, 500);
  assert.equal(failed.body.data, undefined);
  state.products[0].price = 175_000;
  const retried = await quote(body);
  assert.equal(retried.body.data.total, 175_000);
  assert.equal(retried.body.data.source, 'api');
  assert.equal(state.writes, 0);
});

test('Public quote traffic is rate limited before extra database reads', async t => {
  const { state, quote } = await fixture(t);
  const body = { items: [{ productId: 'shared-part', vehicleId: 'bike-a', quantity: 1 }] };
  for (let i = 0; i < 60; i++) assert.equal((await quote(body)).status, 200);
  const readCount = state.reads.length;
  const limited = await quote(body);
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  assert.equal(state.reads.length, readCount);
  assert.equal(state.writes, 0);
});
