import test from 'node:test';
import assert from 'node:assert/strict';
import { galleryProducts, gallerySelection, galleryProductHref, galleryPrice, publicProducts, LOCAL_TTX, galleryCamera24, galleryKey24, galleryPoster24, gallerySwitch24 } from '../frontend/src/experience/galleryDemo24/gallery-demo.logic.mjs';

const real = { id: 'x1r-gtr', slug: 'x1r-gtr', name: 'X1R GTR MONOSHOCK', category: 'suspension', price: 3500000, currency: 'VND', modelUrl: '/models/ai-products/40762c2a-50bd-4514-a523-1ff523c9a9f0.glb', presentation3d: { settings: { assetUrl: '/models/ai-products/40762c2a-50bd-4514-a523-1ff523c9a9f0.glb', scale: 2 } } };
const demo = { id: 'apex-brakes', slug: 'apex-brakes', name: 'Apex brakes', category: 'brakes', modelUrl: '/models/dth-demo/apex-brakes.glb', price: 1500000 };
test('public adapter accepts the existing API envelope and rejects a failed shape', () => {
  assert.deepEqual(publicProducts({ data: [real] }), [real]);
  assert.throws(() => publicProducts({ message: 'Unavailable' }), TypeError);
});
test('gallery preserves real product, price and authored settings by identity', () => {
  const before = structuredClone(real), input = Object.freeze([Object.freeze(demo), Object.freeze(real)]);
  const list = galleryProducts(input);
  assert.equal(list[0], real); assert.equal(list[0].presentation3d, real.presentation3d);
  assert.deepEqual(real, before); assert.equal(input[0], demo);
  assert.equal(galleryProductHref(real, 'live'), '/products/x1r-gtr');
});
test('local asset study has no commerce href or fabricated price; offline fixtures cannot link to live records', () => {
  assert.equal(galleryProductHref(LOCAL_TTX, 'live'), '');
  assert.equal(galleryPrice(LOCAL_TTX), null);
  assert.equal(galleryProductHref(real, 'fixture'), '');
  assert.equal(galleryPrice({ price: -1 }), null);
  assert.equal(galleryPrice({ price: '3500000' }), null);
  assert.match(galleryPrice(real), /3\.500\.000/);
});
test('an existing TTX record takes precedence over the local asset study', () => {
  const existing = { ...real, id: 'ohlins-ttx', slug: 'ohlins-ttx', modelUrl: LOCAL_TTX.modelUrl + '?v=asset' };
  const list = galleryProducts([existing]);
  assert.deepEqual(list, [existing]);
});
test('suspension filtering preserves existing policy and invalid model paths cannot enter gallery', () => {
  const bundled = { ...real, id: 'demo-suspension', slug: 'demo-suspension', modelUrl: '/models/dth-demo/suspension.glb' };
  const external = { ...demo, id: 'external', slug: 'external', modelUrl: 'https://example.com/part.glb' };
  assert.deepEqual(galleryProducts([real, bundled, external, demo]).map(p => p.id), [real.id, LOCAL_TTX.id, demo.id]);
});
test('category changes choose a visible record, missing selections fall back and empty categories stay empty', () => {
  const list = galleryProducts([real, demo]);
  assert.equal(gallerySelection(list, 'all', real.id).product, real);
  assert.equal(gallerySelection(list, 'brakes', real.id).product, demo);
  assert.equal(gallerySelection(list, 'all', 'removed').product, real);
  assert.deepEqual(gallerySelection(list, 'mirrors', ''), { visible: [], product: null });
});

test('preview camera never overrides authored Admin or spatial profile settings', () => {
  assert.equal(galleryCamera24(real, [0, 0, 0], 1), null);
  assert.equal(galleryCamera24({ ...real, presentation3d: undefined }, [0, 0, 0], 1, true), null);
  assert.equal(galleryCamera24(demo, [0, 0, 0], 1), null);
  assert.equal(galleryCamera24(LOCAL_TTX, [NaN, 0, 0], 1), null);
  assert.equal(galleryCamera24(LOCAL_TTX, [0, 0, 0], Infinity), null);
});
test('known unconfigured asset gets a finite three-quarter camera outside its bounds without mutating source', () => {
  const product = Object.freeze({ ...real, presentation3d: undefined }), center = Object.freeze([1, -2, 3]);
  const camera = galleryCamera24(product, center, 2);
  assert.deepEqual(camera.target, center); assert.notEqual(camera.target, center);
  assert.ok(camera.position.every(Number.isFinite));
  assert.ok(Math.abs(Math.hypot(...camera.position.map((v, i) => v - center[i])) - 8) < 1e-8);
  assert.ok(camera.position[0] < center[0]);
  assert.ok(Math.abs(camera.position[0] - center[0]) < Math.abs(camera.position[2] - center[2]));
  assert.equal(product.presentation3d, undefined);
});
test('poster identity includes URL and authored presentation so a changed asset cannot reuse another view', () => {
  assert.notEqual(galleryKey24(real), galleryKey24({ ...real, modelUrl: real.modelUrl + '?v=new' }));
  assert.notEqual(galleryKey24(real), galleryKey24({ ...real, presentation3d: { settings: { scale: 1.2 } } }));
  assert.equal(galleryPoster24(real), real.imageUrl || '');
  assert.equal(galleryPoster24(LOCAL_TTX), '/previews/gallery24/ohlins-ttx.png');
  assert.equal(galleryPoster24({ ...LOCAL_TTX, modelUrl: LOCAL_TTX.modelUrl + '?v=changed', imageUrl: '/previews/new.png' }), '/previews/new.png');
  assert.equal(galleryCamera24({ ...LOCAL_TTX, modelUrl: LOCAL_TTX.modelUrl + '?v=changed' }, [0, 0, 0], 1), null);
});
test('rapid product switches and cancelled timers can never commit an obsolete selection', () => {
  const callbacks = [], committed = [], cancelled = [];
  const controller = gallerySwitch24(value => committed.push(value), callback => { callbacks.push(callback); return callbacks.length; }, handle => cancelled.push(handle));
  controller.request('x1r'); controller.request('ttx');
  callbacks[0](); assert.deepEqual(committed, []);
  callbacks[1](); assert.deepEqual(committed, ['ttx']);
  controller.request('brakes'); controller.cancel(); callbacks[2]();
  assert.deepEqual(committed, ['ttx']); assert.deepEqual(cancelled, [1, 3]);
});
test('reduced motion commits immediately and invalidates an in-flight visual switch', () => {
  const callbacks = [], committed = [];
  const controller = gallerySwitch24(value => committed.push(value), callback => { callbacks.push(callback); return 1; }, () => {});
  controller.request('old'); controller.request('now', true); callbacks[0]();
  assert.deepEqual(committed, ['now']);
});
