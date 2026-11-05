import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import { CAMERA245, cameraPose245, cornerFitDistance245, pointer245, presentationCorners245, retainSample245, settlePointer245, stagePermission245 } from '../frontend/src/experience/access245/camera245.logic.mjs';

const front = { position: [1.4, .4, 4.8], target: [0, 0, 0] };
const frame = { width: 1200, height: 450, radius: 1.35, frameRadius: 1.35, referenceDistance: 5.5, fov: 36 };
test('overview composes a three-quarter study from authored yaw without mutating inputs', () => {
  const original = structuredClone({ front, frame });
  const pose = cameraPose245(front, frame, { intro: 1 });
  assert(Math.abs(pose.yaw - Math.atan2(1.4, 4.8) - CAMERA245.studyArc) < 1e-12);
  assert.deepEqual(pose.target, front.target);
  assert.deepEqual({ front, frame }, original);
});
test('tighter overview still fits presented source-box corners with margin', () => {
  const bounds = { min: [-.5, -.9, -.95], max: [.5, .9, .95] };
  const presentation = { scale: .97, rotation: [.1, .2, .3], offset: [.02, -.01, 0], center: [.1, -.1, 0] };
  const original = structuredClone({ bounds, presentation });
  const points = presentationCorners245(bounds, presentation);
  assert.equal(points.length, 8);
  assert.deepEqual({ bounds, presentation }, original);
  for (const mode of [0, 1]) {
    const pose = cameraPose245(front, { ...frame, points }, { intro: 1, mode });
    const floor = cornerFitDistance245(points, pose.yaw, pose.pitch, pose.target, pose.fov, frame.width / frame.height);
    assert(pose.distance >= floor - 1e-9);
  }
});
test('intro is a bounded dolly/arc to whole-asset overview', () => {
  const close = cameraPose245(front, frame, { intro: 0 }), full = cameraPose245(front, frame, { intro: 1 });
  assert(close.distance < full.distance);
  assert(close.distance >= frame.radius * 1.25);
  assert(Math.abs((close.yaw - full.yaw) - CAMERA245.introArc) < 1e-12);
  assert(close.target[1] > full.target[1]);
});
test('register changes actual camera angle without changing the asset', () => {
  const login = cameraPose245(front, frame, { intro: 1, mode: 0 });
  const register = cameraPose245(front, frame, { intro: 1, mode: 1 });
  assert(Math.abs(register.yaw - login.yaw - Math.PI / 10) < 1e-12);
  assert.notDeepEqual(register.position, login.position);
});
test('framing adapts in every mode including narrow aspect', () => {
  for (const sample of [{ intro: 0 }, { intro: 1 }, { intro: 1, detail: 1 }, { intro: 1, mode: 1 }]) {
    const wide = cameraPose245(front, frame, sample);
    const narrow = cameraPose245(front, { ...frame, width: 350, height: 600 }, sample);
    assert(narrow.distance > wide.distance);
    assert(narrow.position.every(Number.isFinite));
  }
});
test('focus/pause retain exact sample while resize can reframe it', () => {
  const previous = retainSample245(null, { intro: .4, mode: .3, detail: .2 }, { x: .7, y: -.5 }, true);
  assert.equal(retainSample245(previous, { intro: 1, mode: 1 }, {}, false), previous);
  const before = cameraPose245(front, frame, previous);
  assert.deepEqual(cameraPose245(front, frame, retainSample245(previous, {}, {}, false)), before);
  assert.notDeepEqual(cameraPose245(front, { ...frame, width: 200 }, previous), before);
  assert.deepEqual(retainSample245(null, { intro: 0, detail: 1 }, {}, false), { intro: 1, mode: 0, detail: 0, pointer: { x: 0, y: 0 } });
});
test('policy never mounts heavy scene for reduced/save-data/compact and parks hidden/blocked', () => {
  const base = { allowed: true, motion: true };
  for (const patch of [{ allowed: false }, { compact: true }, { reduced: true }, { saveData: true }]) assert.equal(stagePermission245({ ...base, ...patch }).mount, false);
  for (const patch of [{ hidden: true }, { paused: true }, { motion: false }]) assert.equal(stagePermission245({ ...base, ...patch }).move, false);
  assert.equal(stagePermission245(base, { blocked: true }).move, false);
});
test('pointer response converges exactly, is bounded and finite', () => {
  const target = pointer245({ x: 10, y: -10 });
  assert.deepEqual(target, { x: 1, y: -1 });
  let point = { x: 0, y: 0 };
  for (let i = 0; i < 300 && !point.settled; i++) point = settlePointer245(point, target, 1 / 60);
  assert.deepEqual(point, { x: 1, y: -1, settled: true });
  assert.deepEqual(pointer245({ x: NaN, y: Infinity }), { x: 0, y: 0 });
  assert(cameraPose245({}, { width: NaN, height: 0 }, { intro: Infinity }).position.every(Number.isFinite));
});
test('scene syntax and source integration preserve original profiled asset ownership', async () => {
  const source = await readFile(new URL('../frontend/src/experience/access245/AccessStage245.jsx', import.meta.url), 'utf8');
  const result = await transform(source, { loader: 'jsx', jsx: 'automatic', format: 'esm' });
  assert.equal(result.warnings.length, 0);
  assert.match(source, /useProfiledModel\(product, selection, onError\)/);
  assert.match(source, /getPresentation21\(product\)/);
  assert.match(source, /frameloop="demand"/);
  assert.match(source, /onAfterRender/);
  assert.match(source, /dispose=\{null\}/);
  assert.doesNotMatch(source, /requestAnimationFrame|OrbitControls|clearProfiledModelCache|\.material\s*=|\.geometry\s*=/);
  assert.match(source, /statusRef\.current\.status === 'loading'\) callbacks\.current\.onStatus/);
  assert.match(source, /statusRef\.current\.status !== 'loading'\) return/);
});
