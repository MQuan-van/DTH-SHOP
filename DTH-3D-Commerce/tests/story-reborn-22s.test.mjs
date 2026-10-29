import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STORY22S, clamp22S, sampleStudy22S, photo22S, validId22S, localModel22S, selectStoryProduct22S, productLink22S, createStoryDirector22S, studyPose22S } from '../frontend/src/experience/story22s/story22s.logic.mjs';

const product = (id, rest = {}) => ({ id, slug: id, name: id, modelUrl: `/models/ai-products/${id}.glb`, active: true, ...rest });
const base = new URL('../frontend/src/experience/story22s/', import.meta.url);
const read = file => fs.readFileSync(new URL(file, base), 'utf8');

test('configuration and asset lists are immutable', () => {
  assert.ok(Object.isFrozen(STORY22S)); assert.ok(Object.isFrozen(STORY22S.preferredProducts)); assert.ok(Object.isFrozen(STORY22S.photoNames));
});
test('selection prefers published X1R GTR without mutating the catalog', () => {
  const products = [product('apex-suspension'), product('x1r-red'), product('x1r-gtr')], before = JSON.stringify(products);
  assert.equal(selectStoryProduct22S(products).id, 'x1r-gtr'); assert.equal(JSON.stringify(products), before);
});
test('hidden and external assets are never selected', () => {
  assert.equal(selectStoryProduct22S([product('x1r-gtr', { active: false }), product('x1r-red', { modelUrl: 'https://example.com/a.glb' }), product('other')]).id, 'other');
});
test('selection supports missing preferred products and empty catalogs', () => {
  assert.equal(selectStoryProduct22S([product('other'), product('featured', { featured: true })]).id, 'featured');
  for (const list of [[], undefined, null, {}, [null, product('hidden', { active: false })]]) assert.equal(selectStoryProduct22S(list), null);
});
test('product links cannot escape to external destinations', () => {
  assert.equal(productLink22S(product('x1r-gtr')), '/products/x1r-gtr');
  assert.equal(productLink22S(product('x1r-gtr', { slug: '//evil.test' })), '/products/x1r-gtr');
  assert.equal(productLink22S({ id: '<script>', slug: 'https://evil.test' }), '/shop');
});
test('unsafe ids and nonlocal model paths are rejected', () => {
  for (const id of ['', '../a', 'A', 'a_b', '__proto__', null, 'a'.repeat(101)]) assert.equal(validId22S(id), false);
  for (const url of ['', '//host/x.glb', '/models/../x.glb', '/models/x.glb?token=secret', '/api/model', 'data:x']) assert.equal(localModel22S(url), false);
  assert.equal(localModel22S('/models/ai-products/a-b.glb?v=abc'), true);
});
test('photo paths only reference the two existing user photos', () => {
  for (const name of ['crew', 'lineup']) {
    assert.equal(photo22S(name).src, `/story/ride-journal/${name}-1536.webp`);
    assert.match(photo22S(name).srcSet, /768w,.*1536w/);
  }
  assert.equal(photo22S('../file').src, photo22S('lineup').src);
});
test('progress clamps invalid values', () => {
  for (const value of [NaN, Infinity, -1, undefined, '0.4']) assert.equal(clamp22S(value), 0);
  assert.equal(clamp22S(2), 1);
});
test('first and last study poses have actual hold ranges', () => {
  const first = sampleStudy22S(0), opening = sampleStudy22S(0.15), last = sampleStudy22S(1), closing = sampleStudy22S(0.83);
  for (const key of ['yawOffset','pitchOffset','distanceFactor','targetY']) {
    assert.equal(first[key], opening[key]); assert.equal(last[key], closing[key]);
  }
});
test('every transition remains finite and text does not disappear in the crossover', () => {
  for (let i = 0; i <= 200; i++) {
    const p = sampleStudy22S(i / 200);
    for (const [key, value] of Object.entries(p)) if (typeof value === 'number') assert.ok(Number.isFinite(value), key);
    assert.ok(Math.abs(p.formAlpha + p.detailAlpha - 1) < 1e-12);
  }
});
test('scroll reversal produces identical camera coordinates', () => {
  const front = { position: [1.2, .4, 6], target: [0, 0, 0] };
  const descending = Array.from({ length: 101 }, (_, i) => studyPose22S(front, 6, i / 100));
  const ascending = Array.from({ length: 101 }, (_, i) => studyPose22S(front, 6, 1 - i / 100)).reverse();
  for (let i = 0; i <= 100; i++) descending[i].position.forEach((n, k) => assert.ok(Math.abs(n - ascending[i].position[k]) < 1e-10));
});
test('camera poses never mutate saved camera arrays', () => {
  const front = { position: [1, 2, 6], target: [0, .1, 0] }, before = JSON.stringify(front);
  studyPose22S(front, 6, .5); assert.equal(JSON.stringify(front), before);
});
test('reduced-motion keeps a fixed camera at all scroll positions', () => {
  const front = { position: [1, .3, 6], target: [0, 0, 0] };
  assert.deepEqual(studyPose22S(front, 6, 0, false), studyPose22S(front, 6, 1, false));
});
test('invalid camera input remains finite', () => {
  for (const value of [undefined, {}, { position: [NaN, Infinity, 0], target: [0, undefined, 0] }]) {
    const pose = studyPose22S(value, NaN, Infinity);
    assert.ok([...pose.position, ...pose.target].every(Number.isFinite));
  }
});
test('director notifies only on changes and subscriptions are removable', () => {
  const director = createStoryDirector22S(); let calls = 0;
  const off = director.subscribe(() => calls++);
  director.set({ progress: 0 }); director.set({ progress: .2 }); director.set({ progress: .2 });
  assert.equal(calls, 1); off(); director.set({ progress: .3 }); assert.equal(calls, 1); assert.equal(director.listenerCount, 0);
});
test('director keeps boolean gates typed and clamps progress', () => {
  const director = createStoryDirector22S(); director.set({ active: 'yes', motion: null, blocked: true, progress: 10, stranger: 1 });
  assert.equal(director.state.active, false); assert.equal(director.state.motion, true); assert.equal(director.state.blocked, true);
  assert.equal(director.state.progress, 1); assert.equal(director.state.stranger, undefined);
});
test('new Story components contain no decorative directional arrow glyphs', () => {
  for (const name of ['StoryReborn22S.jsx', 'StoryPhoto22S.jsx', 'StoryStudyScene22S.jsx', 'story22s.css']) assert.doesNotMatch(read(name), /[←→↑↓↗↘↙↖➜➝➞➤]/u, name);
});
test('Story keeps first-visit tracking, normal links and the product route', () => {
  const source = read('StoryReborn22S.jsx');
  assert.match(source, /visitStory\(MODE, store\.user\.id\)/);
  assert.match(source, /productLink22S\(product\)/);
  assert.match(source, /Skip story/); assert.match(source, /to="\/"/);
  assert.doesNotMatch(source, /fetch\(|studioRequest\(|localStorage\.|password|MESHY_API_KEY/);
});
test('scene uses the validated product loader and saved presentation without remeshing', () => {
  const source = read('StoryStudyScene22S.jsx');
  assert.match(source, /useProfiledModel\(product, selection, onError\)/);
  assert.match(source, /getPresentation21\(product\)/);
  assert.match(source, /frameloop="demand"/);
  assert.doesNotMatch(source, /useOwnedModel|\.material\.color|roughness\s*=|simplify|decimate|new THREE\.WebGPURenderer|requestAnimationFrame/);
});
test('motion is locally scoped, reversible and cleans observers', () => {
  const source = read('useStoryMotion22S.js');
  assert.match(source, /gsap\.context/); assert.match(source, /ctx\?\.revert\(\)/);
  assert.match(source, /resizeObserver\?\.disconnect\(\)/);
  assert.match(source, /cancelAnimationFrame\(refreshFrame\)/);
  assert.doesNotMatch(source, /\.killAll\s*\(|getAll\(\)|addEventListener\(['"]wheel|preventDefault\(|pin:\s*true/);
});
test('CSS does not target Admin or other storefront components', () => {
  const source = read('story22s.css');
  assert.doesNotMatch(source, /\.dth-admin|\.dth-product|\.dth-story214/);
  assert.match(source, /:has\(\.dth-story22s\)/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /focus-visible/);
});
test('three-dimensional diagnostics do not expose fake loader percentages', () => {
  const source = read('StoryStudyScene22S.jsx');
  assert.match(source, /onAfterRender/); assert.match(source, /Retry 3D/);
  assert.doesNotMatch(source, /Math\.random|setInterval|Loading 100%/);
});
