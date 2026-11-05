import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { galleryKey24 } from '../frontend/src/experience/galleryDemo24/gallery-demo.logic.mjs';
import { captureShelfPoster25, describeProduct25, nextShelfCapture25, orientShelfPixels25, shelfPose25 } from '../frontend/src/experience/studio25Preview/shelf-capture25.logic.mjs';
import { stationPose25 } from '../frontend/src/experience/studio25Preview/spatial-stage25.logic.mjs';

test('shelf borrows only the exact requested presentation and skips completed jobs', () => {
  const first = { id: 'a', modelUrl: '/models/a.glb' };
  const second = { id: 'b', modelUrl: '/models/b.glb' };
  const revised = { ...second, presentation3d: { revision: 2 } };
  const residents = new Map([[second.id, { posterKey: galleryKey24(second) }]]);
  assert.deepEqual(nextShelfCapture25([first, second], new Set(), residents), { product: second, key: galleryKey24(second) });
  assert.deepEqual(nextShelfCapture25([first, revised], new Set(), residents), { product: first, key: galleryKey24(first) });
  const completed = new Set([galleryKey24(first), galleryKey24(second)]);
  assert.equal(nextShelfCapture25([first, second], completed, residents), null);
  assert.deepEqual(nextShelfCapture25([first, revised], completed, residents), { product: revised, key: galleryKey24(revised) });
});

test('readback rows are oriented for a PNG, with transparent margin excluded from its crop', () => {
  const side = 3;
  const bytes = new Uint8Array(side * side * 4);
  bytes.set([8, 21, 84, 255], (side * 2 + 1) * 4);
  bytes.set([4, 12, 90, 254], (side + 2) * 4);
  const out = new Uint8ClampedArray(bytes.length);
  assert.deepEqual(orientShelfPixels25(bytes, out, side), { left: 1, top: 0, width: 2, height: 2 });
  assert.deepEqual([...out.slice(4, 8)], [8, 21, 84, 255]);
  assert.equal(orientShelfPixels25(new Uint8Array(bytes.length), out, side), null);
});

test('only the exact unprofiled GT4 bytes get a side-biased shelf pose', () => {
  const product = { id: 'x1r-red', modelUrl: '/models/ai-products/587efa2d-8287-4fa2-aba4-9f075c521277.glb' };
  const asset = { report: { sha256: 'b17864e59b39faf6455ded70018795d9fb972b4d618ca33fba82e1dd472e9aab' } };
  const descriptor = { center: [1, 2, 3], radius: 1, fov: 36, front: { position: [1, 2, 8], target: [1, 2, 3] } };
  const before = structuredClone(descriptor);
  const original = stationPose25(descriptor, [0, 0, 0], 352, 352);
  const pose = shelfPose25(asset, descriptor, product);
  const [x, y, z] = pose.position.map((value, index) => value - pose.target[index]);
  assert(x > z * 2 && y > 0);
  assert.deepEqual(pose.target, descriptor.center);
  assert.equal(pose.distance, original.distance);
  assert.deepEqual(descriptor, before);
  for (const [candidate, source] of [
    [{ ...product, id: 'another-gt4' }, asset],
    [{ ...product, modelUrl: '/models/replacement.glb' }, asset],
    [{ ...product, presentation3d: {} }, asset],
    [product, { ...asset, profile: {} }],
    [product, { report: { sha256: '0'.repeat(64) } }],
    [product, {}],
  ]) assert.deepEqual(shelfPose25(source, descriptor, candidate), original);
});

test('an offscreen draw failure restores the live renderer and releases only the capture target', () => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, .5), new THREE.MeshStandardMaterial());
  const scene = new THREE.Scene();
  scene.add(mesh);
  const asset = {
    scene,
    measured: { box: new THREE.Box3().setFromObject(scene) },
    presentation: { center: [1, 2, 3], offset: [.25, .5, .75], rotation: [.1, .2, .3], scale: 1.25 },
  };
  const originalRender = () => assert.fail('the live mesh render hook must stay with the live scene');
  mesh.onAfterRender = originalRender;
  const descriptor = describeProduct25(asset, { id: 'a', modelUrl: '/models/a.glb' });
  const live = new THREE.Scene();
  const light = new THREE.HemisphereLight();
  live.add(light);
  const previous = { liveTarget: true };
  let disposed = false;
  const restores = [];
  const gl = {
    autoClear: false,
    getRenderTarget: () => previous,
    getActiveCubeFace: () => 2,
    getActiveMipmapLevel: () => 1,
    getClearColor: target => target.setHex(0x123456),
    getClearAlpha: () => .75,
    setRenderTarget(target, face, mip) {
      if (target !== previous) target.addEventListener('dispose', () => { disposed = true; });
      else restores.push([target, face, mip]);
    },
    setClearColor(color, alpha) { restores.push([color.isColor ? color.getHex() : color, alpha]); },
    render(portrait, camera) {
      const rendered = portrait.getObjectByProperty('isMesh', true);
      assert.notEqual(rendered, mesh);
      assert.equal(rendered.geometry, mesh.geometry);
      assert.equal(rendered.material, mesh.material);
      assert.notEqual(rendered.onAfterRender, originalRender);
      assert.deepEqual(rendered.parent.parent.position.toArray(), asset.presentation.offset);
      assert.deepEqual(rendered.parent.parent.parent.position.toArray(), asset.presentation.center);
      assert.equal(camera.aspect, 1);
      throw new Error('Capture target unavailable');
    },
  };
  assert.throws(() => captureShelfPoster25(gl, live, asset, descriptor), /Capture target unavailable/);
  assert.deepEqual(restores, [[0, 0], [previous, 2, 1], [0x123456, .75]]);
  assert.equal(gl.autoClear, false);
  assert.equal(disposed, true);
  assert.equal(mesh.parent, scene);
  assert.equal(mesh.onAfterRender, originalRender);
  assert.equal(light.parent, live);
  mesh.geometry.dispose();
  mesh.material.dispose();
});
