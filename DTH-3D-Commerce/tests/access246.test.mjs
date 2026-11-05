import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import gsapPackage from 'gsap';
import sharp from 'sharp';
import { atmospherePermission246, atmospherePose246, resetLightPointer246 } from '../frontend/src/experience/access246/atmosphere246.logic.mjs';
import { studioPoster246, STUDY_POSTER246 } from '../frontend/src/experience/access246/poster246.logic.mjs';

test('light composition bounds extreme pointer/state samples and converges without a loop', () => {
  const rest=atmospherePose246({intro:1});
  assert.deepEqual({...rest,opacity:0},{x:0,y:0,apertureRotation:0,apertureScale:1,opacity:0});
  assert(Math.abs(rest.opacity-.87)<1e-10);
  const sample=atmospherePose246({intro:99,mode:NaN,detail:Infinity},{x:99,y:-99,active:true});
  assert.equal(sample.x,66);assert.equal(sample.y,34);
  assert.equal(sample.apertureRotation,0);
  assert(Object.values(sample).every(Number.isFinite));
  assert.equal(atmospherePose246({}, {x:1,y:1,active:false}).x,0);
});
test('ambient input cannot run during system, form, hidden or user pause gates', () => {
  const policy={allowed:true,motion:true};
  assert.deepEqual(atmospherePermission246(policy),{motion:true,blocked:false});
  for(const change of [{compact:true},{reduced:true},{saveData:true},{allowed:false},{motion:false}]) assert.deepEqual(atmospherePermission246({...policy,...change}),{motion:false,blocked:true});
  for(const change of [{hidden:true},{paused:true}]) assert.equal(atmospherePermission246({...policy,...change}).blocked,true);
  for(const change of [{focusing:true},{busy:true}]) assert.equal(atmospherePermission246(policy,change).blocked,true);
});
test('compact/reduced reset discards quickTo cached offsets before desktop resumes (installed GSAP)',()=>{
  const gsap=gsapPackage.gsap||gsapPackage, point={x:0,y:0};
  const xTo=gsap.quickTo(point,'x',{duration:1}),yTo=gsap.quickTo(point,'y',{duration:1});
  try{
    xTo(66);yTo(-34);xTo.tween.progress(.6);yTo.tween.progress(.6);
    assert(point.x>0);assert(point.y<0);
    resetLightPointer246(xTo,yTo);
    assert.deepEqual([point.x,point.y],[0,0]);
    xTo(20);yTo(10);
    assert.deepEqual([point.x,point.y],[0,0],'resume starts from the static pose without a jump');
    xTo.tween.progress(.5);yTo.tween.progress(.5);
    assert(point.x>0&&point.x<=20);assert(point.y>0&&point.y<=10);
  }finally{xTo.tween.kill();yTo.tween.kill();gsap.ticker.sleep();}
});
test('dark preview never substitutes another model or overrides saved Admin presentation',async()=>{
  const product={id:STUDY_POSTER246.productId,modelUrl:STUDY_POSTER246.modelUrl};
  assert.equal(studioPoster246(product),STUDY_POSTER246);
  assert.equal(studioPoster246({...product,modelUrl:'/models/changed.glb'}),null);
  assert.equal(studioPoster246({...product,presentation3d:{revision:1}}),null);
  const image=await readFile(new URL(`../frontend/public${STUDY_POSTER246.src}`,import.meta.url));
  const metadata=await sharp(image).metadata();
  assert.equal(metadata.format,'jpeg');
  assert.equal(metadata.width,500);
  assert.equal(metadata.height,480);
});
test('atmosphere keeps rendering/auth ownership outside its DOM motion (source contract and syntax)',async()=>{
  const source=await readFile(new URL('../frontend/src/experience/access246/AccessAtmosphere246.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/Canvas|requestAnimationFrame|fetch\(|authenticate|localStorage|sessionStorage|setInterval|repeat:\s*-1/);
  assert.match(source,/context\.revert\(\)/);
  assert.match(source,/offPointer\(\); offDirector\(\)/);
  assert.match(source,/xTo\.tween\.pause\(\)/);
  assert.equal((await transform(source,{loader:'jsx',jsx:'automatic'})).warnings.length,0);
});
