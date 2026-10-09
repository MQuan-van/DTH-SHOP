import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteCart } from '../shared/cartQuote.mjs';
import { inspectCartPage, payloadSignature, reviewSignature } from '../frontend/src/shop/cart/page/cartPage.logic.mjs';
import { applyCartQuote, createCartQuoteController } from '../frontend/src/shop/cart/page/cartQuoteReview.mjs';
import { createCheckoutController } from '../frontend/src/shop/cart/page/checkoutSession.mjs';

const catalog = () => ({ products: [
  { id: 'part-a', slug: 'part-a', name: 'Loaded part', price: 100000, active: true, vehicleIds: ['bike-a', 'bike-b'] },
], vehicles: [
  { id: 'bike-a', make: 'Demo', model: 'Street', year: 2022 },
  { id: 'bike-b', make: 'Demo', model: 'Road', year: 2024 },
] });
const item = (quantity = 2, vehicleId = 'bike-a') => ({ productId: 'part-a', vehicleId, quantity });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const memoryStorage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
let intentCounter = 0;
function setup(request) {
  const t = {
    state: { bag: [item()], data: catalog(), actor: 'flow:user-a', identity: 1, mode: 'flow', bagRevision: 0, catalogEpoch: 0, canSubmit: true },
    remote: catalog(), calls: [], notifications: 0,
    quote(items = t.state.bag) { return quoteCart(items, t.remote.products, t.remote.vehicles, { source: 'flow' }); },
    changeBag(bag) { t.state = { ...t.state, bag, bagRevision: t.state.bagRevision + 1 }; },
  };
  t.ctl = createCartQuoteController({ getCurrent: () => t.state,
    requestQuote: items => { t.calls.push(structuredClone(items)); return request ? request(items, t) : Promise.resolve(t.quote(items)); },
    onChange: () => { t.notifications += 1; } });
  return t;
}
function checkout(t, requestOrder, onFailure) {
  const events = [], calls = [];
  const ctl = createCheckoutController({
    getCurrent: () => ({ ...t.state, requireFreshQuote: true, review: t.ctl.read() }),
    requestOrder: async (...args) => { calls.push(args); return requestOrder ? requestOrder(...args)
      : { id: 'ORDER-123456', total: args[4], lines: args[0] }; },
    onSuccess: (...args) => events.push(['success', ...args]),
    onPending: value => events.push(['pending', value]),
    onFailure: error => { events.push(['failure', error]); onFailure?.(error); },
    storage: memoryStorage(), uuid: () => `quote-intent-${++intentCounter}`,
  });
  return { ctl, calls, events };
}
async function acknowledged(t) { await t.ctl.review(); t.ctl.acknowledge(true); return t.ctl.read().signature; }

test('fresh review shows authoritative prices, names and vehicle labels without changing loaded catalog', async () => {
  const t = setup();
  t.remote.products[0].price = 125000; t.remote.products[0].name = 'Current part'; t.remote.vehicles[0].model = 'Current Street';
  const bag = structuredClone(t.state.bag), loaded = structuredClone(t.state.data);
  await t.ctl.review();
  const state = t.ctl.read(), view = applyCartQuote(inspectCartPage(t.state.bag, t.state.data), state.quote);
  assert.equal(state.reviewing, true); assert.equal(state.acknowledged, false);
  assert.equal(view.lines[0].name, 'Current part'); assert.match(view.lines[0].vehicleLabel, /Current Street/);
  assert.equal(view.lines[0].unitPrice, 125000); assert.equal(view.subtotal, 250000);
  assert.deepEqual(t.state.data, loaded); assert.deepEqual(t.state.bag, bag);
  assert.deepEqual(state.priceChanges, [{ key: 'part-a:bike-a', name: 'Current part', before: 100000, after: 125000 }]);
});

