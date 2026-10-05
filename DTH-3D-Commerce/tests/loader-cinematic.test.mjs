import test from 'node:test';
import assert from 'node:assert/strict';
import { LOADER_CONFIG as config } from '../frontend/src/experience/loader/loader.config.mjs';
import { buildLoaderCues } from '../frontend/src/experience/loader/loaderCues.mjs';
import { createLoaderMotion } from '../frontend/src/experience/loader/loaderMotion.mjs';
import { loaderDecision } from '../frontend/src/experience/loader/loader.logic.mjs';

function fixture({ width = 1440, rejects = false, throws = false } = {}) {
  const calls = [];
  let cancellations = 0;
  const node = { animate(frames, options) {
    if (throws) throw new Error('animation unavailable');
    calls.push({ frames, options });
    return { finished: rejects ? Promise.reject(new Error('cancelled')) : Promise.resolve(), cancel() { cancellations++; } };
  } };
  const counts = { segment: 7, echo: 2, bracket: 4, arc: 3, word: 3, streak: 4 };
  const root = {
    ...node,
    ownerDocument: { defaultView: { innerWidth: width } },
    querySelector: () => node,
    querySelectorAll: selector => Array.from({ length: counts[selector.replace('[data-ignition-', '').replace(']', '')] || 0 }, () => node),
  };
  return { root, calls, cancelled: () => cancellations };
}
const flatten = cue => Object.values(cue).flatMap(value => Array.isArray(value) ? value : [value]).filter(value => value && typeof value === 'object');

test('default brand is slow enough to read and exit remains finite', () => {
  assert.ok(config.brandMs >= 2500 && config.brandMs <= 7000); assert.ok(config.exitMs > 0 && config.exitMs <= 1200);
  assert.ok(config.maxCoverMs > config.brandMs + config.exitMs);
});
test('visual upgrade does not replay for existing sessions', () => assert.equal(config.sessionKey, 'dth.ignition.seen.v1'));
test('brand timing and watchdog are not the same delay', () => {
  assert.equal(loaderDecision({ ready: true, logoReady: true, elapsed: config.brandMs - 500, brandElapsed: config.brandMs - 500 }).exit, false);
  assert.equal(loaderDecision({ ready: true, logoReady: true, elapsed: config.brandMs + 100, brandElapsed: config.brandMs }).reason, 'ready');
});
test('all cues have finite nonnegative durations and delays', () => {
  for (const cue of flatten(buildLoaderCues())) {
    assert.ok(Number.isFinite(cue.delay) && cue.delay >= 0);
    assert.ok(Number.isFinite(cue.duration) && cue.duration > 0);
  }
});
test('recognition hold is at least 600 ms at default speed', () => assert.ok(buildLoaderCues().recognitionHoldMs >= 600));
test('all primary cues leave time for the final still logo', () => {
  const cue = buildLoaderCues();
  for (const entry of flatten(cue)) assert.ok(entry.delay + entry.duration <= cue.total - cue.recognitionHoldMs);
});
test('seven original red segments light in ascending order', () => {
  const { segments } = buildLoaderCues(); assert.equal(segments.length, 7);
  assert.ok(segments.every((s, i) => !i || s.delay > segments[i - 1].delay));
});
test('silver sweep starts after most of the face reveal, not at the same instant', () => {
  const cue = buildLoaderCues(); assert.ok(cue.silver.delay > cue.face.delay + cue.face.duration * .8);
});
for (const n of [1800, 3500, 5000, 7000]) test(`choreography scales as a unit at ${n}ms`, () => {
  const cue = buildLoaderCues(n); assert.equal(cue.total, n);
  assert.ok(Math.abs(cue.silver.duration - 1100 * n / 3500) < 1e-9);
  assert.ok(flatten(cue).every(e => e.delay + e.duration <= n));
});
for (const n of [NaN, Infinity, -1, 0, 999, 10000, '3500', null]) test(`invalid duration falls back safely: ${String(n)}`, () => {
  assert.equal(buildLoaderCues(n).total, config.brandMs);
});
test('controller schedules every main stage and never repeats an animation forever', () => {
  const f = fixture(); const controller = createLoaderMotion(f.root);
  for (const call of f.calls) {
    assert.equal(call.options.iterations, 1);
    assert.ok(Number.isFinite(call.options.duration));
    assert.ok(call.options.duration + (call.options.delay || 0) <= config.brandMs - buildLoaderCues().recognitionHoldMs + 1e-6);
  }
  for (const id of ['stage-settle', 'original-face-reveal', 'silver-sweep', 'cyan-bridge'])
    assert.ok(f.calls.some(call => call.options.id === `dth-ignition-${id}`));
  controller.dispose(); assert.equal(f.cancelled(), f.calls.length);
});
test('compact devices have fewer depth layers and streaks', () => {
  const wide = fixture(); const compact = fixture({ width: 390 });
  const a = createLoaderMotion(wide.root), b = createLoaderMotion(compact.root);
  assert.equal(wide.calls.length - compact.calls.length, 3); a.dispose(); b.dispose();
});
test('reduced motion schedules no entry effects', () => {
  const f = fixture(); createLoaderMotion(f.root, { reduced: true }).dispose(); assert.equal(f.calls.length, 0);
});
test('reduced exit is a short opacity transition only', () => {
  const f = fixture(); createLoaderMotion(f.root, { reduced: true, exit: true, duration: 100 }).dispose();
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].options.duration, 100);
  assert.deepEqual(f.calls[0].frames, [{ opacity: 1 }, { opacity: 0 }]);
});
test('ordinary exit has no leftover entry timeline', () => {
  const f = fixture(); createLoaderMotion(f.root, { exit: true, duration: 750 }).dispose();
  assert.equal(f.calls.length, 6); assert.ok(f.calls.every(c => !c.options.delay));
});
test('invalid exit duration uses the quiet fallback', () => {
  const f = fixture(); createLoaderMotion(f.root, { reduced: true, exit: true, duration: Infinity }).dispose();
  assert.equal(f.calls[0].options.duration, config.quietExitMs);
});
test('cleanup is idempotent under StrictMode-style double disposal', () => {
  const f = fixture(); const c = createLoaderMotion(f.root); c.dispose(); c.dispose(); assert.equal(f.cancelled(), f.calls.length);
});
test('motion failure does not throw or lock the rest of the app', () => {
  const f = fixture({ throws: true }); assert.doesNotThrow(() => createLoaderMotion(f.root).dispose());
});
test('null root is safe', () => assert.doesNotThrow(() => createLoaderMotion(null).dispose()));
test('cancelled finished promises are handled', async () => {
  const f = fixture({ rejects: true }); createLoaderMotion(f.root).dispose(); await new Promise(r => setImmediate(r));
  assert.ok(f.calls.length > 0);
});
test('Skip, errors and background are still allowed during the slow brand clock', () => {
  for (const [key, reason] of [['skipped', 'skip'], ['failed', 'error'], ['hidden', 'background'], ['routeChanged', 'navigation']])
    assert.deepEqual(loaderDecision({ elapsed: 50, brandElapsed: 0, [key]: true }), { exit: true, reason });
});
test('late assets cannot hold the overlay indefinitely', () => {
  assert.equal(loaderDecision({ elapsed: config.maxCoverMs, ready: false, logoReady: false }).reason, 'timeout');
});
