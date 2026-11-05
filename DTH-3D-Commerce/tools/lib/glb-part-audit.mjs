/** Offline, non-mutating GLB evidence inspection. Not a glTF conformance certificate. */
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { Matrix4, Quaternion, Vector3, Euler } from 'three';

export const AUDIT_LIMITS = Object.freeze({ bytes: 128 * 1024 * 1024, jsonBytes: 8 * 1024 * 1024, chunks: 64,
  nodes: 4096, meshes: 4096, primitives: 8192, accessors: 32768, views: 32768, materials: 4096,
  accessorCount: 64000000, decodedBytes: 512 * 1024 * 1024, hierarchyDepth: 128, vertexVisits: 64000000, indexVisits: 64000000 });
export class GLBPartAuditError extends Error {
  constructor(code, message) { super(message); this.name = 'GLBPartAuditError'; this.code = code; }
}
const fail = (code, message) => { throw new GLBPartAuditError(code, message); };
const integer = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
const validIndex = (n, rows) => integer(n, 0, rows.length - 1);
const finiteVector = (v, count) => Array.isArray(v) && v.length === count && v.every(n => typeof n === 'number' && Number.isFinite(n));
const label = value => typeof value === 'string' ? value.slice(0, 160) : '';
function list(value, maximum, name) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maximum) fail('structure', `Invalid or excessive ${name} list.`);
  return value;
}
const component = Object.freeze({ 5120: [1, 'getInt8'], 5121: [1, 'getUint8'], 5122: [2, 'getInt16'],
  5123: [2, 'getUint16'], 5125: [4, 'getUint32'], 5126: [4, 'getFloat32'] });
const dimensions = Object.freeze({ SCALAR: [1, 1], VEC2: [2, 1], VEC3: [3, 1], VEC4: [4, 1], MAT2: [2, 2], MAT3: [3, 3], MAT4: [4, 4] });
function normalizedComponent(value, accessor) {
  if (!accessor.normalized) return value;
  if (accessor.componentType === 5120) return Math.max(value / 127, -1);
  if (accessor.componentType === 5121) return value / 255;
  if (accessor.componentType === 5122) return Math.max(value / 32767, -1);
  if (accessor.componentType === 5123) return value / 65535;
  return value;
}
const emptyBounds = () => ({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
function addPoint(bounds, p) { if (!p.every(Number.isFinite)) fail('geometry', 'Nonfinite transformed geometry coordinates.'); for (let i = 0; i < 3; i++) { bounds.min[i] = Math.min(bounds.min[i], p[i]); bounds.max[i] = Math.max(bounds.max[i], p[i]); } }
function boundsResult(bounds) {
  if (!bounds || !bounds.min.every(Number.isFinite)) return null;
  return { min: [...bounds.min], max: [...bounds.max], dimensions: bounds.max.map((n, i) => n - bounds.min[i]) };
}

export function parseGLBForAudit(input, limits = AUDIT_LIMITS) {
  const bytes = input instanceof Uint8Array ? input : input instanceof ArrayBuffer ? new Uint8Array(input) : null;
  if (!bytes) fail('input', 'Expected GLB bytes.');
  const prefix = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 160)));
  if (prefix.startsWith('version https://git-lfs.github.com/spec/v1')) fail('lfs-pointer', 'Git LFS pointer, not GLB bytes. Run git lfs pull for this exact asset.');
  if (bytes.byteLength < 20 || bytes.byteLength > limits.bytes) fail('size', 'GLB is incomplete or exceeds the offline audit byte limit.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.byteLength) fail('header', 'Expected a complete GLB 2.0 header and declared length.');
  let offset = 12, json = null, bin = null;
  const chunks = [];
  while (offset < bytes.length) {
    if (chunks.length >= limits.chunks) fail('chunks', 'GLB chunk-count budget exceeded.');
    if (offset + 8 > bytes.length) fail('chunks', 'Truncated chunk header.');
    const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true); offset += 8;
    if (length % 4 || length > bytes.length - offset) fail('chunks', 'Chunk length/alignment exceeds GLB bytes.');
    chunks.push({ type, bytes: length });
    if (chunks.length === 1 && type !== 0x4e4f534a) fail('chunks', 'JSON must be the first GLB chunk.');
    if (type === 0x4e4f534a) {
      if (json || chunks.length !== 1 || length > limits.jsonBytes) fail('json', 'Duplicate, misplaced or oversized JSON chunk.');
      try { json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(offset, offset + length)).trimEnd()); }
      catch { fail('json', 'Unreadable GLB JSON.'); }
    } else if (type === 0x004e4942) {
      if (!json || bin || chunks.length !== 2) fail('chunks', 'Duplicate or misplaced BIN chunk.');
      bin = bytes.subarray(offset, offset + length);
    }
    offset += length;
  }
  if (!json || typeof json !== 'object' || Array.isArray(json) || json.asset?.version !== '2.0') fail('version', 'Expected glTF asset.version 2.0.');
  return { bytes, json, bin, chunks };
}

