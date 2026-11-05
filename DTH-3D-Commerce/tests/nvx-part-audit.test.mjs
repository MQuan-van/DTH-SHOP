import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { AUDIT_LIMITS, auditGLBBytes, auditGLBFile, parseGLBForAudit } from '../tools/lib/glb-part-audit.mjs';

function glb(json, binary = Buffer.alloc(0)) {
  const source = Buffer.from(JSON.stringify(json)), text = Buffer.alloc(Math.ceil(source.length / 4) * 4, 32); source.copy(text);
  const bin = Buffer.alloc(Math.ceil(binary.length / 4) * 4); binary.copy(bin);
  const bytes = Buffer.alloc(20 + text.length + (bin.length ? 8 + bin.length : 0));
  bytes.writeUInt32LE(0x46546c67); bytes.writeUInt32LE(2, 4); bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(text.length, 12); bytes.writeUInt32LE(0x4e4f534a, 16); text.copy(bytes, 20);
  if (bin.length) { const start = 20 + text.length; bytes.writeUInt32LE(bin.length, start); bytes.writeUInt32LE(0x004e4942, start + 4); bin.copy(bytes, start + 8); }
  return bytes;
}
function fixture({ positions = [0, 0, 0, 1, 0, 0, 0, 1, 0], indices = [0, 1, 2], patch = () => {} } = {}) {
  const points = Buffer.alloc(positions.length * 4), elements = Buffer.alloc(indices.length * 2);
  positions.forEach((n, i) => points.writeFloatLE(n, i * 4)); indices.forEach((n, i) => elements.writeUInt16LE(n, i * 2));
  const binary = Buffer.concat([points, elements]);
  const json = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }], materials: [{}],
    buffers: [{ byteLength: binary.length }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: points.length }, { buffer: 0, byteOffset: points.length, byteLength: elements.length }],
    accessors: [{ bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3' }, { bufferView: 1, componentType: 5123, count: indices.length, type: 'SCALAR' }] };
  patch(json, binary); return glb(json, binary);
}
test('reads complete GLB2 chunks, hierarchy, indexed bounds and material relationships', () => {
  const report = auditGLBBytes(fixture());
  assert.equal(report.glbVersion, 2); assert.equal(report.sha256.length, 64);
  assert.deepEqual(report.counts, { nodes: 1, meshes: 1, primitives: 1, materials: 1, positions: 3, triangles: 1 });
  assert.deepEqual(report.sceneBounds.bounds, { min: [0, 0, 0], max: [1, 1, 0], dimensions: [1, 1, 0] });
  assert.deepEqual(report.materials[0].usedBy, [{ mesh: 0, primitive: 0 }]);
  assert.equal(report.displayNormalization.physicalUnitsVerified, false);
});
test('parsing is non-mutating and accepts a byteOffset subarray', () => {
  const bytes = fixture(), before = Buffer.from(bytes), wrapped = Buffer.concat([Buffer.alloc(7), bytes, Buffer.alloc(9)]);
  assert.equal(auditGLBBytes(wrapped.subarray(7, 7 + bytes.length)).sha256, auditGLBBytes(bytes).sha256);
  assert.deepEqual(bytes, before);
});
test('unknown GLB chunks remain bounded independently of file byte size', () => {
  const source = fixture(), extra = Buffer.alloc(8 * 63);
  for (let i = 0; i < 63; i++) extra.writeUInt32LE(0x12345678, i * 8 + 4);
  const bytes = Buffer.concat([source, extra]); bytes.writeUInt32LE(bytes.length, 8);
  assert.throws(() => auditGLBBytes(bytes), { code: 'chunks' });
});
test('LFS text is identified separately from malformed binary', () => {
  assert.throws(() => parseGLBForAudit(Buffer.from('version https://git-lfs.github.com/spec/v1\noid sha256:' + 'a'.repeat(64))), { code: 'lfs-pointer' });
  assert.throws(() => parseGLBForAudit(Buffer.from('<html>404</html>')), { code: 'size' });
});
for (const [name, change, code] of [
  ['wrong magic', b => b.writeUInt32LE(0, 0), 'header'], ['wrong version', b => b.writeUInt32LE(1, 4), 'header'],
  ['wrong declared length', b => b.writeUInt32LE(b.length - 4, 8), 'header'],
  ['first chunk not JSON', b => b.writeUInt32LE(0x004e4942, 16), 'chunks'],
  ['misaligned chunk', b => b.writeUInt32LE(3, 12), 'chunks'],
  ['truncated chunk range', b => b.writeUInt32LE(b.length + 4, 12), 'chunks'],
]) test(`rejects ${name}`, () => { const bytes = fixture(); change(bytes); assert.throws(() => auditGLBBytes(bytes), { code }); });
for (const [name, patch, code] of [
  ['buffer outside BIN', j => j.buffers[0].byteLength += 4, 'buffer'],
  ['view outside declared buffer', j => j.bufferViews[0].byteLength += 100, 'buffer-view'],
  ['accessor outside view', j => j.accessors[0].count += 1, 'accessor'],
  ['misaligned attribute offset', j => j.accessors[0].byteOffset = 1, 'accessor'],
  ['illegal stride', j => j.bufferViews[0].byteStride = 13, 'buffer-view'],
  ['bad accessor count', j => j.accessors[0].count = Number.MAX_SAFE_INTEGER, 'accessor'],
  ['bad index accessor type', j => j.accessors[1].componentType = 5122, 'indices'],
  ['invalid material', j => j.meshes[0].primitives[0].material = 2, 'primitive'],
  ['bad node mesh', j => j.nodes[0].mesh = 3, 'node'],
  ['matrix mixed with TRS', j => { j.nodes[0].matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; j.nodes[0].translation = [0, 0, 0]; }, 'transform'],
  ['non-unit quaternion', j => j.nodes[0].rotation = [1, 2, 3, 4], 'transform'],
  ['invalid scene root', j => j.scenes[0].nodes = [9], 'scene'],
  ['invalid default scene', j => j.scene = 2, 'scene'],
  ['self cycle', j => j.nodes[0].children = [0], 'hierarchy'],
  ['multiple parents', j => { j.nodes = [{ children: [2] }, { children: [2] }, { mesh: 0 }]; }, 'hierarchy'],
]) test(`validates ${name}`, () => assert.throws(() => auditGLBBytes(fixture({ patch })), { code }));
test('every element index is checked against POSITION count', () => {
  assert.throws(() => auditGLBBytes(fixture({ indices: [0, 1, 9] })), { code: 'indices' });
});
test('referenced-vertex bounds exclude unused outliers but renderer framing retains them', () => {
  const report = auditGLBBytes(fixture({ positions: [0, 0, 0, 1, 0, 0, 0, 1, 0, 100, 100, 100] }));
  assert.deepEqual(report.sceneBounds.bounds.max, [1, 1, 0]);
  assert.deepEqual(report.meshes[0].primitives[0].fullPositionAccessorBounds.max, [100, 100, 100]);
  assert.equal(report.meshes[0].primitives[0].referencedVertices, 3);
  assert.equal(report.displayNormalization.scale, .04);
});
test('NaN/Infinity coordinates cannot produce apparently measured bounds', () => {
  for (const value of [NaN, Infinity, -Infinity]) assert.throws(() => auditGLBBytes(fixture({ positions: [value, 0, 0, 1, 0, 0, 0, 1, 0] })), { code: 'geometry' });
});
test('hierarchy composes parent translation, child quaternion and scale in glTF order', () => {
  const report = auditGLBBytes(fixture({ patch(j) { j.nodes = [{ translation: [10, 0, 0], children: [1] }, { mesh: 0, translation: [2, 0, 0], rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2], scale: [2, 2, 2] }]; } }));
  assert.equal(report.nodes[1].parent, 0);
  assert(Math.abs(report.sceneBounds.bounds.min[0] - 10) < 1e-12);
  assert(Math.abs(report.sceneBounds.bounds.max[0] - 12) < 1e-12);
  assert(Math.abs(report.sceneBounds.bounds.max[1] - 2) < 1e-12);
});
test('reverse-indexed node chains cannot bypass absolute hierarchy depth limits', () => {
  const bytes = fixture({ patch(j) { j.nodes = [{ mesh: 0 }]; for (let i = 1; i < 130; i++) j.nodes.push({ children: [i - 1] }); j.scenes[0].nodes = [129]; } });
  assert.throws(() => auditGLBBytes(bytes), { code: 'hierarchy' });
});
test('matrix transforms, negative scale and display rotation remain separate from source coordinates', () => {
  const report = auditGLBBytes(fixture({ patch(j) { j.nodes[0].matrix = [-2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 1, 0, 5, 4, 0, 1]; } }), { rotation: [0, Math.PI / 2, 0] });
  assert.deepEqual(report.sceneBounds.bounds.min, [3, 4, 0]); assert.deepEqual(report.sceneBounds.bounds.max, [5, 7, 0]);
  assert.equal(report.displayNormalization.targetSize, 4); assert.equal(report.displayNormalization.scale, 4 / 3);
  assert.equal(report.displayNormalization.physicalUnitsVerified, false);
});
test('nodes outside default scene are inventoried but excluded from scene bounds', () => {
  const report = auditGLBBytes(fixture({ patch(j) { j.nodes.push({ mesh: 0, translation: [100, 0, 0] }); } }));
  assert.equal(report.nodes[1].inSelectedScene, false); assert.equal(report.sceneBounds.bounds.max[0], 1);
});
test('the same mesh can be instanced at two scene nodes without losing transforms', () => {
  const report = auditGLBBytes(fixture({ patch(j) { j.nodes.push({ mesh: 0, translation: [2, 0, 0] }); j.scenes[0].nodes.push(1); } }));
  assert.deepEqual(report.meshes[0].nodes, [0, 1]); assert.equal(report.sceneBounds.bounds.max[0], 3);
});
test('name matches remain candidates and never automatically certify separability', () => {
  const report = auditGLBBytes(fixture({ patch(j) { j.nodes[0].name = 'Rear shock'; j.meshes[0].name = 'Ohlins TTX'; } }));
  assert.equal(report.suspensionCandidates.length, 2); assert.equal(report.separability.classification, 'INDETERMINATE');
  assert.equal(report.separability.mechanicallyVerified, false);
});
test('anonymous single-primitive geometry is identified only as a structural isolation limit', () => {
  const report = auditGLBBytes(fixture()); assert.equal(report.suspensionCandidates.length, 0);
  assert.equal(report.separability.structuralIsolation, 'single-primitive-whole-scene');
});
test('Meshopt data is bounded but not falsely reported as measured positions', () => {
  const report = auditGLBBytes(fixture({ patch(j) {
    j.extensionsUsed = ['EXT_meshopt_compression']; j.bufferViews[0].extensions = { EXT_meshopt_compression: { buffer: 0, byteOffset: 0, byteLength: 12, count: 3, byteStride: 12, mode: 'ATTRIBUTES' } };
  } }));
  assert.equal(report.sceneBounds.status, 'partial'); assert.equal(report.sceneBounds.bounds, null);
  assert.equal(report.displayNormalization, null); assert.match(report.meshes[0].primitives[0].limitations.join(), /Meshopt/);
});
test('external references are never fetched and cannot become measured bounds', () => {
  const report = auditGLBBytes(fixture({ patch(j) { j.buffers[0].uri = 'https://example.invalid/private.bin'; } }));
  assert.deepEqual(report.externalResources, [{ kind: 'buffer', index: 0 }]); assert.equal(report.sceneBounds.bounds, null);
});
test('skinned evaluation is explicitly unmeasured', () => {
  const report = auditGLBBytes(fixture({ patch(j) { j.nodes[0].skin = 0; j.skins = [{ joints: [0] }]; } }));
  assert.equal(report.sceneBounds.status, 'partial'); assert.equal(report.displayNormalization, null);
  assert.match(report.nodes[0].unsupportedEvaluation, /Skinning/);
});
test('sparse overrides are structurally bounded and never silently treated as base values', () => {
  const report = auditGLBBytes(fixture({ patch(j) { j.accessors[0].sparse = { count: 1, indices: { bufferView: 1, componentType: 5123 }, values: { bufferView: 0 } }; } }));
  assert.equal(report.sceneBounds.status, 'partial'); assert.equal(report.displayNormalization, null);
  assert.match(report.meshes[0].primitives[0].limitations.join(), /Sparse/);
  assert.throws(() => auditGLBBytes(fixture({ patch(j) { j.accessors[0].sparse = { count: 4, indices: { bufferView: 1, componentType: 5123 }, values: { bufferView: 0 } }; } })), { code: 'sparse' });
});
test('quantized POSITION values use normalized integer conversion without inventing physical units', () => {
  const binary = Buffer.from([0, 0, 0, 0, 127, 0, 0, 0, 0, 127, 0, 0, 0, 1, 2]);
  const json = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    extensionsUsed: ['KHR_mesh_quantization'], extensionsRequired: ['KHR_mesh_quantization'], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    buffers: [{ byteLength: 15 }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 12, byteStride: 4 }, { buffer: 0, byteOffset: 12, byteLength: 3 }],
    accessors: [{ bufferView: 0, componentType: 5120, count: 3, type: 'VEC3', normalized: true, min: [0, 0, 0], max: [127, 127, 0] }, { bufferView: 1, componentType: 5121, count: 3, type: 'SCALAR' }] };
  const report = auditGLBBytes(glb(json, binary));
  assert.deepEqual(report.sceneBounds.bounds.max, [1, 1, 0]); assert.equal(report.displayNormalization.physicalUnitsVerified, false);
  assert.equal(report.displayNormalization.scale, 4);
});
test('bounded inspection cannot silently normalize a budget-truncated scene', () => {
  const report = auditGLBBytes(fixture(), { limits: { ...AUDIT_LIMITS, vertexVisits: 3 } });
  assert.equal(report.sceneBounds.status, 'partial'); assert.equal(report.displayNormalization, null);
});
test('full POSITION scans are charged for each instance even when only three vertices are indexed', () => {
  const positions = [0, 0, 0, 1, 0, 0, 0, 1, 0, ...Array(27).fill(0)];
  const bytes = fixture({ positions, patch(j) { j.nodes.push({ mesh: 0, translation: [10, 0, 0] }); j.scenes[0].nodes.push(1); } });
  const report = auditGLBBytes(bytes, { limits: { ...AUDIT_LIMITS, vertexVisits: 24 } });
  assert.equal(report.sceneBounds.status, 'partial'); assert.equal(report.displayNormalization, null);
  assert(report.warnings.some(w => /World-space vertex-visit budget/.test(w)));
});
test('repeated index work has its own finite budget', () => {
  const report = auditGLBBytes(fixture(), { limits: { ...AUDIT_LIMITS, indexVisits: 2 } });
  assert.equal(report.sceneBounds.status, 'partial'); assert.equal(report.displayNormalization, null);
  assert.match(report.meshes[0].primitives[0].limitations.join(), /index-visit budget/);
});
test('missing files and LFS pointers report useful distinct statuses without touching source bytes', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dth-part-audit-'));
  assert.equal(path.dirname(path.resolve(dir)).toLowerCase(), path.resolve(os.tmpdir()).toLowerCase());
  assert(path.basename(dir).startsWith('dth-part-audit-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const missing = await auditGLBFile(path.join(dir, 'missing.glb')); assert.equal(missing.status, 'missing');
  const pointer = path.join(dir, 'pointer.glb'), value = 'version https://git-lfs.github.com/spec/v1\noid sha256:' + 'a'.repeat(64) + '\nsize 1000\n';
  await fs.writeFile(pointer, value); assert.equal((await auditGLBFile(pointer)).status, 'lfs-pointer'); assert.equal(await fs.readFile(pointer, 'utf8'), value);
});
test('CLI help is Windows/cwd-independent and refuses an output outside the report area', () => {
  const cli = fileURLToPath(new URL('../tools/audit-nvx-parts.mjs', import.meta.url));
  const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8', cwd: os.tmpdir() });
  assert.equal(help.status, 0); assert.match(help.stdout, /No GLB\/database\/network writes/);
  const bad = spawnSync(process.execPath, [cli, '--output', 'shared/catalog.json'], { encoding: 'utf8' });
  assert.notEqual(bad.status, 0); assert.match(bad.stderr, /test-results/);
});
