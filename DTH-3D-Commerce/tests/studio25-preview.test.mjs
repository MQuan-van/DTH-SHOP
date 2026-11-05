import test from 'node:test';
import assert from 'node:assert/strict';
import { previewCatalog25, offlineCatalog25, PREVIEW_ASSETS25, family25, selectionShelf25, productPrice25, productHref25, leaderPath25 } from '../frontend/src/experience/studio25Preview/studio25.data.mjs';
const asset = PREVIEW_ASSETS25[0];
const real = { ...asset, id: 'ohlins', slug: 'ohlins', galleryAssetOnly: false, price: 25000000, finish: 'Yellow - Black', currency: 'VND' };
test('live preview reads only public catalog records and retains their authoritative price/identity', () => {
  const input = Object.freeze([Object.freeze(real)]), output = previewCatalog25(input);
  assert.equal(output.length, 1); assert.equal(output[0], real); assert.equal(output[0].price, 25000000);
  assert.equal(output.some(p => p.id === 'asset-x1r-monoshock'), false);
  assert.deepEqual(previewCatalog25([]), []);
});
test('offline studies are explicitly unpriced and never acquire a product-detail commerce link', () => {
  const offline = offlineCatalog25();
  for (const study of PREVIEW_ASSETS25) { const row = offline.find(p => p.id === study.id); assert(row); assert.equal(productPrice25(row), null); assert.equal(productHref25(row), null); }
  assert.equal(new Set(offline.map(p => p.id)).size, offline.length);
});
test('two real uploaded studies lead the collection without replacing original asset/presentation', () => {
  const mono = { ...PREVIEW_ASSETS25[1], id: 'mono', slug: 'mono', galleryAssetOnly: false, presentation3d: { saved: true } };
  const data = [mono, real], snapshot = structuredClone(data), out = previewCatalog25(data);
  assert.equal(out[0], real); assert.equal(out[1], mono); assert.equal(out[1].presentation3d, mono.presentation3d); assert.deepEqual(data, snapshot);
});
test('shelf preserves the current item centrally and never duplicates a small collection', () => {
  const list = [real, { ...real, id: 'b' }, { ...real, id: 'c' }, { ...real, id: 'd' }];
  assert.deepEqual(selectionShelf25(list, 'b').map(p => [p.product.id, p.role]), [['ohlins', 'previous'], ['b', 'current'], ['c', 'next']]);
  for (let size = 0; size < 3; size++) { const shelf = selectionShelf25(list.slice(0, size), real.id); assert.equal(shelf.length, size); assert.equal(new Set(shelf.map(p => p.product.id)).size, size); }
  assert.deepEqual(selectionShelf25(list, 'missing'), []);
});
test('different categories do not appear in the focused family shelf', () => {
  assert.equal(family25([real, { ...real, id: 'tire', category: 'tires' }], real).length, 1);
  assert.deepEqual(family25([], null), []);
});
test('prices use real integer VND; malformed/foreign prices do not become sale claims', () => {
  assert(productPrice25(real).includes('25.000.000'));
  for (const patch of [{ price: 0 }, { price: '25000000' }, { price: NaN }, { currency: 'USD' }, { galleryAssetOnly: true }]) assert.equal(productPrice25({ ...real, ...patch }), null);
  assert.equal(productHref25(real), '/products/ohlins'); assert.equal(productHref25({ ...real, slug: '../../admin' }), null);
});
test('leader path is bounded, finite and omitted on mobile/hidden/invalid spatial layouts', () => {
  assert.match(leaderPath25({ x: 400, y: 200 }, { x: 700, y: 300 }, { width: 1180, height: 580 }), /^M400.0,200.0 L/);
  for (const [start, end, bounds] of [[{ x: NaN, y: 2 }, { x: 700, y: 3 }, { width: 1180, height: 580 }], [{ x: 700, y: 2 }, { x: 600, y: 3 }, { width: 1180, height: 580 }], [{ x: 100, y: 2 }, { x: 200, y: 3 }, { width: 390, height: 844 }], [{ x: 100, y: 2 }, { x: 1200, y: 3 }, { width: 1180, height: 580 }]]) assert.equal(leaderPath25(start, end, bounds), null);
});