function inspectStructure(parsed, limits) {
  const { json: j, bin } = parsed, warnings = [];
  const nodes = list(j.nodes, limits.nodes, 'nodes'), meshes = list(j.meshes, limits.meshes, 'meshes');
  const views = list(j.bufferViews, limits.views, 'bufferViews'), accessors = list(j.accessors, limits.accessors, 'accessors');
  const materials = list(j.materials, limits.materials, 'materials'), buffers = list(j.buffers, 16, 'buffers');
  const scenes = list(j.scenes, limits.nodes, 'scenes');
  const skins = list(j.skins, limits.nodes, 'skins');
  list(j.animations, 1024, 'animations');
  for (const material of materials) if (!material || typeof material !== 'object' || Array.isArray(material)) fail('material', 'Invalid material declaration.');
  const extensionsUsed = list(j.extensionsUsed, 128, 'extensionsUsed'), extensionsRequired = list(j.extensionsRequired, 128, 'extensionsRequired');
  if ([...extensionsUsed, ...extensionsRequired].some(x => typeof x !== 'string')) fail('extensions', 'Malformed extension name.');
  let totalBytes = 0;
  for (const b of buffers) {
    if (!b || !integer(b.byteLength, 1, limits.decodedBytes) || b.uri !== undefined && typeof b.uri !== 'string') fail('buffer', 'Invalid buffer declaration.');
    totalBytes += b.byteLength;
  }
  if (totalBytes > limits.decodedBytes) fail('budget', 'Declared buffer budget exceeded.');
  const meshopt = views.some(v => v?.extensions?.EXT_meshopt_compression);
  if (buffers[0] && buffers[0].uri === undefined && !meshopt && (!bin || buffers[0].byteLength > bin.length || bin.length - buffers[0].byteLength > 3)) fail('buffer', 'Embedded buffer length does not match BIN data and padding.');
  const externalResources = [];
  buffers.forEach((b, i) => { if (b.uri !== undefined) externalResources.push({ kind: 'buffer', index: i }); });
  list(j.images, 2048, 'images').forEach((image, i) => {
    if (!image || typeof image !== 'object') fail('image', 'Invalid image declaration.');
    if (image.uri !== undefined) { if (typeof image.uri !== 'string' || image.bufferView !== undefined) fail('image', 'Invalid image URI/view combination.'); externalResources.push({ kind: 'image', index: i }); }
    if (image.bufferView !== undefined && !validIndex(image.bufferView, views)) fail('image', 'Invalid embedded image view.');
  });
  const viewInfo = views.map((v, i) => {
    if (!v || !validIndex(v.buffer, buffers) || !integer(v.byteOffset ?? 0, 0, limits.decodedBytes) || !integer(v.byteLength, 1, limits.decodedBytes) || (v.byteOffset ?? 0) + v.byteLength > buffers[v.buffer].byteLength) fail('buffer-view', `Invalid bufferView ${i} range.`);
    if (v.byteStride !== undefined && (!integer(v.byteStride, 4, 252) || v.byteStride % 4)) fail('buffer-view', `Invalid bufferView ${i} stride.`);
    const compression = v.extensions?.EXT_meshopt_compression;
    if (compression) {
      if (!validIndex(compression.buffer, buffers) || !integer(compression.byteOffset ?? 0, 0, limits.decodedBytes) || !integer(compression.byteLength, 1, limits.decodedBytes) || (compression.byteOffset ?? 0) + compression.byteLength > buffers[compression.buffer].byteLength || !integer(compression.count, 1, limits.accessorCount) || !integer(compression.byteStride, 1, 256) || compression.count * compression.byteStride !== v.byteLength) fail('meshopt', `Invalid compressed bufferView ${i}.`);
      if (compression.buffer === 0 && buffers[0].uri === undefined && (!bin || (compression.byteOffset ?? 0) + compression.byteLength > bin.length)) fail('meshopt', 'Compressed source exceeds BIN data.');
      return { supported: false, reason: 'Meshopt decoding not performed by this audit.' };
    }
    const supported = v.buffer === 0 && buffers[0]?.uri === undefined;
    if (supported && (!bin || (v.byteOffset ?? 0) + v.byteLength > bin.length)) fail('buffer-view', `bufferView ${i} exceeds embedded BIN data.`);
    return { supported, reason: supported ? '' : 'External/logical buffer is not read.' };
  });
  const accessorInfo = accessors.map((a, i) => {
    if (!a || !integer(a.count, 1, limits.accessorCount) || !Object.hasOwn(component, a.componentType) || !Object.hasOwn(dimensions, a.type)) fail('accessor', `Invalid accessor ${i} type/count.`);
    const [size] = component[a.componentType], [rows, columns] = dimensions[a.type], columnBytes = rows * size;
    const packed = columns > 1 ? Math.ceil(columnBytes / 4) * 4 * columns : columnBytes;
    if (a.normalized !== undefined && (typeof a.normalized !== 'boolean' || a.normalized && [5125, 5126].includes(a.componentType))) fail('accessor', `Invalid accessor ${i} normalization.`);
    for (const key of ['min', 'max']) if (a[key] !== undefined && (!finiteVector(a[key], rows * columns))) fail('accessor', `Invalid accessor ${i} ${key}.`);
    if (a.min && a.max && a.min.some((x, k) => x > a.max[k])) fail('accessor', `Reversed accessor ${i} bounds.`);
    let info = { supported: false, reason: 'Sparse/zero-filled accessor is not decoded by this audit.', packed, size };
    if (a.bufferView !== undefined) {
      if (!validIndex(a.bufferView, views)) fail('accessor', `Invalid accessor ${i} bufferView.`);
      const v = views[a.bufferView], stride = v.byteStride ?? packed, base = a.byteOffset ?? 0;
      if (!integer(base, 0, v.byteLength) || base % size || (v.byteOffset ?? 0) % size || stride < packed || stride % size || base + (a.count - 1) * stride + packed > v.byteLength) fail('accessor', `Accessor ${i} exceeds/misaligns its bufferView.`);
      info = { ...viewInfo[a.bufferView], packed, size, stride, offset: (v.byteOffset ?? 0) + base };
    } else if (a.byteOffset !== undefined && a.byteOffset !== 0) fail('accessor', `Accessor ${i} without a view has a byteOffset.`);
    if (a.sparse) {
      const s = a.sparse;
      if (!integer(s.count, 1, a.count) || !s.indices || !s.values || ![5121, 5123, 5125].includes(s.indices.componentType) || !validIndex(s.indices.bufferView, views) || !validIndex(s.values.bufferView, views)) fail('sparse', `Invalid sparse accessor ${i}.`);
      for (const [part, byteSize] of [[s.indices, component[s.indices.componentType][0]], [s.values, packed]]) {
        const v = views[part.bufferView], offset = part.byteOffset ?? 0;
        if (!integer(offset, 0, v.byteLength) || offset + s.count * byteSize > v.byteLength) fail('sparse', `Sparse accessor ${i} exceeds its bufferView.`);
      }
      info = { ...info, supported: false, reason: 'Sparse accessor values are not decoded by this audit.' };
    }
    return info;
  });
  const parents = new Int32Array(nodes.length).fill(-1), state = new Uint8Array(nodes.length);
  for (const [i, n] of nodes.entries()) {
    if (!n || typeof n !== 'object' || Array.isArray(n)) fail('node', `Invalid node ${i}.`);
    if (n.mesh !== undefined && !validIndex(n.mesh, meshes)) fail('node', `Invalid node ${i} mesh reference.`);
    if (n.skin !== undefined && !validIndex(n.skin, skins)) fail('node', `Invalid node ${i} skin reference.`);
    if (n.matrix !== undefined && ['translation', 'rotation', 'scale'].some(k => n[k] !== undefined)) fail('transform', `Node ${i} mixes matrix and TRS.`);
    for (const [key, count] of [['matrix', 16], ['translation', 3], ['rotation', 4], ['scale', 3]]) if (n[key] !== undefined && !finiteVector(n[key], count)) fail('transform', `Invalid node ${i} ${key}.`);
    if (n.matrix && (n.matrix[3] !== 0 || n.matrix[7] !== 0 || n.matrix[11] !== 0 || n.matrix[15] !== 1)) fail('transform', `Node ${i} matrix is not affine.`);
    if (n.rotation && Math.abs(Math.hypot(...n.rotation) - 1) > 1e-4) fail('transform', `Node ${i} quaternion is not normalized.`);
    for (const child of list(n.children, limits.nodes, 'children')) {
      if (!validIndex(child, nodes) || parents[child] !== -1) fail('hierarchy', `Invalid/multiple parent for node ${child}.`);
      parents[child] = i;
    }
  }
  const visit = (i, depth) => {
    if (depth > limits.hierarchyDepth || state[i] === 1) fail('hierarchy', 'Cyclic or excessively deep hierarchy.');
    if (state[i] === 2) return;
    state[i] = 1; for (const child of nodes[i].children || []) visit(child, depth + 1); state[i] = 2;
  };
  // Walk actual roots so depth is absolute. Index-order memoization must not reset depth.
  nodes.forEach((_, i) => { if (parents[i] === -1) visit(i, 0); });
  if (state.some(value => value !== 2)) fail('hierarchy', 'A cyclic hierarchy has no parentless root.');
  for (const skin of skins) if (!skin || !Array.isArray(skin.joints) || !skin.joints.length || skin.joints.some(i => !validIndex(i, nodes))) fail('skin', 'Invalid skin joint references.');
  for (const [i, scene] of scenes.entries()) {
    if (!scene || typeof scene !== 'object') fail('scene', `Invalid scene ${i}.`);
    const roots = list(scene.nodes, limits.nodes, 'scene roots'), seen = new Set();
    for (const root of roots) { if (!validIndex(root, nodes) || parents[root] !== -1 || seen.has(root)) fail('scene', `Invalid scene ${i} root.`); seen.add(root); }
  }
  if (j.scene !== undefined && !validIndex(j.scene, scenes)) fail('scene', 'Invalid default scene.');
  let primitiveCount = 0;
  const primitiveInfo = meshes.map((mesh, mi) => list(mesh?.primitives, limits.primitives, 'primitives').map((p, pi) => {
    if (++primitiveCount > limits.primitives) fail('budget', 'Primitive budget exceeded.');
    if (!p || !p.attributes || !validIndex(p.attributes.POSITION, accessors)) fail('primitive', `Mesh ${mi} primitive ${pi} is missing POSITION.`);
    for (const ai of Object.values(p.attributes)) if (!validIndex(ai, accessors)) fail('primitive', 'Invalid attribute accessor reference.');
    const a = accessors[p.attributes.POSITION];
    if (a.type !== 'VEC3' || a.componentType !== 5126 && (!extensionsUsed.includes('KHR_mesh_quantization') || ![5120, 5121, 5122, 5123].includes(a.componentType))) fail('primitive', 'POSITION requires VEC3 float or declared 8/16-bit quantization.');
    if (a.componentType !== 5126 && !extensionsRequired.includes('KHR_mesh_quantization')) fail('primitive', 'Quantized POSITION requires KHR_mesh_quantization in extensionsRequired.');
    for (const ai of Object.values(p.attributes)) {
      const info = accessorInfo[ai];
      if (info.offset !== undefined && (info.offset % 4 || (accessors[ai].byteOffset ?? 0) % 4 || info.stride % 4)) fail('primitive', 'Vertex attribute elements must align to four-byte boundaries.');
    }
    if (Object.values(p.attributes).some(ai => accessors[ai].count !== a.count)) fail('primitive', 'Attribute counts differ within one primitive.');
    if (p.material !== undefined && !validIndex(p.material, materials)) fail('primitive', 'Invalid material reference.');
    if (p.mode !== undefined && !integer(p.mode, 0, 6)) fail('primitive', 'Invalid primitive topology.');
    let indices = null;
    if (p.indices !== undefined) {
      if (!validIndex(p.indices, accessors)) fail('indices', 'Invalid indices accessor.'); indices = accessors[p.indices];
      if (indices.type !== 'SCALAR' || ![5121, 5123, 5125].includes(indices.componentType) || indices.normalized) fail('indices', 'Indices must be unsigned scalar, non-normalized.');
    }
    const count = indices ? indices.count : a.count, mode = p.mode ?? 4;
    if (mode === 4 && count % 3 || mode === 1 && count % 2) fail('primitive', 'Incomplete primitive topology.');
    const reasons = [];
    if (!accessorInfo[p.attributes.POSITION].supported) reasons.push(accessorInfo[p.attributes.POSITION].reason);
    if (indices && !accessorInfo[p.indices].supported) reasons.push(accessorInfo[p.indices].reason);
    if (p.extensions?.KHR_draco_mesh_compression) reasons.push('Draco decoding is not performed by this audit.');
    if (p.targets?.length) reasons.push('Morph targets require evaluated runtime bounds.');
    return { primitive: p, supported: !reasons.length, reasons, positionAccessor: p.attributes.POSITION, indexAccessor: p.indices ?? null,
      mode, vertices: a.count, indexCount: indices?.count ?? null, triangles: mode === 4 ? count / 3 : mode === 5 || mode === 6 ? Math.max(0, count - 2) : 0 };
  }));
  if (externalResources.length) warnings.push('External resource references are counted but never loaded.');
  if (j.skins?.length || j.animations?.length) warnings.push('Skin/animation evaluation is not performed; bounds are static base geometry only.');
  if (extensionsRequired.some(x => !['KHR_mesh_quantization', 'EXT_meshopt_compression', 'KHR_draco_mesh_compression'].includes(x))) warnings.push('Required extensions beyond static vertex geometry are not evaluated; full conformance is not certified.');
  return { nodes, meshes, materials, scenes, parents, accessors, accessorInfo, primitiveInfo, externalResources, warnings, extensionsUsed, extensionsRequired };
}

