import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import {
  advanceWheelWash247,
  wheelWashDelta247,
  wheelWashTravel247,
  wheelWashDestination247,
} from '../frontend/src/experience/access246/wheelWash247.logic.mjs';

test('normalizes wheel pixels, lines and pages while preserving direction', () => {
  assert.equal(wheelWashDelta247({ deltaY: 3.5 }), 3.5);
  assert.equal(wheelWashDelta247({ deltaY: -3, deltaMode: 1 }), -48);
  assert.equal(wheelWashDelta247({ deltaY: 0.25, deltaMode: 2 }, 600), 150);
  assert.equal(wheelWashDelta247({ deltaY: 0.1, deltaMode: 2 }, 20), 24);
  assert.equal(wheelWashDelta247({ deltaY: -0.1, deltaMode: 2 }, 2000), -160);
  assert.equal(wheelWashDelta247({ deltaY: 0.25, deltaMode: 2 }, NaN), 200);
});

test('ignores horizontal, zoom, shifted and invalid wheel events', () => {
  const ignored = [
    undefined,
    { deltaY: 0 },
    { deltaX: -21, deltaY: 20 },
    { deltaY: 20, ctrlKey: true },
    { deltaY: 20, metaKey: true },
    { deltaY: 20, shiftKey: true },
    { deltaY: NaN },
    { deltaY: Infinity },
    { deltaX: Infinity, deltaY: 20 },
    { deltaY: 20, deltaMode: 3 },
  ];
  for (const event of ignored) assert.equal(wheelWashDelta247(event), 0);
  assert.equal(wheelWashDelta247({ deltaX: 10, deltaY: -20 }), -20);
});

test('limits large wheel events and phase changes in either direction', () => {
  assert.equal(wheelWashDelta247({ deltaY: Number.MAX_VALUE, deltaMode: 2 }), 240);
  assert.equal(wheelWashDelta247({ deltaY: -1000, deltaMode: 1 }), -240);
  assert.equal(advanceWheelWash247(2, 1000), 2.5);
  assert.equal(advanceWheelWash247(2, -1000), 1.5);
});

test('wraps the palette at both ends and reverses across the seam', () => {
  assert.equal(advanceWheelWash247(3.875, 120), 0.125);
  assert.equal(advanceWheelWash247(0.125, -120), 3.875);
  assert.equal(advanceWheelWash247(3.75, 120), 0);
  assert.equal(advanceWheelWash247(0.25, -120), 0);
  assert.equal(advanceWheelWash247(4, 0), 0);
  assert.equal(advanceWheelWash247(-0.5, 0), 3.5);
  assert.equal(advanceWheelWash247(NaN, 120), 0.25);
  assert.equal(advanceWheelWash247(0.25, Infinity), 0.25);
  assert.equal(advanceWheelWash247(0, -1e-13), 0);
});

test('accumulates small trackpad deltas and cancels a reversed burst', () => {
  const initial = 3.95;
  let phase = initial;
  for (let index = 0; index < 160; index += 1) {
    phase = advanceWheelWash247(phase, wheelWashDelta247({ deltaY: 0.375 }));
  }
  assert.ok(Math.abs(phase - 0.075) < 1e-12);
  for (let index = 0; index < 160; index += 1) {
    phase = advanceWheelWash247(phase, wheelWashDelta247({ deltaY: -0.375 }));
  }
  assert.ok(Math.abs(phase - initial) < 1e-12);
});

test('the tween crosses the palette seam in the direction of the wheel', () => {
  assert.equal(wheelWashTravel247(3.875, 120), 4.125);
  assert.equal(wheelWashTravel247(.125, -120), -.125);
  assert.equal(advanceWheelWash247(4.125, 0), .125);
  assert.equal(advanceWheelWash247(-.125, 0), 3.875);
});

test('a fast wheel burst cannot queue whole color cycles ahead of the visible wash', () => {
  const rendered = 3.875;
  let target = rendered;
  for (let index = 0; index < 150; index += 1) target = wheelWashDestination247(rendered, target, 240);
  assert.equal(target, 4.875);
  for (let index = 0; index < 150; index += 1) target = wheelWashDestination247(rendered, target, -240);
  assert.equal(target, 2.875);
});

test('wheel decoration attaches a passive page listener and cleans it up (source contract)', async () => {
  const source = await readFile(new URL('../frontend/src/experience/access246/WheelWash247.jsx', import.meta.url), 'utf8');
  assert.match(source, /addEventListener\('wheel', onWheel, \{ passive: true \}\)/);
  assert.match(source, /removeEventListener\('wheel', onWheel\)/);
  assert.doesNotMatch(source, /preventDefault\(|scrollTo\(|requestAnimationFrame|\bCanvas\b|setInterval/);
  assert.equal((await transform(source, { loader: 'jsx', jsx: 'automatic' })).warnings.length, 0);
});
