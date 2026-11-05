import test from 'node:test';
import { categoryId } from '../shared/categories.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  catalog22H2,
  playable22H2,
  choose22H2,
  gallery22H2,
} from '../frontend/src/experience/studio22h2/studio22h2.logic.mjs';
import { filterStudioSuspension22H2 } from '../frontend/src/experience/studio22h2/studioSuspensionCatalog.mjs';

const source = relativePath => readFileSync(new URL('../' + relativePath, import.meta.url), 'utf8');

test('Home retains commerce23/Studio23 as the precision rollback', () => {
  assert.match(
    source('frontend/src/shop/home/HomePage.jsx'),
    /import\(['"]\.\.\/\.\.\/experience\/commerce23\/Studio23\.jsx['"]\)/
  );
});

test('Rollback Studio23 applies Suspension policy before model selection and gallery', () => {
  const jsx = source('frontend/src/experience/commerce23/Studio23.jsx');
  assert.match(jsx, /import\s+\{\s*filterStudioSuspension22H2\s*\}\s+from\s+['"]\.\.\/studio22h2\/studioSuspensionCatalog\.mjs['"]/);
  assert.match(jsx, /const catalog\s*=\s*useMemo\(\(\)\s*=>\s*filterStudioSuspension22H2\(catalog22H2\(store\.data\?\.products\)\)/);
  assert.match(jsx, /const candidates\s*=\s*useMemo\(\(\)\s*=>\s*playable22H2\(catalog\)/);
  assert.match(jsx, /const siblings\s*=\s*candidates\.filter\(/);
  assert.match(jsx, /<Gallery22H2\s+products=\{catalog\}/);
});

const products = [
  { id: 'apex', slug: 'apex', name: 'Apex Coilover', active: true, category: 'suspension', featured: true, modelUrl: '/models/dth-demo/apex-suspension.glb' },
  { id: 'studio', slug: 'studio', name: 'Studio Coilover', active: true, category: 'suspension', modelUrl: '/models/dth-demo/studio-suspension.glb' },
  { id: 'touring', slug: 'touring', name: 'Touring Coilover', active: true, category: 'suspension', modelUrl: '/models/dth-demo/touring-suspension.glb' },
  { id: 'vector', slug: 'vector', name: 'Vector Coilover', active: true, category: 'suspension', modelUrl: '/models/dth-demo/vector-suspension.glb' },
  { id: 'ohlins-ttx', slug: 'ohlins-ttx', name: 'Ohlins TTX', active: true, category: 'suspension', modelUrl: '/models/ai-products/0262d0bd-690d-439e-8132-8b07088abadb.glb' },
  { id: 'wheels-demo', slug: 'wheels-demo', name: 'Apex Wheels', active: true, category: 'wheels', modelUrl: '/models/dth-demo/apex-wheels.glb' },
  { id: 'brakes-demo', slug: 'brakes-demo', name: 'Apex Brakes', active: true, category: 'brakes', modelUrl: '/models/dth-demo/apex-brakes.glb' },
  { id: 'exhaust-demo', slug: 'exhaust-demo', name: 'Apex Exhaust', active: true, category: 'exhausts', modelUrl: '/models/dth-demo/apex-exhausts.glb' },
  { id: 'mirror-demo', slug: 'mirror-demo', name: 'Apex Mirrors', active: true, category: 'mirrors', modelUrl: '/models/dth-demo/apex-mirrors.glb' },
];

test('Filtered Studio23 stage picks TTX instead of featured demo Apex', () => {
  const filtered = filterStudioSuspension22H2(catalog22H2(products));
  const candidates = playable22H2(filtered);
  assert.deepEqual(candidates.map(p => p.id), ['ohlins-ttx', 'wheels-demo', 'brakes-demo', 'exhaust-demo', 'mirror-demo']);
  assert.equal(choose22H2(candidates, '', 'apex').id, 'ohlins-ttx');
  assert.deepEqual(candidates.filter(p => p.category === 'suspension').map(p => p.name), ['Ohlins TTX']);
});

test('Without an uploaded Suspension, Studio23 does not re-introduce demo models', () => {
  const input = products.filter(p => p.id !== 'ohlins-ttx');
  const candidates = playable22H2(filterStudioSuspension22H2(catalog22H2(input)));
  assert.equal(candidates.some(p => p.category === 'suspension'), false);
  assert.equal(choose22H2(candidates, '', 'apex').category, 'rims');
  assert.deepEqual(candidates.map(p => p.id), ['wheels-demo', 'brakes-demo', 'exhaust-demo', 'mirror-demo']);
});

test('Gallery is filtered but all other categories and original catalog stay unchanged', () => {
  const copy = structuredClone(products);
  const filtered = filterStudioSuspension22H2(catalog22H2(products));
  const gallery = gallery22H2(filtered, 'ohlins-ttx');
  assert.equal(gallery.some(p => p.category === 'suspension' && p.id !== 'ohlins-ttx'), false);
  for (const category of ['rims', 'tires', 'brakes', 'exhausts', 'mirrors']) {
    assert.equal(filtered.filter(p => p.category === category).length, products.filter(p => categoryId(p.category) === category).length);
  }
  assert.deepEqual(products, copy);
});
