import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isIntroRoute, shouldShowIntro, readSeen, writeSeen, loaderDecision } from '../frontend/src/experience/loader/loader.logic.mjs';
import { LOADER_CONFIG as config } from '../frontend/src/experience/loader/loader.config.mjs';
import { createLoaderMotion } from '../frontend/src/experience/loader/loaderMotion.mjs';
const ready = { elapsed: config.brandMs + 100, brandElapsed: config.brandMs + 100, ready: true, logoReady: true };
for (const path of ['/', '/story', '/story/', '/shop', '/shop/', '/products/apex-suspension'])
  test(`public entry permits intro: ${path}`, () => assert.equal(isIntroRoute(path), true));
for (const path of ['/account', '/bag', '/order-complete', '/admin', '/admin/experience', '/story/not-found', '/shopping', 'https://evil.test', null])
  test(`utility or invalid route does not start intro: ${path}`, () => assert.equal(isIntroRoute(path), false));
test('seen session does not replay intro', () => assert.equal(shouldShowIntro({ pathname: '/', seen: true }), false));
test('background entry does not animate', () => assert.equal(shouldShowIntro({ pathname: '/', hidden: true }), false));
test('feature can be disabled', () => assert.equal(shouldShowIntro({ enabled: false }), false));
test('first storefront visit starts', () => assert.equal(shouldShowIntro({ pathname: '/shop' }), true));
test('unknown storage safely defaults', () => assert.equal(readSeen(null), false));
test('storage denial does not throw', () => {
  const storage = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } };
  assert.equal(readSeen(storage), false); assert.equal(writeSeen(storage), false);
});
test('seen record is exact, isolated and versioned', () => {
  const map = new Map([['dth.commerce.bag.v1','KEEP']]);
  const storage = { getItem: k => map.get(k), setItem: (k,v) => map.set(k,v) };
  assert.equal(readSeen(storage), false); assert.equal(writeSeen(storage), true); assert.equal(readSeen(storage), true);
  assert.equal(map.get('dth.commerce.bag.v1'), 'KEEP');
});
test('ready page exits after the brand clock', () => assert.deepEqual(loaderDecision(ready), { exit:true,reason:'ready' }));
test('network is not simulated by the logo clock', () => assert.equal(loaderDecision({...ready, ready:false}).exit,false));
test('logo must decode before ordinary ready exit', () => assert.equal(loaderDecision({...ready,logoReady:false}).exit,false));
test('reduced motion does not require full brand sequence', () => assert.equal(loaderDecision({...ready, brandElapsed:0,reduced:true}).exit,true));
test('API error exits even during brand introduction', () => assert.equal(loaderDecision({elapsed:0,failed:true}).reason,'error'));
test('Skip does not wait for assets', () => assert.equal(loaderDecision({elapsed:0,skipped:true}).reason,'skip'));
test('background interrupts instead of replaying later', () => assert.equal(loaderDecision({hidden:true}).reason,'background'));
test('navigation bypasses the intro without redirect', () => assert.equal(loaderDecision({routeChanged:true}).reason,'navigation'));
test('timeout reveals existing app state even without catalog or logo', () => assert.equal(loaderDecision({elapsed:config.maxCoverMs}).reason,'timeout'));
test('waiting label reports real non-readiness', () => assert.equal(loaderDecision({elapsed:config.waitingLabelMs,ready:false}).reason,'waiting'));
test('invalid clock values never assert readiness', () => {
  for (const n of [NaN, Infinity, -100]) assert.equal(loaderDecision({...ready,elapsed:n,brandElapsed:n}).exit,false);
});
test('motion controller accepts missing animation API', () => {
  const root={querySelector:()=>({}),querySelectorAll:()=>[]};assert.doesNotThrow(()=>createLoaderMotion(root).dispose());
});
test('reduced introduction schedules zero decorative animations', () => {
  let count=0;const node={animate(){count++;return {cancel(){}}}};
  const root={querySelector:()=>node,querySelectorAll:()=>[node,node],animate:node.animate};
  createLoaderMotion(root,{reduced:true}).dispose();assert.equal(count,0);
});
test('cleanup cancels every animated node', () => {
  let made=0,cancelled=0;
  const node={animate(){made++;return {cancel(){cancelled++;}}}};
  const root={querySelector:()=>node,querySelectorAll:()=>[node,node],animate:node.animate};
  const controller=createLoaderMotion(root);controller.dispose();controller.dispose();assert.ok(made>0);assert.equal(cancelled,made);
});
test('original uploaded PNG remains byte-identical', async () => {
  const bytes=await readFile(new URL('../frontend/public/branding/dth-logo-original.png',import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'6a6360260306dc8688e2b8221b5b9838211961423e8dfccae7e615596e10c91e');
  assert.equal(bytes.readUInt32BE(16),1536);assert.equal(bytes.readUInt32BE(20),1024);
});
test('gate does not import a second GLB loader or video', async () => {
  const content=await readFile(new URL('../frontend/src/experience/loader/AppLoaderGate.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(content, /GLTFLoader|<video|\.mp4|setInterval/);
  assert.match(content,/inert=\{covered\}/);assert.match(content,/\{children\}/);
});
