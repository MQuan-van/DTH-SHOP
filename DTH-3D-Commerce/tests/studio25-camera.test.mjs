import test from 'node:test';
import assert from 'node:assert/strict';
import { allowIdleOrbit25, createTravel25, fitDistance25, guardCamera25, idleOrbitAngle25, nearestResident25, projectPoint25, residents25, scenePermitted25, station25, stationPose25 } from '../frontend/src/experience/studio25Preview/spatial-stage25.logic.mjs';
const descriptor = { center: [.1, -.2, .05], radius: 1.35, fov: 36, front: { position: [-2, .6, 5], target: [.1, -.2, .05] } };
const finite = value => value.every(Number.isFinite);
const close = (a, b) => a.forEach((n, i) => assert(Math.abs(n - b[i]) < 1e-9));

test('hidden, inactive and dialog-blocked scenes cannot own input or frame work', () => {
  assert.equal(scenePermitted25(), false);
  assert.equal(scenePermitted25({ active: true }), true);
  for (const gate of [{ active: false }, { active: true, blocked: true }, { active: true, hidden: true }, { active: true, failed: true }]) assert.equal(scenePermitted25(gate), false);
});
test('idle motion honours Save-Data, native reduced motion, manual inspection, pause and author stop independently', () => {
  assert.equal(allowIdleOrbit25(), true);
  for (const gate of [{ paused: true }, { reduced: true }, { orbitDisabled: true }, { inspect: true }, { spinEnabled: false }]) assert.equal(allowIdleOrbit25(gate), false);
  // Save-Data affects idle work only; a user-requested camera journey remains available.
  const a = stationPose25(descriptor, station25(0), 790, 580), b = stationPose25(descriptor, station25(1), 790, 580);
  assert.equal(createTravel25(a, b).seconds, 1.18);
});

test('automatic overview covers front, side, rear and a complete turn at the authored speed', () => {
  for (const period of [12, 32, 38, 120]) {
    close([0, .25, .5, .75, 1].map(turn => idleOrbitAngle25(period * turn, period)), [0, Math.PI / 2, Math.PI, Math.PI * 1.5, 0]);
    // A sine sway would reverse after a quarter cycle and never reach the rear.
    assert(idleOrbitAngle25(period * .6, period) > idleOrbitAngle25(period * .4, period));
  }
});

test('idle orbit wraps continuously across many turns and never accumulates unbounded angles', () => {
  const period = 38, epsilon = 1e-6;
  close([idleOrbitAngle25(period * 1000.25, period)], [Math.PI / 2]);
  const before = idleOrbitAngle25(period - epsilon, period), after = idleOrbitAngle25(period + epsilon, period);
  assert(Math.hypot(Math.sin(after) - Math.sin(before), Math.cos(after) - Math.cos(before)) < 1e-5);
});

