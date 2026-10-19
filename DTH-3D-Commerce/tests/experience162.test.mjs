import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { entranceDecision, safeJourneyReturn, signInDestination, storyVisited, visitStory, forgetStory } from '../frontend/src/experience/journey/journey.logic.mjs';
import { routeKey, shouldTransition, animatePage, TRANSITION } from '../frontend/src/experience/journey/transition.logic.mjs';
import { JOURNAL_SHOTS, shotFor, clampParallax } from '../frontend/src/experience/story/journal/journal.logic.mjs';
const storage = () => { const data = new Map(); return { getItem: k => data.get(k), setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k), data }; };
const account = { id:'entry-test' };
for (const [name, input, expected] of [
  ['loading is not signed out',{loading:true},'pending'],
  ['session error shows retry/account instead of Home',{error:'offline',user:account},'account'],
  ['visitor sees Login',{user:null},'account'],
  ['preview never invents authenticated users',{mode:'preview',user:account},'account'],
  ['first authenticated entrance is Story',{user:account},'story'],
  ['visited authenticated entrance is Home',{user:account,visited:true},'home'],
]) test(name,()=>assert.equal(entranceDecision(input),expected));
for (const p of ['/bag','/checkout','/shop','/products/apex-suspension']) test(`keep explicit purchase return ${p}`,()=>{
  assert.equal(safeJourneyReturn(p),p); assert.equal(signInDestination(p,'api',account,storage()),p);
});
for (const p of [null,{},'/','/account','//evil.test','https://evil.test','javascript:alert(1)','/\\evil.test','/products/../admin','/shop?return=evil','/admin','/products/X','/products/'+'x'.repeat(190)])
  test(`reject untrusted/default destination ${JSON.stringify(p)}`,()=>assert.equal(safeJourneyReturn(p),''));
