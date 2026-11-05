import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORIES, categoryId, categoryLabel, isCategory, normalizeCatalogCategories, normalizeProductCategory } from '../shared/categories.mjs';
import { validateProduct, filterProducts, quoteOrder } from '../shared/domain.mjs';
import { buildNVXDemoCatalog } from '../shared/nvx.mjs';
import { cartQuoteFingerprint, quoteCart } from '../shared/cartQuote.mjs';
import { readShopQuery, selectShopProducts } from '../frontend/src/shop/catalog/catalog.logic.mjs';
import { pinProduct, sanitizeDraft } from '../frontend/src/shop/discovery174/discovery.logic.mjs';
import { CATEGORIES22H2, catalog22H2 } from '../frontend/src/experience/studio22h2/studio22h2.logic.mjs';
import { gallerySelection } from '../frontend/src/experience/galleryDemo24/gallery-demo.logic.mjs';
import { studioGalleryCatalog24 } from '../frontend/src/experience/gallery24/studio-gallery24.logic.mjs';
import { SYSTEMS23 } from '../frontend/src/experience/commerce23/spatial23.logic.mjs';
import { SLOTS233, LEGACY_WHEEL_SLOTS233, slot233, emptyProfile233, validateProfile233, resolveSlot233, pickSlot233 } from '../frontend/src/experience/hotspots233/hotspots233.logic.mjs';
const original = JSON.parse(readFileSync(new URL('../shared/catalog.json', import.meta.url)));
const data = buildNVXDemoCatalog(original), view = normalizeCatalogCategories(data), vehicleId = data.vehicles[0].id;
const legacy = data.products.find(p => p.id === 'apex-wheels');
const rim = { ...legacy, category: 'rims' };
// Selector/validation fixtures only; this does not create a catalog record or 3D asset.
const tire = { ...rim, id: 'test-tire', slug: 'test-tire', category: 'tires', name: 'Test tire' };
const spec = { id: 'yamaha-nvx-v2', file: 'models/nvx/nvx-v2.glb', rotation: [0, 0, 0] }, hash = 'a'.repeat(64);
const anchor = n => ({ point: [n, 1, .3], normal: [1, 0, 0], pose: { target: [n, 1, .3], radius: 2, phi: 1.2, theta: .8 }, pickRadius: .1, viewAspect: 1.5, confirmed: true });

