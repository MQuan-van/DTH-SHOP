import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spatialCatalog25, spatialSelection25 } from '../frontend/src/experience/spatial25/spatial25.logic.mjs';
import { family25, selectionShelf25 } from '../frontend/src/experience/studio25Preview/studio25.data.mjs';
import { galleryPrice } from '../frontend/src/experience/galleryDemo24/gallery-demo.logic.mjs';
import { href22H2 } from '../frontend/src/experience/studio22h2/studio22h2.logic.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const mono = { id: 'x1r-gtr', slug: 'x1r-gtr', name: 'X1R GTR MONOSHOCK', category: 'suspension', finish: 'Blue', price: 3500000, currency: 'VND', modelUrl: '/models/ai-products/40762c2a-50bd-4514-a523-1ff523c9a9f0.glb' };
const ttx = { ...mono, id: 'ohlins', slug: 'ohlins', name: 'Ohlins TTX', price: 25000000, modelUrl: '/models/ai-products/0262d0bd-690d-439e-8132-8b07088abadb.glb' };
const rim = { id: 'apex-rim', slug: 'apex-rim', name: 'Apex Alloy wheel', category: 'rims', price: 3200000, modelUrl: '/models/dth-demo/apex-wheels.glb' };

test('live spatial catalogue never injects offline studies, fake SKUs or fallback data', () => {
  for (const input of [undefined, null, {}, '', []]) assert.deepEqual(spatialCatalog25(input), []);
  assert.deepEqual(spatialCatalog25([rim]), [rim]);
  assert.equal(spatialCatalog25([rim]).some(p => p.id.startsWith('asset-')), false);
});

test('live catalogue keeps valid source records, prices and uploaded suspension policy immutable', () => {
  const bundledShock = { ...mono, id: 'bundled', slug: 'bundled', modelUrl: '/models/dth-demo/apex-suspension.glb' };
  const invalid = [{ ...rim, id: 'inactive', slug: 'inactive', active: false }, { ...rim, id: 'remote', slug: 'remote', modelUrl: 'https://example.com/rim.glb' }, { ...rim, id: 'bad-id!', slug: 'bad-slug!' }];
  const input = Object.freeze([Object.freeze(rim), Object.freeze(bundledShock), Object.freeze(mono), ...invalid]);
  const before = structuredClone(input), output = spatialCatalog25(input);
  assert.deepEqual(output, [mono, rim]);
  assert.equal(output[0], mono); assert.equal(output[1], rim);
  assert.equal(output[0].price, 3500000); assert.equal(output[0].modelUrl, mono.modelUrl);
  assert.deepEqual(input, before);
});

test('Rim/Tire projection preserves source names and does not fabricate a tire product', () => {
  const legacyWheel = Object.freeze({ ...rim, category: 'wheels' });
  const output = spatialCatalog25([legacyWheel]);
  assert.equal(output[0].category, 'rims');
  assert.equal(output[0].name, legacyWheel.name);
  assert.equal(output[0].price, legacyWheel.price);
  assert.equal(output[0].modelUrl, legacyWheel.modelUrl);
  assert.equal(output.some(p => p.category === 'tires'), false);
  assert.equal(legacyWheel.category, 'wheels');
});

test('published binding changes only the exact matching model view and authored asset URL', () => {
  const authored = Object.freeze({ ...mono, presentation3d: Object.freeze({ revision: 'authored', settings: Object.freeze({ assetUrl: mono.modelUrl, rotationDeg: [0, 9, 0] }) }) });
  const input = Object.freeze([authored, Object.freeze(ttx), rim]), before = structuredClone(input), sha256 = 'a'.repeat(64);
  const result = spatialCatalog25(input, { modelUrl: authored.modelUrl, sha256 });
  const matched = result.find(p => p.id === mono.id);
  assert.notEqual(matched, authored);
  assert.equal(matched.modelUrl, `${mono.modelUrl}?v=${sha256}`);
  assert.equal(matched.presentation3d.settings.assetUrl, matched.modelUrl);
  assert.equal(matched.presentation3d.revision, 'authored');
  assert.equal(matched.presentation3d.settings.rotationDeg, authored.presentation3d.settings.rotationDeg);
  assert.equal(matched.price, authored.price);
  assert.equal(result.find(p => p.id === ttx.id), ttx);
  assert.deepEqual(input, before);
});

