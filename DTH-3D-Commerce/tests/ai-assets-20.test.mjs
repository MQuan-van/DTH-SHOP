import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { AIAssetService } from '../backend/commerce/ai-assets/aiAssets.service.mjs';
import { safeName, imageId, validateSelection, isGLBHeader, safeDownloadUrl } from '../backend/commerce/ai-assets/aiAssets.logic.mjs';

function testGLB() {
  const contents = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [] }] }));
  const bytes = Buffer.alloc(Math.ceil(contents.length / 4) * 4, 32);
  contents.copy(bytes);
  const glb = Buffer.alloc(20 + bytes.length);
  glb.write('glTF', 0);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(bytes.length, 12);
  glb.write('JSON', 16);
  bytes.copy(glb, 20);
  return glb;
}
const reply = data => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
const fixture = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dth-ai-step20-'));
  const inbox = path.join(root, 'inbox'), output = path.join(root, 'generated');
  await fs.mkdir(inbox);
  const png = await sharp({ create: { width: 48, height: 48, channels: 3, background: 'white' } }).png().toBuffer();
  await fs.writeFile(path.join(inbox, 'nvx-left.png'), png);
  await fs.writeFile(path.join(inbox, 'nvx-right.png'), png);
  let posts = 0;
  let lastBody;
  const fetchImpl = async (url, opts = {}) => {
    if (opts.method === 'POST') {
      posts++;
      lastBody = JSON.parse(opts.body);
      return reply({ result: 'mesh-task-fake-1001' });
    }
    if (url.includes('/openapi/v1/')) return reply({ status: 'SUCCEEDED', progress: 100, consumed_credits: 30,
      model_urls: { glb: 'https://assets.meshy.ai/test.glb' } });
    if (url === 'https://assets.meshy.ai/test.glb') return new Response(testGLB(), { status: 200, headers: { 'Content-Type': 'model/gltf-binary' } });
    throw new Error(`Unexpected fetch ${url}`);
  };
  const studio = new AIAssetService({ inbox, output, key: 'msy_fake_key_for_tests_only', fetchImpl });
  await studio.start();
  return { studio, root, getPosts: () => posts, getBody: () => lastBody };
};
async function until(fn) { for (let n = 0; n < 80; n++) { if (fn()) return; await new Promise(resolve => setTimeout(resolve, 5)); } throw new Error('Timed out waiting for mocked request.'); }

test('filename and image selection guards reject paths, duplicates and too many views', () => {
  assert.ok(safeName('NVX-V2_front.webp'));
  assert.ok(!safeName('../sneaky.png'));
  assert.ok(!safeName('C:\\tmp\\photo.png'));
  assert.ok(!safeName('.hidden.png'));
  assert.ok(!safeName('other.glb'));
  const id = imageId('nvx.png', { size: 123, mtimeMs: 555 });
  assert.equal(id.length, 32);
  assert.throws(() => validateSelection([id, id]), /different/);
  assert.throws(() => validateSelection([]), /Choose/);
  assert.throws(() => validateSelection(Array(5).fill('a'.repeat(32))), /Choose/);
});
test('download URL allowlist blocks arbitrary external and private hosts', () => {
  assert.equal(safeDownloadUrl('https://assets.meshy.ai/example.glb'), 'https://assets.meshy.ai/example.glb');
  for (const url of ['http://assets.meshy.ai/file.glb', 'https://127.0.0.1/secret', 'https://assets.meshy.ai.evil.example/file', 'file:///etc/passwd', 'https://user:pass@assets.meshy.ai/a']) {
    assert.throws(() => safeDownloadUrl(url), /trusted|invalid/);
  }
});
test('GLB header rejects HTML', () => {
  const valid = testGLB(); assert.equal(isGLBHeader(valid.subarray(0, 20), valid.length), true);
  const html = Buffer.from('<html>not a GLB</html>'); assert.equal(isGLBHeader(html, html.length), false);
});
test('scan photos, require explicit credit approval and generate via mocked multi-view API', async t => {
  const { studio, root, getPosts, getBody } = await fixture();
  t.after(async () => { studio.close(); await fs.rm(root, { recursive: true, force: true }); });
  await studio.scan();
  const images = studio.images;
  assert.equal(images.length, 2);
  await assert.rejects(studio.createJob({ imageIds: images.map(x => x.id), confirmed: false }), /Confirm/);
  assert.equal(getPosts(), 0);
  const created = await studio.createJob({ imageIds: images.map(x => x.id), confirmed: true });
  assert.equal(created.status, 'SUBMITTING');
  await until(() => studio.getJob(created.id).providerTaskId !== null);
  assert.equal(getPosts(), 1);
  assert.equal(getBody().image_urls.length, 2);
  assert.equal(getBody().target_formats[0], 'glb');
  assert.equal(getBody().image_urls[0].startsWith('data:image/png;base64,'), true);
  await studio.refreshJob(studio.getJob(created.id));
  const file = await studio.modelFile(created.id);
  assert.equal((await fs.readFile(file)).subarray(0, 4).toString(), 'glTF');
  assert.equal(studio.jobsList()[0].consumedCredits, 30);
  await assert.rejects(studio.publish(created.id, 'v3', false), /Confirm/);
  assert.deepEqual(studio.manifest(), {});
  await studio.publish(created.id, 'v3', true);
  assert.match(studio.manifest()['yamaha-nvx-v3'].url, /^api\/shop\/ai-assets\/models\/v3\.glb\?rev=/);
  assert.equal(await studio.publishedFile('v3'), file);
  assert.equal(getPosts(), 1, 'publishing must not create another paid Meshy request');
});
test('job and published state survive a service restart', async t => {
  const { studio, root } = await fixture();
  t.after(async () => { studio.close(); await fs.rm(root, { recursive: true, force: true }); });
  const single = await studio.createJob({ imageIds: [studio.images[0].id], confirmed: true });
  await until(() => studio.getJob(single.id).providerTaskId !== null);
  await studio.refreshJob(studio.getJob(single.id));
  await studio.publish(single.id, 'v2', true);
  const restarted = new AIAssetService({ inbox: studio.inbox, output: studio.output, key: 'fake', fetchImpl: studio.fetch });
  await restarted.start(); t.after(() => restarted.close());
  assert.equal(restarted.jobsList()[0].modelAvailable, true);
  assert.equal(restarted.manifest()['yamaha-nvx-v2'].url.includes('v2.glb'), true);
});
