import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { studioGalleryCatalog24, studioGalleryDefault24, externalGalleryOverlay24, mountGalleryHost24 } from '../frontend/src/experience/gallery24/studio-gallery24.logic.mjs';
const uploaded = { id: 'x1r-gtr', slug: 'x1r-gtr', name: 'X1R GTR MONOSHOCK', category: 'suspension', price: 3500000, modelUrl: '/models/ai-products/40762c2a-50bd-4514-a523-1ff523c9a9f0.glb' };
const wheel = { id: 'wheel', slug: 'wheel', name: 'Rim', category: 'rims', price: 3200000, featured: true, modelUrl: '/models/dth-demo/apex-wheels.glb' };
const bundled = { ...uploaded, id: 'demo-shock', slug: 'demo-shock', modelUrl: '/models/dth-demo/apex-suspension.glb' };
test('production catalog never creates a local asset study or substitutes API failures with fixtures', () => {
  assert.deepEqual(studioGalleryCatalog24(undefined), []);
  assert.deepEqual(studioGalleryCatalog24([]), []);
  assert.deepEqual(studioGalleryCatalog24([wheel]), [wheel]);
  assert.equal(studioGalleryCatalog24([wheel]).some(p => p.id === 'asset-ohlins-ttx'), false);
});
test('current suspension policy, inactive/path validation and source object identity remain intact', () => {
  const input = Object.freeze([Object.freeze(wheel), Object.freeze(bundled), Object.freeze(uploaded), { ...wheel, id: 'inactive', slug: 'inactive', active: false }, { ...wheel, id: 'remote', slug: 'remote', modelUrl: 'https://example.com/part.glb' }]);
  const snapshot = structuredClone(input), result = studioGalleryCatalog24(input);
  assert.deepEqual(result, [uploaded, wheel]); assert.equal(result[0], uploaded); assert.equal(result[1], wheel);
  assert.deepEqual(input, snapshot); assert.equal(result[0].price, 3500000);
});
test('published product choice wins; unconfigured default prefers an uploaded record', () => {
  const list = studioGalleryCatalog24([wheel, uploaded]);
  assert.equal(studioGalleryDefault24(list, wheel.id), wheel.id);
  assert.equal(studioGalleryDefault24(list, 'missing'), uploaded.id);
  assert.equal(studioGalleryDefault24([wheel], ''), wheel.id);
  assert.equal(studioGalleryDefault24([], ''), '');
});
test('a fresh catalog record retains its updated price without changing the model identity', () => {
  const refreshed = { ...uploaded, price: 3600000 };
  const [record] = studioGalleryCatalog24([refreshed]);
  assert.equal(record, refreshed); assert.equal(record.price, 3600000);
  assert.equal(record.modelUrl, uploaded.modelUrl); assert.equal(uploaded.price, 3500000);
});
test('published hash binding changes only a view copy and retargets matching Admin presentation', () => {
  const p = { ...uploaded, presentation3d: { revision: 'author', settings: { assetUrl: uploaded.modelUrl, rotationDeg: [0, 2, 0] } } };
  const before = structuredClone(p), sha256 = 'a'.repeat(64);
  const [result] = studioGalleryCatalog24([p], { modelUrl: p.modelUrl, sha256 });
  assert.notEqual(result, p); assert.equal(result.modelUrl, p.modelUrl + '?v=' + sha256);
  assert.equal(result.presentation3d.settings.assetUrl, result.modelUrl); assert.equal(result.presentation3d.revision, 'author');
  assert.deepEqual(p, before); assert.equal(result.price, p.price);
  assert.equal(studioGalleryCatalog24([p], { modelUrl: p.modelUrl, sha256: 'invalid' })[0], p);
});
test('own expanded dialog does not block its scene, external cart/vehicle/support does', () => {
  const own = {}, cart = {}, support = {};
  assert.equal(externalGalleryOverlay24([own], own), false);
  assert.equal(externalGalleryOverlay24([own, cart], own), true);
  assert.equal(externalGalleryOverlay24([support], own), true);
  assert.equal(externalGalleryOverlay24([], own), false);
});
function modalFixture() {
  const canvas = {}, host = { children: [canvas], getBoundingClientRect: () => ({ height: 520 }) };
  const slot = { style: {}, appendChild: node => { node.parent = slot; } };
  const dialog = { open: false, appendChild: node => { node.parent = dialog; }, showModal() { this.open = true; }, close() { this.open = false; } };
  return { canvas, host, slot, dialog };
}
test('modal reparent preserves the exact host/Canvas and restores the inline slot without reconstruction', () => {
  const { canvas, host, slot, dialog } = modalFixture();
  assert.equal(mountGalleryHost24(host, slot, dialog, false), true); assert.equal(host.parent, slot);
  assert.equal(mountGalleryHost24(host, slot, dialog, true), true); assert.equal(host.parent, dialog);
  assert.equal(dialog.open, true); assert.equal(slot.style.height, '520px'); assert.equal(host.children[0], canvas);
  mountGalleryHost24(host, slot, dialog, false);
  assert.equal(host.parent, slot); assert.equal(dialog.open, false); assert.equal(slot.style.height, ''); assert.equal(host.children[0], canvas);
});
test('unavailable/rejected native modal cannot orphan the gallery host', () => {
  const { host, slot, dialog } = modalFixture();
  dialog.showModal = () => { throw Error('Unavailable'); };
  assert.equal(mountGalleryHost24(host, slot, dialog, true), false); assert.equal(host.parent, slot); assert.equal(slot.style.height, '');
  assert.equal(mountGalleryHost24(host, slot, {}, true), false);
  assert.equal(mountGalleryHost24(null, slot, dialog, false), false);
});
test('Home defaults to Spatial25 while retaining Gallery24 and classic/precision rollback contracts', () => {
  const home = readFileSync(new URL('../frontend/src/shop/home/HomePage.jsx', import.meta.url), 'utf8');
  const view = readFileSync(new URL('../frontend/src/experience/gallery24/StudioGallery24.jsx', import.meta.url), 'utf8');
  assert.match(home, /experience\/gallery24\/StudioGallery24\.jsx/);
  assert.match(home, /experience\/spatial25\/StudioSpatial25\.jsx/);
  assert.match(home, /studioMode === 'classic'.*studioMode === 'precision'/);
  assert.match(home, /studioMode === 'gallery24'\s*\?\s*StudioGallery24\s*:\s*StudioSpatial25/);
  assert.match(view, /studioGalleryCatalog24\(store\.data\?\.products, binding\)/);
  assert.match(view, /useStartupAllowed\(\)/); assert.match(view, /useIntroCover\(\)/); assert.match(view, /useGalleryInput24\(signal, modal\)/);
  assert.match(view, /outlet\?\.chooseVehicle/); assert.match(view, /fitment\(product, store\.vehicleId/);
  assert.doesNotMatch(view, /fetch\(|setBag|localStorage|fixture\.products|galleryProducts\(/);
});