test('line mapping uses product plus vehicle even when server line order differs', async () => {
  const t = setup(async (items, fixture) => ({ ...fixture.quote(items), lines: fixture.quote(items).lines.reverse() }));
  t.state.bag = [item(1, 'bike-b'), item(3, 'bike-a')];
  await t.ctl.review();
  const view = applyCartQuote(inspectCartPage(t.state.bag, t.state.data), t.ctl.read().quote);
  assert.deepEqual(view.lines.map(row => [row.vehicleId, row.quantity, row.lineTotal]), [['bike-b', 1, 100000], ['bike-a', 3, 300000]]);
  assert.match(view.lines[0].vehicleLabel, /Road/); assert.match(view.lines[1].vehicleLabel, /Street/);
  assert.deepEqual(t.calls[0], [item(3, 'bike-a'), item(1, 'bike-b')]);
});

test('request payload discards stale price, name and global vehicle fields', async () => {
  const t = setup(); t.state.bag = [{ ...item(), price: 1, name: 'Forged' }]; t.state.vehicleId = 'bike-b';
  await t.ctl.review(); assert.deepEqual(t.calls, [[item()]]); assert.equal(t.ctl.read().quote.total, 200000);
});

test('a recheck compares prices to the prior quote and requires a new acknowledgement', async () => {
  const t = setup(); t.remote.products[0].price = 125000;
  const before = await acknowledged(t);
  t.ctl.invalidate('Edit bag'); t.remote.products[0].price = 150000;
  await t.ctl.review();
  const after = t.ctl.read();
  assert.notEqual(after.signature, before); assert.equal(after.acknowledged, false);
  assert.equal(after.priceChanges[0].before, 125000); assert.equal(after.priceChanges[0].after, 150000);
});

test('a zero-price authoritative demo quote is displayed and compared accurately', async () => {
  const t = setup(); t.remote.products[0].price = 0; await t.ctl.review();
  assert.equal(t.ctl.read().quote.total, 0); assert.equal(t.ctl.read().reviewing, true);
  assert.equal(t.ctl.read().priceChanges[0].after, 0);
  t.remote.products[0].price = 125000; t.ctl.invalidate(); await t.ctl.review();
  assert.equal(t.ctl.read().priceChanges[0].before, 0); assert.equal(t.ctl.read().priceChanges[0].after, 125000);
});

test('newly added vehicle lines compare to their estimate while existing lines use previous checked prices', async () => {
  const t = setup(); t.remote.products[0].price = 125000; await t.ctl.review();
  t.changeBag([item(), item(1, 'bike-b')]); t.remote.products[0].price = 150000; await t.ctl.review();
  assert.deepEqual(t.ctl.read().priceChanges.map(row => [row.key, row.before, row.after]),
    [['part-a:bike-a', 125000, 150000], ['part-a:bike-b', 100000, 150000]]);
});

test('invalid quote preserves the affected vehicle line, blocks acknowledgement and allows a fresh retry', async () => {
  const t = setup(); t.state.bag = [item(1, 'bike-a'), item(2, 'bike-b')];
  t.remote.products[0].vehicleIds = ['bike-a'];
  await t.ctl.review();
  const state = t.ctl.read(), view = applyCartQuote(inspectCartPage(t.state.bag, t.state.data), state.quote);
  assert.equal(state.reviewing, false); assert.equal(t.ctl.acknowledge(true), false);
  assert.equal(view.subtotal, null); assert.equal(view.lines.length, 2); assert.equal(view.canReview, true);
  assert.equal(view.lines[0].status, 'compatible'); assert.equal(view.lines[1].status, 'incompatible');
  assert.match(view.lines[1].issue, /does not match/);
  t.remote.products[0].vehicleIds.push('bike-b'); await t.ctl.review();
  assert.equal(t.ctl.read().reviewing, true); assert.equal(t.ctl.read().acknowledged, false); assert.equal(t.calls.length, 2);
});

