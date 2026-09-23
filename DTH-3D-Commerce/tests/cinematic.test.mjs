import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { sampleStory, chapterAt, damp, createDirector } from '../frontend/src/experience/motion/story.mjs';
import { STORY_FRAMES, CINEMATIC_CONFIG } from '../frontend/src/experience/motion/motion.config.mjs';
import { componentsOf, createProductRig, PART_OFFSETS } from '../frontend/src/experience/world/apexRig.mjs';
const asset = await readFile(new URL('../frontend/public/models/dth-demo/apex-suspension.glb', import.meta.url));
const { scene } = await new GLTFLoader().parseAsync(asset.buffer.slice(asset.byteOffset, asset.byteOffset + asset.byteLength), '');
const meshList = scene => { const list = []; scene.traverse(o => { if (o.isMesh) list.push(o); }); return list; };
const snapshot = scene => JSON.stringify(meshList(scene).map(m => [Array.from(m.geometry.attributes.position.array), m.material.color.toArray(), m.position.toArray()]));
const url = '/models/dth-demo/apex-suspension.glb';
test('Timeline starts and ends assembled', () => { assert.equal(sampleStory(0).explode, 0); assert.equal(sampleStory(1).explode, 0); });
test('Assembly chapter separates existing parts', () => assert.equal(sampleStory(.61).explode, 1));
test('All samples are bounded and finite, including invalid input', () => {
  for (const p of [-2, NaN, Infinity, undefined, ...Array.from({length:1001}, (_,i)=>i/1000), 2]) {
    const f=sampleStory(p);assert.ok(Object.values(f).flat().every(Number.isFinite));assert.ok(f.explode>=0&&f.explode<=1);assert.ok(f.scale>0);
    assert.ok(new THREE.Vector3(...f.camera).distanceTo(new THREE.Vector3(...f.target))>3);
  }
});
test('Chapter stops and frame stops are monotonic', () => { for(let i=1;i<STORY_FRAMES.length;i++)assert.ok(STORY_FRAMES[i].at>STORY_FRAMES[i-1].at);CINEMATIC_CONFIG.chapters.forEach((c,i)=>assert.equal(chapterAt(c.at),i)); });
test('Camera path has no jumps at keyframe boundaries', () => { for(const f of STORY_FRAMES){const a=sampleStory(f.at-1e-5),b=sampleStory(f.at+1e-5);a.camera.forEach((x,i)=>assert.ok(Math.abs(x-b.camera[i])<.001));} });
test('Frame-time damping is stable at 30, 60 and 120Hz', () => { const value=fps=>{let x=0;for(let i=0;i<fps;i++)x=damp(x,1,1/fps);return x;};assert.ok(Math.abs(value(30)-value(120))<1e-9); });
test('Long inactive frame does not produce a large jump', () => assert.equal(damp(0,1,30),damp(0,1,.05)));
test('Director subscriptions can be removed without leaving listeners', () => { const d=createDirector();let calls=0;const remove=d.subscribe(()=>calls++);d.set({progress:.2});remove();d.set({progress:.3});assert.equal(calls,1);assert.equal(d.state.progress,.3); });
test('Original GLB component grouping matches authored disconnected geometry', () => assert.deepEqual(meshList(scene).map(m=>componentsOf(m.geometry).length),[4,2,131]));
test('Semantic rig has all nine authored groups', () => {const rig=createProductRig(scene,url);assert.equal(rig.supported,true);assert.deepEqual([...rig.parts.keys()].sort(),Object.keys(PART_OFFSETS).sort());rig.dispose();});
test('Splitting preserves every original triangle', () => {const count=s=>meshList(s).reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count),0);const rig=createProductRig(scene,url);assert.equal(count(rig.root),count(scene));rig.dispose();});
test('Rest pose and reassembled pose retain the original bounding box', () => {const rig=createProductRig(scene,url);const before=new THREE.Box3().setFromObject(scene);rig.explode(1);rig.explode(0);const after=new THREE.Box3().setFromObject(rig.root);assert.ok(before.min.distanceTo(after.min)<1e-6);assert.ok(before.max.distanceTo(after.max)<1e-6);rig.dispose();});
test('Explode transforms components in 3D, not the canvas DOM', () => {const rig=createProductRig(scene,url);rig.explode(.5);for(const[name,part]of rig.parts)assert.deepEqual(part.position.toArray(),PART_OFFSETS[name].map(v=>v*.5));rig.dispose();});
test('Cloned materials, positions and wireframe do not mutate cached product assets', () => {const before=snapshot(scene);const rig=createProductRig(scene,url);rig.explode(1);rig.wireframe(true);rig.dispose();assert.equal(snapshot(scene),before);});
test('Known legacy lime is corrected once, not bleached or recoloured cyan', () => {const rig=createProductRig(scene,url);const mesh=rig.parts.get('spring').children[0];const expected=new THREE.Color().setRGB(215/255,245/255,92/255,THREE.SRGBColorSpace);assert.ok(mesh.material.color.equals(expected));rig.dispose();});
test('Unknown URL never gets Apex-specific explosion', () => {const rig=createProductRig(scene,'/models/custom-part.glb');assert.equal(rig.supported,false);assert.equal(rig.parts.size,0);rig.explode(1);rig.dispose();});
test('Unexpected geometry fails closed to ordinary model display', () => {const copy=scene.clone(true);copy.getObjectByName('part-0').name='unexpected-name';const rig=createProductRig(copy,url);assert.equal(rig.supported,false);rig.dispose();});
test('Cached geometry remains usable after rig disposal', () => {const original=meshList(scene)[0].geometry;const array=original.attributes.position.array;const rig=createProductRig(scene,url);rig.dispose();assert.equal(original.attributes.position.array,array);assert.ok(array.length>0);});
test('Changed vertices with the same mesh counts do not get rigged', () => {const copy=scene.clone(true);const mesh=copy.getObjectByName('part-0');mesh.geometry=mesh.geometry.clone();mesh.geometry.attributes.position.setX(0,123);const rig=createProductRig(copy,url);assert.equal(rig.supported,false);rig.dispose();mesh.geometry.dispose();});
