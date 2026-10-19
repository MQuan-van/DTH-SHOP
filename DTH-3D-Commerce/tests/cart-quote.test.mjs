import test from 'node:test';
import assert from 'node:assert/strict';
import { InputError } from '../shared/domain.mjs';
import { cartQuoteFingerprint, quoteCart } from '../shared/cartQuote.mjs';

const quotedAt = '2026-10-05T13:30:00.000Z';
const options = { source: 'api', now: () => quotedAt };
const vehicles = [
  { id: 'street-2023', make: 'Demo Moto', model: 'Street', year: 2023 },
  { id: 'touring-2024', make: 'Demo Auto', model: 'Touring', year: 2024 },
];
const products = [
  { id: 'brake-kit', name: 'Demo Brake Kit', price: 200_000, currency: 'VND', active: true, vehicleIds: ['street-2023'] },
  { id: 'mirror-kit', name: 'Demo Mirror Kit', price: 300_000, currency: 'VND', active: true, vehicleIds: ['street-2023', 'touring-2024'] },
];
const brakeItem = { productId: 'brake-kit', vehicleId: 'street-2023', quantity: 2 };
const mirrorItem = { productId: 'mirror-kit', vehicleId: 'touring-2024', quantity: 1 };

function quote(items = [brakeItem], catalog = products, fleet = vehicles, config = options) {
  return quoteCart(items, catalog, fleet, config);
}

function assertInputError(operation) {
  assert.throws(operation, error => error instanceof InputError && error.status === 400);
}

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) freezeDeep(entry);
    Object.freeze(value);
  }
  return value;
}

test('fresh quote returns trusted per-line prices and an explicit demo quote snapshot', () => {
  const result = quote([mirrorItem, brakeItem]);
  assert.equal(result.version, 1);
  assert.equal(result.source, 'api');
  assert.equal(result.quotedAt, quotedAt);
  assert.equal(result.valid, true);
  assert.equal(result.currency, 'VND');
  assert.equal(result.delivery, 0);
  assert.equal(result.paymentStatus, 'simulated');
  assert.equal(result.inventoryChecked, false);
  assert.equal(result.subtotal, 700_000);
  assert.equal(result.total, 700_000);
  assert.deepEqual(result.items, [brakeItem, mirrorItem]);
  assert.deepEqual(result.lines.map(line => ({
    productId: line.productId, vehicleId: line.vehicleId, quantity: line.quantity,
    name: line.name, unitPrice: line.unitPrice, lineTotal: line.lineTotal, status: line.status,
  })), [
    { ...brakeItem, name: 'Demo Brake Kit', unitPrice: 200_000, lineTotal: 400_000, status: 'compatible' },
    { ...mirrorItem, name: 'Demo Mirror Kit', unitPrice: 300_000, lineTotal: 300_000, status: 'compatible' },
  ]);
  for (const line of result.lines) {
    const vehicle = vehicles.find(candidate => candidate.id === line.vehicleId);
    assert.equal(typeof line.issue, 'string');
    assert.equal(typeof line.vehicleLabel, 'string');
    for (const value of [vehicle.make, vehicle.model, String(vehicle.year)]) {
      assert.ok(line.vehicleLabel.includes(value), `Vehicle label must identify ${value}`);
    }
  }
  assert.equal(typeof result.fingerprint, 'string');
  assert.ok(result.fingerprint.length > 0);
  assert.equal(result.fingerprint, cartQuoteFingerprint(result));
});

test('the same product for two vehicles remains two independently validated lines', () => {
  const result = quote([
    { productId: 'mirror-kit', vehicleId: 'touring-2024', quantity: 9 },
    { productId: 'mirror-kit', vehicleId: 'street-2023', quantity: 9 },
  ]);
  assert.equal(result.valid, true);
  assert.equal(result.lines.length, 2);
  assert.deepEqual(result.lines.map(line => [line.vehicleId, line.quantity, line.status]), [
    ['street-2023', 9, 'compatible'],
    ['touring-2024', 9, 'compatible'],
  ]);
  assert.notEqual(result.lines[0].vehicleLabel, result.lines[1].vehicleLabel);
  assert.equal(result.total, 5_400_000);

  const mixedFitment = quote([
    brakeItem,
    { ...brakeItem, vehicleId: 'touring-2024' },
  ]);
  assert.deepEqual(mixedFitment.lines.map(line => [line.vehicleId, line.status]), [
    ['street-2023', 'compatible'],
    ['touring-2024', 'incompatible'],
  ]);
  assert.equal(mixedFitment.valid, false);
  assert.equal(mixedFitment.total, null);
});

