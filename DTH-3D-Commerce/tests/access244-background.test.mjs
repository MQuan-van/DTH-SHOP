import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import { FIELD244, FIELD_FRAGMENT244, FIELD_VERTEX244, fieldPermission244, fieldTarget244, settleField244 } from '../frontend/src/experience/access244/lightField244.logic.mjs';

test('light field respects startup, device, visibility and form gates', () => {
  const base = { allowed: true, motion: true, compact: false, saveData: false, reduced: false, hidden: false, paused: false };
  assert.deepEqual(fieldPermission244(base), { mount: true, run: true });
  for (const key of ['compact', 'saveData', 'reduced']) assert.deepEqual(fieldPermission244({ ...base, [key]: true }), { mount: false, run: false });
  assert.equal(fieldPermission244({ ...base, allowed: false }).mount, false);
  for (const key of ['hidden', 'paused']) assert.deepEqual(fieldPermission244({ ...base, [key]: true }), { mount: true, run: false });
  for (const state of [{ focusing: true }, { busy: true }]) assert.equal(fieldPermission244(base, state).run, false);
});

test('pointer target ignores inactive input and clamps malformed values', () => {
  assert.deepEqual(fieldTarget244({ x: 50, y: -20 }), { x: 1, y: -1 });
  assert.deepEqual(fieldTarget244({ x: Infinity, y: NaN }), { x: 0, y: 0 });
  assert.deepEqual(fieldTarget244({ x: 1, y: 1, active: false }), { x: 0, y: 0 });
});

test('finite pointer convergence reaches an exact rest and can sleep', () => {
  let point = { x: -1, y: 1 }, target = { x: .7, y: -.4 };
  for (let i = 0; i < 150 && !point.settled; i++) point = settleField244(point, target, 1 / 60);
  assert.deepEqual(point, { ...target, settled: true });
  assert.deepEqual(settleField244(point, target, 1 / 60), point);
  assert(FIELD244.entrySeconds <= 1);
});

test('shader is an asset-free two-triangle light study with finite semantic inputs', () => {
  assert.match(FIELD_VERTEX244, /gl_Position = vec4\(position.xy/);
  assert.match(FIELD_FRAGMENT244, /colorspace_fragment/);
  assert.doesNotMatch(FIELD_FRAGMENT244, /sampler|texture2D|uTime|password|email/i);
});

test('background JSX transforms with the installed compiler, independent of browser rendering', async () => {
  const source = await readFile(new URL('../frontend/src/experience/access244/LightField244.jsx', import.meta.url), 'utf8');
  const result = await transform(source, { loader: 'jsx', jsx: 'automatic', format: 'esm' });
  assert.equal(result.warnings.length, 0);
  assert.match(source, /frameloop="demand"/);
  assert.doesNotMatch(source, /requestAnimationFrame|authenticate|fetch\(|studioRequest|localStorage/);
});
