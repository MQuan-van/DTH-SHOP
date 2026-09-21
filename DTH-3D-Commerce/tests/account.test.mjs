import test from 'node:test';
import assert from 'node:assert/strict';
import { accountReturnPath, literalSearch, orderQuery, orderUnits, vehiclePreference } from '../shared/account.mjs';

for (const path of ['/bag', '/shop', '/products/apex-suspension']) test(`Return to ${path}`, () => assert.equal(accountReturnPath(path), path));
for (const path of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/account?return=https://evil.example', '/shop#https://evil.example', null, {}, '/products/../admin']) test(`Reject unsafe/unrecognised return ${JSON.stringify(path)}`, () => assert.equal(accountReturnPath(path), '/account'));
for (const id of ['demo-moto-2022', 'a', '']) test(`Vehicle input ${JSON.stringify(id)}`, () => assert.equal(vehiclePreference({ vehicleId: id }), id));
for (const id of [undefined, null, { $ne: '' }, [], 'demo/vehicle', 'A', 'a'.repeat(81)]) test(`Reject vehicle ${JSON.stringify(id)}`, () => assert.throws(() => vehiclePreference({ vehicleId: id })));
test('Order query defaults and bounded page size', () => assert.deepEqual(orderQuery(), { page: 1, pageSize: 8, search: '' }));
test('Order query normalises search', () => assert.deepEqual(orderQuery({ page: '2', q: ' Apex ' }), { page: 2, pageSize: 8, search: 'Apex' }));
for (const page of ['0', '-1', '1.5', '100000', 'Infinity', '1e2']) test(`Reject order page ${page}`, () => assert.throws(() => orderQuery({ page })));
test('Reject query objects and long searches', () => { assert.throws(() => orderQuery({ q: { $ne: '' } })); assert.throws(() => orderQuery({ q: 'a'.repeat(65) })); });
test('Search patterns are literal, not executable regex', () => { for (const s of ['.*', '[a-z]+', 'part (one)', '$10', 'a\\b', 'x|y']) { const re = new RegExp(literalSearch(s)); assert.ok(re.test(s)); assert.ok(!re.test('unrelated-value')); } });
test('Order quantity summary uses stored integer quantities', () => { assert.equal(orderUnits({ lines: [{ quantity: 2 }, { quantity: 3 }] }), 5); assert.equal(orderUnits({ lines: [{ quantity: '2' }, { quantity: -1 }] }), 0); assert.equal(orderUnits(null), 0); });
