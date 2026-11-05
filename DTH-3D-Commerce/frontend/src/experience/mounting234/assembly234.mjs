/** Future same-renderer adapter. Not connected to Shop, Studio, network or persistence. */
import { Euler, Group, Matrix4, Vector3 } from 'three';
import { mountingReadiness234, sameAssetBinding234, validateAssetBinding234, validateMountCalibration234, vector234 } from '../../../../shared/mounting234.mjs';

const finiteMatrix = a => Array.isArray(a) && a.length === 16 && a.every(Number.isFinite);
/** Bounds must be measured AFTER the configured vehicle rotation, as in prepare() of the current engine. */
export function vehicleDisplayFrame234({ orientedBounds, rotationXYZ, targetSize = 4 }) {
  if (!vector234(orientedBounds?.min) || !vector234(orientedBounds?.max) || !vector234(rotationXYZ) || orientedBounds.min.some((v, i) => v > orientedBounds.max[i]) || targetSize !== 4) throw new TypeError('Invalid measured vehicle display frame.');
  const { min, max } = orientedBounds, size = max.map((v, i) => v - min[i]), largest = Math.max(...size);
  if (!(largest > 1e-12)) throw new TypeError('Vehicle bounds are empty.');
  const scale = targetSize / largest, translation = [-(min[0] + max[0]) * scale / 2, -min[1] * scale, -(min[2] + max[2]) * scale / 2];
  const matrix = new Matrix4().makeTranslation(...translation).multiply(new Matrix4().makeScale(scale, scale, scale)).multiply(new Matrix4().makeRotationFromEuler(new Euler(...rotationXYZ, 'XYZ')));
  return { coordinateSpace: 'normalized-stage-4-v1', scale, translation, dimensions: size.map(n => n * scale), matrix: matrix.toArray(), inverse: matrix.clone().invert().toArray() };
}
export function transformPoint234(point, matrix) {
  if (!vector234(point) || !finiteMatrix(matrix)) throw new TypeError('Invalid coordinate conversion.');
  const m = new Matrix4().fromArray(matrix);
  const determinant = m.determinant();
  if (!Number.isFinite(determinant) || determinant === 0 || matrix[3] !== 0 || matrix[7] !== 0 || matrix[11] !== 0 || Math.abs(matrix[15] - 1) > 1e-12) throw new TypeError('Coordinate conversion needs an invertible finite affine matrix.');
  const result = new Vector3(...point).applyMatrix4(m).toArray();
  if (!result.every(Number.isFinite)) throw new TypeError('Coordinate conversion overflowed.');
  return result;
}
const descendant = (object, root) => { for (let p = object; p; p = p.parent) if (p === root) return true; return false; };
const meshes = root => { const result = []; root.traverse(o => { if (o.isMesh) result.push(o); }); return result; };
function applyTransform(group, transform, scale = 1) { group.position.fromArray(transform.position); group.rotation.set(...transform.rotationXYZ, 'XYZ'); group.scale.setScalar(scale); }
function assertSourceFrame(root) {
  if (!root?.isObject3D || root.position.lengthSq() !== 0 || root.quaternion.x !== 0 || root.quaternion.y !== 0 || root.quaternion.z !== 0 || root.quaternion.w !== 1 || root.scale.x !== 1 || root.scale.y !== 1 || root.scale.z !== 1 || !root.matrixAutoUpdate && !root.matrix.equals(new Matrix4())) throw new TypeError('Mounting needs an identity source frame before vehicle display normalization.');
}

/**
 * vehicleSourceRoot is an identity frame BEFORE the vehicle's display orientation/normalization.
 * loadOwnedPart returns {root,binding,ownership:'exclusive',dispose}: a fresh original glTF scene.
 * resolveStockNode must use GLTFParser.associations node indices, never substring names.
 * Borrowed vehicle/camera/renderer resources are never disposed here.
 */