test('six canonical categories replace the Wheel group in Studio and Build', () => {
  assert.equal(CATEGORIES.length, 6); assert(!CATEGORIES.includes('wheels'));
  for (const list of [CATEGORIES22H2, SYSTEMS23]) assert.deepEqual(list.map(c => c.id).sort(), [...CATEGORIES].sort());
  assert.equal(categoryLabel('rims'), 'Rims'); assert.equal(categoryLabel('tires'), 'Tires');
});
test('legacy alias is narrow; invalid/prototype categories stay rejected', () => {
  assert.equal(categoryId('wheels'), 'rims'); assert.equal(categoryLabel('wheels'), 'Rims');
  for (const bad of ['wheel', 'rim', 'tire', '__proto__', 'constructor', 'rims&x=1', {}, null]) {
    assert.equal(isCategory(bad), false); assert.equal(categoryLabel(bad), 'Parts');
  }
});
test('read projection preserves all product and vehicle facts except the category alias', () => {
  const before = structuredClone(data), projected = normalizeCatalogCategories(data);
  assert.deepEqual(data, before); assert.equal(projected.products.length, data.products.length);
  projected.products.forEach((p, i) => {
    const { category, ...facts } = p, { category: old, ...source } = data.products[i];
    assert.deepEqual(facts, source); assert.equal(category, categoryId(old));
  });
  assert.equal(projected.vehicles, data.vehicles); assert.deepEqual(normalizeCatalogCategories(projected), projected);
});
test('canonical records keep their identity and Admin presentation settings', () => {
  const product = Object.freeze({ ...rim, presentation3d: Object.freeze({ settings: { assetUrl: rim.modelUrl } }) });
  assert.equal(normalizeProductCategory(product), product);
  const old = Object.freeze({ ...product, category: 'wheels' }), normalized = normalizeProductCategory(old);
  assert.equal(normalized.presentation3d, old.presentation3d); assert.equal(old.category, 'wheels');
});
test('no tire SKU or renamed route/GLB is invented by the projection', () => {
  assert.equal(view.products.filter(p => p.category === 'tires').length, 0);
  assert.deepEqual(view.products.map(p => [p.id, p.slug, p.modelUrl, p.imageUrl]), data.products.map(p => [p.id, p.slug, p.modelUrl, p.imageUrl]));
});
for (const category of ['rims', 'tires', 'wheels']) test(`Admin validates ${category} without altering category on an unrelated save`, () => {
  const clean = validateProduct({ ...legacy, category }, data.vehicles);
  assert.equal(clean.category, category); assert.equal(clean.id, legacy.id); assert.equal(clean.price, legacy.price);
});
test('Tire keeps existing price, stock, asset path and fitment validation', () => {
  for (const patch of [{ category: 'tire' }, { price: 0 }, { stockQty: -1 }, { modelUrl: 'https://example.com/tire.glb' }, { vehicleIds: ['unknown'] }]) {
    assert.throws(() => validateProduct({ ...tire, ...patch }, data.vehicles));
  }
});
test('legacy, canonical and mixed bookmarks deduplicate to the new filter', () => {
  assert.deepEqual(readShopQuery('category=wheels&category=rims,tires&category=bad', 1e9).categories, ['rims', 'tires']);
  const pool = [legacy, tire];
  const select = search => selectShopProducts(pool, data.vehicles, '', readShopQuery(search, 1e9)).map(p => p.id);
  assert.deepEqual(select('category=wheels'), [legacy.id]); assert.deepEqual(select('category=rims'), [legacy.id]);
  assert.deepEqual(select('category=tires'), [tire.id]);
});
test('Rim/Tire search uses the same products and keeps the old wheels keyword', () => {
  for (const term of ['rim', 'wheels']) assert.equal(filterProducts([rim, tire], { search: term }).length, 1);
  assert.equal(filterProducts([rim, tire], { search: 'tire' })[0].id, tire.id);
});
test('Studio accepts both new groups and safely projects old Wheel records', () => {
  const list = studioGalleryCatalog24([legacy, tire]);
  assert.deepEqual(list.map(p => p.category), ['rims', 'tires']);
  assert.equal(gallerySelection(list, 'rims', '').product.id, legacy.id);
  assert.equal(gallerySelection(list, 'tires', '').product.id, tire.id);
  assert.equal(gallerySelection(catalog22H2([legacy]), 'tires', '').product, null);
});
test('Build keeps all six categories and a Tire does not replace a Rim', () => {
  const products = CATEGORIES.map((category, i) => ({ ...rim, id: `part-${i}`, slug: `part-${i}`, category }));
  let ids = []; for (const p of products) ids = pinProduct(ids, p, products);
  assert.equal(ids.length, 6); assert.equal(sanitizeDraft(ids, products, data.vehicles, vehicleId).length, 6);
  const next = { ...products[1], id: 'other-rim', slug: 'other-rim' }, updated = pinProduct(ids, next, [...products, next]);
  assert.equal(updated.length, 6); assert(updated.includes(products[2].id)); assert(!updated.includes(products[1].id));
});
test('legacy Wheel and new Rim occupy the same shortlist slot', () => {
  const newer = { ...rim, id: 'new-rim', slug: 'new-rim' }, products = [legacy, newer, tire];
  assert.deepEqual(pinProduct([legacy.id, tire.id], newer, products), [tire.id, newer.id]);
  assert.equal(sanitizeDraft([legacy.id, newer.id, tire.id], products, data.vehicles, vehicleId).length, 2);
});
test('cart and checkout keep exact line IDs, VND totals and fingerprints', () => {
  const items = [{ productId: legacy.id, vehicleId, quantity: 2 }];
  assert.deepEqual(quoteOrder(items, view.products, data.vehicles), quoteOrder(items, data.products, data.vehicles));
  assert.equal(cartQuoteFingerprint(quoteCart(items, view.products, data.vehicles)), cartQuoteFingerprint(quoteCart(items, data.products, data.vehicles)));
});
test('Rim and Tire have separate authored front/rear slot IDs', () => {
  for (const id of ['rims-front', 'rims-rear', 'tires-front', 'tires-rear']) assert(SLOTS233.some(s => s.id === id));
  assert.equal(new Set(SLOTS233.map(s => s.id)).size, SLOTS233.length);
  assert.deepEqual(emptyProfile233(spec, hash).anchors, {});
});
test('legacy assembly profiles are preserved without creating Rim or Tire anchors', () => {
  for (const schemaVersion of [1, 2]) {
    const source = { ...emptyProfile233(spec, hash), schemaVersion, anchors: { wheels: anchor(.2) } }, before = structuredClone(source);
    const parsed = validateProfile233(source, spec, hash);
    assert.deepEqual(Object.keys(parsed.anchors), ['wheels']); assert.deepEqual(source, before);
    assert.equal(resolveSlot233(parsed, 'rims'), ''); assert.equal(resolveSlot233(parsed, 'tires'), '');
    assert.equal(pickSlot233([.2, 1, .3], parsed, ['wheels']), null); assert.equal(slot233('wheels').legacy, true);
  }
});
test('new Rim and Tire anchors resolve independently and still bind to exact GLB identity', () => {
  const source = { ...emptyProfile233(spec, hash), anchors: { 'rims-front': anchor(.2), 'tires-front': anchor(.6) } };
  const parsed = validateProfile233(source, spec, hash);
  assert.equal(resolveSlot233(parsed, 'rims'), 'rims-front'); assert.equal(resolveSlot233(parsed, 'tires'), 'tires-front');
  assert.equal(pickSlot233([.6, 1, .3], parsed, Object.keys(parsed.anchors)), 'tires-front');
  assert.throws(() => validateProfile233(source, spec, 'b'.repeat(64)));
  assert.throws(() => validateProfile233({ ...source, rotation: [0, 1, 0] }, spec, hash));
});
test('expanded hotspot allowlist remains bounded and rejects unknown or unconfirmed points', () => {
  const anchors = Object.fromEntries([...SLOTS233, ...LEGACY_WHEEL_SLOTS233].map(s => [s.id, anchor(.2)]));
  assert.equal(Object.keys(validateProfile233({ ...emptyProfile233(spec, hash), anchors }, spec, hash).anchors).length, 20);
  assert.throws(() => validateProfile233({ ...emptyProfile233(spec, hash), anchors: { ...anchors, guessed: anchor(.2) } }, spec, hash));
  assert.throws(() => validateProfile233({ ...emptyProfile233(spec, hash), anchors: { 'tires-front': { ...anchor(.2), confirmed: false } } }, spec, hash));
});
