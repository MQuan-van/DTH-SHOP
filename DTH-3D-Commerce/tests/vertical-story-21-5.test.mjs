// DTH21.5.1: patched
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { frame214, createStoryClock214 } from '../frontend/src/shop/story214/story214.logic.mjs';
import { verticalCamera215, verticalPlacement215, copyMotion215, railProgress215, trail215, categoryWord215, atmosphere215 } from '../frontend/src/shop/story214/verticalMotion215.mjs';
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
const sample=p=>{const f=frame214(p,4);return {f,pose:verticalCamera215(f,null,null,960,620)}};
test('screen-up is normalized and perpendicular to camera-right and view',()=>{
  for(const yaw of [-170,-55,0,95,180])for(const pitch of [-60,0,60]){
    const s={camera:{yawDeg:yaw,pitchDeg:pitch,zoom:1},scale:1,offset:[0,0,0]};
    const p=verticalCamera215(frame214(.3,3),s,s,1000,600);
    near(Math.hypot(...p.up),1);near(dot(p.up,p.right),0);near(dot(p.up,p.position),0);
  }
});
test('outgoing moves DOWN in screen space, never sideways',()=>{
  const {f,pose}=sample(.76),p=verticalPlacement215(f,f.left,pose);
  assert.equal(p.visible,true);assert.ok(dot(p.position,pose.up)<0);near(dot(p.position,pose.right),0);
});
test('incoming arrives from ABOVE',()=>{
  const {f,pose}=sample(.76),p=verticalPlacement215(f,f.right,pose);
  assert.equal(p.visible,true);assert.ok(dot(p.position,pose.up)>0);near(dot(p.position,pose.right),0);
});
test('all scroll positions have deterministic reversible placements',()=>{
  const positions=Array.from({length:201},(_,i)=>3*i/200);
  const run=arr=>new Map(arr.map(p=>{const {f,pose}=sample(p);return[p,JSON.stringify([pose,verticalPlacement215(f,f.left,pose),copyMotion215(f,f.left),atmosphere215(f,[{category:'suspension'},{category:'wheels'},{category:'brakes'},{}])])]}));
  const a=run(positions),b=run([...positions].reverse());for(const[p,v]of a)assert.equal(b.get(p),v);
});
test('no sideways drift across saved camera yaw angles',()=>{
  for(let i=0;i<50;i++){const f=frame214(.6+i*.007,3),p=verticalCamera215(f,{camera:{yawDeg:i*7}},{camera:{yawDeg:-i}},600,900);for(const n of [f.left,f.right])near(dot(verticalPlacement215(f,n,p).position,p.right),0);}
});
test('model at a resting chapter is centered at original scale',()=>{
  const {f,pose}=sample(1),p=verticalPlacement215(f,1,pose);p.position.forEach(v=>near(v,0));near(p.scale,1);assert.equal(p.visible,true);
});
test('off-pair product is hidden',()=>{const{f,pose}=sample(.75);assert.equal(verticalPlacement215(f,3,pose).visible,false);});
test('text directions match model travel',()=>{const{f}=sample(.76);assert.ok(copyMotion215(f,0).y>0);assert.ok(copyMotion215(f,1).y<0);});
test('text crossfades without a mid-transition blank',()=>{const f={left:0,right:1,primary:1,mix:.5};assert.ok(copyMotion215(f,0).opacity>.35);assert.ok(copyMotion215(f,1).opacity>.35);});
test('only active chapter CTA can receive clicks',()=>{const f={left:0,right:1,primary:1,mix:.53};assert.equal(copyMotion215(f,0).active,false);assert.equal(copyMotion215(f,1).active,true);});
test('text endpoints have only one active product',()=>{for(const p of [0,1,2]){const f=frame214(p,3);for(let i=0;i<3;i++)assert.equal(copyMotion215(f,i).active,i===f.primary);}});
test('reduced motion has no transitional displacement',()=>{const f=frame214(.9,3,false),p=verticalCamera215(f,null,null,600,800,false);assert.equal(copyMotion215(f,f.primary,false).y,0);verticalPlacement215(f,f.primary,p).position.forEach(v=>near(v,0));});
test('rail progress is bounded and handles empty/single categories',()=>{assert.equal(railProgress215(-2,3),0);assert.equal(railProgress215(10,3),1);assert.equal(railProgress215(.3,1),.5);assert.equal(railProgress215(0,0),0);near(railProgress215(1,3),.5);});
test('rail stops at the same coordinate for repeated identical input',()=>{for(let i=0;i<40;i++)assert.deepEqual(trail215(.43,1000),trail215(.43,1000));});
test('glow never runs ahead of the scroll head',()=>{for(let i=0;i<=100;i++){const s=trail215(i/100,1000);assert.ok(s.start>=0);near(s.start+s.span,s.end);near(s.coreStart+s.core,s.end);assert.ok(s.end<=1000);}});
test('rail reversal is exact',()=>{const p=[0,.3,.7,1];assert.deepEqual(p.map(v=>trail215(v,900)),p.slice().reverse().map(v=>trail215(v,900)).reverse());});
test('malformed rail length never produces NaN',()=>{for(const n of [NaN,0,-100,undefined])for(const p of [NaN,Infinity,-1,5])assert.ok(Object.values(trail215(p,n)).every(Number.isFinite));});
test('category words are labels, not hardcoded product IDs',()=>{assert.equal(categoryWord215({category:'suspension'}),'SUSPENSION');assert.equal(categoryWord215({category:'wheels'}),'WHEELS');assert.equal(categoryWord215(null),'PARTS');});
test('same category watermark stays single during transition',()=>{const s=atmosphere215(frame214(.75,2),[{category:'suspension'},{category:'suspension'}]);assert.equal(s.firstOpacity,1);assert.equal(s.secondOpacity,0);});
test('different category watermark transitions without modifying product data',()=>{const products=[{category:'suspension'},{category:'wheels'}],before=JSON.stringify(products);const s=atmosphere215(frame214(.9,2),products);assert.equal(s.first,'SUSPENSION');assert.equal(s.second,'WHEELS');assert.equal(JSON.stringify(products),before);});
test('clock subscriptions can be cleaned up',()=>{const c=createStoryClock214(3);let n=0;const off=c.subscribe(()=>n++);c.set(.2);off();c.set(.7);assert.equal(n,1);assert.equal(c.subscriberCount,0);});
test('render patch keeps one canvas and native validated GLB loading',()=>{
 const s=fs.readFileSync(new URL('../frontend/src/shop/story214/StoryScene214.jsx',import.meta.url),'utf8');
 assert.equal((s.match(/<Canvas\b/g)||[]).length,1);assert.ok(s.includes('inspectGLB(bytes,limits)'));assert.ok(s.includes('inspectProductGeometry(parsed.scene,limits)'));assert.ok(s.includes('verticalPlacement215'));
 assert.ok(s.includes('THREE.NeutralToneMapping'));assert.ok(!s.includes('group.position.set(pose.right'));
});
test('CSS is Story-scoped with white base and vertical fading mask',()=>{
 const s=fs.readFileSync(new URL('../frontend/src/shop/story214/vertical215.css',import.meta.url),'utf8');
 assert.match(s,/data-story-skin="vertical-215"/);assert.match(s,/background:#fff/);assert.match(s,/mask-image:linear-gradient\(to bottom/);assert.match(s,/overflow-y:visible/);assert.doesNotMatch(s,/@keyframes|animation:.*infinite/);
});
test('atmosphere has cleanup, no free-running animation or network calls',()=>{
 const s=fs.readFileSync(new URL('../frontend/src/shop/story214/StoryAtmosphere215.jsx',import.meta.url),'utf8');
 assert.match(s,/const unsubscribe = clock.subscribe\(paint\)/);assert.match(s,/aria-hidden="true"/);assert.doesNotMatch(s,/requestAnimationFrame|setInterval|fetch\(|Math.random/);
});
test('motion helpers never mutate GLB material or mesh geometry',()=>{
 const s=fs.readFileSync(new URL('../frontend/src/shop/story214/verticalMotion215.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(s,/\.material\s*=|\.geometry\s*=|\.metalness\s*=|\.roughness\s*=|\.opacity\s*=/);
});

test('normal mid-transition model centers remain inside the vertical frame',()=>{
 const f={position:.77,left:0,right:1,primary:1,mix:.5,hold:1};
 const p=verticalCamera215(f,null,null,960,620);
 const half=Math.hypot(...p.position)*Math.tan(p.fov*Math.PI/360);
 assert.ok(p.outgoing<half);assert.ok(-p.incoming<half);
});

// DTH21.5.1: anchored category, extended product chapters, and safe native scroll.
test('same-category watermark does not bounce at chapter boundaries',()=>{const products=Array.from({length:3},()=>({category:'suspension'}));for(let p=0;p<=2;p+=.005){const f=frame214(p,3),s=atmosphere215(f,products);assert.equal(s.firstY,0);assert.equal(s.secondY,0);assert.equal(s.firstOpacity,1);assert.equal(s.secondOpacity,0);}});
test('chapter traversal gives a dwell at the end of the last product',async()=>{const { CHAPTER2151 }=await import('../frontend/src/shop/story214/verticalMotion215.mjs');assert.ok(CHAPTER2151.segmentViewport>1.5);assert.ok(CHAPTER2151.exitViewport>=1);const code=fs.readFileSync(new URL('../frontend/src/shop/story214/useStoryScroll214.js',import.meta.url),'utf8');assert.match(code,/offsetHeight-panel.offsetHeight-Math.round/);assert.match(code,/CHAPTER2151.exitViewport/);});
test('native scroll stays intact, with scoped chapter markers',()=>{const jsx=fs.readFileSync(new URL('../frontend/src/shop/story214/StoryAtmosphere215.jsx',import.meta.url),'utf8');const css=fs.readFileSync(new URL('../frontend/src/shop/story214/vertical215.css',import.meta.url),'utf8');assert.match(jsx,/data-215-stops/);assert.match(jsx,/stops.forEach\(node => node.remove\(\)\)/);assert.match(css,/story215-tail/);assert.doesNotMatch(css,/(?:scroll-snap-type|overscroll-behavior):\s*none/);});
