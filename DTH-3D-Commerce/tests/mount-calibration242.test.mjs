import test from 'node:test';
import assert from 'node:assert/strict';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { CALIBRATION_NORMALIZATION242, createCalibration242, createCalibrationHistory242, editCalibration242, exportCalibration242, importCalibration242, reviewCalibration242, validateAttachment242, validateCalibration242 } from '../shared/mount-calibration242.mjs';
import { vehicleDisplayFrame234, transformPoint234 } from '../frontend/src/experience/mounting234/assembly234.mjs';

// Synthetic contract fixtures, never published as real calibration coordinates.
const vehicle = { id:'yamaha-nvx-v2', assetUrl:'/models/nvx/nvx-v2.glb', sha256:'a'.repeat(64), rotationXYZ:[0,0,0] };
const product = { id:'ohlins-fixture', assetUrl:'/models/test/pair.glb', sha256:'b'.repeat(64), category:'suspension' };
const context = extra => ({vehicle:structuredClone(vehicle), product:structuredClone(product), nodeIndices:[0,1,2], ...extra});
const pose = x => ({position:[x,2,-3], quaternion:[0,0,0,1], scale:.5});
const nearly = (a,b) => a.forEach((value,index)=>assert(Math.abs(value-b[index])<1e-9, `${a} != ${b}`));
const make = extra => createCalibration242(context(extra));
const draft = extra => editCalibration242(make(extra),pose(1),context(extra));
const reviewed = extra => reviewCalibration242(draft(extra),'I inspected both sides visually; physical fit remains unassessed.',context(extra));

test('starter is one uncalibrated whole-asset instance, scene units, fixed source pivot and no stock removal claim', () => {
  const profile=make();
  assert.equal(profile.schemaVersion,2); assert.equal(profile.calibrationStatus,'uncalibrated');
  assert.deepEqual(profile.attachment,{position:[0,0,0],quaternion:[0,0,0,1],scale:1});
  assert.deepEqual(profile.partInstance,{id:'whole-asset-1',scope:'whole-asset',count:1,pivot:'part-source-origin-v1'});
  assert.equal(profile.coordinateFrame,'vehicle-source-root-v1'); assert.equal(profile.units,'scene-units');
  assert.equal(profile.physicalCompatibility,'not-assessed'); assert.equal(profile.stock.classification,'indeterminate');
  assert.deepEqual(profile.stock.nodeRefs,[]); assert.equal(profile.stock.review,null); assert.equal(profile.review,null);
});

test('published vehicle asset identity and revision are retained without substituting local V2 bytes', () => {
  const published={...vehicle,assetUrl:'/api/shop/ai-assets/models/v2.glb?rev=44a0b2a5-7e0a-44e6-bbb5-67fff6de755a',sha256:'c'.repeat(64)};
  const loaded=context({vehicle:published,stockClassification:'merged'}), profile=createCalibration242(loaded);
  assert.deepEqual(profile.vehicle,published); assert.equal(profile.stock.classification,'merged');
  assert.throws(()=>validateCalibration242(profile,context()),/Vehicle identity/);
});

test('profile validation, transforms, history snapshots and exports never mutate catalog/context inputs', () => {
  const loaded=context(), before=structuredClone(loaded), profile=createCalibration242(loaded), original=structuredClone(profile);
  const clean=validateCalibration242(profile,loaded), history=createCalibrationHistory242(profile,loaded);
  clean.attachment.position[0]=99; clean.vehicle.rotationXYZ[0]=9; history.snapshot().profile.product.id='mutated';
  const input=pose(8), saved=structuredClone(input); history.setAttachment(input); input.position[0]=700;
  assert.equal(history.snapshot().profile.attachment.position[0],8);
  assert.deepEqual(saved,pose(8)); assert.deepEqual(loaded,before); assert.deepEqual(profile,original);
  const parsed=JSON.parse(history.exportJSON()); parsed.attachment.position[0]=66;
  assert.equal(history.snapshot().profile.attachment.position[0],8);
});

