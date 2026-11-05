import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { approvedAsset242, fetchCalibrationAsset242, inspectCalibrationAsset242, PART_LIMITS242, attachmentFromObject242, applyAttachment242, calibrationFocusBox242, createGhost242, disposeCalibrationGLTF242 } from '../frontend/src/experience/mountCalibration242/scene242.logic.mjs';
import { vehicleDisplayFrame234 } from '../frontend/src/experience/mounting234/assembly234.mjs';
const bytes=new Uint8Array(await readFile(new URL('../frontend/public/models/dth-demo/apex-suspension.glb',import.meta.url)));

test('calibration admits bound V2 paths, never remote/other-version/script paths',()=>{
  assert(approvedAsset242('/models/nvx/nvx-v2.glb','vehicle'));
  assert(approvedAsset242('/api/shop/ai-assets/models/v2.glb?rev=44a0b2a5-7e0a-44e6-bbb5-67fff6de755a','vehicle'));
  assert(approvedAsset242('/models/ai-products/part.glb','product'));
  for(const url of ['https://example.test/part.glb','javascript:alert(1)','/models/../private.glb','/models/nvx/nvx-v3.glb','/api/shop/ai-assets/models/v3.glb?rev=44a0b2a5-7e0a-44e6-bbb5-67fff6de755a'])assert.equal(approvedAsset242(url,'vehicle'),false);
});
test('part resource limits match the existing high fidelity path rather than 16 MiB',()=>{
  assert.equal(PART_LIMITS242.bytes,64*1024*1024);assert.equal(PART_LIMITS242.decodedBytes,256*1024*1024);assert.equal(PART_LIMITS242.triangles,1_500_000);
});
test('actual GLB preflight leaves source bytes untouched and rejects LFS pointers distinctly',()=>{
  const before=bytes.slice();assert(inspectCalibrationAsset242(bytes,'product').nodes.length);assert.deepEqual(bytes,before);
  assert.throws(()=>inspectCalibrationAsset242(new TextEncoder().encode('version https://git-lfs.github.com/spec/v1\noid sha256:abc'),'vehicle'),/Git LFS pointer/);
  assert.throws(()=>inspectCalibrationAsset242(new TextEncoder().encode('<html>404</html>'),'product'),/GLB/);
});
test('missing model and oversized declared response report clear errors without parsing or fallback',async()=>{
  await assert.rejects(()=>fetchCalibrationAsset242('/models/a.glb','product',{fetcher:async()=>new Response('Missing',{status:404})}),/Part GLB request failed \(404\)/);
  let cancelled=false;const body=new ReadableStream({cancel(){cancelled=true;}});
  await assert.rejects(()=>fetchCalibrationAsset242('/models/a.glb','product',{fetcher:async()=>new Response(body,{headers:{'content-length':String(PART_LIMITS242.bytes+1)}})}),/64 MiB/);
  assert.equal(cancelled,true);
});
test('download is bounded, same-origin, refuses redirects and preserves bytes',async()=>{
  let options;const result=await fetchCalibrationAsset242('/models/a.glb','product',{fetcher:async(url,value)=>{options=value;return new Response(bytes);}});
  assert.deepEqual(result,bytes);assert.equal(options.credentials,'same-origin');assert.equal(options.redirect,'error');
});
test('aborted custom stream is cancelled and releases its reader without decoding',async()=>{
  const controller=new AbortController();controller.abort();let cancelled=false;
  const body=new ReadableStream({cancel(){cancelled=true;}});
  await assert.rejects(()=>fetchCalibrationAsset242('/models/a.glb','product',{signal:controller.signal,fetcher:async()=>new Response(body)}),{name:'AbortError'});
  assert.equal(cancelled,true);assert.equal(body.locked,false);
});
test('every gizmo scale axis becomes a finite positive uniform transform before drawing',()=>{
  const group=new THREE.Group();group.scale.set(2,3,4);
  for(const [axis,expected]of [['X',2],['Y',3],['Z',4]]){const pose=attachmentFromObject242(group,axis);assert.equal(pose.scale,expected);}
  applyAttachment242(group,attachmentFromObject242(group,'Y'));assert.deepEqual(group.scale.toArray(),[3,3,3]);
  group.scale.x=-2;assert.equal(attachmentFromObject242(group,'X').scale,1e-6);
  group.position.x=NaN;assert.throws(()=>attachmentFromObject242(group),/invalid/);
});
test('one common display transform preserves raw attachment coordinates without double scale',()=>{
  const frame=vehicleDisplayFrame234({orientedBounds:{min:[-2,-1,-1],max:[2,1,1]},rotationXYZ:[0,0,0]}),display=new THREE.Group(),attachment=new THREE.Group(),part=new THREE.Object3D();
  display.matrix.fromArray(frame.matrix);display.matrixAutoUpdate=false;display.add(attachment);attachment.add(part);part.position.set(.2,.4,.6);
  const pose={position:[1,2,3],quaternion:[0,0,0,1],scale:2};applyAttachment242(attachment,pose);display.updateMatrixWorld(true);
  const expected=new THREE.Vector3(1.4,2.8,4.2).applyMatrix4(new THREE.Matrix4().fromArray(frame.matrix));assert(part.getWorldPosition(new THREE.Vector3()).distanceTo(expected)<1e-12);
  assert.deepEqual(attachment.position.toArray(),pose.position);assert.deepEqual(attachment.scale.toArray(),[2,2,2]);
});
test('ghost uses owned material clones, restores originals and disposes each resource exactly once',()=>{
  let materialDisposed=0,textureDisposed=0,geometryDisposed=0,imageClosed=0;
  const texture=new THREE.Texture({close(){imageClosed++;}}),material=new THREE.MeshStandardMaterial({map:texture}),geometry=new THREE.BoxGeometry(),root=new THREE.Group(),mesh=new THREE.Mesh(geometry,material);root.add(mesh);
  material.addEventListener('dispose',()=>materialDisposed++);texture.addEventListener('dispose',()=>textureDisposed++);geometry.addEventListener('dispose',()=>geometryDisposed++);
  const ghost=createGhost242(root);ghost.set(true);const clone=mesh.material;
  assert.notEqual(clone,material);assert.equal(material.opacity,1);assert.equal(clone.opacity,.23);assert.equal(clone.map,texture);assert.equal(clone.depthWrite,false);
  ghost.set(false);assert.equal(mesh.material,material);ghost.set(true);assert.equal(mesh.material,clone);
  ghost.dispose();assert.equal(mesh.material,material);assert.equal(materialDisposed,0);assert.equal(textureDisposed,0);
  const gltf={scene:root};disposeCalibrationGLTF242(gltf);disposeCalibrationGLTF242(gltf);
  assert.equal(materialDisposed,1);assert.equal(textureDisposed,1);assert.equal(geometryDisposed,1);assert.equal(imageClosed,1);
});

test('whole-vehicle/reset camera bounds ignore a far-away part and leave its pose untouched',()=>{
  const display=new THREE.Group(),vehicleRoot=new THREE.Mesh(new THREE.BoxGeometry(2,2,2)),attachment=new THREE.Group(),part=new THREE.Mesh(new THREE.BoxGeometry());
  display.scale.setScalar(2);display.position.set(0,2,0);display.add(vehicleRoot,attachment);attachment.add(part);
  const entry={display,vehicleRoot,attachment},before=calibrationFocusBox242(entry);
  const pose={position:[100,10,5],quaternion:[0,0,0,1],scale:12};applyAttachment242(attachment,pose);
  for(const view of ['overview','left','right','rear','reset'])assert(calibrationFocusBox242(entry,view).equals(before));
  assert(calibrationFocusBox242(entry,'part').getCenter(new THREE.Vector3()).x>190);
  assert.deepEqual(attachmentFromObject242(attachment),pose);
  vehicleRoot.geometry.dispose();part.geometry.dispose();vehicleRoot.material.dispose();part.material.dispose();
});
