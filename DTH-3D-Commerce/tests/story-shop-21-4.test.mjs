import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { frame214, camera214, smooth214, clamp214, createStoryClock214, isStoryView214, setShopView214, returnToChapter214, chapterIndex214 } from '../frontend/src/shop/story214/story214.logic.mjs';
import { STORY214, QUALITY214, quality214 } from '../frontend/src/shop/story214/story214.config.mjs';
import { createByteCache214, disposeStoryAsset214 } from '../frontend/src/shop/story214/byteCache214.mjs';
const tick=()=>new Promise(r=>setImmediate(r));
const settings={scale:1,offset:[0,0,0],rotationDeg:[90,15,-8],camera:{yawDeg:16,pitchDeg:5,zoom:1},spin:{enabled:true,secondsPerTurn:32}};
const near=(a,b,eps=1e-4)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
test('Story is default, explicit old Grid/Wide/Compact bookmarks still work',()=>{
 assert.equal(isStoryView214(''),true);assert.equal(isStoryView214('mode=shop&fit=match'),true);
 for(const l of ['grid','wide','compact'])assert.equal(isStoryView214('layout='+l),false);
 assert.equal(isStoryView214('layout=grid&view=story'),true);assert.equal(isStoryView214('view=grid'),false);
});
test('view switch preserves catalog filters and does not mutate input',()=>{
 const p=new URLSearchParams('q=shock&category=suspension&max=9000000&fit=match&sort=name&layout=wide&page=3');
 const before=p.toString(),s=setShopView214(p,'story');assert.equal(p.toString(),before);
 for(const k of ['q','category','max','fit','sort'])assert.equal(s.get(k),p.get(k));assert.equal(s.has('page'),false);assert.equal(s.has('layout'),false);assert.equal(s.get('view'),'story');
 const grid=setShopView214(s,'grid');assert.equal(grid.get('layout'),'grid');assert.throws(()=>setShopView214(p,'unknown'));
});
test('return link retains product/category context, never changes origin',()=>{
 const href=returnToChapter214('mode=shop&category=suspension&fit=match','x1r-red');assert.match(href,/^\/shop\?/);assert.match(href,/chapter=x1r-red/);assert.match(href,/category=suspension/);
 assert.doesNotMatch(returnToChapter214('', 'https://bad.test'),/bad\.test/);
});
test('zero and one product have safe stable positions',()=>{
 assert.equal(frame214(0,0).primary,-1);assert.equal(frame214(99,1).left,0);assert.equal(frame214(99,1).right,0);assert.equal(frame214(99,1).mix,0);
});
test('position is bounded and finite',()=>{for(const value of [NaN,Infinity,-Infinity,-100,100]){const f=frame214(value,5);assert.ok(f.position>=0&&f.position<=4);}});
test('chapter begins with hero, holds, then outgoing/incoming cross',()=>{
 assert.equal(frame214(.4,5).mix,0);assert.ok(frame214(.8,5).mix>.5);assert.equal(frame214(.96,5).mix,1);assert.equal(frame214(1,5).primary,1);
});
test('reverse scroll reproduces the same frames exactly',()=>{
 const positions=Array.from({length:301},(_,i)=>i/100),forward=positions.map(p=>frame214(p,4));
 for(let i=positions.length-1;i>=0;i--)assert.deepEqual(frame214(positions[i],4),forward[i]);
});
test('frame exposes at most two neighboring models',()=>{
 for(let x=0;x<=19;x+=.01){const f=frame214(x,20);assert.ok(f.right-f.left<=1);assert.ok(f.primary===f.left||f.primary===f.right);}
});
test('reduced/paused motion keeps a single static chapter pose',()=>{
 for(let x=0;x<5;x+=.05){const f=frame214(x,5,false);assert.equal(f.left,f.right);assert.equal(f.mix,0);assert.equal(f.hold,0);}
});
test('scroll easing is monotonic, bounded and reversible',()=>{
 let last=0;for(let n=0;n<=100;n++){const x=smooth214(.58,.96,n/100);assert.ok(x>=last&&x<=1);last=x;}
 assert.equal(clamp214(NaN,0,1),0);
});
test('camera remains continuous at chapter boundaries for different products',()=>{
 const b={...settings,scale:1.25,offset:[.2,.1,-.1],camera:{yawDeg:-150,pitchDeg:30,zoom:.8}};
 const c={...settings,scale:.75,camera:{yawDeg:100,pitchDeg:-25,zoom:1.25}};
 const before=camera214(frame214(1-1e-8,3),settings,b,800,650),after=camera214(frame214(1,3),b,c,800,650);
 before.position.forEach((v,i)=>near(v,after.position[i],1e-5));
});
test('camera reverse path is exact and never alters authored orientation',()=>{
 const original=JSON.stringify(settings),p=.78;
 const before=camera214(frame214(p,4),settings,settings,800,650);
 camera214(frame214(2.2,4),settings,settings,800,650);
 assert.deepEqual(camera214(frame214(p,4),settings,settings,800,650),before);assert.equal(JSON.stringify(settings),original);
});
test('saved scale is not cancelled by automatic camera fitting',()=>{const a=camera214(frame214(0,1),settings,settings,800,650,false);const b=camera214(frame214(0,1),{...settings,scale:1.15},{...settings,scale:1.15},800,650,false);a.position.forEach((v,i)=>near(v,b.position[i]));});
test('camera safely handles narrow aspect ratio and zoom',()=>{
 for(const [w,h] of [[360,320],[1280,720],[1,1],[2000,500]]){const p=camera214(frame214(.7,3),settings,settings,w,h);assert.ok(p.position.every(Number.isFinite));assert.ok(Math.hypot(...p.position)>p.envelope);}
});
test('Ultra desktop / High compact have finite immutable budgets, not unbounded rendering',()=>{
 assert.equal(quality214(false),QUALITY214.ultra);assert.equal(quality214(true),QUALITY214.high);assert.equal(QUALITY214.ultra.dpr,2);
 assert.equal(QUALITY214.ultra.bytes,128*1048576);assert.ok(Object.isFrozen(QUALITY214.ultra));assert.equal(STORY214.maxConcurrentDownloads,1);
});
test('clock notifies, unsubscribes and has no time accumulator',()=>{
 const c=createStoryClock214(3),seen=[];const off=c.subscribe(v=>seen.push(v));c.set(.3);c.set(.8);c.set(.3);assert.deepEqual(seen[0],seen[2]);off();c.set(1);assert.equal(seen.length,3);c.clear();assert.equal(c.subscriberCount,0);
});
test('chapter return selects existing ID or safe first item',()=>{const ps=[{id:'a'},{id:'b'}];assert.equal(chapterIndex214(ps,'b'),1);assert.equal(chapterIndex214(ps,'missing'),0);});
test('byte cache reuses bytes without another fetch',async()=>{
 let calls=0;const c=createByteCache214({load:async()=>{calls++;return new Uint8Array(8);}});const a=await c.get('a'),b=await c.get('a');assert.equal(a,b);assert.equal(calls,1);c.close();
});
test('byte cache shares concurrent identical requests',async()=>{
 let calls=0,done;const c=createByteCache214({load:()=>{calls++;return new Promise(r=>done=r);}});const a=c.get('a'),b=c.get('a');await tick();done(new Uint8Array(4));await Promise.all([a,b]);assert.equal(calls,1);c.close();
});
test('downloads are serialized, and failures do not block the next request',async()=>{
 const order=[];let done;const c=createByteCache214({load:async k=>{order.push(k);if(k==='a')await new Promise(r=>done=r);if(k==='b')throw new Error('missing');return new Uint8Array(2);}});
 const a=c.get('a'),b=c.get('b').catch(e=>e.message),d=c.get('d');await tick();assert.deepEqual(order,['a']);done();await a;assert.equal(await b,'missing');await d;assert.deepEqual(order,['a','b','d']);c.close();
});
test('abort one waiter does not abort another waiter for the same asset',async()=>{
 let finish,aborted=false;const c=createByteCache214({load:async(k,s)=>{s.addEventListener('abort',()=>aborted=true);return new Promise(r=>finish=r);}}),controller=new AbortController();
 const a=c.get('a',{signal:controller.signal}).catch(e=>e.name),b=c.get('a');await tick();controller.abort();assert.equal(await a,'AbortError');assert.equal(aborted,false);finish(new Uint8Array(2));await b;c.close();
});
test('aborting last waiter cancels a network request',async()=>{
 let aborted=false;const c=createByteCache214({load:(k,s)=>new Promise((r,j)=>s.addEventListener('abort',()=>{aborted=true;j(Object.assign(new Error(),{name:'AbortError'}));}))}),ctrl=new AbortController();
 const a=c.get('a',{signal:ctrl.signal}).catch(e=>e.name);await tick();ctrl.abort();assert.equal(await a,'AbortError');assert.equal(aborted,true);c.close();
});
test('queued request cancelled before start is not fetched',async()=>{
 let finish;const order=[];const c=createByteCache214({load:async k=>{order.push(k);if(k==='a')await new Promise(r=>finish=r);return new Uint8Array(2);}}),ctrl=new AbortController();
 const a=c.get('a'),b=c.get('b',{signal:ctrl.signal}).catch(e=>e.name);await tick();ctrl.abort();assert.equal(await b,'AbortError');finish();await a;await tick();assert.deepEqual(order,['a']);c.close();
});
test('raw byte LRU respects entry count and memory cap',async()=>{
 const c=createByteCache214({load:async()=>new Uint8Array(6),maxBytes:12,maxEntries:2});for(const k of ['a','b','c','d'])await c.get(k);assert.equal(c.stats().entries,2);assert.equal(c.stats().bytes,12);c.close();assert.equal(c.stats().bytes,0);
});
test('oversize single asset is returned but not retained by raw cache',async()=>{const c=createByteCache214({load:async()=>new Uint8Array(20),maxBytes:10});assert.equal((await c.get('large')).byteLength,20);assert.equal(c.stats().entries,0);c.close();});
test('closed cache refuses requests and does not retain bytes',async()=>{const c=createByteCache214({load:async()=>new Uint8Array(1)});c.close();await assert.rejects(c.get('x'),{name:'AbortError'});});
test('retry invalidates only the selected cache entry',async()=>{const c=createByteCache214({load:async()=>new Uint8Array(3)});await c.get('a');await c.get('b');c.invalidate('a');assert.equal(c.stats().entries,1);assert.equal(c.stats().bytes,3);c.close();});
test('invalid cache budgets fail explicitly',()=>{for(const v of [0,-1,NaN])assert.throws(()=>createByteCache214({load:()=>{},concurrency:v}));});
test('disposal deduplicates resources and closes embedded images once',()=>{
 const calls={g:0,m:0,t:0,i:0},image={close(){calls.i++;}},t={isTexture:true,image,dispose(){calls.t++;}},m={map:t,normalMap:t,dispose(){calls.m++;}},g={dispose(){calls.g++;}},scene={traverse(fn){fn({geometry:g,material:m});fn({geometry:g,material:[m]});}};
 disposeStoryAsset214({scene});assert.deepEqual(calls,{g:1,m:1,t:1,i:1});
});
const read=file=>readFile(new URL('../frontend/src/shop/story214/'+file,import.meta.url),'utf8');
test('scene uses one Canvas and preserves materials and geometry',async()=>{
 const s=await read('StoryScene214.jsx');assert.equal((s.match(/<Canvas\b/g)||[]).length,1);
 for(const forbidden of ['toNonIndexed(','.decimate(','.metalness =','.roughness =','.color.set(','ProductImage','useGLTF('])assert.ok(!s.includes(forbidden),forbidden);
 assert.match(s,/inspectGLB\(bytes,limits\)/);assert.match(s,/inspectProductGeometry\(parsed.scene,limits\)/);
});
test('loader forbids external resources and never calls Meshy',async()=>{const s=await read('StoryScene214.jsx');assert.match(s,/External model resources are not allowed/);assert.doesNotMatch(s,/api\.meshy|MESHY_API_KEY/);});
test('camera is scroll-driven, not a drifting auto-rotate loop',async()=>{const s=await read('StoryScene214.jsx');assert.doesNotMatch(s,/rotation\.y\s*\+=|elapsedTime|getElapsedTime|autoRotate\s*=\s*true/);assert.match(s,/clock\.subscribe/);});
test('scroll hook cleans up its context and never hijacks wheel events',async()=>{const s=await read('useStoryScroll214.js');assert.match(s,/scrub:motion\?STORY214.scrubSeconds:true/);assert.match(s,/ctx\?\.revert\(\)/);assert.doesNotMatch(s,/preventDefault|ScrollTrigger\.getAll|killAll|addEventListener\(['"]wheel/);});
test('Story UI only reads commerce data and keeps detail links',async()=>{const s=await read('ShopStoryPage214.jsx');assert.match(s,/selectShopProducts/);assert.match(s,/productHref21/);assert.match(s,/state=\{\{fromShop\}\}/);assert.doesNotMatch(s,/studioRequest|method:\s*['"](?:POST|PUT|DELETE)|createJob|<img\b|ProductImage/);});
test('English UI has no technical lighting controls',async()=>{const s=await read('ShopStoryPage214.jsx');assert.doesNotMatch(s,/Studio Lighting|setExposure|metalness|roughness/);assert.match(s,/View details/);assert.match(s,/Jump to product/);});
