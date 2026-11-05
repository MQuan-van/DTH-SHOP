import test from 'node:test';
import assert from 'node:assert/strict';
import { calibrationProduct242, calibrationVehicle242, attachmentFields242, changeAttachmentField242, numericCommit242, calibrationShortcut242 } from '../frontend/src/experience/mountCalibration242/calibration-ui242.logic.mjs';
const pose = {position:[1,2,3],quaternion:[0,0,0,1],scale:1};
test('focus/blur or Escape without an intentional numeric change preserves full profile precision', () => {
  const precise=1.2345678912345, shown=String(Math.round(precise*1e6)/1e6);
  assert.deepEqual(numericCommit242(shown,shown,false),{changed:false});
  assert.deepEqual(numericCommit242(shown,shown,true),{changed:false});
  assert.deepEqual(numericCommit242('2.5',shown,true),{changed:true,value:2.5});
  assert.throws(()=>numericCommit242('',shown,true));assert.throws(()=>numericCommit242('Infinity',shown,true));
  assert.equal(precise,1.2345678912345);
});
test('the workspace uses the current active Ohlins suspension record without injecting a fallback SKU', () => {
  const product={id:'ohlins',category:'suspension',active:true,modelUrl:'/models/current.glb'};
  assert.equal(calibrationProduct242([product]),product);
  for(const products of [[],[{...product,active:false}],[{...product,id:'fixture-ohlins'}],[{...product,category:'rims'}]]) assert.equal(calibrationProduct242(products),null);
});
test('published V2 overrides local V2 without accepting arbitrary URLs or another version', () => {
  const url='api/shop/ai-assets/models/v2.glb?rev=44a0b2a5-7e0a-44e6-bbb5-67fff6de755a';
  assert.equal(calibrationVehicle242({data:{'yamaha-nvx-v2':{url}}}).assetUrl,'/'+url);
  assert.equal(calibrationVehicle242({data:{}}).assetUrl,'/models/nvx/nvx-v2.glb');
  for(const invalid of ['https://example.test/v2.glb','javascript:alert(1)','api/shop/ai-assets/models/v3.glb?rev=44a0b2a5-7e0a-44e6-bbb5-67fff6de755a']) assert.throws(()=>calibrationVehicle242({data:{'yamaha-nvx-v2':{url:invalid}}}));
  assert.throws(()=>calibrationVehicle242({}));
});
test('explicit local source stays on the original V2 and cannot silently consume a published replacement', () => {
  const manifest={data:{'yamaha-nvx-v2':{url:'api/shop/ai-assets/models/v2.glb?rev=44a0b2a5-7e0a-44e6-bbb5-67fff6de755a'}}};
  assert.equal(calibrationVehicle242(manifest,'local').assetUrl,'/models/nvx/nvx-v2.glb');
  assert.equal(calibrationVehicle242(manifest,'local').source,'Local NVX V2');
  assert.equal(calibrationVehicle242(manifest,'published').source,'Published model');
  assert.throws(()=>calibrationVehicle242(manifest,'v3'));
});
test('degree inputs produce quaternions without changing position, uniform scale or source pose', () => {
  const next=changeAttachmentField242(pose,'rotation',1,90);
  assert(Math.abs(attachmentFields242(next).rotation[1]-90)<1e-6);
  assert.deepEqual(next.position,pose.position);assert.equal(next.scale,1);
  assert.deepEqual(pose,{position:[1,2,3],quaternion:[0,0,0,1],scale:1});
  const moved=changeAttachmentField242(next,'position',2,4.5);
  assert.equal(moved.position[2],4.5);assert.deepEqual(moved.quaternion,next.quaternion);
  assert.equal(changeAttachmentField242(moved,'scale',null,.5).scale,.5);
});
test('numeric editing rejects invalid and non-positive scale without mutating the current pose', () => {
  for(const value of [NaN,Infinity,0,-1]) assert.throws(()=>changeAttachmentField242(pose,'scale',null,value));
  assert.throws(()=>changeAttachmentField242(pose,'rotation',4,0));assert.equal(pose.scale,1);
});
test('shortcuts are inert in editable fields and preserve browser modifier combinations', () => {
  for(const key of ['w','e','r','f','Home','Escape','z']) assert.equal(calibrationShortcut242({key,ctrlKey:key==='z',editing:true}),null);
  assert.equal(calibrationShortcut242({key:'z',ctrlKey:true}),'undo');
  assert.equal(calibrationShortcut242({key:'z',metaKey:true,shiftKey:true}),'redo');
  assert.equal(calibrationShortcut242({key:'r'}),'scale');
  assert.equal(calibrationShortcut242({key:'r',ctrlKey:true}),null);
  assert.equal(calibrationShortcut242({key:'f',altKey:true}),null);
});
