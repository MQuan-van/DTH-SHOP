import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isUploadedSuspensionGLB22H2,
  filterStudioSuspension22H2,
} from '../frontend/src/experience/studio22h2/studioSuspensionCatalog.mjs';

const make = (id, category, modelUrl) => ({ id, category, modelUrl });
const UUID = '0262d0bd-690d-439e-8132-8b07088abadb';
const cases = [
  make('apex', 'suspension', '/models/dth-demo/apex-suspension.glb'),
  make('studio', 'suspension', '/models/dth-demo/studio-suspension.glb'),
  make('touring', 'suspension', '/models/dth-demo/touring-suspension.glb'),
  make('vector', 'suspension', '/models/dth-demo/vector-suspension.glb'),
  make('ohlins-ttx', 'suspension', '/models/ai-products/'+UUID+'.glb'),
  make('own-part', 'suspension', '/models/my-custom-ttx.glb'),
  make('imported-other', 'suspension', '/models/uploads/ttx-v2.glb?v=123'),
  make('invalid-image', 'suspension', '/previews/ttx.png'),
  make('missing', 'suspension', ''),
  make('external', 'suspension', 'https://example.com/a.glb'),
  make('fake-nvx', 'suspension', '/models/nvx/nvx-v2.glb'),
  make('wheels-demo', 'wheels', '/models/dth-demo/apex-wheels.glb'),
  make('brakes-demo', 'brakes', '/models/dth-demo/apex-brakes.glb'),
  make('exhaust-demo', 'exhausts', '/models/dth-demo/apex-exhausts.glb'),
  make('mirror-demo', 'mirrors', '/models/dth-demo/apex-mirrors.glb'),
];

test('Hides bundled Suspension GLBs without removing files', () => {
  cases.slice(0,4).forEach(p => assert.equal(isUploadedSuspensionGLB22H2(p),false,p.id));
});
test('Keeps uploaded Ohlins TTX',()=>{
  assert.equal(isUploadedSuspensionGLB22H2(cases[4]),true);
});
test('Keeps manually imported local GLBs',()=>{
  assert.equal(isUploadedSuspensionGLB22H2(cases[5]),true);
  assert.equal(isUploadedSuspensionGLB22H2(cases[6]),true);
});
test('Excludes images, blank, external and vehicle GLBs from Suspension',()=>{
  cases.slice(7,11).forEach(p => assert.equal(isUploadedSuspensionGLB22H2(p),false,p.id));
});
test('Never alters other categories',()=>{
  assert.deepEqual(filterStudioSuspension22H2(cases).slice(3),cases.slice(11));
});
test('Studio-only list excludes demos and preserves uploaded Suspension',()=>{
  assert.deepEqual(filterStudioSuspension22H2(cases).map(p=>p.id),[
    'ohlins-ttx','own-part','imported-other','wheels-demo','brakes-demo','exhaust-demo','mirror-demo'
  ]);
});
test('Filter is pure: input objects and product values unchanged',()=>{
  const before=structuredClone(cases);
  const result=filterStudioSuspension22H2(cases);
  assert.deepEqual(cases,before);assert.notEqual(result,cases);assert.equal(result[0],cases[4]);
});
test('Invalid filter input safely returns empty list',()=>{
  assert.deepEqual(filterStudioSuspension22H2(null),[]);
  assert.deepEqual(filterStudioSuspension22H2(undefined),[]);
});