test('invalid or foreign published hashes cannot retarget the original model', () => {
  for (const binding of [{ modelUrl: mono.modelUrl, sha256: 'bad' }, { modelUrl: ttx.modelUrl, sha256: 'b'.repeat(64) }, undefined]) {
    assert.equal(spatialCatalog25([mono], binding)[0], mono);
  }
});

test('explicit product selection wins without replacing it with the configured/default model', () => {
  const list = spatialCatalog25([rim, mono, ttx]);
  assert.equal(spatialSelection25(list, ttx.id, rim.id), ttx);
  assert.equal(spatialSelection25(list, rim.id, ttx.id), rim);
});

test('configured published product wins when a selected ID is absent', () => {
  const list = spatialCatalog25([rim, mono]);
  assert.equal(spatialSelection25(list, 'removed', rim.id), rim);
  assert.equal(spatialSelection25(list, '', rim.id), rim);
  assert.equal(spatialSelection25(list, 'removed', 'missing'), mono);
  assert.equal(spatialSelection25([rim], '', ''), rim);
  assert.equal(spatialSelection25([], 'removed', mono.id), null);
});

test('refreshed source price and identity replace a previous record without rewriting model bytes', () => {
  const refreshed = { ...mono, price: 3600000 };
  const product = spatialSelection25(spatialCatalog25([refreshed]), mono.id, '');
  assert.equal(product, refreshed); assert.equal(product.price, 3600000);
  assert.equal(product.modelUrl, mono.modelUrl); assert.equal(mono.price, 3500000);
  assert(galleryPrice(product).includes('3.600.000'));
  assert.equal(href22H2(product), '/products/x1r-gtr');
});

test('selection shelf uses the current catalogue family and never duplicates two-part groups', () => {
  const catalogue = spatialCatalog25([ttx, rim, mono]);
  const family = family25(catalogue, mono), shelf = selectionShelf25(family, mono.id);
  assert.equal(shelf.length, 2);
  assert.equal(new Set(shelf.map(item => item.product.id)).size, 2);
  assert.equal(shelf.find(item => item.role === 'current').product, mono);
  assert.equal(shelf.some(item => item.product.category === 'rims'), false);
  assert.deepEqual(selectionShelf25(family, 'removed'), []);
});

test('invalid source prices stay unavailable rather than taking a preview price', () => {
  for (const price of [-1, NaN, Infinity, '3500000']) {
    const product = spatialSelection25(spatialCatalog25([{ ...mono, price }]), mono.id, '');
    assert.equal(product.price, price);
    assert.equal(galleryPrice(product), null);
  }
});

test('actual live view keeps the authoritative store, startup, interaction and identity gates', () => {
  const view = read('frontend/src/experience/spatial25/StudioSpatial25.jsx');
  assert.match(view, /useStore\(\)/);
  assert.match(view, /spatialCatalog25\(store\.data\?\.products, binding\)/);
  assert.match(view, /useStartupAllowed\(\)/); assert.match(view, /useIntroCover\(\)/); assert.match(view, /useExperiencePolicy\(\)/);
  assert.match(view, /allowed = startup && !covered/);
  assert.match(view, /canInspect = !!displayed && ready && allowed && active && !blocked/);
  assert.match(view, /\(allowed \|\| sceneStarted\) && <SpatialStage25/);
  assert.match(view, /key=\{store\.user\?\.id \|\| 'guest'\}/);
  assert.match(view, /active=\{active && allowed\}/); assert.match(view, /blocked=\{blocked\}/); assert.match(view, /orbitDisabled=\{policy\.saveData\}/);
  assert.match(view, /new IntersectionObserver\(\(\[entry\]\) => \{\s*if \(live && entry\?\.target === hero\.current && entry\.target\.isConnected\) setActive\(entry\.isIntersecting\)/);
  assert.match(view, /if \(hero\.current\) observer\.observe\(hero\.current\);\s*return \(\) => \{ live = false; observer\.disconnect\(\); \};\s*\}, \[portalHost, expanded, collectionOpen\]\)/);
  assert.match(view, /new ResizeObserver\(measure\)[\s\S]*?\}, \[displayed\?\.id, anchor, portalHost\]\)/);
  assert.doesNotMatch(view, /fetch\s*\(|localStorage|offlineCatalog25|PREVIEW_ASSETS25|catalog\.json|setVehicle\s*\(/);
});

