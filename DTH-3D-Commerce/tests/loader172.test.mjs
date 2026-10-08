import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { nextLoaderCheckDelay } from '../frontend/src/experience/loader/loaderSchedule.mjs';
import { scheduleSceneRelease, SCENE_RELEASE_MS } from '../frontend/src/experience/loader/startup.logic.mjs';
import { loaderDecision, shouldShowIntro, readSeen, writeSeen } from '../frontend/src/experience/loader/loader.logic.mjs';

function clock({ raf = true, hidden = false } = {}) {
  let now = 0, id = 0; const jobs = new Map(), listeners = new Set();
  const doc = { hidden, addEventListener: (_, cb) => listeners.add(cb), removeEventListener: (_, cb) => listeners.delete(cb) };
  const host = { document: doc, setTimeout: (fn, ms) => { jobs.set(++id, { at: now + ms, fn }); return id; }, clearTimeout: id => jobs.delete(id) };
  if (raf) { host.requestAnimationFrame = fn => host.setTimeout(fn, 16); host.cancelAnimationFrame = host.clearTimeout; }
  return { host, jobs, listeners, advance(ms) {
    const end = now + ms; let steps = 0;
    while (true) {
      const first = [...jobs].sort((a, b) => a[1].at - b[1].at)[0];
      if (!first || first[1].at > end) break;
      if (++steps > 100) throw Error('timer loop');
      now = first[1].at; jobs.delete(first[0]); first[1].fn();
    } now = end;
  }, show() { doc.hidden = false; for (const f of [...listeners]) f(); } };
}
test('first check sleeps until real waiting deadline when logo is pending', () => assert.equal(nextLoaderCheckDelay(), 4800));
test('decoded logo wakes at brand completion', () => assert.equal(nextLoaderCheckDelay({ elapsed: 120, brandElapsed: 20, logoReady: true }), 2480));
test('ready-but-incomplete page sleeps until waiting/max milestones', () => {
  assert.equal(nextLoaderCheckDelay({ elapsed: 2500, brandElapsed: 2500, logoReady: true }), 2300);
  assert.equal(nextLoaderCheckDelay({ elapsed: 4800, logoReady: true, brandElapsed: 4800 }), 1700);
});
test('max cover takes precedence for late image', () => assert.equal(nextLoaderCheckDelay({ elapsed: 6300, logoReady: true }), 200));
test('reduced mode never waits for presentation when ready', () => {
  assert.equal(loaderDecision({ ready: true, logoReady: true, reduced: true }).exit, true);
  assert.equal(nextLoaderCheckDelay({ elapsed: 100, logoReady: true, reduced: true }), 4700);
});
for (const n of [NaN, Infinity, -50]) test(`bad clocks bounded ${String(n)}`, () => {
  const d = nextLoaderCheckDelay({ elapsed: n, brandElapsed: n, logoReady: true }); assert.ok(Number.isFinite(d) && d > 0);
});
test('past deadline does not schedule negative timer', () => assert.equal(nextLoaderCheckDelay({ elapsed: 8000 }), 1));
test('scene release waits then crosses two frame boundaries', () => {
  const c = clock(); let releases = 0;
  scheduleSceneRelease(() => releases++, c.host);
  c.advance(SCENE_RELEASE_MS + 31); assert.equal(releases, 0);
  c.advance(1); assert.equal(releases, 1); c.advance(1000); assert.equal(releases, 1);
  assert.equal(c.jobs.size, 0); assert.equal(c.listeners.size, 0);
});
test('cancel and StrictMode-style cleanup never release stale scene', () => {
  const c = clock(); let n = 0;
  const cancel = scheduleSceneRelease(() => n++, c.host); cancel(); cancel();
  const stop = scheduleSceneRelease(() => n++, c.host); c.advance(180); stop(); c.advance(1000);
  assert.equal(n, 0); assert.equal(c.jobs.size, 0); assert.equal(c.listeners.size, 0);
});
test('no requestAnimationFrame still releases', () => {
  const c = clock({ raf: false }); let n = 0; scheduleSceneRelease(() => n++, c.host); c.advance(180); assert.equal(n, 1);
});
test('throttled requestAnimationFrame has timeout fallback', () => {
  const c = clock({ raf: false }); c.host.requestAnimationFrame = () => 0; let n = 0;
  scheduleSceneRelease(() => n++, c.host); c.advance(430); assert.equal(n, 1);
});
test('hidden tab defers new scene until visible, without polling', () => {
  const c = clock({ hidden: true }); let n = 0;
  scheduleSceneRelease(() => n++, c.host); c.advance(5000); assert.equal(n, 0); assert.equal(c.jobs.size, 0);
  c.show(); c.advance(212); assert.equal(n, 1); assert.equal(c.listeners.size, 0);
});
test('tab hidden during frame handoff resumes safely', () => {
  const c = clock(); let n = 0;
  scheduleSceneRelease(() => n++, c.host); c.advance(180); c.host.document.hidden = true; c.advance(1000); assert.equal(n, 0);
  c.show(); c.advance(212); assert.equal(n, 1);
});
test('seen intro does not replay on navigation or reload', () => {
  const map = new Map([['dth.commerce.bag.v1', 'KEEP']]); const storage = { getItem: k => map.get(k), setItem: (k, v) => map.set(k, v) };
  writeSeen(storage); assert.equal(shouldShowIntro({ seen: readSeen(storage) }), false); assert.equal(map.get('dth.commerce.bag.v1'), 'KEEP');
});
const source = rel => readFile(new URL('../' + rel, import.meta.url), 'utf8');
test('Gate retains providers, readiness, keyboard, timeout and scope; only schedule/bootstrap changes', async () => {
  const s = await source('frontend/src/experience/loader/AppLoaderGate.jsx');
  for (const part of ['StartupCoverContext.Provider value={covered}', 'ready: catalog.ready && pageReady', 'inert={covered}', '{children}', "event.key === 'Escape'", 'nextLoaderCheckDelay', "reason.current = 'watchdog'", "exit('background', true)"])
    assert.ok(s.includes(part), part);
  assert.doesNotMatch(s, /setTimeout\(inspect, 50\)|<video|GLTFLoader|fetch\(/);
});
test('art direction contains exactly three static regions, no video or new renderer', async () => {
  const s = await source('frontend/src/experience/loader/AppLoader.jsx');
  assert.match(s, /REGIONS = \[/); assert.match(s, /entrance.current\?\.freeze/);
  assert.match(s, /elapsedMs: performance.now\(\) - origin.current/);
  assert.doesNotMatch(s, /<video|\.mp4|\.webm|fetch\(|new WebGL/);
});
test('new CSS has bounded paint and no blur/will-change blanket', async () => {
  const s = await source('frontend/src/experience/loader/AppLoader.module.css');
  assert.match(s, /contain:layout paint/); assert.doesNotMatch(s, /filter\s*:|backdrop-filter\s*:|will-change\s*:/);
});
for (const [file, needle] of [
  ['frontend/src/experience/home/CinematicHome.jsx', 'allow3D && !fallback && <SceneBoundary'],
  ['frontend/src/experience/story/StoryPage.jsx', "allow3D && status !== 'fallback' && <SceneBoundary"],
  ['frontend/src/shop/product/ProductMedia.jsx', 'const show = allow3D && request'],
  ['frontend/src/shop/Viewer3D.jsx', 'const { capable, allow3D } = useStartupWebGL(supports3D)'],
  ['frontend/src/shop/account/AccountVisual.jsx', 'startupAllowed&&visible&&capable&&!failed&&'],
  ['frontend/src/shop/home/sections/Hero/HeroSection.jsx', 'startupAllowed && !fallback && <StageBoundary'],
]) test(`renderer deferral wired: ${file}`, async () => assert.ok((await source(file)).includes(needle)));