for(const [title,mutate] of [
  ['schema',p=>{p.schemaVersion=1;}], ['vehicle ID',p=>{p.vehicleId='yamaha-nvx-v3';}],
  ['product ID',p=>{p.productId='other';}], ['vehicle hash',p=>{p.vehicle.sha256='c'.repeat(64);} ],
  ['product hash',p=>{p.product.sha256='c'.repeat(64);} ], ['part URL',p=>{p.product.assetUrl='/models/test/other.glb';}],
  ['slot',p=>{p.slotId='suspension-front';}], ['display revision',p=>{p.display.normalizationRevision='new-revision';}],
  ['orientation revision',p=>{p.display.orientationRevision='new-revision';}], ['orientation',p=>{p.display.rotationXYZ[1]=.5;}],
  ['source coordinates',p=>{p.coordinateFrame='world-space';}], ['fake units',p=>{p.units='millimetres';}],
  ['paired duplicate',p=>{p.partInstance.count=2;}], ['part subset',p=>{p.partInstance.scope='left-shock';}],
  ['pivot change',p=>{p.partInstance.pivot='guessed-pivot';}], ['physical certification',p=>{p.physicalCompatibility='verified';}],
]) test(`rejects changed ${title} before applying a profile`,()=>{
  const profile=make(); mutate(profile); assert.throws(()=>validateCalibration242(profile,context()));
});

test('arbitrary URLs, executable fields, extra fields and incomplete profiles are rejected',()=>{
  for(const patch of [p=>{p.product.assetUrl='https://untrusted.test/model.glb';},p=>{p.product.assetUrl='javascript:alert(1)';},
    p=>{p.script='alert(1)';},p=>{p.attachment.onChange='alert(1)';},p=>{delete p.attachment.quaternion;},
    p=>{p.notes='<script>alert(1)</script>';},p=>{p.vehicle.assetUrl='/models/nvx/../nvx-v2.glb';}]){
    const profile=make(); patch(profile); assert.throws(()=>validateCalibration242(profile,context()));
  }
  assert.throws(()=>importCalibration242('{"__proto__":{"polluted":true}}',context()));
  assert.equal({}.polluted,undefined);
});

test('normalized quaternion accepts floating point drift and canonicalizes equivalent q/-q',()=>{
  const valid=pose(0), angle=Math.PI/4; valid.quaternion=[0,Math.sin(angle),0,Math.cos(angle)];
  const normalized=validateAttachment242({...valid,quaternion:valid.quaternion.map(n=>n*(1+1e-7))});
  nearly(normalized.quaternion,valid.quaternion);
  assert.deepEqual(validateAttachment242({...valid,quaternion:[0,0,0,-1]}).quaternion,[0,0,0,1]);
  const h=createCalibrationHistory242(make(),context()); h.setAttachment({position:[0,0,0],quaternion:[0,0,0,-1],scale:1});
  assert.equal(h.snapshot().canUndo,false); assert.equal(h.snapshot().profile.calibrationStatus,'uncalibrated');
});

test('invalid position/quaternion/nonuniform/negative/zero/infinite scale cannot enter the scene',()=>{
  for(const patch of [{position:[NaN,0,0]},{position:[Infinity,0,0]},{position:[1e7,0,0]},
    {quaternion:[0,0,0,0]},{quaternion:[0,0,0,2]},{quaternion:[0,NaN,0,1]},{quaternion:[0,0,1]},
    {scale:-1},{scale:0},{scale:Infinity},{scale:[1,2,1]}]) assert.throws(()=>validateAttachment242({...pose(0),...patch}));
});

test('sparse or undefined transform/orientation components and node arrays are rejected for direct JS callers',()=>{
  for(const patch of [{position:new Array(3)},{position:[0,undefined,0]},{quaternion:new Array(4)},{quaternion:[0,0,undefined,1]}]) assert.throws(()=>validateAttachment242({...pose(0),...patch}));
  assert.throws(()=>createCalibration242(context({nodeIndices:new Array(1)})),/node identities/);
  assert.throws(()=>createCalibration242(context({nodeIndices:[undefined]})),/node identities/);
  assert.throws(()=>createCalibration242(context({vehicle:{...vehicle,rotationXYZ:new Array(3)}})),/vehicle orientation/);
  const sparseOrientation=make(); sparseOrientation.vehicle.rotationXYZ=new Array(3);
  assert.throws(()=>validateCalibration242(sparseOrientation,context()),/vehicle orientation/);
  const sparseDisplay=make(); sparseDisplay.display.rotationXYZ=new Array(3);
  assert.throws(()=>validateCalibration242(sparseDisplay,context()),/display orientation/);
  const sparseStock=make(); sparseStock.stock.nodeRefs=new Array(1);
  assert.throws(()=>validateCalibration242(sparseStock,context()),/stock node reference/);
});