test('malformed local input stays blocked before making a quote request', async () => {
  const t = setup(); t.state.bag = [item(11)];
  assert.equal((await t.ctl.review()).ignored, true); assert.equal(t.calls.length, 0);
});

test('a stale local business failure does not prevent checking the current authoritative catalog', async () => {
  for (const change of [data => { data.products[0].active = false; }, data => { data.products[0].price = 0; },
    data => { data.products[0].vehicleIds = ['bike-b']; }, data => { data.products = []; }, data => { data.vehicles = []; }]) {
    const t = setup(); change(t.state.data);
    assert.equal(inspectCartPage(t.state.bag, t.state.data).canReview, false);
    await t.ctl.review(); assert.equal(t.ctl.read().reviewing, true); assert.equal(t.calls.length, 1);
  }
});

test('network failure keeps the bag and permits a successful retry', async () => {
  const t = setup((items, fixture) => fixture.calls.length === 1 ? Promise.reject(new Error('Offline')) : Promise.resolve(fixture.quote(items)));
  const before = structuredClone(t.state.bag); await t.ctl.review();
  assert.equal(t.ctl.read().pending, false); assert.equal(t.ctl.read().reviewing, false); assert.match(t.ctl.read().error, /Offline/);
  assert.deepEqual(t.state.bag, before); await t.ctl.review();
  assert.equal(t.ctl.read().reviewing, true); assert.equal(t.ctl.read().error, '');
});

test('older quote response cannot replace a newer accepted and acknowledged result', async () => {
  const first = deferred(), second = deferred();
  const t = setup((_, fixture) => fixture.calls.length === 1 ? first.promise : second.promise);
  const oldQuote = t.quote(), a = t.ctl.review();
  t.remote.products[0].price = 160000; const newer = t.quote(), b = t.ctl.review();
  second.resolve(newer); await b; t.ctl.acknowledge(true); const accepted = t.ctl.read().signature;
  first.resolve(oldQuote); assert.equal((await a).ignored, true);
  assert.equal(t.ctl.read().quote.total, 320000); assert.equal(t.ctl.read().signature, accepted); assert.equal(t.ctl.read().acknowledged, true);
});

test('an older failed request cannot replace a newer successful review with an error', async () => {
  const old = deferred(); const t = setup((items, fixture) => fixture.calls.length === 1 ? old.promise : Promise.resolve(fixture.quote(items)));
  const first = t.ctl.review(); await t.ctl.review(); t.ctl.acknowledge(true);
  old.reject(new Error('Old timeout')); await first;
  assert.equal(t.ctl.read().error, ''); assert.equal(t.ctl.read().acknowledged, true);
});

test('external quantity change during a request is detected without an intervening render', async () => {
  const pending = deferred(); const t = setup(() => pending.promise), quote = t.quote(), promise = t.ctl.review();
  t.changeBag([item(3)]); pending.resolve(quote);
  assert.equal((await promise).ignored, true); assert.equal(t.ctl.read().quote, null); assert.equal(t.ctl.read().pending, false);
  assert.equal(t.state.bag[0].quantity, 3);
});

test('A -> B -> A external bag changes invalidate an in-flight response by revision', async () => {
  const pending = deferred(); const t = setup(() => pending.promise), quote = t.quote(), promise = t.ctl.review();
  t.changeBag([item(3)]); t.changeBag([item()]); pending.resolve(quote);
  assert.equal((await promise).ignored, true); assert.equal(t.ctl.read().quote, null); assert.equal(t.ctl.read().acknowledged, false);
});

test('emptying the bag while checking never opens review of the removed lines', async () => {
  const pending = deferred(); const t = setup(() => pending.promise), quote = t.quote(), promise = t.ctl.review();
  t.changeBag([]); pending.resolve(quote); await promise;
  assert.deepEqual(t.state.bag, []); assert.equal(t.ctl.read().reviewing, false); assert.equal(t.ctl.read().quote, null);
});