export function createAssemblyController234({ vehicleSourceRoot, vehicleBinding, loadOwnedPart, resolveStockNode = () => null }) {
  if (!vehicleSourceRoot?.isObject3D || typeof loadOwnedPart !== 'function' || typeof resolveStockNode !== 'function') throw new TypeError('Assembly needs a source frame and an owned asset loader.');
  assertSourceFrame(vehicleSourceRoot);
  let sourceRoot = vehicleSourceRoot, binding = validateAssetBinding234(vehicleBinding, 'vehicle'), disposed = false, epoch = 0, pending = null, current = null;
  const released = new WeakSet(), owned = new WeakSet(), claimedRoots = new WeakMap(), borrowedObjects = new WeakSet();
  const rememberBorrowed = root => root.traverse(object => borrowedObjects.add(object));
  rememberBorrowed(sourceRoot);
  function claim(asset) {
    if (!asset?.root?.isObject3D || asset.ownership !== 'exclusive' || typeof asset.dispose !== 'function' || asset.root.parent || claimedRoots.has(asset.root) || borrowedObjects.has(asset.root) || descendant(asset.root, sourceRoot) || descendant(sourceRoot, asset.root)) throw new Error('Loader must supply a fresh exclusively owned, unparented original product scene.');
    owned.add(asset); claimedRoots.set(asset.root, asset);
  }
  function release(asset) { if (!asset || !owned.has(asset) || released.has(asset)) return; released.add(asset); asset.root.removeFromParent(); asset.dispose(); }
  function clear() {
    const old = current; current = null;
    if (!old) return;
    old.group.removeFromParent();
    for (const [node, visible] of old.stockVisibility) node.visible = visible;
    release(old.asset);
  }
  function cancel() { epoch++; pending?.abort(); pending = null; }
  function remove() { cancel(); clear(); }
  function stockNodes(definition) {
    const nodes = definition.stock.nodeIndices.map(index => resolveStockNode(index, binding));
    if (nodes.some(n => !n?.isObject3D || !descendant(n, sourceRoot) || n === sourceRoot || current && descendant(n, current.group)) || new Set(nodes).size !== nodes.length) throw new Error('Reviewed stock nodes do not match this vehicle scene.');
    const all = meshes(sourceRoot).filter(m => !current || !descendant(m, current.group));
    const covered = all.filter(m => nodes.some(n => descendant(m, n)));
    if (!covered.length || covered.length >= all.length) throw new Error('Refusing to hide the complete vehicle or an empty selection.');
    const originalVisibility = new Map(current?.stockVisibility || []);
    const visible = all.filter(mesh => {
      for (let p = mesh; p; p = p.parent) {
        if ((originalVisibility.has(p) ? originalVisibility.get(p) : p.visible) === false) return false;
        if (p === sourceRoot) break;
      }
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      return materials.some(m => m && m.visible !== false && m.opacity !== 0);
    });
    if (visible.length && visible.every(m => nodes.some(n => descendant(m, n)))) throw new Error('Refusing to hide the complete visible vehicle, including hidden helper meshes.');
    return nodes;
  }
  async function attach(value, { productBinding, catalogStatus = 'unknown', mode = 'overlay', allowDraft = false } = {}) {
    if (disposed) throw new Error('Assembly controller is disposed.');
    assertSourceFrame(sourceRoot);
    const definition = validateMountCalibration234(value), readiness = mountingReadiness234(definition, { vehicle: binding, product: productBinding, catalogStatus, allowDraft });
    if (!['overlay', 'replace'].includes(mode) || !readiness.canPreview || mode === 'replace' && !readiness.canReplaceStock) throw new Error('Mounting is blocked by asset identity, catalog match, calibration or stock isolation.');
    cancel(); const ticket = epoch, controller = new AbortController(); pending = controller;
    const expectedVehicle = binding;
    let asset, claimed = false;
    try {
      asset = await loadOwnedPart(definition.product, { signal: controller.signal });
      claim(asset); claimed = true;
      if (disposed || ticket !== epoch || !sameAssetBinding234(expectedVehicle, binding, 'vehicle')) { release(asset); return { status: 'stale' }; }
      assertSourceFrame(sourceRoot);
      if (!sameAssetBinding234(asset.binding, definition.product, 'product')) throw new Error('Owned product scene does not match the calibrated asset bytes.');
      const stock = mode === 'replace' ? stockNodes(definition) : [];
      const group = new Group(), part = new Group();
      group.name = `dth-mount:${definition.mountId}`;
      applyTransform(group, definition.mountFrame); applyTransform(part, definition.partTransform, definition.partTransform.scale);
      part.add(asset.root); group.add(part);
      clear();
      const stockVisibility = stock.map(node => [node, node.visible]);
      sourceRoot.add(group);
      for (const node of stock) node.visible = false;
      current = { asset, group, stockVisibility, definition, mode };
      return { status: 'attached', mode, physical: 'not-assessed', calibration: definition.calibrationStatus };
    } catch (error) { if (claimed) release(asset); if (disposed || ticket !== epoch) return { status: 'stale' }; throw error; }
    finally { if (pending === controller) pending = null; }
  }
  return {
    attach, remove,
    setVehicle({ sourceRoot: nextRoot, binding: nextBinding }) {
      if (disposed || !nextRoot?.isObject3D) throw new Error('Cannot change this assembly source frame.');
      assertSourceFrame(nextRoot);
      const next = validateAssetBinding234(nextBinding, 'vehicle'); remove(); sourceRoot = nextRoot; binding = next; rememberBorrowed(sourceRoot);
    },
    state: () => ({ disposed, vehicleId: binding.id, productId: current?.definition.product.id || null, mountId: current?.definition.mountId || null, mode: current?.mode || 'stock' }),
    dispose() { if (disposed) return; disposed = true; remove(); },
  };
}