test('merged stock cannot acquire node selectors or import a separable classification, including node 0',()=>{
  const loaded=context({stockClassification:'merged'}), profile=createCalibration242(loaded);
  const ref={assetSha256:vehicle.sha256,nodeIndex:0};
  assert.throws(()=>validateCalibration242({...profile,stock:{...profile.stock,nodeRefs:[ref]}},loaded),/cannot claim isolated/);
  assert.throws(()=>validateCalibration242({...profile,stock:{classification:'separable',nodeRefs:[ref],review:{kind:'visual-only',note:'Guessed whole vehicle'}}},loaded),/classification differs/);
});

test('stable stock references need actual unique node indices on the exact asset and explicit evidence',()=>{
  const base=make(), loaded=context({stockClassification:'separable'});
  const stock={classification:'separable',nodeRefs:[{assetSha256:vehicle.sha256,nodeIndex:1}],review:{kind:'visual-only',note:'Synthetic segmented node evidence, no real part identity.'}};
  assert.deepEqual(validateCalibration242({...base,stock},loaded).stock,stock);
  for(const refs of [[{...stock.nodeRefs[0],nodeIndex:9}],[{...stock.nodeRefs[0],assetSha256:'c'.repeat(64)}],[stock.nodeRefs[0],stock.nodeRefs[0]]]) assert.throws(()=>validateCalibration242({...base,stock:{...stock,nodeRefs:refs}},loaded));
  assert.throws(()=>validateCalibration242({...base,stock},context({stockClassification:'separable',nodeIndices:[1,1,2]})),/ambiguous/);
  assert.throws(()=>validateCalibration242({...base,stock:{...stock,review:null}},loaded),/visual review/);
});

test('export/import roundtrip recovers source position/quaternion/uniform scale exactly',()=>{
  const loaded=context(), profile=draft(), before=structuredClone(profile);
  const rotation=new Quaternion().setFromEuler(new Euler(.2,-.8,.4,'XYZ')).toArray();
  const authored=editCalibration242(profile,{...pose(3.25),quaternion:rotation,scale:2.75},loaded);
  assert.deepEqual(importCalibration242(exportCalibration242(authored,loaded),loaded),authored);
  assert.deepEqual(profile,before);
});

test('common vehicle display frame is reversible and does not double-scale part source coordinates',()=>{
  const rotation=[0,Math.PI/2,0], frame=vehicleDisplayFrame234({orientedBounds:{min:[-100,0,-200],max:[100,100,200]},rotationXYZ:rotation});
  const q=new Quaternion().setFromEuler(new Euler(.1,.3,0)), attachment={position:[10,20,30],quaternion:q.toArray(),scale:2};
  const sourcePoint=[1,2,3], localMatrix=new Matrix4().compose(new Vector3(...attachment.position),q,new Vector3(attachment.scale,attachment.scale,attachment.scale));
  const sourceMounted=new Vector3(...sourcePoint).applyMatrix4(localMatrix).toArray();
  const displayPoint=transformPoint234(sourceMounted,frame.matrix);
  nearly(transformPoint234(displayPoint,frame.inverse),sourceMounted);
  const combined=new Matrix4().fromArray(frame.matrix).multiply(localMatrix);
  nearly(new Vector3(...sourcePoint).applyMatrix4(combined).toArray(),displayPoint);
  const profile=createCalibration242(context({vehicle:{...vehicle,rotationXYZ:rotation}}),attachment);
  const imported=importCalibration242(exportCalibration242(profile,context({vehicle:{...vehicle,rotationXYZ:rotation}})),context({vehicle:{...vehicle,rotationXYZ:rotation}}));
  assert.equal(imported.attachment.scale,2); assert.equal(imported.display.normalizationRevision,CALIBRATION_NORMALIZATION242);
  assert.notEqual(imported.attachment.scale,2*frame.scale);
});