test('first login goes to Story, subsequent visit goes to Home',()=>{
  const s=storage(),u={id:'flow-return-1'};
  assert.equal(signInDestination(null,'flow',u,s),'/story?intro=1');
  visitStory('flow',u.id,s);assert.equal(signInDestination(null,'flow',u,s),'/');
  forgetStory('flow',u.id,s);assert.equal(storyVisited('flow',u.id,s),false);
});
test('visit markers are isolated between accounts and modes',()=>{
  const s=storage();visitStory('api','member-A',s);
  assert.equal(storyVisited('api','member-A',s),true);assert.equal(storyVisited('api','member-B',s),false);
  assert.equal(storyVisited('flow','member-A',s),false);
});
test('denied browser storage uses document memory, never throws',()=>{
  const s={getItem(){throw Error('denied')},setItem(){throw Error('denied')},removeItem(){throw Error('denied')}};
  assert.equal(storyVisited('api','denied-account',s),false);visitStory('api','denied-account',s);
  assert.equal(storyVisited('api','denied-account',s),true);forgetStory('api','denied-account',s);
  assert.equal(storyVisited('api','denied-account',s),false);
});
test('anonymous Story cannot mark another identity',()=>{
  const s=storage();assert.equal(visitStory('api','',s),false);assert.equal(s.data.size,0);
});
test('marking Story does not touch cart, auth or intro keys',()=>{
  const s=storage();s.setItem('dth.commerce.bag.v1','KEEP');s.setItem('dth.ignition.seen.v1','1');
  visitStory('api','isolated-keys',s);forgetStory('api','isolated-keys',s);
  assert.equal(s.getItem('dth.commerce.bag.v1'),'KEEP');assert.equal(s.getItem('dth.ignition.seen.v1'),'1');
});
test('shop filters do not start a page transition',()=>{
  assert.equal(routeKey({pathname:'/shop',search:'?q=apex'}),routeKey({pathname:'/shop',search:'?q=coil&page=2'}));
});
test('account tabs/order details do receive page transitions, search does not',()=>{
  assert.notEqual(routeKey({pathname:'/account',search:'?view=orders'}),routeKey({pathname:'/account',search:'?view=vehicle'}));
  assert.notEqual(routeKey({pathname:'/account',search:'?view=orders&order=DTH-A'}),routeKey({pathname:'/account',search:'?view=orders&order=DTH-B'}));
  assert.equal(routeKey({pathname:'/account',search:'?view=orders&q=a'}),routeKey({pathname:'/account',search:'?view=orders&q=b'}));
});
const navigation={from:{pathname:'/'},to:{pathname:'/story'}};
test('ordinary Story navigation animates',()=>assert.equal(shouldTransition(navigation),true));
for (const reason of ['reduced','hidden','covered','identityChanged']) test(`${reason} bypasses outgoing hold`,()=>assert.equal(shouldTransition({...navigation,[reason]:true}),false));
for (const path of ['/checkout','/bag','/order-complete','/admin','/admin/experience']) test(`${path} is never delayed by exit animation`,()=>{
  assert.equal(shouldTransition({...navigation,to:{pathname:path}}),false);
  assert.equal(shouldTransition({...navigation,from:{pathname:path}}),false);
});
test('animation is finite and cancelled explicitly',()=>{
  let count=0;const calls=[];
  const node={animate:(frames,options)=>{calls.push({frames,options});return{finished:Promise.resolve(),cancel(){count++}}}};
  animatePage(node,false,TRANSITION.outMs).cancel();animatePage(node,true,TRANSITION.inMs).cancel();
  assert.equal(count,2);assert.ok(calls.every(c=>c.options.iterations===1&&c.options.fill==='none'));
});
test('missing/broken WAAPI is a usable static fallback',()=>{
  assert.doesNotThrow(()=>animatePage(null,true,100).cancel());
  assert.doesNotThrow(()=>animatePage({},true,100).cancel());
  assert.doesNotThrow(()=>animatePage({animate(){throw Error('unsupported')}},true,100).cancel());
});
test('parallax is bounded to 18 pixels and invalid inputs are static',()=>{
  assert.equal(clampParallax(-5000,900),18);assert.equal(clampParallax(5000,900),-18);
  assert.equal(clampParallax(450,900),0);assert.equal(clampParallax(NaN,900),0);assert.equal(clampParallax(0,0),0);
});
test('photo presets have no inferred vehicle generation labels',()=>{
  assert.equal(JOURNAL_SHOTS.length,3);assert.ok(JOURNAL_SHOTS.every(s=>!/(V1|V2|V3)/.test(s.label)));
  assert.equal(shotFor('unknown').id,'crew');
});
test('responsive images are actual RIFF/WEBP files',async()=>{
  for(const name of ['crew','lineup']) for(const width of [768,1536]){
    const b=await readFile(new URL(`../frontend/public/story/ride-journal/${name}-${width}.webp`,import.meta.url));
    assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.ok(b.length>1000);
  }
});
test('entry waits for loader release before redirect and respects session failures',async()=>{
  const s=await readFile(new URL('../frontend/src/experience/journey/StudioEntry.jsx',import.meta.url),'utf8');
  assert.match(s,/!covered && decision === 'story'/);assert.match(s,/error: store.authError/);
  assert.doesNotMatch(s,/setUser\(|fetch\(|setTimeout\(/);
});
test('route animation owns no data fetch or outer provider remount',async()=>{
  const s=await readFile(new URL('../frontend/src/experience/journey/TransitionRoutes.jsx',import.meta.url),'utf8');
  assert.match(s,/<Routes location=\{shown\}/);assert.match(s,/clearTimeout/);assert.match(s,/main.inert = oldInert/);
  assert.doesNotMatch(s,/<StoreProvider|fetch\(|innerHTML|cloneNode|startViewTransition/);
});
test('Story uses original photo source names and exposes a real Home link',async()=>{
  const s=await readFile(new URL('../frontend/src/experience/story/journal/StoryEditorial.jsx',import.meta.url),'utf8');
  assert.match(s,/to="\/" className=\{styles.enter\}/);assert.match(s,/\{children\}/);assert.match(s,/aria-pressed/);
  assert.doesNotMatch(s,/<video|\.mp4|new Canvas|WebGLRenderer/);
});
