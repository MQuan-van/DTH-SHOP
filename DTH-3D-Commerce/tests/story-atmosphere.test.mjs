import test from 'node:test';
import assert from 'node:assert/strict';
import { ATMOSPHERE, canvasSize, contourField, createContourGrid, traceContours, checkerCell, cellNoise, seamProgress, safeDelta, canAnimateDecor } from '../frontend/src/experience/story/atmosphere/atmosphereMath.mjs';
import { createAtmosphereTicker } from '../frontend/src/experience/story/atmosphere/frameLoop.mjs';

function fakeTicker() {
  let id = 0; const tasks = new Map(), errors = [];
  const ticker = createAtmosphereTicker({ requestFrame: callback => { const key = id++; tasks.set(key, callback); return key; }, cancelFrame: key => tasks.delete(key), onError: error => errors.push(error.message) });
  return { ticker, tasks, errors, step(now) { const pending = [...tasks.values()]; tasks.clear(); pending.forEach(fn => fn(now)); } };
}

test('contour constants remain finite and bounded', () => { Object.values(ATMOSPHERE).forEach(v => assert(Number.isFinite(v) && v > 0)); assert(Object.isFrozen(ATMOSPHERE)); });
test('canvas DPR is capped without changing layout size', () => { assert.deepEqual(canvasSize(1440,900,3),{width:2160,height:1350,ratio:1.5}); });
test('canvas allocation respects the maximum side and pixel budget', () => { for (const [w,h] of [[8000,8000],[16000,9000],[390,20000]]) { const s=canvasSize(w,h,4);assert(s.width<=4096&&s.height<=4096);assert(s.width*s.height<=6009000); } });
test('zero and invalid viewports do not allocate canvas buffers', () => { for(const v of [0,-1,NaN,Infinity])assert.equal(canvasSize(v,900,2).width,0); });
test('invalid DPR falls back to one', () => { for(const v of [0,-1,NaN,Infinity])assert.equal(canvasSize(320,400,v).ratio,1); });
test('frame delta caps background catch-up and invalid samples', () => { assert.equal(safeDelta(600),.05);for(const v of [NaN,Infinity,-1])assert.equal(safeDelta(v),0); });
test('analytic contour field is repeatable and changes smoothly with time', () => { const a=contourField(.8,.6,2);assert.equal(a,contourField(.8,.6,2));assert(Math.abs(contourField(.8,.6,2.001)-a)<.01); });
test('invalid contour input is finite rather than corrupting geometry', () => { assert.equal(contourField(NaN,1,2),0);assert.equal(contourField(1,Infinity,2),0); });
test('grid rejects empty dimensions', () => { assert.throws(()=>createContourGrid(0,600));assert.throws(()=>createContourGrid(500,NaN)); });
test('compact contour grid has a smaller workload', () => { const full=createContourGrid(1440,900), small=createContourGrid(1440,900,true);assert(small.values.length<full.values.length); });
for(const [w,h] of [[320,640],[390,844],[768,1024],[1280,720],[1440,900],[1920,1080],[2560,1440]]) {
  test(`contours are finite and inside ${w}x${h}`, () => {
    const grid=createContourGrid(w,h,w<768);let previous;
    for(const t of [0,1,60,3600]) {
      const points=[];const count=traceContours(grid,t,(...p)=>points.push(...p));assert(count>0);
      points.forEach((v,i)=>{assert(Number.isFinite(v));assert(v>=-1e-5);});
      for(let i=0;i<points.length;i+=2){assert(points[i]<=w+1e-5);assert(points[i+1]<=h+1e-5);}
      if(previous)assert.notDeepEqual(points,previous);previous=points;
    }
  });
}
test('contour grid storage is reused between frames', () => {const g=createContourGrid(1440,900);const storage=g.values;traceContours(g,0,()=>{});traceContours(g,1,()=>{});assert.equal(g.values,storage);});
test('seam progress follows native scroll and clamps ends', () => { assert.equal(seamProgress(900,900),0);assert.equal(seamProgress(450,900),.5);assert.equal(seamProgress(-300,900),1);assert.equal(seamProgress(1200,900),0); });
test('invalid seam measurements remain safe', () => {assert.equal(seamProgress(NaN,900),0);assert.equal(seamProgress(1,0),0);});
test('cell hash is deterministic and within zero to one', () => {for(let y=0;y<30;y++)for(let x=0;x<80;x++){const v=cellNoise(x,y);assert(v>=0&&v<1);assert.equal(v,cellNoise(x,y));}});
test('seam has a solid paper edge at entry', () => {for(let x=0;x<60;x++)assert.equal(checkerCell(x,0,9,0),'paper');});
test('checker cells retire monotonically and are gone by the midpoint', () => {for(let y=0;y<9;y++)for(let x=0;x<60;x++){let gone=false;for(const p of [0,.08,.16,.24,.4,.5,1]){const v=checkerCell(x,y,9,p);if(!v)gone=true;else assert(!gone);}assert.equal(checkerCell(x,y,9,.5),null);}});
test('checker pattern returns exactly when scrolling backward', () => {const grid=p=>Array.from({length:600},(_,i)=>checkerCell(i%60,Math.floor(i/60),10,p));const first=grid(.17);grid(.35);assert.deepEqual(grid(.17),first);});
test('empty or invalid checker rows are rejected', () => {for(const rows of [0,-1,NaN,2.5])assert.equal(checkerCell(0,0,rows,0),null);});
test('motion gate ignores the unrelated hero-active flag', () => {assert(canAnimateDecor({motion:true,active:false,visible:true,hidden:false,blocked:false,reduced:false}));});
for(const key of ['blocked','hidden','reduced'])test(`${key} closes the motion gate`,()=>{assert(!canAnimateDecor({motion:true,visible:true,[key]:true}));});
test('Motion off and offscreen regions stay still',()=>{assert(!canAnimateDecor({motion:false,visible:true}));assert(!canAnimateDecor({motion:true,visible:false}));});
test('multiple effects share one scheduled frame, even if its ID is zero',()=>{const f=fakeTicker();const a=f.ticker.subscribe({render(){}});const b=f.ticker.subscribe({render(){}});assert.equal(f.tasks.size,1);a.stop();b.stop();assert.equal(f.tasks.size,0);});
test('static content draws once then releases the frame loop',()=>{const f=fakeTicker();let draws=0;f.ticker.subscribe({render(){draws++;}});f.step(0);assert.equal(draws,1);assert.equal(f.tasks.size,0);});
test('invalidation coalesces repeated scroll events',()=>{const f=fakeTicker();let draws=0;const c=f.ticker.subscribe({render(){draws++;}});f.step(0);for(let i=0;i<100;i++)c.invalidate();assert.equal(f.tasks.size,1);f.step(16);assert.equal(draws,2);});
test('offscreen clients do not schedule frames',()=>{const f=fakeTicker();let visible=false;const c=f.ticker.subscribe({render(){},enabled:()=>visible,animate:()=>true});assert.equal(f.tasks.size,0);visible=true;c.invalidate();assert.equal(f.tasks.size,1);visible=false;c.invalidate();assert.equal(f.tasks.size,0);});
test('resuming after a long pause does not fast-forward the phase',()=>{const f=fakeTicker();let moving=true;const deltas=[];const c=f.ticker.subscribe({render:({delta})=>deltas.push(delta),animate:()=>moving});f.step(0);f.step(16);moving=false;c.invalidate();f.step(32);moving=true;c.invalidate();f.step(500000);assert.deepEqual(deltas,[0,.016,0,0]);});
test('30 FPS decorative phase is consistent on 60Hz and 120Hz schedules',()=>{
 const run=hz=>{const f=fakeTicker();let total=0,count=0;const c=f.ticker.subscribe({render:({delta})=>{total+=delta;count++;},animate:()=>true,interval:1000/30});for(let i=0;i<=hz*3;i++)f.step(i*1000/hz);c.stop();return{total,count};};
 const a=run(60),b=run(120);assert(Math.abs(a.total-b.total)<.035);assert(a.count<=92&&b.count<=92);
});
test('strict mount/unmount cycles leave no scheduled callbacks or subscriptions',()=>{const f=fakeTicker();for(let i=0;i<20;i++){const c=f.ticker.subscribe({render(){},animate:()=>true});c.stop();}assert.equal(f.ticker.clientCount,0);assert.equal(f.tasks.size,0);});
test('one renderer failure does not stop other decorative clients',()=>{const f=fakeTicker();let rendered=0;f.ticker.subscribe({render(){throw Error('canvas lost');}});f.ticker.subscribe({render(){rendered++;}});f.step(0);assert.deepEqual(f.errors,['canvas lost']);assert.equal(rendered,1);assert.equal(f.tasks.size,0);});
test('disposal permanently clears the ticker and refuses new clients',()=>{const f=fakeTicker();f.ticker.subscribe({render(){},animate:()=>true});f.ticker.dispose();assert.equal(f.tasks.size,0);assert.throws(()=>f.ticker.subscribe({render(){}}));});