test('manual visual review requires a draft and note; a transform edit removes review and marks draft',()=>{
  assert.throws(()=>reviewCalibration242(make(),'Looked at it',context()),/Adjust or import a draft/);
  assert.throws(()=>reviewCalibration242(draft(),' ',context()),/review note/);
  const profile=reviewed(); assert.equal(profile.review.kind,'visual-only'); assert.equal(profile.physicalCompatibility,'not-assessed');
  const edited=editCalibration242(profile,pose(7),context()); assert.equal(edited.calibrationStatus,'draft'); assert.equal(edited.review,null);
  assert.equal(editCalibration242(profile,profile.attachment,context()).calibrationStatus,'reviewed');
});

test('one gesture creates one undo record; previews and canceled/no-op gestures create none',()=>{
  const h=createCalibrationHistory242(make(),context()); h.begin();
  for(let index=0;index<300;index++) h.preview(pose(index/10));
  const last=h.snapshot().profile; h.commit(); assert.equal(h.snapshot().canUndo,true);
  assert.deepEqual(h.undo().profile,make()); assert.equal(h.snapshot().canUndo,false); assert.deepEqual(h.redo().profile,last);
  h.begin(); h.preview(pose(80)); assert.deepEqual(h.cancel().profile,last);
  h.begin(); h.preview(last.attachment); h.commit(); h.undo(); assert.deepEqual(h.snapshot().profile,make());
  assert.throws(()=>h.preview(pose(1)),/Begin a transform transaction/);
});

test('numeric/reset/import actions are undoable and a new edit discards the redo branch',()=>{
  const initial=make(), h=createCalibrationHistory242(initial,context());
  h.setAttachment(pose(1)); h.setAttachment(pose(2)); h.undo(); assert.equal(h.snapshot().profile.attachment.position[0],1);
  h.setAttachment(pose(3)); assert.equal(h.snapshot().canRedo,false);
  const edited=h.snapshot().profile; h.reset(); assert.deepEqual(h.snapshot().profile,initial); assert.deepEqual(h.undo().profile,edited);
  const imported=exportCalibration242(draft(),context()); h.importJSON(imported); assert.deepEqual(h.snapshot().profile,draft());
  assert.deepEqual(h.undo().profile,edited);
});

test('invalid import is atomic and preserves both draft and undo/redo state, including during a drag',()=>{
  const h=createCalibrationHistory242(make(),context()); h.setAttachment(pose(1)); h.setAttachment(pose(2)); h.undo();
  const original=h.snapshot(), bad=JSON.parse(h.exportJSON()); bad.vehicle.sha256='c'.repeat(64);
  for(const input of ['broken json',JSON.stringify(bad),' '.repeat(128*1024+1)]){
    assert.throws(()=>h.importJSON(input)); assert.deepEqual(h.snapshot(),original);
  }
  h.begin(); h.preview(pose(7)); const transaction=h.snapshot();
  assert.throws(()=>h.importJSON(JSON.stringify(bad))); assert.deepEqual(h.snapshot(),transaction);
  assert.throws(()=>h.importJSON(exportCalibration242(draft(),context())),/Finish or cancel/); assert.deepEqual(h.snapshot(),transaction);
  h.cancel(); assert.deepEqual(h.snapshot(),original);
});

test('history is bounded and undo during a gesture cancels it without undoing older work',()=>{
  const h=createCalibrationHistory242(make(),context(),{limit:2});
  for(const x of [1,2,3])h.setAttachment(pose(x));
  h.begin(); h.preview(pose(4)); assert.equal(h.undo().profile.attachment.position[0],3);
  assert.equal(h.undo().profile.attachment.position[0],2); assert.equal(h.undo().profile.attachment.position[0],1);
  assert.equal(h.snapshot().canUndo,false); assert.equal(h.redo().profile.attachment.position[0],2);
  assert.throws(()=>createCalibrationHistory242(make(),context(),{limit:0}),/history limit/);
});
