import test from 'node:test';
import assert from 'node:assert/strict';
import { LOADER_CONFIG as config } from '../frontend/src/experience/loader/loader.config.mjs';
import { buildLoaderCues } from '../frontend/src/experience/loader/loaderCues.mjs';
import { createLoaderMotion } from '../frontend/src/experience/loader/loaderMotion.mjs';
import { loaderDecision } from '../frontend/src/experience/loader/loader.logic.mjs';

function fixture({ width = 1440, throws = false, rejects = false } = {}) {
  const calls = []; let cancelled = 0, paused = 0, finished = 0;
  const node = { animate(frames, options) {
    if (throws) throw Error('unsupported');
    const animation = { finished: rejects ? Promise.reject(Error('cancelled')) : Promise.resolve(),
      cancel() { cancelled++; }, pause() { paused++; }, finish() { finished++; } };
    calls.push({ frames, options, animation }); return animation;
  } };
  const root = { ...node, ownerDocument: { defaultView: { innerWidth: width }, timeline: { currentTime: 1000 } },
    querySelector: () => node, querySelectorAll: () => [node, node, node] };
  return { root, calls, count: () => ({ cancelled, paused, finished }) };
}
const cuesOf = value => Object.values(value).flatMap(v => Array.isArray(v) ? v : [v]).filter(v => v && typeof v === 'object');
test('normal presentation is 2.5s plus 360ms fade, not a network percentage', () => {
  assert.equal(config.brandMs, 2500); assert.equal(config.exitMs, 360);
  assert.ok(config.maxCoverMs > config.brandMs + config.exitMs);
});
test('intro key and original logo dimensions stay compatible', () => {
  assert.equal(config.sessionKey, 'dth.ignition.seen.v1');
  assert.equal(config.logoUrl, '/branding/dth-logo-original.png');
  assert.equal(config.logoWidth, 1536); assert.equal(config.logoHeight, 1024);
});
test('all movement ends before the 650ms still-logo hold', () => {
  const cues = buildLoaderCues(); assert.equal(cues.recognitionHoldMs, 650);
  assert.equal(cues.fragments.length, 3);
  for (const cue of cuesOf(cues)) {
    assert.ok(cue.delay >= 0 && cue.duration > 0);
    assert.ok(cue.delay + cue.duration <= cues.total - cues.recognitionHoldMs);
  }
});
for (const ms of [1000, 1800, 2500, 5000, 7000]) test(`choreography scales together: ${ms}`, () => {
  const c = buildLoaderCues(ms); assert.equal(c.total, ms);
  assert.ok(cuesOf(c).every(x => x.delay + x.duration <= ms - c.recognitionHoldMs + .000001));
});
for (const ms of [NaN, Infinity, -1, 0, 999, 10000, '2500', null]) test(`invalid time defaults safely: ${String(ms)}`, () => {
  assert.equal(buildLoaderCues(ms).total, config.brandMs);
});
test('desktop schedules exactly seven finite entry tracks', () => {
  const f = fixture(), c = createLoaderMotion(f.root); assert.equal(f.calls.length, 7);
  for (const call of f.calls) {
    assert.equal(call.options.iterations, 1);
    assert.ok(call.options.duration + (call.options.delay || 0) <= 1850);
    for (const frame of call.frames) assert.ok(Object.keys(frame).every(k => ['opacity', 'transform', 'offset'].includes(k)));
  }
  for (const id of ['fragment-0', 'fragment-1', 'fragment-2', 'original-face-reveal', 'silver-sweep', 'signature-line'])
    assert.ok(f.calls.some(x => x.options.id === `dth-ignition-${id}`));
  c.dispose(); c.dispose(); assert.equal(f.count().cancelled, 7);
});
test('compact uses five tracks without deleting the main logo', () => {
  const f = fixture({ width: 390 }); createLoaderMotion(f.root).dispose(); assert.equal(f.calls.length, 5);
  assert.ok(f.calls.some(x => x.options.id === 'dth-ignition-original-face-reveal'));
});
test('all tracks share a clock; effect restart can resume elapsed time', () => {
  const f = fixture(); createLoaderMotion(f.root, { elapsedMs: 425 }).dispose();
  assert.ok(f.calls.every(x => x.animation.startTime === 575));
});
test('a rejected timing cannot make the animation infinite', () => {
  const f = fixture(); createLoaderMotion(f.root, { elapsedMs: Infinity }).dispose();
  assert.ok(f.calls.every(x => x.animation.startTime === 1000));
});
test('freeze pauses rather than cancelling to an unrelated final pose', () => {
  const f = fixture(), c = createLoaderMotion(f.root); c.freeze();
  assert.equal(f.count().paused, 7); assert.equal(f.count().cancelled, 0); c.dispose();
});
test('reduced-motion change can finish decorative movement', () => {
  const f = fixture(), c = createLoaderMotion(f.root); c.finish(); assert.equal(f.count().finished, 7); c.dispose();
});
test('reduced entry schedules no animations', () => {
  const f = fixture(); createLoaderMotion(f.root, { reduced: true }).dispose(); assert.equal(f.calls.length, 0);
});
for (const reduced of [false, true]) test(`exit only fades the root: ${reduced}`, () => {
  const f = fixture(); createLoaderMotion(f.root, { exit: true, reduced, duration: 100 }).dispose();
  assert.equal(f.calls.length, 1); assert.deepEqual(f.calls[0].frames, [{ opacity: 1 }, { opacity: 0 }]);
});
test('invalid exit time uses quiet fallback', () => {
  const f = fixture(); createLoaderMotion(f.root, { exit: true, duration: Infinity }).dispose();
  assert.equal(f.calls[0].options.duration, config.quietExitMs);
});
test('absent or failing WAAPI cannot lock app', () => {
  assert.doesNotThrow(() => createLoaderMotion(null).dispose());
  assert.doesNotThrow(() => createLoaderMotion({ querySelector: () => ({}) }).dispose());
  const f = fixture({ throws: true }); assert.doesNotThrow(() => createLoaderMotion(f.root).dispose());
});
test('cancelled animation promise is handled', async () => {
  const f = fixture({ rejects: true }); createLoaderMotion(f.root).dispose(); await new Promise(r => setImmediate(r));
});
for (const [flag, reason] of [['skipped', 'skip'], ['failed', 'error'], ['hidden', 'background'], ['routeChanged', 'navigation']])
  test(`${reason} interrupts without waiting for animation`, () => assert.equal(loaderDecision({ elapsed: 10, [flag]: true }).reason, reason));
test('slow network is not declared ready by brand clock', () => assert.equal(loaderDecision({
  elapsed: config.brandMs, brandElapsed: config.brandMs, logoReady: true, ready: false,
}).exit, false));
test('maximum cover still releases missing image/page', () => assert.equal(loaderDecision({ elapsed: config.maxCoverMs }).reason, 'timeout'));
