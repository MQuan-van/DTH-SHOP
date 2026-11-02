import test from 'node:test';
import assert from 'node:assert/strict';
import { COLLECTIONS, DB_NAME, validateAtlasUri, validateLocalUri, migrationPlan, fingerprintDocuments } from '../tools/atlas-catalog-sync.mjs';

test('Scope: only catalog and home Experience, not users/sessions/orders/support', () => {
  assert.deepEqual(COLLECTIONS, ['store_vehicles', 'store_products', 'store_experiences']);
  assert.equal(DB_NAME, 'dth_3d_commerce');
});
test('Local URI must point to expected database on localhost', () => {
  assert.equal(validateLocalUri('mongodb://127.0.0.1:27017/dth_3d_commerce'), 'mongodb://127.0.0.1:27017/dth_3d_commerce');
  assert.throws(() => validateLocalUri('mongodb+srv://test:pw@cluster.mongodb.net/dth_3d_commerce'));
  assert.throws(() => validateLocalUri('mongodb://example.com:27017/dth_3d_commerce'));
  assert.throws(() => validateLocalUri('mongodb://127.0.0.1:27017/admin'));
});
test('Atlas URI must be valid SRV and refer to DTH DB, not admin', () => {
  const valid='mongodb+srv://dbuser:sample%40pass@dth-cluster.mongodb.net/dth_3d_commerce?retryWrites=true&w=majority';
  assert.equal(validateAtlasUri(valid),valid);
  assert.throws(() => validateAtlasUri('mongodb://127.0.0.1:27017/dth_3d_commerce'));
  assert.throws(() => validateAtlasUri('mongodb+srv://dbuser:pw@dth-cluster.mongodb.net/test'));
  assert.throws(() => validateAtlasUri('mongodb+srv://dbuser:<password>@dth-cluster.mongodb.net/dth_3d_commerce'));
});
test('Migration blocked when target already has a product', () => {
  const plan=migrationPlan({store_products:25,store_vehicles:3,store_experiences:1},{store_products:1});
  assert.equal(plan.destinationEmpty,false);assert.equal(plan.canApply,false);
});
test('Migration blocked when target has only experience or vehicles', () => {
  for(const key of COLLECTIONS){const plan=migrationPlan({store_products:25},{[key]:1});assert.equal(plan.canApply,false);}
});
test('Migration blocked when local catalog has no products', () => {
  assert.equal(migrationPlan({store_products:0},{store_products:0}).canApply,false);
});
test('Migration allows non-empty source to empty target', () => {
  const plan=migrationPlan({store_products:23,store_vehicles:3,store_experiences:0},{});
  assert.equal(plan.canApply,true);assert.equal(plan.target.store_products,0);
});
test('Canonical fingerprints ignore field order but detect changed content', () => {
  const simpleEJSON={serialize:obj=>obj};
  const a=[{_id:'z',name:'ttx',price:100},{_id:'a',n:1}];
  const b=[{n:1,_id:'a'},{price:100,_id:'z',name:'ttx'}];
  assert.equal(fingerprintDocuments(a,simpleEJSON),fingerprintDocuments(b,simpleEJSON));
  assert.notEqual(fingerprintDocuments(a,simpleEJSON),fingerprintDocuments([{_id:'z',name:'ttx',price:101},{_id:'a',n:1}],simpleEJSON));
});