import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCheckoutDetails } from '../shared/checkout.mjs';
import { checkoutPayloadSignature, resolveCheckoutIntent, finishCheckoutIntent } from '../frontend/src/shop/checkout/checkoutIntent.mjs';

const valid = {
  recipientName: 'Demo Rider', phone: '+84 912 345 678', email: 'RIDER@DTH.TEST',
  addressLine: '12 Demo Street', city: 'Ho Chi Minh City', note: '  Leave at demo desk  ',
  fulfillment: 'demo-delivery', paymentMethod: 'demo-cod',
};

test('checkout normalizes safe demo delivery fields and never accepts payment credentials', () => {
  const value = normalizeCheckoutDetails(valid);
  assert.equal(value.email, 'rider@dth.test');
  assert.equal(value.note, 'Leave at demo desk');
  assert.equal(value.paymentMethod, 'demo-cod');
  assert.equal(value.demoOnly, true);
  assert.equal('cardNumber' in value, false);
});

test('checkout rejects malformed contact, address and payment mode', () => {
  assert.throws(() => normalizeCheckoutDetails({ ...valid, phone: 'abc' }), /phone/i);
  assert.throws(() => normalizeCheckoutDetails({ ...valid, email: 'not-an-email' }), /email/i);
  assert.throws(() => normalizeCheckoutDetails({ ...valid, addressLine: 'x' }), /address/i);
  assert.throws(() => normalizeCheckoutDetails({ ...valid, paymentMethod: 'card' }), /simulated/i);
});

test('checkout intent is stable for retry and rotates when payload changes', () => {
  const memory = new Map();
  const storage = { getItem: k => memory.get(k) ?? null, setItem: (k,v) => memory.set(k,v), removeItem: k => memory.delete(k) };
  const sigA = checkoutPayloadSignature([{ productId: 'part', vehicleId: 'bike', quantity: 1 }], normalizeCheckoutDetails(valid), 'quote-A');
  assert.equal(sigA.includes('Demo Rider'), false);
  assert.equal(sigA.includes('12 Demo Street'), false);
  assert.match(sigA, /^v1-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-z]+$/);
  const first = resolveCheckoutIntent(sigA, null, storage, () => '11111111-1111-1111-1111-111111111111');
  const retry = resolveCheckoutIntent(sigA, null, storage, () => '22222222-2222-2222-2222-222222222222');
  assert.deepEqual(retry, first);
  const sigB = checkoutPayloadSignature([{ productId: 'part', vehicleId: 'bike', quantity: 2 }], normalizeCheckoutDetails(valid), 'quote-B');
  const changed = resolveCheckoutIntent(sigB, first, storage, () => '33333333-3333-3333-3333-333333333333');
  assert.notEqual(changed.id, first.id);
  finishCheckoutIntent(changed, storage);
  assert.equal(memory.size, 0);
});
