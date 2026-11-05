import test from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Euler, Matrix4, Vector3 } from 'three';
import { CATEGORIES } from '../shared/categories.mjs';
import { MOUNT_SLOTS234, createMountDraft234, createVehicleAssembly234, validateMountCalibration234, validateAssetBinding234, mountingReadiness234 } from '../shared/mounting234.mjs';
import { createAssemblyController234, vehicleDisplayFrame234, transformPoint234 } from '../frontend/src/experience/mounting234/assembly234.mjs';

// Synthetic authoring fixtures only. No fixture transform is published as production calibration.
const vehicle = { id: 'yamaha-nvx-v2', assetUrl: '/models/nvx/nvx-v2.glb', sha256: 'a'.repeat(64), rotationXYZ: [0, 0, 0] };
const product = { id: 'test-shock', assetUrl: '/models/test/shock.glb', sha256: 'b'.repeat(64), category: 'suspension' };
const review = { reviewer: 'fixture-reviewer', evidence: 'Synthetic segmented boxes for ownership tests; no motorcycle fitment claim.', reviewedAt: '2026-11-04T00:00:00.000Z' };
const make = () => createMountDraft234({ vehicle, product, mountId: 'suspension-rear' });
const authored = (status = 'reviewed') => ({ ...make(), calibrationStatus: status, mountFrame: { position: [1, 2, 3], rotationXYZ: [0, .5, 0] }, partTransform: { position: [.2, .3, .4], rotationXYZ: [.2, 0, 0], scale: .25 }, review: status === 'reviewed' ? { ...review } : null });
const replaceable = () => ({ ...authored(), stock: { classification: 'separable', nodeIndices: [1], review: { ...review } } });
const options = extra => ({ vehicle, product, catalogStatus: 'compatible', ...extra });
const mesh = () => new Mesh(new BoxGeometry(), new MeshBasicMaterial());
const source = () => { const root = new Group(); root.add(mesh(), mesh(), mesh()); return root; };
function asset(binding = product) { const root = new Group(); root.add(mesh()); return { root, binding, ownership: 'exclusive', releases: 0, dispose() { this.releases++; this.root.traverse(m => { m.geometry?.dispose(); m.material?.dispose(); }); } }; }
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const nearly = (a, b) => a.forEach((n, i) => assert(Math.abs(n - b[i]) < 1e-9, `${a} != ${b}`));

