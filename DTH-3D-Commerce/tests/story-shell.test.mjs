import test from 'node:test';
import assert from 'node:assert/strict';
import { STORY_HERO, selectStoryProduct, fitStoryDistance, createStorySignal, advanceStoryTurn } from '../frontend/src/experience/story/storyHero.config.mjs';

const running = { active: true, motion: true, blocked: false };

test('Selection prefers the configured active product without mutating catalog data', () => {
  const products = [{ id:'other',active:true,modelUrl:'/other.glb' },{ id:STORY_HERO.productId,active:true }];
  const before = JSON.stringify(products);
  assert.equal(selectStoryProduct(products), products[1]);
  assert.equal(JSON.stringify(products), before);
});
test('Inactive hero is not exposed and another active model can be shown', () => {
  const products = [{id:STORY_HERO.productId,active:false},{id:'photo'},{id:'other',modelUrl:'/other.glb'}];
  assert.equal(selectStoryProduct(products).id, 'other');
});
test('Empty catalog is an explicit empty state', () => {
  assert.equal(selectStoryProduct(), null);
  assert.equal(selectStoryProduct([{active:false},null]), null);
});
test('Composition settings and pose cannot be mutated', () => {
  assert.ok(Object.isFrozen(STORY_HERO)); assert.ok(Object.isFrozen(STORY_HERO.rotation));
});
test('Invalid viewport, radius and FOV never produce an invalid camera', () => {
  for (const v of [0,-1,NaN,Infinity]) assert.throws(()=>fitStoryDistance(v,1.7));
  for (const v of [0,-1,NaN,Infinity]) assert.throws(()=>fitStoryDistance(1,v));
  for (const v of [0,100,NaN]) assert.throws(()=>fitStoryDistance(1,1.7,v));
});
test('Narrowing the protected viewport moves the camera back, not the model sideways', () => {
  assert.ok(fitStoryDistance(.45,1.7)>fitStoryDistance(1,1.7));
  assert.ok(Number.isFinite(fitStoryDistance(3,1.7)));
});
for (const aspect of [.45,.68,1,1.6,2.8]) test(`All rotating model and pedestal points fit at aspect ${aspect}`, () => {
  const r=1.74,d=fitStoryDistance(aspect,r),tv=Math.tan(STORY_HERO.cameraFov*Math.PI/360),th=tv*aspect;
  const project=(x,y,z)=>{
    assert.ok(d-z>0);
    assert.ok(Math.abs(x/((d-z)*th))<1, `clipped horizontal ${[x,y,z]}`);
    assert.ok(Math.abs(y/((d-z)*tv))<1, `clipped vertical ${[x,y,z]}`);
  };
  for(let i=0;i<=72;i++) for(let j=0;j<=36;j++) {
    const theta=i*Math.PI/36,phi=j*Math.PI/36;
    project(r*Math.cos(theta)*Math.sin(phi),r*Math.cos(phi),r*Math.sin(theta)*Math.sin(phi));
  }
  for(let i=0;i<144;i++) {
    const a=i*Math.PI/72;
    project(r*1.046*Math.cos(a),-r-.18,r*1.046*.58*Math.sin(a));
    project((r*1.04+.005)*Math.cos(a),(r*1.04+.005)*Math.sin(a),-r*.42);
  }
});
test('Autoplay speed is identical at 30, 60 and 120 fps', () => {
  const step=fps=>{let phase=0;for(let i=0;i<fps*3;i++)phase=advanceStoryTurn(phase,1/fps,running);return phase;};
  assert.ok(Math.abs(step(30)-step(120))<1e-10);
  assert.ok(Math.abs(step(60)+Math.PI/4)<1e-10);
});
for (const [key,value] of [['active',false],['motion',false],['blocked',true]]) test(`${key} gate pauses without resetting the current angle`, () => {
  assert.equal(advanceStoryTurn(-.72,.03,{...running,[key]:value}),-.72);
});
test('Returning from a hidden tab cannot fast-forward an entire turn', () => {
  assert.equal(advanceStoryTurn(-.2,40,running),advanceStoryTurn(-.2,.05,running));
});
test('Invalid deltas do not move or corrupt the phase', () => {
  for(const value of [NaN,Infinity,-1,undefined]) assert.equal(advanceStoryTurn(-.2,value,running),-.2);
});
test('Observers unsubscribe and repeated values do not trigger redraws', () => {
  const s=createStorySignal();let calls=0;const off=s.subscribe(()=>calls++);
  s.set({motion:true});s.set({blocked:true});s.set({blocked:true});assert.equal(calls,1);
  off();s.set({blocked:false});assert.equal(calls,1);assert.equal(s.listenerCount,0);
});
test('Invalid gate and reset inputs are ignored', () => {
  const s=createStorySignal();s.set({motion:'false',active:null,resetSerial:NaN});
  assert.equal(s.state.motion,true);assert.equal(s.state.active,true);assert.equal(s.state.resetSerial,0);
  s.set({resetSerial:1});assert.equal(s.state.resetSerial,1);
});