/** Exact indexed base-position bounds; no image loading, decompression, renderer or source mutation. */
export function auditGLBBytes(input, { rotation = [0, 0, 0], normalizedSize = 4, limits = AUDIT_LIMITS } = {}) {
  if (!finiteVector(rotation, 3) || !Number.isFinite(normalizedSize) || normalizedSize <= 0) fail('options', 'Invalid display orientation/normalization size.');
  const parsed = parseGLBForAudit(input, limits), s = inspectStructure(parsed, limits), j = parsed.json;
  const data = parsed.bin ? new DataView(parsed.bin.buffer, parsed.bin.byteOffset, parsed.bin.byteLength) : null;
  const read = (ai, index, axis = 0) => {
    const a = s.accessors[ai], info = s.accessorInfo[ai], [size, method] = component[a.componentType];
    let value = data[method](info.offset + index * info.stride + axis * size, true);
    value = normalizedComponent(value, a);
    if (!Number.isFinite(value)) fail('geometry', 'POSITION contains nonfinite values.');
    return value;
  };
  let vertexVisits = 0, indexVisits = 0;
  const cache = s.primitiveInfo.map(primitives => primitives.map(p => {
    if (!p.supported) return { ...p, bounds: null, used: null };
    if (vertexVisits + p.vertices > limits.vertexVisits) return { ...p, supported: false, reasons: ['Offline vertex-visit budget exceeded.'], bounds: null, used: null };
    if (indexVisits + (p.indexCount || 0) > limits.indexVisits) return { ...p, supported: false, reasons: ['Offline index-visit budget exceeded.'], bounds: null, used: null };
    indexVisits += p.indexCount || 0;
    const used = p.indexAccessor === null ? null : new Uint8Array(p.vertices);
    if (used) for (let i = 0; i < p.indexCount; i++) { const index = read(p.indexAccessor, i); if (index >= p.vertices) fail('indices', 'An index exceeds the POSITION count.'); used[index] = 1; }
    const bounds = emptyBounds(), accessorBounds = emptyBounds(); let referenced = 0;
    for (let i = 0; i < p.vertices; i++) {
      vertexVisits++;
      const position = [read(p.positionAccessor, i, 0), read(p.positionAccessor, i, 1), read(p.positionAccessor, i, 2)];
      addPoint(accessorBounds, position);
      if (used && !used[i]) continue; referenced++; addPoint(bounds, position);
    }
    const declared = s.accessors[p.positionAccessor], low = declared.min?.map(n => normalizedComponent(n, declared)), high = declared.max?.map(n => normalizedComponent(n, declared));
    const outsideDeclared = low && high && boundsResult(accessorBounds) && accessorBounds.min.some((n, i) => n < low[i] - 1e-6 * Math.max(1, Math.abs(low[i])) || accessorBounds.max[i] > high[i] + 1e-6 * Math.max(1, Math.abs(high[i])));
    if (outsideDeclared) s.warnings.push('Measured referenced positions exceed declared accessor bounds; renderer framing may differ.');
    return { ...p, bounds: boundsResult(bounds), accessorBounds: boundsResult(accessorBounds), referenced, used };
  }));
  const localMatrices = s.nodes.map(n => n.matrix ? new Matrix4().fromArray(n.matrix) : new Matrix4().compose(new Vector3(...(n.translation || [0, 0, 0])), new Quaternion(...(n.rotation || [0, 0, 0, 1])), new Vector3(...(n.scale || [1, 1, 1]))));
  const worldMatrices = new Array(s.nodes.length);
  const world = i => {
    if (worldMatrices[i]) return worldMatrices[i];
    const matrix = s.parents[i] === -1 ? localMatrices[i].clone() : world(s.parents[i]).clone().multiply(localMatrices[i]);
    if (!matrix.elements.every(Number.isFinite)) fail('transform', 'Composed hierarchy transform is not finite.');
    return worldMatrices[i] = matrix;
  };
  const selectedScene = s.scenes.length ? j.scene ?? 0 : null;
  const reachable = new Set();
  const reach = i => { reachable.add(i); for (const c of s.nodes[i].children || []) reach(c); };
  for (const root of s.scenes[selectedScene]?.nodes || []) reach(root);
  const orientedMatrix = new Matrix4().makeRotationFromEuler(new Euler(...rotation, 'XYZ'));
  const sceneBounds = emptyBounds(), orientedBounds = emptyBounds(), viewerOrientedBounds = emptyBounds(); let partial = false;
  const point = new Vector3();
  const nodes = s.nodes.map((n, ni) => {
    const own = emptyBounds(), m = world(ni), oriented = orientedMatrix.clone().multiply(m);
    const unsupported = n.skin !== undefined || n.extensions?.EXT_mesh_gpu_instancing;
    if (unsupported) partial ||= reachable.has(ni);
    for (const primitive of cache[n.mesh] || []) {
      if (!primitive.supported || unsupported) { partial ||= reachable.has(ni); continue; }
      if (vertexVisits + primitive.vertices > limits.vertexVisits) { partial ||= reachable.has(ni); s.warnings.push('World-space vertex-visit budget exceeded.'); continue; }
      if (reachable.has(ni)) {
        const declaration = s.accessors[primitive.positionAccessor];
        const box = declaration.min && declaration.max ? { min: declaration.min.map(n => normalizedComponent(n, declaration)), max: declaration.max.map(n => normalizedComponent(n, declaration)) } : primitive.accessorBounds;
        // Current Three.js Box3.setFromObject uses transformed geometry AABB corners.
        for (const x of [box.min[0], box.max[0]]) for (const y of [box.min[1], box.max[1]]) for (const z of [box.min[2], box.max[2]]) {
          point.set(x, y, z).applyMatrix4(oriented); addPoint(viewerOrientedBounds, [point.x, point.y, point.z]);
        }
      }
      for (let i = 0; i < primitive.vertices; i++) {
        // Even an unused slot costs a scan. Charge every position on every instance.
        vertexVisits++; if (primitive.used && !primitive.used[i]) continue;
        point.set(read(primitive.positionAccessor, i, 0), read(primitive.positionAccessor, i, 1), read(primitive.positionAccessor, i, 2));
        point.applyMatrix4(m); addPoint(own, [point.x, point.y, point.z]);
        if (reachable.has(ni)) {
          addPoint(sceneBounds, [point.x, point.y, point.z]);
          point.set(read(primitive.positionAccessor, i, 0), read(primitive.positionAccessor, i, 1), read(primitive.positionAccessor, i, 2)).applyMatrix4(oriented);
          addPoint(orientedBounds, [point.x, point.y, point.z]);
        }
      }
    }
    return { index: ni, name: label(n.name), parent: s.parents[ni] === -1 ? null : s.parents[ni], children: [...(n.children || [])], mesh: n.mesh ?? null,
      inSelectedScene: reachable.has(ni), localTransform: n.matrix ? { matrix: [...n.matrix] } : { translation: [...(n.translation || [0, 0, 0])], rotationQuaternion: [...(n.rotation || [0, 0, 0, 1])], scale: [...(n.scale || [1, 1, 1])] },
      localMatrix: localMatrices[ni].toArray(), sceneMatrix: m.toArray(), ownGeometrySceneBounds: boundsResult(own),
      metadataKeys: Object.keys(n.extras || {}).slice(0, 32), unsupportedEvaluation: unsupported ? 'Skinning or GPU instancing is not evaluated.' : null };
  });
  const measured = boundsResult(sceneBounds), oriented = boundsResult(orientedBounds), viewerOriented = boundsResult(viewerOrientedBounds), largest = viewerOriented ? Math.max(...viewerOriented.dimensions) : 0;
  const display = !partial && largest > 0 ? { coordinateSpace: `normalized-stage-${normalizedSize}-v1`,
    algorithm: 'Current viewer: rotate XYZ; transform geometry AABB corners; uniform scale to largest dimension; center X/Z and ground minimum Y.', rotationXYZ: [...rotation], targetSize: normalizedSize,
    scale: normalizedSize / largest, translation: [-((viewerOriented.min[0] + viewerOriented.max[0]) / 2) * normalizedSize / largest, -viewerOriented.min[1] * normalizedSize / largest, -((viewerOriented.min[2] + viewerOriented.max[2]) / 2) * normalizedSize / largest],
    dimensions: viewerOriented.dimensions.map(n => n * normalizedSize / largest), physicalUnitsVerified: false } : null;
  const meshRows = s.meshes.map((mesh, mi) => ({ index: mi, name: label(mesh.name), nodes: nodes.filter(n => n.mesh === mi).map(n => n.index),
    metadataKeys: Object.keys(mesh.extras || {}).slice(0, 32), primitives: cache[mi].map((p, pi) => ({ index: pi, mode: p.mode, positionAccessor: p.positionAccessor, indexAccessor: p.indexAccessor,
      vertices: p.vertices, referencedVertices: p.referenced ?? null, indices: p.indexCount, triangles: p.triangles, material: p.primitive.material ?? null,
      attributes: { ...p.primitive.attributes }, localBounds: p.bounds, fullPositionAccessorBounds: p.accessorBounds ?? null, boundsStatus: p.supported ? 'measured-indexed-base-positions' : 'unavailable', limitations: p.reasons })) }));
  const candidates = [];
  const candidatePattern = /suspension|shock|damper|coil|ohlins|öhlins|ttx|phu[oộ]c/i;
  for (const n of nodes) if (candidatePattern.test(n.name)) candidates.push({ kind: 'node', index: n.index, name: n.name, evidence: 'Name match only; not verified mechanical identity.' });
  for (const m of meshRows) if (candidatePattern.test(m.name)) candidates.push({ kind: 'mesh', index: m.index, name: m.name, evidence: 'Name match only; not verified mechanical identity.' });
  if (!measured) s.warnings.push('No fully evaluated geometry bounds for the selected scene.');
  if (partial) s.warnings.push('Scene bounds are partial; do not use for mounting/normalization calibration.');
  const selectedPrimitives = meshRows.flatMap(m => m.primitives.filter(() => m.nodes.some(i => reachable.has(i))));
  return { schemaVersion: 1, evidence: 'Offline static structure and indexed vertex measurements; no semantic or physical certification.',
    bytes: parsed.bytes.length, sha256: createHash('sha256').update(parsed.bytes).digest('hex'), glbVersion: 2,
    gltfVersion: j.asset.version, generator: label(j.asset.generator), chunks: parsed.chunks,
    selectedScene, scenes: s.scenes.map((scene, i) => ({ index: i, name: label(scene.name), roots: [...(scene.nodes || [])] })),
    counts: { nodes: nodes.length, meshes: meshRows.length, primitives: meshRows.reduce((n, m) => n + m.primitives.length, 0), materials: s.materials.length,
      positions: selectedPrimitives.reduce((n, p) => n + p.vertices, 0), triangles: selectedPrimitives.reduce((n, p) => n + p.triangles, 0) },
    nodes, meshes: meshRows, materials: s.materials.map((m, i) => ({ index: i, name: label(m?.name), usedBy: meshRows.flatMap(mesh => mesh.primitives.filter(p => p.material === i).map(p => ({ mesh: mesh.index, primitive: p.index }))),
      alphaMode: m?.alphaMode || 'OPAQUE', doubleSided: m?.doubleSided === true, extensions: Object.keys(m?.extensions || {}), metadataKeys: Object.keys(m?.extras || {}).slice(0, 32) })),
    sceneBounds: { coordinateSpace: 'gltf-scene-space', status: partial ? 'partial' : measured ? 'measured' : 'unavailable', bounds: measured },
    orientedBounds: { rotationXYZ: [...rotation], bounds: oriented }, rendererFramingBounds: { coordinateSpace: 'oriented-geometry-aabb', bounds: viewerOriented, note: 'Current non-precise Box3 framing, including unused accessor vertices and declared bounds; distinct from referenced-vertex geometry bounds.' }, displayNormalization: display,
    coordinateNotes: ['glTF declares right-handed +Y-up coordinates and meter convention; this asset has no verified physical scale.', 'Bounds are from referenced static base POSITION values. Display normalization is not a physical measurement.', 'An AABB does not identify which axis is motorcycle forward or which triangle is a suspension.'],
    suspensionCandidates: candidates, separability: { classification: 'INDETERMINATE', mechanicallyVerified: false,
      structuralIsolation: selectedPrimitives.length === 1 && nodes.filter(n => n.inSelectedScene && n.mesh !== null).length === 1 ? 'single-primitive-whole-scene' : 'multiple-or-no-geometry-units',
      evidence: 'Mechanical identity requires visual/source-author evidence. This utility never labels anonymous triangles as a part.' },
    externalResources: s.externalResources, extensionsUsed: [...s.extensionsUsed], extensionsRequired: [...s.extensionsRequired], warnings: [...new Set(s.warnings)] };
}

export async function auditGLBFile(filename, options = {}) {
  try {
    const stat = await fs.stat(filename), limits = options.limits || AUDIT_LIMITS;
    if (!stat.isFile()) fail('file', 'Asset path is not a regular file.');
    if (stat.size > limits.bytes) fail('size', 'Asset exceeds the offline audit byte limit.');
    const bytes = await fs.readFile(filename);
    return { status: 'audited', ...auditGLBBytes(bytes, options) };
  } catch (error) {
    if (error.code === 'ENOENT') return { status: 'missing', code: 'missing', message: 'Asset not present. Check its exact path and run git lfs pull if tracked by LFS.' };
    return { status: error.code === 'lfs-pointer' ? 'lfs-pointer' : 'error', code: error.code || 'io', message: error.message };
  }
}
