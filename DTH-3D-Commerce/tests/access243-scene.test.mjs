import test from 'node:test';
import assert from 'node:assert/strict';
import { LOGO_MESHES } from '../frontend/src/experience/access181/logo.mesh.mjs';
import { SCENE243, lightStudyPose243, logoPosterPath243, logoSurfaces243, pointerTarget243, scenePermission243, settlePointer243 } from '../frontend/src/experience/access243/scene243.logic.mjs';

test('only startup-approved desktop devices mount the decorative scene', () => {
  assert.deepEqual(scenePermission243({ allowed: true }), { mount: true, run: true });
  for (const key of ['reduced', 'compact', 'saveData']) assert.deepEqual(scenePermission243({ allowed: true, [key]: true }), { mount: false, run: false });
  assert.deepEqual(scenePermission243({ allowed: false }), { mount: false, run: false });
});

test('focus, request work, pause and hidden tab park the scene without losing its mount', () => {
  for (const key of ['hidden', 'paused']) assert.deepEqual(scenePermission243({ allowed: true, [key]: true }), { mount: true, run: false });
  for (const key of ['focusing', 'busy']) assert.deepEqual(scenePermission243({ allowed: true }, { [key]: true }), { mount: true, run: false });
  assert.equal(scenePermission243({ allowed: true, motion: false }).run, false);
});

test('pointer data is finite, bounded and returns to rest when inactive', () => {
  assert.deepEqual(pointerTarget243({ x: 5, y: -8 }), { x: 1, y: -1 });
  assert.deepEqual(pointerTarget243({ x: NaN, y: Infinity }), { x: 0, y: 0 });
  assert.deepEqual(pointerTarget243({ x: 1, y: 1, active: false }), { x: 0, y: 0 });
  assert.deepEqual(pointerTarget243({ x: 1, y: 1 }, false), { x: 0, y: 0 });
});

test('combined pointer rotation never exceeds three degrees; light remains bounded', () => {
  for (let x = -2; x <= 2; x += .125) for (let y = -2; y <= 2; y += .125) {
    const pose = lightStudyPose243({ x, y });
    assert(Math.hypot(pose.tiltX, pose.tiltY) <= SCENE243.maxTilt + 1e-12);
    assert(pose.lightX >= -5.6 - 1e-12 && pose.lightX <= -2 + 1e-12);
    assert(pose.lightY >= -3.85 - 1e-12 && pose.lightY <= -1.55 + 1e-12);
  }
});

test('finite demand work reaches an exact resting state after pointer stops', () => {
  let value = { x: -1, y: 1 }, frames = 0;
  while (!value.settled && frames < 150) { value = settlePointer243(value, { x: 1, y: -1 }, 1 / 60); frames++; }
  assert(frames < 70); assert.deepEqual(value, { x: 1, y: -1, settled: true });
  assert.deepEqual(settlePointer243(value, { x: 1, y: -1 }, 3), value);
});

test('the entry light sweep changes illumination rather than moving the camera or geometry', () => {
  const start = lightStudyPose243({ x: 0, y: 0 }, 0), finish = lightStudyPose243({ x: 0, y: 0 }, 1);
  assert.equal(start.tiltX, finish.tiltX); assert.equal(start.tiltY, finish.tiltY);
  assert.equal(start.lightX - finish.lightX, 5);
  assert(SCENE243.sweepSeconds <= .8);
});

test('authored brand triangles and normals survive surface assignment unchanged', () => {
  const before = JSON.stringify(LOGO_MESHES), data = logoSurfaces243(LOGO_MESHES);
  assert.equal(JSON.stringify(LOGO_MESHES), before);
  assert.equal(data.positions.length, LOGO_MESHES.reduce((sum, m) => sum + m.positions.length, 0));
  assert.equal(data.groups.reduce((sum, group) => sum + group.count, 0), data.positions.length / 3);
  assert.deepEqual(new Set(data.groups.map(group => group.materialIndex)), new Set([0, 1, 2]));
  assert(data.positions.every(Number.isFinite)); assert(data.normals.every(Number.isFinite));
  assert.throws(() => logoSurfaces243([{ positions: [1, 2], normals: [1, 2] }]), /geometry/);
});

test('the static poster uses the same authored front-face silhouette', () => {
  const path = logoPosterPath243(LOGO_MESHES);
  const front = LOGO_MESHES.reduce((sum, mesh) => sum + mesh.normals.filter((value, index) => index % 9 === 2 && value >= .9).length, 0);
  assert.equal((path.match(/M/g) || []).length, front);
  assert(!/NaN|Infinity/.test(path)); assert(path.length < 100_000);
});
