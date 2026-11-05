import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { transform } from 'esbuild';
import { createAccessDirector245, directorPermission245, studioProduct245, studioPoster245, STUDY_POSTER245 } from '../frontend/src/experience/access245/director245.logic.mjs';

test('director reports mutable semantic camera values without owning form state', () => {
  const bus = createAccessDirector245(), seen = [];
  const off = bus.subscribe(state => seen.push(state.intro));
  bus.state.intro = .3; bus.emit(); off(); bus.state.intro = .9; bus.emit();
  assert.deepEqual(seen, [.3]);
  assert.equal(createAccessDirector245(true).state.mode, 1);
  assert.equal(bus.state.blocked, true);
  assert.equal(bus.intent.modeInstant, false);
  assert.equal('password' in bus.state, false);
});
test('studio selection never invents another asset or revives an inactive part', () => {
  const actual = { id: 'ohlins', category: 'suspension', active: true, modelUrl: '/models/ai-products/original.glb' };
  assert.equal(studioProduct245([actual]), actual);
  for (const data of [null, [], [{ ...actual, active: false }], [{ ...actual, id: 'fake' }], [{ ...actual, modelUrl: 'https://external.test/model.glb' }]]) assert.equal(studioProduct245(data), null);
});
test('camera permission always respects user/system/input gates', () => {
  const base = { allowed: true, motion: true };
  assert.deepEqual(directorPermission245(base), { motion: true, blocked: false });
  for (const changes of [{ reduced: true }, { compact: true }, { saveData: true }, { allowed: false }, { motion: false }]) assert.deepEqual(directorPermission245({ ...base, ...changes }), { motion: false, blocked: true });
  for (const changes of [{ focusing: true }, { busy: true }]) assert.equal(directorPermission245(base, changes).blocked, true);
  for (const changes of [{ hidden: true }, { paused: true }]) assert.equal(directorPermission245({ ...base, ...changes }).blocked, true);
});
test('static study belongs only to the captured model and default Admin presentation', async () => {
  const product = { id: STUDY_POSTER245.productId, modelUrl: STUDY_POSTER245.modelUrl, presentation3d: null };
  assert.equal(studioPoster245(product), STUDY_POSTER245);
  for (const change of [{ id: 'other' }, { modelUrl: '/models/changed.glb' }, { presentation3d: { revision: 1 } }]) assert.equal(studioPoster245({ ...product, ...change }), null);
  assert.equal(studioPoster245(null), null);
  const bytes = await readFile(new URL(`../frontend/public${STUDY_POSTER245.modelUrl}`, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), STUDY_POSTER245.sha256, 'Model bytes changed: re-capture its poster');
  assert((await readFile(new URL(`../frontend/public${STUDY_POSTER245.src}`, import.meta.url))).byteLength > 1000);
});
const read = path => readFile(new URL(`../frontend/src/experience/access245/${path}`, import.meta.url), 'utf8');
test('camera/visual orchestration stays outside authentication and input contents (source contract)', async () => {
  for (const path of ['AccessSurface245.jsx', 'useAccessDirector245.js', 'AccessStage245.jsx']) {
    const source = await read(path);
    assert.doesNotMatch(source, /authenticate\(|setUser\(|onAuthenticated|localStorage|sessionStorage|password=|email=/);
  }
  const hook = await read('useAccessDirector245.js');
  assert.match(hook, /context\.current\?\.revert\(\)/);
  assert.doesNotMatch(hook, /requestAnimationFrame/);
});
test('new JSX transforms with installed tooling (syntax only)', async () => {
  for (const path of ['AccessSurface245.jsx', 'AccessStage245.jsx']) assert.equal((await transform(await read(path), { loader: 'jsx', jsx: 'automatic' })).warnings.length, 0);
});
