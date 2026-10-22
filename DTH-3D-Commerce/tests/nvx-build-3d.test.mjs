import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clamp, easeInCubic, easeOutCubic, nextIndex, swipeDirection, transitionDirection, fitDistance, validateGLB } from '../frontend/src/shop/discovery174/nvx3d/nvx3d.logic.mjs';
import { NVX_MODELS, publicAsset } from '../frontend/src/shop/discovery174/nvx3d/nvx3d.config.mjs';

const vehicles = ['v1', 'v2', 'v3'].map(id => ({ id }));
function minimalGLB() {
  const json = JSON.stringify({ asset: { version: '2.0' } });
  const size = Math.ceil(json.length / 4) * 4;
  const buffer = new ArrayBuffer(20 + size);
  const view = new DataView(buffer);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true);
  view.setUint32(8, buffer.byteLength, true); view.setUint32(12, size, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(buffer, 20).fill(32);
  new Uint8Array(buffer, 20, json.length).set(new TextEncoder().encode(json));
  return buffer;
}

test('V3 owns its GLB; V1 and V2 are not disguised copies', () => {
  assert.notEqual(NVX_MODELS['yamaha-nvx-v1'].file, NVX_MODELS['yamaha-nvx-v3'].file);
  assert.notEqual(NVX_MODELS['yamaha-nvx-v2'].file, NVX_MODELS['yamaha-nvx-v3'].file);
  assert.equal(NVX_MODELS['yamaha-nvx-v3'].file, 'models/nvx/nvx-v3.glb');
});
test('next and previous wrap correctly', () => {
  assert.equal(nextIndex(2, 1, 3), 0); assert.equal(nextIndex(0, -1, 3), 2);
  assert.equal(nextIndex(1, 1, 3), 2); assert.equal(nextIndex(0, 1, 0), -1);
});
test('short gestures and vertical page scrolling do not change versions', () => {
  assert.equal(swipeDirection(25, 0), 0); assert.equal(swipeDirection(90, 130), 0);
  assert.equal(swipeDirection(-100, 5), 1); assert.equal(swipeDirection(100, 5), -1);
});
test('swipe thresholds work on a narrow phone and a wide desktop', () => {
  assert.equal(swipeDirection(-50, 0, 300), 1);
  assert.equal(swipeDirection(-70, 0, 1500), 0);
  assert.equal(swipeDirection(-95, 0, 1500), 1);
});
test('explicit transition direction survives cyclic navigation', () => {
  assert.equal(transitionDirection('v3', 'v1', vehicles, 1), 1);
  assert.equal(transitionDirection('v1', 'v3', vehicles, -1), -1);
  assert.equal(transitionDirection('v3', 'v1', vehicles), -1);
});
test('sphere fitting moves the camera back for narrow aspect ratios', () => {
  const wide = fitDistance(2, 35, 2), narrow = fitDistance(2, 35, 0.7);
  assert.ok(narrow > wide); assert.ok(wide > 2);
  assert.throws(() => fitDistance(0, 35, 1));
});
test('easing is bounded and reaches exact transition endpoints', () => {
  for (const ease of [easeInCubic, easeOutCubic]) {
    assert.equal(ease(0), 0); assert.equal(ease(1), 1);
    assert.equal(ease(-5), 0); assert.equal(ease(5), 1);
  }
  assert.equal(clamp(12, 1, 3), 3);
});
test('valid GLB header and chunks pass', () => assert.equal(validateGLB(minimalGLB()), true));
test('HTML 404 fallback is not accepted as a GLB', () => {
  assert.throws(() => validateGLB(new TextEncoder().encode('<!doctype html><html></html>').buffer), /Expected GLB/);
});
test('truncated, wrong-version and oversized GLBs fail explicitly', () => {
  const bytes = minimalGLB();
  assert.throws(() => validateGLB(bytes.slice(0, -1)), /incomplete/);
  assert.throws(() => validateGLB(bytes, 20), /size limit/);
  new DataView(bytes).setUint32(4, 1, true);
  assert.throws(() => validateGLB(bytes), /2.0/);
});
test('local public URLs do not include the literal public directory', () => {
  assert.equal(publicAsset('models/nvx/nvx-v3.glb'), '/models/nvx/nvx-v3.glb');
  assert.equal(publicAsset(null), null);
  assert.equal(publicAsset('decoders/nvx3d/draco/'), '/decoders/nvx3d/draco/');
});
test('version gestures live outside the canvas host', () => {
  const source = readFileSync(new URL('../frontend/src/shop/discovery174/nvx3d/NVXBuildStudio.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes('className="nvx3d-swipe"'));
  assert.ok(source.includes('onPointerUp={pointerUp}'));
  assert.ok(!source.includes('drag="x"'));
  assert.ok(source.includes('onVehicle(id)'));
});
test('renderer handles disposal and compressed assets without a remote HDR', () => {
  const source = readFileSync(new URL('../frontend/src/shop/discovery174/nvx3d/createNVXStage.mjs', import.meta.url), 'utf8');
  assert.ok(source.includes('setDRACOLoader'));
  assert.ok(source.includes('setKTX2Loader'));
  assert.ok(source.includes('setMeshoptDecoder'));
  assert.ok(source.includes('renderer.dispose()'));
  assert.ok(source.includes('observer.disconnect()'));
  assert.ok(!source.includes('https://'));
});