test('invalid idle timing cannot produce a NaN camera transform', () => {
  for (const [elapsed, period] of [[NaN,38],[Infinity,38],[-1,38],[1,0],[1,-1],[1,NaN]]) assert.equal(idleOrbitAngle25(elapsed,period),0);
});
test('display stations are stable and distinct; they are not mount metadata', () => {
  assert.deepEqual(station25(0), [0, 0, 0]); assert.deepEqual(station25(1), [12, 0, 0]); assert.throws(() => station25(-1));
});
for (const [width, height] of [[790, 580], [390, 350], [320, 420], [1440, 700]]) test(`complete sphere fitting works at ${width}x${height}`, () => {
  const pose = stationPose25(descriptor, station25(1), width, height), radius = descriptor.radius;
  const vertical = 36 * Math.PI / 360, horizontal = Math.atan(Math.tan(vertical) * width / height);
  assert(pose.distance * Math.sin(vertical) >= radius); assert(pose.distance * Math.sin(horizontal) >= radius);
  close(pose.target, [12.1, -.2, .05]); assert(finite(pose.position));
});
test('authored camera direction and target are preserved through responsive station placement', () => {
  const pose = stationPose25(descriptor, [12, 0, 0], 790, 580), direction = descriptor.front.position.map((n, i) => n - descriptor.front.target[i]);
  const length = Math.hypot(...direction), actual = pose.position.map((n, i) => (n - pose.target[i]) / pose.distance);
  close(actual, direction.map(n => n / length));
});
test('camera journey has exact finite endpoints and a spatial retreat rather than a DOM slide', () => {
  const a = stationPose25(descriptor, station25(0), 790, 580), b = stationPose25(descriptor, station25(1), 790, 580), input = structuredClone([a, b]);
  const travel = createTravel25(a, b, { spheres: [a, b] });
  close(travel.sample(0).position, a.position); close(travel.sample(travel.seconds).position, b.position);
  const middle = travel.sample(travel.seconds / 2), straightZ = (a.position[2] + b.position[2]) / 2;
  assert(middle.position[2] > straightZ + .5); assert(middle.position[1] > (a.position[1] + b.position[1]) / 2);
  assert.deepEqual([a, b], input);
  for (let i = 0; i <= 100; i++) {
    const s = travel.sample(travel.seconds * i / 100); assert(finite(s.position)); assert(finite(s.target));
    for (const sphere of [a, b]) assert(Math.hypot(...s.position.map((n, j) => n - sphere.center[j])) >= sphere.radius * 1.18 - 1e-9);
  }
});
test('rapid switching starts a new journey at the actual interrupted camera pose', () => {
  const a = stationPose25(descriptor, station25(0), 790, 580), b = stationPose25(descriptor, station25(1), 790, 580), c = stationPose25(descriptor, station25(2), 790, 580);
  const interrupted = createTravel25(a, b).sample(.46), latest = createTravel25(interrupted, c);
  close(latest.sample(0).position, interrupted.position); close(latest.sample(0).target, interrupted.target); close(latest.sample(5).position, c.position);
});
test('reduced motion cuts directly to the destination after preparation', () => {
  const a = stationPose25(descriptor, station25(0), 790, 580), b = stationPose25(descriptor, station25(1), 790, 580), t = createTravel25(a, b, { reduced: true });
  assert.equal(t.seconds, 0); assert.equal(t.sample(0).done, true); close(t.sample(0).position, b.position);
});
test('different authored fields of view interpolate with the same camera journey rather than snapping', () => {
  const a = stationPose25(descriptor, station25(0), 790, 580), b = stationPose25({ ...descriptor, fov: 48 }, station25(1), 790, 580), journey = createTravel25(a, b);
  assert.equal(journey.sample(0).fov, 36); assert.equal(journey.sample(journey.seconds).fov, 48);
  assert(Math.abs(journey.sample(.01).fov - 36) < .01);
  assert(journey.sample(journey.seconds / 2).fov > 36 && journey.sample(journey.seconds / 2).fov < 48);
});
test('manual camera positions inside the model hull are made finite and external', () => {
  const result = guardCamera25([0, 0, 0], [{ center: [0, 0, 0], radius: 2 }]);
  assert(finite(result)); assert(Math.hypot(...result) >= 2.36 - 1e-9);
});
test('residency stays bounded to two and prioritises a scene actually rendered near the camera', () => {
  assert.deepEqual(residents25('ttx', 'mono'), ['ttx', 'mono']); assert.deepEqual(residents25('ttx', 'ttx'), ['ttx']);
  assert.equal(nearestResident25([{ id: 'a', center: [0, 0, 0], rendered: true }, { id: 'b', center: [12, 0, 0], rendered: true }, { id: 'c', center: [10, 0, 0], rendered: false }], [11, 0, 5], 'a'), 'b');
});
test('leader projection rejects offscreen/behind/unfacing values without claiming a surface label', () => {
  assert.deepEqual(projectPoint25([0, 0, 0], 790, 580), { x: 395, y: 290, visible: true });
  for (const point of [[2, 0, 0], [0, 0, 2], [NaN, 0, 0]]) assert.equal(projectPoint25(point, 790, 580).visible, false);
  assert.equal(projectPoint25([0, 0, 0], 790, 580, { facing: false }).visible, false);
});
test('invalid framing inputs fail without corrupting the camera', () => {
  for (const args of [[0, 100, 100], [1, 0, 100], [1, 100, NaN]]) assert.throws(() => fitDistance25(...args));
  assert.throws(() => createTravel25({ position: [NaN, 0, 0], target: [0, 0, 0] }, { position: [0, 0, 5], target: [0, 0, 0] }));
});