test('collection and external dialogs gate the scene while expanded inspection preserves the same portal', () => {
  const view = read('frontend/src/experience/spatial25/StudioSpatial25.jsx');
  assert.match(view, /useGalleryInput24\(signal, ownDialog\)/);
  assert.match(view, /blocked = externalBlocked \|\| collectionOpen/);
  assert.match(view, /useGalleryModal24\(expanded, setExpanded, slot, expandedDialog, closeExpanded, expandButton\)/);
  assert.match(view, /createPortal\([\s\S]*portalHost\)/);
  assert.match(view, /if \(!el\.open\) el\.showModal\(\)/);
  assert.match(view, /if \(el\.open\) el\.close\(\); document\.body\.style\.overflow = overflow/);
  assert.match(view, /dialogTrigger\.current\?\.isConnected\) dialogTrigger\.current\.focus\(\{ preventScroll: true \}\)/);
  assert.match(view, /onCancel=\{event => \{ event\.preventDefault\(\); setCollectionOpen\(false\)/);
  assert.match(view, /inert=\{expanded\}/);
  assert.match(view, /modalOpen = collectionOpen \|\| expanded/);
  assert.match(view, /previous = html\.style\.overflow;\s*html\.style\.overflow = 'hidden'/);
  assert.match(view, /return \(\) => \{ html\.style\.overflow = previous; \}/);
});

test('live product facts, route links and vehicle picker preserve the existing business adapters', () => {
  const view = read('frontend/src/experience/spatial25/StudioSpatial25.jsx');
  assert.match(view, /price = galleryPrice\(displayed\), href = href22H2\(displayed\)/);
  assert.match(view, /fitment\(displayed, store\.vehicleId, store\.data\?\.vehicles \|\| \[\]\)/);
  assert.match(view, /<Link className="dsp25-primary" to=\{href\}>View product<\/Link>/);
  assert.match(view, /onClick=\{outlet\?\.chooseVehicle\}/);
  assert.match(view, /<Link to="\/shop\?mode=build">Build your NVX<\/Link>/);
  assert.doesNotMatch(view, /import .*Header25|<Header25|<StudioHeader26|Asset study|Design preview|Your shopping bag\.|const VERSIONS|dangerouslySetInnerHTML/);
});

test('Home ships Spatial25 by default and scoped styles cannot reset the app document', () => {
  const home = read('frontend/src/shop/home/HomePage.jsx'), view = read('frontend/src/experience/spatial25/StudioSpatial25.jsx'), css = read('frontend/src/experience/spatial25/spatial25.css');
  assert.match(home, /experience\/spatial25\/StudioSpatial25\.jsx/);
  assert.match(home, /studioMode === 'classic'.*studioMode === 'precision'.*studioMode === 'gallery24'\s*\?\s*StudioGallery24\s*:\s*StudioSpatial25/);
  assert.match(home, /binding=\{experience\.binding\}/);
  assert.match(view, /import '\.\/spatial25\.css'/);
  assert.doesNotMatch(view, /studio25-preview\.css/);
  const approvedViewportRule = 'html[data-studio-spatial25=true] { scrollbar-gutter: stable; }';
  assert(css.includes(approvedViewportRule));
  assert.match(view, /previous = html\.getAttribute\('data-studio-spatial25'\)/);
  assert.match(view, /html\.setAttribute\('data-studio-spatial25', 'true'\)/);
  assert.match(view, /previous === null \? html\.removeAttribute\('data-studio-spatial25'\) : html\.setAttribute\('data-studio-spatial25', previous\)/);
  // This exact viewport guard is the sole exception; other/duplicate document rules still fail.
  assert.doesNotMatch(css.replace(approvedViewportRule, ''), /(?:^|\n)\s*(?::root|body\b|html\b|#root\b)|@import/);
});