test('acknowledgement cannot return when a changed bag returns to the same items', async () => {
  const t = setup(), old = await acknowledged(t);
  t.changeBag([item(3)]); t.changeBag([item()]);
  assert.equal(t.ctl.read().acknowledged, false); assert.equal(t.ctl.read().quote, null);
  await t.ctl.review(); assert.notEqual(t.ctl.read().signature, old); assert.equal(t.ctl.read().acknowledged, false);
});

test('loaded catalog changes and refresh epochs invalidate quote acknowledgement', async () => {
  const t = setup(); await acknowledged(t); t.state.data.products[0].price += 1;
  assert.equal(t.ctl.read().acknowledged, false); assert.equal(t.ctl.read().quote, null);
  await acknowledged(t); t.state.catalogEpoch += 1;
  assert.equal(t.ctl.read().acknowledged, false); assert.equal(t.ctl.read().quote, null);
});

test('a catalog refresh that starts before the next render rejects the pending response', async () => {
  const pending = deferred(); const t = setup(() => pending.promise), quote = t.quote(), promise = t.ctl.review();
  t.state.catalogEpoch += 1; pending.resolve(quote);
  assert.equal((await promise).ignored, true); assert.equal(t.ctl.read().reviewing, false);
});

test('logout and login to the same actor discards old responses using the identity epoch', async () => {
  const pending = deferred(); const t = setup(() => pending.promise), quote = t.quote(), promise = t.ctl.review();
  t.state.identity += 2; pending.resolve(quote);
  assert.equal((await promise).ignored, true); assert.equal(t.ctl.read().quote, null);
});

test('account change clears previous-account price comparisons and acknowledgement', async () => {
  const t = setup(); t.remote.products[0].price = 125000; await acknowledged(t);
  t.state.actor = 'flow:user-b'; t.state.identity += 1; t.remote.products[0].price = 150000;
  await t.ctl.review();
  assert.equal(t.ctl.read().acknowledged, false); assert.equal(t.ctl.read().priceChanges[0].before, 100000);
});

test('unmounted controller cannot publish, and reactivation cannot revive its old request', async () => {
  const pending = deferred(); const t = setup((items, fixture) => fixture.calls.length === 1 ? pending.promise : Promise.resolve(fixture.quote(items)));
  const quote = t.quote(), old = t.ctl.review(); t.ctl.dispose(); const notifications = t.notifications;
  pending.resolve(quote); assert.equal((await old).ignored, true); assert.equal(t.notifications, notifications);
  t.ctl.activate(); await t.ctl.review(); assert.equal(t.ctl.read().reviewing, true); assert.equal(t.ctl.read().acknowledged, false);
});

test('malformed or wrong-source responses never become checked UI data', async () => {
  for (const edit of [quote => { quote.lines.pop(); }, quote => { quote.source = 'api'; }, quote => { quote.lines[0].quantity += 1; }]) {
    const t = setup(async (items, fixture) => { const quote = fixture.quote(items); edit(quote); return quote; });
    await t.ctl.review(); assert.equal(t.ctl.read().quote, null); assert.equal(t.ctl.read().reviewing, false);
    assert.match(t.ctl.read().error, /could not be verified/); assert.deepEqual(t.state.bag, [item()]);
  }
});

test('checkout submits fresh authoritative total and fingerprint despite a stale loaded price', async () => {
  const t = setup(); t.remote.products[0].price = 175000; const signature = await acknowledged(t), c = checkout(t);
  assert.equal((await c.ctl.submit(signature)).ok, true);
  assert.deepEqual(c.calls[0][0], [item()]); assert.equal(c.calls[0][2], true);
  assert.equal(c.calls[0][3].products[0].price, 100000); assert.equal(c.calls[0][4], 350000);
  assert.equal(c.calls[0][5], t.ctl.read().quote.fingerprint);
});

