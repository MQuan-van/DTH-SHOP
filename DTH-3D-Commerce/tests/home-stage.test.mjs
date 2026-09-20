import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { HOME_CONFIG, resolveExhibits, enabledSections } from '../frontend/src/shop/home/home.config.mjs';
const root = new URL('../', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('shared/catalog.json', root), 'utf8'));

test('configured showroom products resolve to real catalog records', () => {
  const list = resolveExhibits(catalog.products);
  assert.equal(list.length, 3);
  assert.deepEqual(list.map(e => e.product.id), HOME_CONFIG.hero.exhibits.map(e => e.productId));
  assert.ok(list.every(e => e.product.slug && e.product.modelUrl));
});
test('missing configured products use a valid fallback rather than broken links', () => {
  const list = resolveExhibits([{ id:'new-part', name:'New part', category:'brakes', active:true, modelUrl:'/demo.glb' }]);
  assert.equal(list.length, 1); assert.equal(list[0].productId, 'new-part');
});
test('empty catalog and inactive records do not create a pretend exhibit', () => {
  assert.deepEqual(resolveExhibits([]), []);
  assert.deepEqual(resolveExhibits([{ id:'apex-suspension', active:false }]), []);
});
test('removed exhibit does not disturb order of remaining exhibits', () => {
  assert.deepEqual(resolveExhibits(catalog.products.filter(p => p.id !== 'apex-wheels')).map(e => e.product.id), ['apex-suspension', 'apex-exhausts']);
});
test('section order and visibility follow the configuration', () => {
  assert.deepEqual(enabledSections({ sections:[{id:'fitment',enabled:true},{id:'hero',enabled:false},{id:'featured',enabled:true}] }), ['fitment', 'featured']);
});
test('configuration uses one enabled hero and no duplicate section identifiers', () => {
  const sections=enabledSections(); assert.equal(sections.filter(id=>id==='hero').length,1);
  assert.equal(sections.length,new Set(sections).size);
});
test('camera and motion values form a bounded starting configuration', () => {
  const { scene }=HOME_CONFIG.hero;
  const distance=Math.hypot(...scene.camera);
  assert.ok(distance>scene.minDistance && distance<scene.maxDistance);
  assert.ok(scene.maxDpr>=1 && scene.maxDpr<=2);
  assert.ok(scene.fov>10 && scene.fov<90);
  assert.ok(scene.autoRotateSpeed>=0 && scene.autoRotateSpeed<1);
  for(const exhibit of HOME_CONFIG.hero.exhibits){
    assert.ok(exhibit.modelSize>0); assert.equal(exhibit.rotation.length,3);
    assert.ok(exhibit.rotation.every(Number.isFinite));
  }
});
test('all exhibit models and loading/fallback images are local and present', async () => {
  for(const exhibit of resolveExhibits(catalog.products)) {
    for(const file of [exhibit.stillUrl, exhibit.product.modelUrl, exhibit.product.imageUrl]) {
      assert.ok(file.startsWith('/')); assert.ok(!file.includes('..'));
      await access(new URL(`frontend/public${file}`,root));
    }
  }
});