test('duplicate product and vehicle pairs merge before arithmetic with canonical ordering', () => {
  const result = quote([
    mirrorItem,
    { ...brakeItem, quantity: 3 },
    { ...brakeItem, quantity: 4 },
    { ...mirrorItem, vehicleId: 'street-2023', quantity: 2 },
  ]);
  assert.deepEqual(result.items, [
    { ...brakeItem, quantity: 7 },
    { ...mirrorItem, vehicleId: 'street-2023', quantity: 2 },
    mirrorItem,
  ]);
  assert.equal(result.lines.length, 3);
  assert.equal(result.lines[0].lineTotal, 1_400_000);
  assert.equal(result.total, 2_300_000);
});

test('all invalid business lines are retained and prevent a misleading partial total', () => {
  const catalog = [
    ...products,
    { ...products[0], id: 'inactive-kit', active: false },
    { ...products[0], id: 'invalid-price-kit', price: -1 },
    { ...products[0], id: 'unmapped-kit', vehicleIds: undefined },
  ];
  const result = quote([
    brakeItem,
    { ...brakeItem, productId: 'missing-kit' },
    { ...brakeItem, productId: 'inactive-kit' },
    { ...brakeItem, productId: 'invalid-price-kit' },
    { ...brakeItem, productId: 'unmapped-kit' },
    { ...brakeItem, vehicleId: 'missing-vehicle' },
    { ...brakeItem, vehicleId: 'touring-2024' },
  ], catalog);
  assert.equal(result.valid, false);
  assert.equal(result.subtotal, null);
  assert.equal(result.total, null);
  assert.equal(result.lines.length, 7);
  assert.equal(result.items.length, 7);
  assert.deepEqual(Object.fromEntries(result.lines.map(line => [
    `${line.productId}:${line.vehicleId}`, line.status,
  ])), {
    'brake-kit:street-2023': 'compatible',
    'missing-kit:street-2023': 'unavailable',
    'inactive-kit:street-2023': 'unavailable',
    'invalid-price-kit:street-2023': 'price-unavailable',
    'unmapped-kit:street-2023': 'unknown',
    'brake-kit:missing-vehicle': 'unknown',
    'brake-kit:touring-2024': 'incompatible',
  });
  for (const line of result.lines) {
    assert.equal(line.quantity, 2);
    assert.equal(typeof line.name, 'string');
    assert.equal(typeof line.vehicleLabel, 'string');
    if (line.status !== 'compatible') {
      assert.equal(typeof line.issue, 'string');
      assert.ok(line.issue.trim().length > 0, `Missing issue for ${line.productId}:${line.vehicleId}`);
    }
  }
  const available = result.lines.find(line => line.status === 'compatible');
  assert.equal(available.unitPrice, 200_000);
  assert.equal(available.lineTotal, 400_000);
  for (const productId of ['missing-kit', 'invalid-price-kit']) {
    const line = result.lines.find(candidate => candidate.productId === productId);
    assert.equal(line.unitPrice, null);
    assert.equal(line.lineTotal, null);
  }
});

test('empty fitment lists mean a known mismatch while absent fitment is unknown', () => {
  for (const vehicleIds of [undefined, null, 'street-2023']) {
    const result = quote([brakeItem], [{ ...products[0], vehicleIds }]);
    assert.equal(result.lines[0].status, 'unknown');
    assert.equal(result.valid, false);
  }
  const mismatch = quote([brakeItem], [{ ...products[0], vehicleIds: [] }]);
  assert.equal(mismatch.lines[0].status, 'incompatible');
  assert.equal(mismatch.valid, false);
});