test('new checkout path never falls back to a loaded-catalog quote', async () => {
  const t = setup(), c = checkout(t);
  const oldSignature = reviewSignature(t.state.actor, inspectCartPage(t.state.bag, t.state.data));
  assert.equal((await c.ctl.submit(oldSignature)).ignored, true); assert.equal(c.calls.length, 0);
});

test('new quote with identical facts does not accept an old acknowledgement signature', async () => {
  const t = setup(), old = await acknowledged(t), c = checkout(t);
  t.ctl.invalidate(); await acknowledged(t);
  assert.equal((await c.ctl.submit(old)).ignored, true); assert.equal(c.calls.length, 0);
  assert.equal((await c.ctl.submit(t.ctl.read().signature)).ok, true);
});

test('checkout rejects a cached review if live bag or catalog revisions have changed', async () => {
  for (const change of [t => t.changeBag([item(3)]), t => { t.state.catalogEpoch += 1; }, t => { t.state.identity += 1; }]) {
    const t = setup(), signature = await acknowledged(t), review = t.ctl.read(); let calls = 0;
    const ctl = createCheckoutController({ getCurrent: () => ({ ...t.state, requireFreshQuote: true, review }), requestOrder: () => { calls += 1; } });
    change(t); assert.equal((await ctl.submit(signature)).ignored, true); assert.equal(calls, 0);
  }
});

test('409 unlocks recheck and new acknowledgement while preserving the order retry intent', async () => {
  const t = setup(); await acknowledged(t); let fail = true;
  const c = checkout(t, async (...args) => {
    if (fail) { fail = false; throw Object.assign(new Error('Price changed'), { status: 409 }); }
    return { id: 'ORDER-123456', total: args[4], lines: args[0] };
  }, error => { if (error.status === 409) t.ctl.invalidate('Check again.', error.message); });
  const first = await c.ctl.submit(t.ctl.read().signature);
  assert.equal(first.ok, false); assert.equal(c.ctl.isPending(), false); assert.equal(t.ctl.read().reviewing, false);
  t.remote.products[0].price = 125000; await t.ctl.review();
  assert.equal(t.ctl.read().reviewing, true); assert.equal(t.ctl.read().acknowledged, false);
  assert.equal((await c.ctl.submit(t.ctl.read().signature)).ignored, true);
  t.ctl.acknowledge(true); assert.equal((await c.ctl.submit(t.ctl.read().signature)).ok, true);
  assert.equal(c.calls[0][1], c.calls[1][1]); assert.equal(c.calls[1][4], 250000); assert.notEqual(c.calls[0][5], c.calls[1][5]);
});

test('fresh checkout ignores a second submit and retains the same intent on an uncertain network failure', async () => {
  const pending = deferred(), t = setup(), signature = await acknowledged(t); let count = 0;
  const c = checkout(t, async (...args) => ++count === 1 ? pending.promise : { id: 'ORDER-123456', total: args[4], lines: args[0] });
  const first = c.ctl.submit(signature); assert.equal((await c.ctl.submit(signature)).ignored, true);
  pending.reject(new Error('Network lost')); await first;
  assert.equal((await c.ctl.submit(signature)).ok, true); assert.equal(c.calls.length, 2); assert.equal(c.calls[0][1], c.calls[1][1]);
});

test('order confirmation carries the original bag revision so a later bag is retained', async () => {
  const pending = deferred(), t = setup(), signature = await acknowledged(t), c = checkout(t, () => pending.promise);
  const revision = t.state.bagRevision, payload = payloadSignature(t.state.bag), submit = c.ctl.submit(signature);
  t.changeBag([item(3)]); t.changeBag([item()]); pending.resolve({ id: 'ORDER-123456', total: 200000, lines: [item()] }); await submit;
  const success = c.events.find(event => event[0] === 'success');
  assert.equal(success[2], payload); assert.equal(success[3], revision); assert.notEqual(success[3], t.state.bagRevision);
});
