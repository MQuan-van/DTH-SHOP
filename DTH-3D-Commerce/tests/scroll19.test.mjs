import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SCROLL19, clamp, copyPose, storyDistance, scrollTarget, canWriteStory, canStickMedia } from '../frontend/src/experience/scroll19/scroll19.logic.mjs';
const chapters=[{at:0},{at:.29},{at:.61},{at:1}];
test('19A: invalid progress is finite and clamped',()=>{
  for(const x of [undefined,NaN,Infinity,-Infinity,'0.5',null])assert.equal(clamp(x),0);
  assert.equal(clamp(-3),0);assert.equal(clamp(4),1);assert.equal(clamp(.43),.43);
});
test('19A: each published chapter stop is readable and correctly selected',()=>{
  chapters.forEach((c,index)=>{const p=copyPose(c.at,chapters);assert.equal(p.index,index);assert.equal(p.opacity,1);assert.equal(p.y,0);});
});
test('19A: neighbouring copy swaps are hidden at their exact midpoint',()=>{
  for(let i=1;i<chapters.length;i++){
    const p=(chapters[i-1].at+chapters[i].at)/2;
    assert.ok(copyPose(p,chapters).opacity<1e-10);
    assert.ok(copyPose(p-1e-7,chapters).opacity<1e-6);
    assert.ok(copyPose(p+1e-7,chapters).opacity<1e-6);
  }
});
test('19A: copy is deterministic and reversible, not an entrance timer',()=>{
  const forwards=Array.from({length:2001},(_,i)=>copyPose(i/2000,chapters));
  for(let i=2000;i>=0;i--)assert.deepEqual(copyPose(i/2000,chapters),forwards[i]);
});
test('19A: all copy samples remain bounded and finite',()=>{
  for(let i=-200;i<=1200;i++){
    const sample=copyPose(i/1000,chapters);
    assert.ok(Number.isInteger(sample.index)&&sample.index>=0&&sample.index<4);
    assert.ok(Number.isFinite(sample.opacity)&&sample.opacity>=0&&sample.opacity<=1);
    assert.ok(Number.isFinite(sample.y)&&Math.abs(sample.y)<=SCROLL19.copyPixels);
  }
});
test('19A: invalid chapter data fails open to readable content',()=>{
  for(const value of [null,[],[{at:NaN}],[{at:1},{at:0}],[{at:.3},{at:.3}],[{at:-1}],[{}]])
    assert.deepEqual(copyPose(.4,value),{index:0,opacity:1,y:0});
});
test('19A: one chapter has no disappearing midpoint',()=>{
  for(const p of [0,.2,.8,1])assert.deepEqual(copyPose(p,[{at:.5}]),{index:0,opacity:1,y:0});
});
test('19A: story distance is bounded independently of published content',()=>{
  assert.equal(storyDistance(800,3),2400);
  assert.equal(storyDistance(800,1000),3360);
  assert.equal(storyDistance(800,0),1760);
  for(const x of [NaN,Infinity,-100,0,320,800,10000])assert.ok(Number.isFinite(storyDistance(x,x))&&storyDistance(x,x)>0);
});
test('19A: chapter targets clamp before and after the real scroll range',()=>{
  assert.equal(scrollTarget(100,2100,0),100);assert.equal(scrollTarget(100,2100,.29),680);
  assert.equal(scrollTarget(100,2100,1),2100);assert.equal(scrollTarget(100,2100,50),2100);
  assert.equal(scrollTarget(100,0,.5),100);assert.equal(scrollTarget(NaN,Infinity,NaN),0);
});
for(const [label,state,hidden] of [
  ['hidden document',{},true],['inactive stage',{active:false},false],
  ['open overlay',{blocked:true},false],['Inspect camera owner',{inspecting:true},false],
])test(`19A: progress writes stop for ${label}`,()=>assert.equal(canWriteStory(state,hidden),false));
test('19A: progress reconciliation is allowed after returning from Inspect',()=>{
  assert.equal(canWriteStory({active:true,blocked:false,inspecting:false,mode:'returning'},false),true);
});
test('19A: sticky media requires enough vertical space and desktop policy',()=>{
  const good={compact:false,mediaHeight:600,viewportHeight:900,headerHeight:80};
  assert.equal(canStickMedia(good),true);
  assert.equal(canStickMedia({...good,compact:true}),false);
  assert.equal(canStickMedia({...good,mediaHeight:850}),false);
  assert.equal(canStickMedia({...good,mediaHeight:NaN}),false);
  assert.equal(canStickMedia({...good,viewportHeight:NaN}),false);
});
test('19A: scroll module does not capture wheels or write renderer transforms',async()=>{
  const text=await readFile(new URL('../frontend/src/experience/scroll19/useScrollDirector19.js',import.meta.url),'utf8');
  assert.doesNotMatch(text,/preventDefault\(|normalizeScroll\(|addEventListener\(['"]wheel|camera\.position\s*=|\.quaternion\s*=/);
  assert.match(text,/director\.set\(\{ progress: p \}\)/);
  assert.match(text,/canWriteStory/);assert.match(text,/unsubscribe\(\)/);assert.match(text,/ctx\.revert\(\)/);
});
test('19A: reveals are scoped and clean up media-query animations',async()=>{
  const text=await readFile(new URL('../frontend/src/experience/scroll19/useScrollReveals19.js',import.meta.url),'utf8');
  assert.match(text,/element\.querySelectorAll\('\[data-scroll19-reveal\]'\)/);
  assert.match(text,/prefers-reduced-motion: no-preference/);assert.match(text,/mm\.revert\(\)/);
  assert.doesNotMatch(text,/querySelectorAll\(['"]canvas|ScrollTrigger\.killAll|document\.body\.style\.transform/);
});