test('malformed carts fail with InputError 400 instead of a business-validation quote', async t => {
  const cases = [
    ['missing cart', undefined],
    ['null cart', null],
    ['non-array cart', {}],
    ['empty cart', []],
    ['too many raw lines', Array.from({ length: 21 }, () => ({ ...brakeItem, quantity: 1 }))],
    ['null item', [null]],
    ['array item', [[]]],
    ['string item', ['brake-kit']],
    ['object product ID', [{ ...brakeItem, productId: { $ne: null } }]],
    ['invalid product ID', [{ ...brakeItem, productId: '../brake-kit' }]],
    ['empty vehicle ID', [{ ...brakeItem, vehicleId: '' }]],
    ['object vehicle ID', [{ ...brakeItem, vehicleId: { $ne: null } }]],
    ['missing vehicle ID', [{ productId: 'brake-kit', quantity: 1 }]],
    ['duplicate quantity cap', [{ ...brakeItem, quantity: 6 }, { ...brakeItem, quantity: 5 }]],
  ];
  for (const quantity of [0, -1, 1.5, 11, '2', null, undefined, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    cases.push([`invalid quantity ${String(quantity)}`, [{ ...brakeItem, quantity }]]);
  }
  for (const [name, items] of cases) {
    await t.test(name, () => assertInputError(() => quoteCart(items, products, vehicles, options)));
  }
});

test('quoting neither mutates inputs nor trusts client-supplied price, fitment, or totals', () => {
  const input = freezeDeep([{
    ...brakeItem,
    name: 'Forged product name', vehicleLabel: 'Forged vehicle',
    price: 1, unitPrice: 1, lineTotal: 2, total: 2, currency: 'USD',
    active: true, status: 'compatible', issue: '', inventoryChecked: true,
    vehicleIds: ['touring-2024'],
  }]);
  const catalog = freezeDeep(structuredClone(products));
  const fleet = freezeDeep(structuredClone(vehicles));
  const before = structuredClone({ input, catalog, fleet });
  const result = quote(input, catalog, fleet);
  assert.deepEqual({ input, catalog, fleet }, before);
  assert.deepEqual(result.items, [brakeItem]);
  assert.equal(result.lines[0].name, 'Demo Brake Kit');
  assert.equal(result.lines[0].unitPrice, 200_000);
  assert.equal(result.lines[0].lineTotal, 400_000);
  assert.notEqual(result.lines[0].vehicleLabel, 'Forged vehicle');
  assert.equal(result.total, 400_000);
  assert.equal(result.currency, 'VND');
  assert.equal(result.inventoryChecked, false);

  const forgedFitment = quote([{ ...input[0], vehicleId: 'touring-2024' }], catalog, fleet);
  assert.equal(forgedFitment.lines[0].status, 'incompatible');
  assert.equal(forgedFitment.valid, false);
});

test('non-integer, missing, and out-of-bounds catalog money is not quoteable', async t => {
  for (const price of [-1, 0.5, 1_000_000_001, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, '200000', null, undefined]) {
    await t.test(`catalog price ${String(price)}`, () => {
      const result = quote([brakeItem], [{ ...products[0], price }]);
      assert.equal(result.valid, false);
      assert.equal(result.lines[0].status, 'price-unavailable');
      assert.equal(result.lines[0].unitPrice, null);
      assert.equal(result.lines[0].lineTotal, null);
      assert.equal(result.subtotal, null);
      assert.equal(result.total, null);
    });
  }
});

test('inclusive VND price bounds and the maximum allowed cart retain exact integer totals', () => {
  for (const price of [0, 1_000_000_000]) {
    const result = quote([{ ...brakeItem, quantity: 10 }], [{ ...products[0], price }]);
    assert.equal(result.valid, true);
    assert.equal(result.lines[0].unitPrice, price);
    assert.equal(result.total, price * 10);
    assert.ok(Number.isSafeInteger(result.total));
  }
  const catalog = Array.from({ length: 20 }, (_, index) => ({
    ...products[0], id: `part-${index}`, price: 1_000_000_000,
  }));
  const items = catalog.map(product => ({ ...brakeItem, productId: product.id, quantity: 10 }));
  const result = quote(items, catalog);
  assert.equal(result.valid, true);
  assert.equal(result.total, 200_000_000_000);
  assert.ok(Number.isSafeInteger(result.total));
});

test('explicit non-VND currencies are invalid while omitted legacy currency remains VND', async t => {
  for (const currency of ['USD', 'vnd', '', null, 704]) {
    await t.test(`currency ${String(currency)}`, () => {
      const result = quote([brakeItem], [{ ...products[0], currency }]);
      assert.equal(result.valid, false);
      assert.equal(result.lines[0].status, 'price-unavailable');
      assert.equal(result.lines[0].unitPrice, null);
      assert.equal(result.lines[0].lineTotal, null);
      assert.equal(result.total, null);
    });
  }
  const { currency, ...legacyProduct } = products[0];
  const legacy = quote([brakeItem], [legacyProduct]);
  assert.equal(legacy.valid, true);
  assert.equal(legacy.currency, 'VND');
  assert.equal(legacy.total, 400_000);
});

test('fingerprint is stable across input order, catalog order, and equivalent duplicate representation', () => {
  const baseline = quote([brakeItem, mirrorItem]);
  const reordered = quote([mirrorItem, brakeItem], [...products].reverse(), [...vehicles].reverse());
  const duplicates = quote([
    { ...brakeItem, quantity: 1 },
    mirrorItem,
    { ...brakeItem, quantity: 1 },
  ]);
  assert.deepEqual(reordered.items, baseline.items);
  assert.deepEqual(duplicates.items, baseline.items);
  assert.equal(reordered.fingerprint, baseline.fingerprint);
  assert.equal(duplicates.fingerprint, baseline.fingerprint);
});

test('fingerprint excludes source, quote time, and explanatory issue text', () => {
  const baseline = quote([brakeItem, mirrorItem]);
  for (const source of ['api', 'flow', 'preview']) {
    const result = quote([brakeItem, mirrorItem], products, vehicles, {
      source, now: () => '2026-10-06T10:00:00.000Z',
    });
    assert.equal(result.source, source);
    assert.equal(result.quotedAt, '2026-10-06T10:00:00.000Z');
    assert.equal(result.fingerprint, baseline.fingerprint);
  }
  const changedExplanations = {
    ...baseline,
    source: 'preview',
    quotedAt: '2027-01-01T00:00:00.000Z',
    lines: baseline.lines.map(line => ({ ...line, issue: 'Updated explanation only' })),
  };
  assert.equal(cartQuoteFingerprint(changedExplanations), baseline.fingerprint);
});

test('fingerprint catches individual price changes even when the order total stays the same', () => {
  const items = [{ ...brakeItem, quantity: 1 }, mirrorItem];
  const original = quote(items);
  const changed = quote(items, [
    { ...products[0], price: products[0].price + 25_000 },
    { ...products[1], price: products[1].price - 25_000 },
  ]);
  assert.equal(changed.total, original.total);
  assert.notEqual(changed.lines[0].unitPrice, original.lines[0].unitPrice);
  assert.notEqual(changed.fingerprint, original.fingerprint);
});

test('fingerprint binds every material line field and the monetary summary', async t => {
  const baseline = quote([brakeItem, mirrorItem]);
  const lineChanges = [
    ['product identity', { productId: 'replacement-kit' }],
    ['vehicle identity', { vehicleId: 'different-vehicle' }],
    ['quantity', { quantity: 3 }],
    ['product label', { name: 'Renamed Brake Kit' }],
    ['vehicle label', { vehicleLabel: 'Corrected model year' }],
    ['unit price', { unitPrice: 199_999 }],
    ['line total', { lineTotal: 399_999 }],
    ['fitment status', { status: 'incompatible' }],
  ];
  for (const [name, change] of lineChanges) {
    await t.test(name, () => {
      const changed = { ...baseline, lines: [{ ...baseline.lines[0], ...change }, baseline.lines[1]] };
      assert.notEqual(cartQuoteFingerprint(changed), baseline.fingerprint);
    });
  }
  for (const [name, change] of [
    ['subtotal', { subtotal: baseline.subtotal - 1 }],
    ['total', { total: baseline.total - 1 }],
    ['currency', { currency: 'USD' }],
  ]) {
    await t.test(name, () => assert.notEqual(cartQuoteFingerprint({ ...baseline, ...change }), baseline.fingerprint));
  }
});
