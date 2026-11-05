import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { bundledStill25, STUDIO_STILLS25 } from '../frontend/src/experience/spatial25/static-previews25.mjs';

test('prepared original stills match only the bound GLB identity and default presentation', () => {
  for (const record of STUDIO_STILLS25) {
    const product = { id: record.id, modelUrl: record.modelUrl, imageUrl: '/reference-photo.webp' };
    assert.equal(bundledStill25(product), record.src);
    assert.equal(bundledStill25({ ...product, modelUrl: `${record.modelUrl}?v=${record.sha256}` }), record.src);
    assert.equal(bundledStill25({ ...product, modelUrl: `${record.modelUrl}?v=${'a'.repeat(64)}` }), '');
    assert.equal(bundledStill25({ ...product, presentation3d: { revision: 2 } }), '');
    assert.equal(bundledStill25({ ...product, id: 'wrong-identity' }), '');
  }
});

test('the three uploaded suspension previews have real transparent pixels and current source hashes', async () => {
  assert.deepEqual(STUDIO_STILLS25.map(record => record.id).sort(), ['ohlins', 'x1r-gtr', 'x1r-red']);
  for (const record of STUDIO_STILLS25) {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(new URL(`../frontend/public${record.modelUrl}`, import.meta.url))) hash.update(chunk);
    assert.equal(hash.digest('hex'), record.sha256);
    const image = sharp(await readFile(new URL(`../frontend/public${record.src}`, import.meta.url)));
    const metadata = await image.metadata();
    assert.deepEqual([metadata.format, metadata.width, metadata.height, metadata.hasAlpha], ['png', 352, 352, true]);
    const alpha = (await image.stats()).channels[3];
    assert.equal(alpha.min, 0);
    assert.equal(alpha.max, 255);
  }
});

test('only exact bundled demo render paths qualify; uploaded photos never become a still', () => {
  const demo = { id: 'apex-wheels', modelUrl: '/models/dth-demo/apex-wheels.glb', imageUrl: '/previews/dth-demo/apex-wheels.png' };
  assert.equal(bundledStill25(demo), '/previews/shop-motion/apex-wheels.png');
  for (const product of [null, { ...demo, imageUrl: '/custom-upload.webp' }, { ...demo, modelUrl: '/models/dth-demo/changed.glb' },
    { ...demo, imageUrl: '/previews/shop-motion/apex-wheels.png' }, { ...demo, presentation3d: { revision: 1 } }]) assert.equal(bundledStill25(product), '');
});

test('live shelf and All parts consume static frames without a photo fallback (source contract)', async () => {
  const source = await readFile(new URL('../frontend/src/experience/spatial25/StudioSpatial25.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /galleryPoster24|product\.imageUrl|<Canvas/);
  assert.match(source, /<StudioColorWash25 pageRoot=\{root\} enabled=\{allowed && !blocked && !expanded && !reduced && !policy\.saveData\}/);
  assert.match(source, /shelfProducts=\{shelfProducts\} onShelfPoster=\{onShelfPoster\}/);
});
