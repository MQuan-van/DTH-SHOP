import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_EXPERIENCE, validateExperience, makeExperiencePreset, expectedRevision } from '../shared/experience.mjs';
import { createDirector, sampleStory } from '../frontend/src/experience/motion/story.mjs';
const copy=()=>structuredClone(DEFAULT_EXPERIENCE);
for(const preset of ['studio','detail','assembly'])test(`Preset ${preset} round-trips through the shared schema`,()=>{
  const config=validateExperience(makeExperiencePreset(preset));assert.equal(config.preset,preset);
  for(let p=0;p<=1;p+=.003){const f=sampleStory(p,config.frames);assert.ok(Object.values(f).flat().every(Number.isFinite));}
});
test('Editing a preset never mutates the bundled fallback',()=>{const c=copy();c.frames[0].camera[0]=5;assert.equal(DEFAULT_EXPERIENCE.frames[0].camera[0],0);});
for(const invalid of [null,[],{},'config',42])test(`Reject invalid config ${JSON.stringify(invalid)}`,()=>assert.throws(()=>validateExperience(invalid)));
for(const invalid of [NaN,Infinity,-1,100,'2',null])test(`Bound scroll length ${String(invalid)}`,()=>{const c=copy();c.storyScreens=invalid;assert.throws(()=>validateExperience(c));});
test('Unknown executable fields are rejected',()=>{const c=copy();c.shader='while(true){}';assert.throws(()=>validateExperience(c));});
test('Prototype-like fields are rejected at nested boundaries',()=>{const c=JSON.parse(JSON.stringify(copy()));c.controls=JSON.parse('{"rotateSpeed":1,"zoomSpeed":1,"__proto__":{}}');assert.throws(()=>validateExperience(c));});
for(const path of ['https://remote.test/a.glb','/models/../a.glb','/models/%2e%2e/a.glb','/previews/a.glb','/models/a.gltf','/models/a.glb?x=1'])test(`Reject model path ${path}`,()=>{const c=copy();c.modelUrl=path;assert.throws(()=>validateExperience(c));});
test('Adjacent camera endpoints cannot pass through the target',()=>{const c=copy();c.frames[0].camera=[0,0,8];c.frames[0].target=[0,0,0];c.frames[1].camera=[0,0,-8];c.frames[1].target=[0,0,0];assert.throws(()=>validateExperience(c),/cross the target/);});
test('Degenerate camera, zero scale and changed timeline are rejected',()=>{for(const patch of [{camera:[0,0,0],target:[0,0,0]},{scale:0},{at:.123}]){const c=copy();Object.assign(c.frames[0],patch);assert.throws(()=>validateExperience(c));}});
test('Copy and frame counts are bounded',()=>{const c=copy();c.chapters[0].title[0]='x'.repeat(29);assert.throws(()=>validateExperience(c));c.frames=[];assert.throws(()=>validateExperience(c));});
test('A revision must be an integer, not a query object or coerced string',()=>{for(const r of ['1',null,-1,1.2,{$gt:0}])assert.throws(()=>expectedRevision(r));assert.equal(expectedRevision(0),0);});
test('Rapid inspect/return changes have a single explicit camera owner',()=>{const d=createDirector();for(let i=0;i<100;i++){d.set({inspecting:true});assert.equal(d.state.mode,'inspect');d.set({inspecting:false});assert.equal(d.state.mode,'returning');}d.set({mode:'story'});assert.equal(d.state.inspecting,false);});
test('Identical gate state does not invalidate the scene repeatedly',()=>{const d=createDirector();let n=0;const off=d.subscribe(()=>n++);for(let i=0;i<100;i++)d.set({blocked:false});assert.equal(n,0);d.set({blocked:true});assert.equal(n,1);off();assert.equal(d.listenerCount,0);});