test('registry covers current six categories without fabricated vehicle coordinates', () => {
  assert.deepEqual([...new Set(MOUNT_SLOTS234.map(s => s.category))].sort(), [...CATEGORIES].sort());
  assert.equal(new Set(MOUNT_SLOTS234.map(s => s.id)).size, MOUNT_SLOTS234.length);
  assert(Object.isFrozen(MOUNT_SLOTS234)); assert(MOUNT_SLOTS234.every(Object.isFrozen));
  assert.deepEqual(createVehicleAssembly234(vehicle).mounts, []);
  const d = make(); assert.equal(d.mountFrame, null); assert.equal(d.partTransform, null); assert.equal(d.calibrationStatus, 'unverified');
});
test('source definitions are copied, including review and node allowlists', () => {
  const input = replaceable(), snapshot = structuredClone(input), clean = validateMountCalibration234(input);
  clean.mountFrame.position[0] = 77; clean.stock.nodeIndices.push(2); clean.vehicle.rotationXYZ[0] = 4; clean.review.reviewer = 'other';
  assert.deepEqual(input, snapshot);
});
for (const patch of [{ sha256: 'bad' }, { id: 'yamaha-nvx-v3' }, { assetUrl: '/models/nvx/nvx-v3.glb' }, { assetUrl: 'https://example.com/v2.glb' }, { assetUrl: '/models/../v2.glb' }, { rotationXYZ: [NaN, 0, 0] }]) test(`invalid vehicle binding rejects ${JSON.stringify(patch)}`, () => assert.throws(() => validateAssetBinding234({ ...vehicle, ...patch }, 'vehicle')));
test('published vehicle URL stays bound to the exact version and revision', () => {
  const url = '/api/shop/ai-assets/models/v2.glb?rev=12345678-abcd-1234-abcd-123456789abc';
  assert.equal(validateAssetBinding234({ ...vehicle, assetUrl: url }, 'vehicle').assetUrl, url);
  assert.throws(() => validateAssetBinding234({ ...vehicle, assetUrl: url.replace('v2.glb', 'v3.glb') }, 'vehicle'));
});
test('product version URL hash cannot contradict calibration bytes', () => {
  assert.throws(() => validateAssetBinding234({ ...product, assetUrl: `${product.assetUrl}?v=${'c'.repeat(64)}` }, 'product'));
});
test('Rim and Tire bindings cannot share the wrong mount slot', () => {
  assert.throws(() => createMountDraft234({ vehicle, product: { ...product, category: 'tires' }, mountId: 'rims-front' }));
  assert.equal(createMountDraft234({ vehicle, product: { ...product, category: 'wheels' }, mountId: 'rims-front' }).product.category, 'rims');
});
test('unverified and merely numeric identity transforms cannot be called reviewed', () => {
  assert.throws(() => validateMountCalibration234({ ...make(), partTransform: { position: [0, 0, 0], rotationXYZ: [0, 0, 0], scale: 1 } }));
  assert.throws(() => validateMountCalibration234({ ...make(), calibrationStatus: 'reviewed' }));
  assert.throws(() => validateMountCalibration234({ ...authored(), review: null }));
  assert.throws(() => validateMountCalibration234({ ...authored(), complete: true }));
});
for (const patch of [{ scale: 0 }, { scale: -1 }, { scale: Infinity }, { scale: [1, 2, 3] }, { position: [NaN, 0, 0] }, { rotationXYZ: [10000, 0, 0] }]) test(`bad product transform rejected ${JSON.stringify(patch)}`, () => assert.throws(() => validateMountCalibration234({ ...authored(), partTransform: { ...authored().partTransform, ...patch } })));
test('visual review cannot claim physical fit, subset geometry, or unknown coordinate space', () => {
  for (const patch of [{ physicalCompatibility: 'verified' }, { coordinateSpace: 'millimetres' }, { assetScope: 'left-shock' }, { calibrationStatus: 'complete' }, { review: { ...review, evidence: '' } }]) assert.throws(() => validateMountCalibration234({ ...authored(), ...patch }));
});
test('catalog match, visual calibration and physical assessment remain separate', () => {
  const r = mountingReadiness234(authored(), options()); assert.equal(r.canPreview, true); assert.equal(r.physical, 'not-assessed'); assert.equal(r.canReplaceStock, false);
  for (const catalogStatus of ['incompatible', 'unknown', 'unselected']) assert.equal(mountingReadiness234(authored(), options({ catalogStatus })).canPreview, false);
  assert.equal(mountingReadiness234(make(), options()).canPreview, false);
  assert.equal(mountingReadiness234(authored('draft'), options()).canPreview, false);
  assert.equal(mountingReadiness234(authored('draft'), options({ allowDraft: true })).canPreview, true);
});
test('byte, URL revision and orientation changes invalidate visual calibration', () => {
  for (const patch of [{ vehicle: { ...vehicle, sha256: 'c'.repeat(64) } }, { vehicle: { ...vehicle, rotationXYZ: [0, .1, 0] } }, { product: { ...product, assetUrl: '/models/test/other.glb' } }]) assert.equal(mountingReadiness234(authored(), options(patch)).canPreview, false);
});
test('merged and unknown stock reject node selectors; separable stock requires evidence', () => {
  for (const stock of [{ classification: 'merged', nodeIndices: [0], review }, { classification: 'separable', nodeIndices: [0], review: null }, { classification: 'separable', nodeIndices: [0, 0], review }]) assert.throws(() => validateMountCalibration234({ ...authored(), stock }));
});
test('normalization reproduces the current renderer and has a reversible source transform', () => {
  const f = vehicleDisplayFrame234({ orientedBounds: { min: [-2, -1, -1], max: [2, 3, 1] }, rotationXYZ: [0, 0, 0] });
  assert.equal(f.scale, 1); nearly(f.translation, [0, 1, 0]); nearly(f.dimensions, [4, 4, 2]);
  nearly(transformPoint234([-2, -1, -1], f.matrix), [-2, 0, -1]);
  const point = [.3, 1.2, -.7]; nearly(transformPoint234(transformPoint234(point, f.matrix), f.inverse), point);
});
test('rotation is applied once, before scale and ground centering', () => {
  const r = [0, Math.PI / 2, 0], f = vehicleDisplayFrame234({ orientedBounds: { min: [-1, 0, -2], max: [1, 2, 2] }, rotationXYZ: r });
  const expected = new Vector3(2, 0, 0).applyEuler(new Euler(...r, 'XYZ')).multiplyScalar(f.scale).add(new Vector3(...f.translation));
  nearly(transformPoint234([2, 0, 0], f.matrix), expected.toArray());
});
test('empty bounds and singular/projective matrices fail instead of producing mount coordinates', () => {
  assert.throws(() => vehicleDisplayFrame234({ orientedBounds: { min: [0, 0, 0], max: [0, 0, 0] }, rotationXYZ: [0, 0, 0] }));
  assert.throws(() => transformPoint234([0, 0, 0], new Matrix4().makeScale(0, 0, 0).toArray()));
  assert.throws(() => transformPoint234([2, 0, 0], new Matrix4().makeScale(1e308, 1e308, 1).toArray()));
  assert.throws(() => transformPoint234([2, 0, 0], new Matrix4().makeScale(1e308, 1e-308, 1).toArray()));
  const tiny = vehicleDisplayFrame234({ orientedBounds: { min: [0, 0, 0], max: [1e-10, 1e-10, 1e-10] }, rotationXYZ: [0, 0, 0] });
  nearly(transformPoint234(transformPoint234([1e-10, 0, 0], tiny.matrix), tiny.inverse), [1e-10, 0, 0]);
});
test('overlay owns only product transforms and does not normalize or recolor the product/vehicle', async () => {
  const root = source(), owned = asset(), original = owned.root.children[0], before = original.material.color.clone();
  owned.root.position.set(.8, .2, -.1); const authoredRoot = owned.root.matrix.clone();
  const c = createAssemblyController234({ vehicleSourceRoot: root, vehicleBinding: vehicle, loadOwnedPart: async () => owned });
  assert.equal((await c.attach(authored(), { productBinding: product, catalogStatus: 'compatible' })).status, 'attached');
  assert.equal(root.children.length, 4); assert(original.material.color.equals(before)); assert(owned.root.matrix.equals(authoredRoot));
  nearly(owned.root.position.toArray(), [.8, .2, -.1]); assert.equal(c.state().mode, 'overlay');
  c.remove(); c.remove(); c.dispose(); c.dispose(); assert.equal(owned.releases, 1); assert.equal(root.children.length, 3);
});
test('replacement restores original stock visibility and never disposes borrowed geometry', async () => {
  const root = source(), stock = root.children[1], owned = asset(); let borrowedDisposals = 0;
  root.traverse(o => o.geometry?.addEventListener('dispose', () => borrowedDisposals++));
  const c = createAssemblyController234({ vehicleSourceRoot: root, vehicleBinding: vehicle, loadOwnedPart: async () => owned, resolveStockNode: i => root.children[i] });
  await c.attach(replaceable(), { productBinding: product, catalogStatus: 'compatible', mode: 'replace' });
  assert.equal(stock.visible, false); c.remove(); assert.equal(stock.visible, true); assert.equal(borrowedDisposals, 0);
  c.dispose(); assert.equal(owned.releases, 1);
});
test('previously hidden stock stays hidden after removal', async () => {
  const root = source(), stock = root.children[1]; stock.visible = false;
  const c = createAssemblyController234({ vehicleSourceRoot: root, vehicleBinding: vehicle, loadOwnedPart: async () => asset(), resolveStockNode: i => root.children[i] });
  await c.attach(replaceable(), { productBinding: product, catalogStatus: 'compatible', mode: 'replace' }); c.remove(); assert.equal(stock.visible, false);
});
test('whole-vehicle mesh or group is never accepted as a stock part', async () => {
  for (const group of [false, true]) {
    const root = new Group(), all = new Group(); all.add(mesh()); root.add(all); const owned = asset();
    const c = createAssemblyController234({ vehicleSourceRoot: root, vehicleBinding: vehicle, loadOwnedPart: async () => owned, resolveStockNode: () => group ? all : all.children[0] });
    await assert.rejects(c.attach(replaceable(), { productBinding: product, catalogStatus: 'compatible', mode: 'replace' }), /complete vehicle/);
    assert.equal(all.visible, true); assert.equal(all.children[0].visible, true); assert.equal(owned.releases, 1); c.dispose();
  }
});
test('foreign stock selectors fail before changing any visibility', async () => {
  const owned = asset(), foreign = mesh(), c = createAssemblyController234({ vehicleSourceRoot: source(), vehicleBinding: vehicle, loadOwnedPart: async () => owned, resolveStockNode: () => foreign });
  await assert.rejects(c.attach(replaceable(), { productBinding: product, catalogStatus: 'compatible', mode: 'replace' }), /do not match/);
  assert.equal(foreign.visible, true); assert.equal(owned.releases, 1); c.dispose();
});
test('an explicitly allowed draft can overlay but cannot hide stock', async () => {
  const c = createAssemblyController234({ vehicleSourceRoot: source(), vehicleBinding: vehicle, loadOwnedPart: async () => asset() });
  const d = { ...replaceable(), calibrationStatus: 'draft', review: null };
  await assert.rejects(c.attach(d, { productBinding: product, catalogStatus: 'compatible', allowDraft: true, mode: 'replace' }));
  assert.equal((await c.attach(d, { productBinding: product, catalogStatus: 'compatible', allowDraft: true })).calibration, 'draft'); c.dispose();
});
test('late parse after switching vehicles is disposed and never attached', async () => {
  const d = deferred(), root = source(), nextRoot = source(), owned = asset(); let signal;
  const c = createAssemblyController234({ vehicleSourceRoot: root, vehicleBinding: vehicle, loadOwnedPart: (_, opts) => { signal = opts.signal; return d.promise; } });
  const pending = c.attach(authored(), { productBinding: product, catalogStatus: 'compatible' });
  c.setVehicle({ sourceRoot: nextRoot, binding: { ...vehicle, id: 'yamaha-nvx-v3', assetUrl: '/models/nvx/nvx-v3.glb' } });
  assert.equal(signal.aborted, true); d.resolve(owned); assert.equal((await pending).status, 'stale');
  assert.equal(owned.releases, 1); assert.equal(root.children.length, 3); assert.equal(nextRoot.children.length, 3); c.dispose();
});
test('rapid product changes are last-request-wins and release the losing parse', async () => {
  const a = deferred(), b = deferred(), old = asset(), latest = asset(); let loads = 0;
  const c = createAssemblyController234({ vehicleSourceRoot: source(), vehicleBinding: vehicle, loadOwnedPart: () => ++loads === 1 ? a.promise : b.promise });
  const first = c.attach(authored(), { productBinding: product, catalogStatus: 'compatible' }), second = c.attach(authored(), { productBinding: product, catalogStatus: 'compatible' });
  b.resolve(latest); assert.equal((await second).status, 'attached'); a.resolve(old); assert.equal((await first).status, 'stale'); assert.equal(old.releases, 1); assert.equal(latest.releases, 0); c.dispose(); assert.equal(latest.releases, 1);
});
test('disposal while parsing invalidates the operation and releases it once', async () => {
  const d = deferred(), owned = asset(), c = createAssemblyController234({ vehicleSourceRoot: source(), vehicleBinding: vehicle, loadOwnedPart: () => d.promise });
  const p = c.attach(authored(), { productBinding: product, catalogStatus: 'compatible' }); c.dispose(); c.dispose(); d.resolve(owned); assert.equal((await p).status, 'stale'); assert.equal(owned.releases, 1);
});
test('borrowed product preview roots are not reparented or disposed', async () => {
  const owned = asset(), external = new Group(); external.add(owned.root);
  const c = createAssemblyController234({ vehicleSourceRoot: source(), vehicleBinding: vehicle, loadOwnedPart: async () => owned });
  await assert.rejects(c.attach(authored(), { productBinding: product, catalogStatus: 'compatible' }), /unparented/);
  assert.equal(owned.root.parent, external); assert.equal(owned.releases, 0); c.dispose();
});
test('source frame rejects display transforms at construction, switch and attach time', async () => {
  for (const change of [r => r.position.set(123, 0, 0), r => r.scale.setScalar(2), r => r.rotation.y = .2, r => { r.matrixAutoUpdate = false; r.matrix.makeTranslation(1, 0, 0); }]) {
    const invalid = source(); change(invalid);
    assert.throws(() => createAssemblyController234({ vehicleSourceRoot: invalid, vehicleBinding: vehicle, loadOwnedPart: async () => asset() }), /identity source frame/);
    const root = source(), c = createAssemblyController234({ vehicleSourceRoot: root, vehicleBinding: vehicle, loadOwnedPart: async () => asset() });
    assert.throws(() => c.setVehicle({ sourceRoot: invalid, binding: vehicle }), /identity source frame/);
    change(root); await assert.rejects(c.attach(authored(), { productBinding: product, catalogStatus: 'compatible' }), /identity source frame/); c.dispose();
  }
});
test('hidden helper meshes cannot make the complete visible vehicle a replaceable part', async () => {
  for (const hiddenParent of [false, true]) {
    const root = new Group(), vehicleMesh = mesh(), helper = new Group(); helper.add(mesh()); root.add(vehicleMesh, helper);
    if (hiddenParent) helper.visible = false; else helper.children[0].visible = false;
    const owned = asset(), c = createAssemblyController234({ vehicleSourceRoot: root, vehicleBinding: vehicle, loadOwnedPart: async () => owned, resolveStockNode: () => vehicleMesh });
    await assert.rejects(c.attach(replaceable(), { productBinding: product, catalogStatus: 'compatible', mode: 'replace' }), /complete visible vehicle/);
    assert.equal(vehicleMesh.visible, true); assert.equal(owned.releases, 1); c.dispose();
  }
});
test('replacement-to-replacement uses saved baseline visibility and restores it on detach', async () => {
  const root = source(), stock = root.children[1], first = asset(), second = asset(); let n = 0;
  const c = createAssemblyController234({ vehicleSourceRoot: root, vehicleBinding: vehicle, loadOwnedPart: async () => ++n === 1 ? first : second, resolveStockNode: () => stock });
  await c.attach(replaceable(), { productBinding: product, catalogStatus: 'compatible', mode: 'replace' });
  await c.attach(replaceable(), { productBinding: product, catalogStatus: 'compatible', mode: 'replace' });
  assert.equal(first.releases, 1); assert.equal(stock.visible, false); c.remove(); assert.equal(stock.visible, true); assert.equal(second.releases, 1);
});
test('a handle aliasing the current part cannot dispose or steal the mounted scene', async () => {
  const owned = asset(); let requests = 0, aliasDisposals = 0;
  const c = createAssemblyController234({ vehicleSourceRoot: source(), vehicleBinding: vehicle, loadOwnedPart: async () => ++requests === 1 ? owned : { ...owned, dispose() { aliasDisposals++; } } });
  await c.attach(authored(), { productBinding: product, catalogStatus: 'compatible' });
  await assert.rejects(c.attach(authored(), { productBinding: product, catalogStatus: 'compatible' }), /unparented/);
  assert.equal(aliasDisposals, 0); assert.equal(owned.releases, 0); assert.equal(c.state().productId, product.id); c.dispose(); assert.equal(owned.releases, 1);
});
test('late borrowed vehicle root is not disposed after a vehicle switch', async () => {
  const oldRoot = source(), nextRoot = source(), d = deferred(); let disposals = 0;
  const c = createAssemblyController234({ vehicleSourceRoot: oldRoot, vehicleBinding: vehicle, loadOwnedPart: () => d.promise });
  const p = c.attach(authored(), { productBinding: product, catalogStatus: 'compatible' });
  c.setVehicle({ sourceRoot: nextRoot, binding: vehicle });
  d.resolve({ root: oldRoot, binding: product, ownership: 'exclusive', dispose() { disposals++; } });
  assert.equal((await p).status, 'stale'); assert.equal(disposals, 0); assert.equal(oldRoot.children.length, 3); c.dispose();
});
test('wrong product bytes release only the exclusively owned candidate', async () => {
  const owned = asset({ ...product, sha256: 'c'.repeat(64) }), root = source();
  const c = createAssemblyController234({ vehicleSourceRoot: root, vehicleBinding: vehicle, loadOwnedPart: async () => owned });
  await assert.rejects(c.attach(authored(), { productBinding: product, catalogStatus: 'compatible' }), /asset bytes/);
  assert.equal(owned.releases, 1); assert.equal(root.children.length, 3); c.dispose();
});
