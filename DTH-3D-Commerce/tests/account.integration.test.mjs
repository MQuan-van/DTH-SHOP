/** Real HTTP + Mongoose + MongoDB. Run only against the disposable test database. */
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { makeApp } from '../backend/commerce/app.mjs';
import { Product, Vehicle, User, Session, Order } from '../backend/commerce/models.mjs';

const uri = process.env.TEST_MONGO_URI;
if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):[0-9]+\/dth_account_test$/.test(uri)) {
  throw new Error('Set TEST_MONGO_URI=mongodb://127.0.0.1:27017/dth_account_test. No other database will be modified.');
}
const origin = 'http://127.0.0.1:5000';
const password = 'Test only password 28!';
let server, base;
async function start() { const app = await makeApp(); server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); }); base = `http://127.0.0.1:${server.address().port}/api/shop`; }
async function stop() { if (!server) return; server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); server = null; }
async function request(path, method = 'GET', body, identity = {}, extra = {}) {
  const response = await fetch(base + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(identity.cookie ? { Cookie: identity.cookie } : {}), ...(identity.csrf ? { 'X-CSRF-Token': identity.csrf } : {}), ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  const cookie = response.headers.getSetCookie().find(c => c.startsWith('dth_commerce_session='));
  return { status: response.status, data, cookie: cookie?.split(';')[0], fullCookie: cookie };
}

test('Account API against real MongoDB', async t => {
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  try {
    await Promise.all([Product, Vehicle, User, Session, Order].map(m => m.init()));
    const catalog = JSON.parse(await readFile(new URL('../shared/catalog.json', import.meta.url), 'utf8'));
    await Product.insertMany(catalog.products); await Vehicle.insertMany(catalog.vehicles);
    const p = catalog.products[0], vehicleId = p.vehicleIds[0];
    await start();
    let a, b, orderId;
    await t.test('Register and create hashed session, no secret fields exposed', async () => {
      const r = await request('/auth/register', 'POST', { email: 'account-a@example.test', password, role: 'admin' });
      assert.equal(r.status, 201); assert.equal(r.data.user.role, 'customer'); assert.equal(r.data.user.savedVehicleId, '');
      assert.ok(r.data.user.createdAt); assert.equal(r.data.user.passwordHash, undefined);
      assert.match(r.fullCookie, /HttpOnly/i); assert.match(r.fullCookie, /SameSite=Lax/i);
      a = { cookie: r.cookie, csrf: r.data.csrf, id: r.data.user.id };
      const stored = await User.findById(a.id).lean(); assert.match(stored.passwordHash, /^scrypt\$/); assert.notEqual(stored.passwordHash, password);
      const session = await Session.findOne({ userId: a.id }).lean(); assert.notEqual(session.tokenHash, a.cookie.split('=')[1]);
    });
    await t.test('Unauthenticated account routes reject access', async () => { assert.equal((await request('/account/orders')).status, 401); assert.equal((await request('/account/vehicle', 'PUT', { vehicleId })).status, 401); });
    await t.test('Saved vehicle rejects missing CSRF and wrong Origin', async () => { assert.equal((await request('/account/vehicle', 'PUT', { vehicleId }, { cookie: a.cookie })).status, 403); assert.equal((await request('/account/vehicle', 'PUT', { vehicleId }, a, { Origin: 'https://evil.example' })).status, 403); });
    await t.test('Saved vehicle rejects query injection and unknown IDs', async () => { assert.equal((await request('/account/vehicle', 'PUT', { vehicleId: { $ne: '' } }, a)).status, 400); assert.equal((await request('/account/vehicle', 'PUT', { vehicleId: 'unknown-vehicle' }, a)).status, 409); });
    await t.test('Save writes the account document, never client-supplied roles', async () => { const r = await request('/account/vehicle', 'PUT', { vehicleId, role: 'admin', userId: 'another-user' }, a); assert.equal(r.status, 200); assert.equal(r.data.user.savedVehicleId, vehicleId); assert.equal(r.data.user.role, 'customer'); assert.equal((await User.findById(a.id).lean()).savedVehicleId, vehicleId); });
    await t.test('Save persists in current session', async () => assert.equal((await request('/auth/me', 'GET', undefined, a)).data.user.savedVehicleId, vehicleId));
    await t.test('Second account cannot see or change the first preference', async () => { const r = await request('/auth/register', 'POST', { email: 'account-b@example.test', password }); b = { cookie: r.cookie, csrf: r.data.csrf, id: r.data.user.id }; assert.equal(r.status, 201); assert.equal(r.data.user.savedVehicleId, ''); await request('/account/vehicle', 'PUT', { vehicleId: '', userId: a.id }, b); assert.equal((await User.findById(a.id).lean()).savedVehicleId, vehicleId); });
    await t.test('Checkout persists an actual simulated order and duplicate retry is idempotent', async () => { const body = { items: [{ productId: p.id, vehicleId, quantity: 2 }], idempotencyKey: randomUUID(), demoAcknowledged: true }; const r = await request('/orders', 'POST', body, a); assert.equal(r.status, 201); orderId = r.data.data.id; assert.equal(r.data.data.total, p.price * 2); const repeat = await request('/orders', 'POST', body, a); assert.equal(repeat.data.data.id, orderId); assert.equal(await Order.countDocuments({ userId: a.id }), 1); });
    await t.test('Own order history has correct totals and details', async () => { const r = await request('/account/orders', 'GET', undefined, a); assert.equal(r.status, 200); assert.equal(r.data.total, 1); assert.equal(r.data.data[0].id, orderId); assert.equal(r.data.data[0].userId, undefined); const d = await request(`/account/orders/${orderId}`, 'GET', undefined, a); assert.equal(d.data.data.total, p.price * 2); });
    await t.test('Different account cannot read another receipt, even with userId override', async () => { assert.equal((await request(`/account/orders/${orderId}`, 'GET', undefined, b)).status, 404); const r = await request(`/account/orders?userId=${a.id}`, 'GET', undefined, b); assert.equal(r.data.total, 0); });
    await t.test('Order search escapes metacharacters and rejects object filters', async () => { assert.equal((await request('/account/orders?q=.*', 'GET', undefined, a)).data.total, 0); assert.equal((await request('/account/orders?q%5B%24ne%5D=x', 'GET', undefined, a)).status, 400); assert.equal((await request('/account/orders?page=0', 'GET', undefined, a)).status, 400); const r = await request(`/account/orders?q=${encodeURIComponent(p.name)}`, 'GET', undefined, a); assert.equal(r.data.total, 1); });
    await t.test('Server restart retains preference and receipt in MongoDB', async () => { await stop(); await start(); assert.equal((await request('/auth/me', 'GET', undefined, a)).data.user.savedVehicleId, vehicleId); assert.equal((await request(`/account/orders/${orderId}`, 'GET', undefined, a)).data.data.id, orderId); });
    await t.test('Logout revokes the old session; new login restores saved vehicle', async () => { assert.equal((await request('/auth/logout', 'POST', {}, a)).status, 200); assert.equal((await request('/account/orders', 'GET', undefined, a)).status, 401); const r = await request('/auth/login', 'POST', { email: 'account-a@example.test', password }); assert.equal(r.status, 200); assert.equal(r.data.user.savedVehicleId, vehicleId); a.cookie = r.cookie; a.csrf = r.data.csrf; });
    await t.test('Incorrect password never returns an authenticated user', async () => { const r = await request('/auth/login', 'POST', { email: 'account-a@example.test', password: 'incorrect password test' }); assert.equal(r.status, 401); assert.equal(r.data.user, undefined); });
    await t.test('Clear saved vehicle is persisted', async () => { const r = await request('/account/vehicle', 'PUT', { vehicleId: '' }, a); assert.equal(r.status, 200); assert.equal((await User.findById(a.id).lean()).savedVehicleId, ''); });
    await t.test('Deletion needs the current password', async () => { assert.equal((await request('/auth/account', 'DELETE', { password: 'incorrect password test' }, a)).status, 401); assert.ok(await User.findById(a.id)); });
    await t.test('Confirmed deletion removes only the owner account, orders and sessions', async () => { assert.equal((await request('/auth/account', 'DELETE', { password }, a)).status, 200); assert.equal(await User.findById(a.id), null); assert.equal(await Order.countDocuments({ userId: a.id }), 0); assert.equal(await Session.countDocuments({ userId: a.id }), 0); assert.ok(await User.findById(b.id)); });
  } finally { await stop(); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); }
});
