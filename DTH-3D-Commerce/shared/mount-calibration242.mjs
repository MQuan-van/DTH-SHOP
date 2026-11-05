/** Local visual calibration only. No network, persistence or physical fitment claims. */
import { DISPLAY_SPACE234, MOUNT_SPACE234, validateAssetBinding234 } from './mounting234.mjs';

export const CALIBRATION_SCHEMA242 = 2;
export const CALIBRATION_SLOT242 = 'suspension-rear';
export const CALIBRATION_NORMALIZATION242 = 'normalized-stage-4-v1';
export const CALIBRATION_ORIENTATION242 = 'nvx-config-v1';
const fail = message => { throw new TypeError(message); };
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const clone = value => JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function object(value, fields, title) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Object.keys(value).length !== fields.length || fields.some(key => !own(value, key))) fail(`Invalid ${title} fields.`);
}
function vector(value, length, title, maximum = 1e6) {
  if (!Array.isArray(value) || value.length !== length || Array.from(value).some(n => typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > maximum)) fail(`Invalid ${title}.`);
  return [...value];
}
function text(value, maximum, title, allowEmpty = false) {
  if (typeof value !== 'string' || value.length > maximum || !allowEmpty && !value.trim()
    || /<\s*script\b|\b(?:javascript|vbscript|data):/i.test(value)) fail(`Invalid ${title}.`);
  return value.trim();
}
function revision(value, fallback, title) {
  const result = value ?? fallback;
  if (typeof result !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(result)) fail(`Invalid ${title}.`);
  return result;
}
function binding(value, kind) {
  object(value, kind === 'vehicle' ? ['id', 'assetUrl', 'sha256', 'rotationXYZ'] : ['id', 'assetUrl', 'sha256', 'category'], `${kind} binding`);
  if (kind === 'vehicle') vector(value.rotationXYZ, 3, 'vehicle orientation');
  return validateAssetBinding234(value, kind);
}
function context242(value) {
  if (!value || typeof value !== 'object') fail('Calibration needs the currently loaded asset identities.');
  const vehicle = binding(value.vehicle, 'vehicle'), product = binding(value.product, 'product');
  if (vehicle.id !== 'yamaha-nvx-v2' || product.category !== 'suspension') fail('This workspace calibrates NVX V2 rear suspension only.');
  const nodeIndices = value.nodeIndices ?? [];
  if (!Array.isArray(nodeIndices) || nodeIndices.length > 100000 || Array.from(nodeIndices).some(n => !Number.isSafeInteger(n) || n < 0 || n > 100000)) fail('Invalid loaded vehicle node identities.');
  const stockClassification = value.stockClassification ?? 'indeterminate';
  if (!['indeterminate', 'merged', 'separable'].includes(stockClassification)) fail('Invalid inspected stock classification.');
  return { vehicle, product, nodeIndices: [...nodeIndices], stockClassification,
    normalizationRevision: revision(value.normalizationRevision, CALIBRATION_NORMALIZATION242, 'normalization revision'),
    orientationRevision: revision(value.orientationRevision, CALIBRATION_ORIENTATION242, 'orientation revision') };
}
export function validateAttachment242(value) {
  object(value, ['position', 'quaternion', 'scale'], 'attachment transform');
  const position = vector(value.position, 3, 'source position');
  const quaternion = vector(value.quaternion, 4, 'quaternion', 1.00001), norm = Math.hypot(...quaternion);
  if (!(norm > 0) || Math.abs(norm - 1) > 1e-5) fail('Attachment quaternion must be normalized [x,y,z,w].');
  // Canonical antipodal representation keeps equivalent rotations from creating undo entries.
  const sign = (quaternion[3] || quaternion.find(n => n !== 0) || 1) < 0 ? -1 : 1;
  const cleanQuaternion = quaternion.map(n => n === 0 ? 0 : n / norm * sign);
  if (typeof value.scale !== 'number' || !Number.isFinite(value.scale) || value.scale < 1e-6 || value.scale > 1e6) fail('Use a finite positive uniform scale between 0.000001 and 1000000.');
  return { position, quaternion: cleanQuaternion, scale: value.scale };
}
function review242(value, required) {
  if (!required) { if (value !== null) fail('Only reviewed visual calibration can carry review evidence.'); return null; }
  object(value, ['kind', 'note'], 'visual review');
  if (value.kind !== 'visual-only') fail('Review does not certify physical compatibility.');
  return { kind: 'visual-only', note: text(value.note, 2000, 'visual review note') };
}
function stock242(value, context) {
  object(value, ['classification', 'nodeRefs', 'review'], 'stock geometry');
  if (!['indeterminate', 'merged', 'separable'].includes(value.classification) || !Array.isArray(value.nodeRefs) || value.nodeRefs.length > 32) fail('Invalid stock classification or node references.');
  if (value.classification !== context.stockClassification) fail('Stock classification differs from the inspected loaded vehicle.');
  const seen = new Set();
  const nodeRefs = Array.from(value.nodeRefs, ref => {
    object(ref, ['assetSha256', 'nodeIndex'], 'stock node reference');
    if (ref.assetSha256 !== context.vehicle.sha256) fail('Stock node reference belongs to different vehicle bytes.');
    if (!Number.isSafeInteger(ref.nodeIndex) || ref.nodeIndex < 0 || ref.nodeIndex > 100000 || seen.has(ref.nodeIndex)) fail('Stock node references must be unique glTF node indices.');
    const count = context.nodeIndices.filter(index => index === ref.nodeIndex).length;
    if (count !== 1) fail(count ? 'Stock node reference is ambiguous in the loaded asset.' : 'Stock node reference does not exist in the loaded asset.');
    seen.add(ref.nodeIndex);
    return { assetSha256: ref.assetSha256, nodeIndex: ref.nodeIndex };
  });
  if (value.classification !== 'separable' && nodeRefs.length) fail('Merged or indeterminate stock cannot claim isolated nodes.');
  if (value.classification === 'separable' && !nodeRefs.length) fail('Separable stock needs verified node references and visual evidence.');
  return { classification: value.classification, nodeRefs, review: review242(value.review, value.classification === 'separable') };
}
export function validateCalibration242(value, loadedContext) {
  const context = context242(loadedContext);
  object(value, ['schemaVersion', 'vehicleId', 'productId', 'slotId', 'vehicle', 'product', 'coordinateFrame', 'units', 'display', 'attachment', 'partInstance', 'stock', 'calibrationStatus', 'review', 'notes', 'physicalCompatibility'], 'calibration profile');
  if (value.schemaVersion !== CALIBRATION_SCHEMA242 || value.slotId !== CALIBRATION_SLOT242) fail('Unsupported calibration schema or slot.');
  const vehicle = binding(value.vehicle, 'vehicle'), product = binding(value.product, 'product');
  if (value.vehicleId !== context.vehicle.id || value.vehicleId !== vehicle.id || !same(vehicle, context.vehicle)) fail('Vehicle identity, URL, hash or orientation differs from the loaded vehicle.');
  if (value.productId !== context.product.id || value.productId !== product.id || !same(product, context.product)) fail('Product identity, URL or hash differs from the loaded part.');
  if (value.coordinateFrame !== MOUNT_SPACE234 || value.units !== 'scene-units') fail('Calibration requires vehicle source coordinates in scene units.');
  object(value.display, ['space', 'normalizationRevision', 'orientationRevision', 'rotationXYZ'], 'display frame');
  if (value.display.space !== DISPLAY_SPACE234 || value.display.normalizationRevision !== context.normalizationRevision
    || value.display.orientationRevision !== context.orientationRevision || !same(vector(value.display.rotationXYZ, 3, 'display orientation'), context.vehicle.rotationXYZ)) fail('Display normalization/orientation revision differs from the loaded scene.');
  object(value.partInstance, ['id', 'scope', 'count', 'pivot'], 'part instance');
  if (value.partInstance.id !== 'whole-asset-1' || value.partInstance.scope !== 'whole-asset' || value.partInstance.count !== 1 || value.partInstance.pivot !== 'part-source-origin-v1') fail('Calibrate one original whole asset at its source pivot; do not duplicate a shock pair.');
  if (!['uncalibrated', 'draft', 'reviewed'].includes(value.calibrationStatus)) fail('Invalid calibration status.');
  if (value.physicalCompatibility !== 'not-assessed') fail('Visual calibration cannot certify mechanical compatibility.');
  return { schemaVersion: CALIBRATION_SCHEMA242, vehicleId: vehicle.id, productId: product.id, slotId: CALIBRATION_SLOT242,
    vehicle, product, coordinateFrame: MOUNT_SPACE234, units: 'scene-units',
    display: { space: DISPLAY_SPACE234, normalizationRevision: context.normalizationRevision, orientationRevision: context.orientationRevision, rotationXYZ: [...context.vehicle.rotationXYZ] },
    attachment: validateAttachment242(value.attachment),
    partInstance: { id: 'whole-asset-1', scope: 'whole-asset', count: 1, pivot: 'part-source-origin-v1' },
    stock: stock242(value.stock, context), calibrationStatus: value.calibrationStatus,
    review: review242(value.review, value.calibrationStatus === 'reviewed'), notes: text(value.notes, 4000, 'calibration notes', true), physicalCompatibility: 'not-assessed' };
}
export function createCalibration242(loadedContext, attachment = { position: [0, 0, 0], quaternion: [0, 0, 0, 1], scale: 1 }) {
  const context = context242(loadedContext);
  return validateCalibration242({ schemaVersion: CALIBRATION_SCHEMA242, vehicleId: context.vehicle.id, productId: context.product.id,
    slotId: CALIBRATION_SLOT242, vehicle: context.vehicle, product: context.product,
    coordinateFrame: MOUNT_SPACE234, units: 'scene-units',
    display: { space: DISPLAY_SPACE234, normalizationRevision: context.normalizationRevision, orientationRevision: context.orientationRevision, rotationXYZ: context.vehicle.rotationXYZ },
    attachment, partInstance: { id: 'whole-asset-1', scope: 'whole-asset', count: 1, pivot: 'part-source-origin-v1' },
    stock: { classification: context.stockClassification, nodeRefs: [], review: null }, calibrationStatus: 'uncalibrated', review: null,
    notes: 'Visual calibration preview. Stock part is not removed. Scene units have no verified physical scale.', physicalCompatibility: 'not-assessed' }, context);
}
export function editCalibration242(value, attachment, context) {
  const previous = validateCalibration242(value, context), next = validateAttachment242(attachment);
  return same(previous.attachment, next) ? previous : { ...previous, attachment: next, calibrationStatus: 'draft', review: null };
}
export function reviewCalibration242(value, note, context) {
  const previous = validateCalibration242(value, context);
  if (previous.calibrationStatus === 'uncalibrated') fail('Adjust or import a draft before marking its visual placement reviewed.');
  return validateCalibration242({ ...previous, calibrationStatus: 'reviewed', review: { kind: 'visual-only', note } }, context);
}
export function exportCalibration242(value, context) { return JSON.stringify(validateCalibration242(value, context), null, 2); }
export function importCalibration242(json, context) {
  if (typeof json !== 'string' || json.length > 128 * 1024) fail('Import requires a calibration JSON file no larger than 128 KiB.');
  let parsed;
  try { parsed = JSON.parse(json); } catch { fail('Invalid calibration JSON.'); }
  return validateCalibration242(parsed, context);
}
/** Session-only bounded history. Snapshots are detached copies; a drag commits once. */
export function createCalibrationHistory242(initial, loadedContext, { limit = 60 } = {}) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) fail('Invalid calibration history limit.');
  const context = context242(loadedContext), baseline = validateCalibration242(initial, context);
  let current = clone(baseline), past = [], future = [], transaction = null;
  const snapshot = () => ({ profile: clone(current), canUndo: past.length > 0 || !!transaction && !same(current, transaction), canRedo: !transaction && future.length > 0, transaction: !!transaction });
  const remember = previous => { past.push(clone(previous)); if (past.length > limit) past.shift(); future = []; };
  const set = value => {
    const next = validateCalibration242(value, context);
    if (transaction) fail('Finish or cancel the current transform drag before another action.');
    if (!same(current, next)) { remember(current); current = next; }
    return snapshot();
  };
  const cancel = () => { if (transaction) { current = transaction; transaction = null; } return snapshot(); };
  return {
    snapshot, set,
    setAttachment: value => set(editCalibration242(current, value, context)),
    reset: () => set(baseline),
    undo() { if (transaction) return cancel(); if (past.length) { future.push(current); current = past.pop(); } return snapshot(); },
    redo() { if (transaction) return cancel(); if (future.length) { past.push(current); current = future.pop(); } return snapshot(); },
    begin() { if (!transaction) transaction = clone(current); return snapshot(); },
    preview(value) { if (!transaction) fail('Begin a transform transaction before previewing.'); current = editCalibration242(transaction, value, context); return snapshot(); },
    commit() { if (transaction) { if (!same(current, transaction)) remember(transaction); transaction = null; } return snapshot(); },
    cancel,
    importJSON: json => set(importCalibration242(json, context)),
    exportJSON: () => exportCalibration242(current, context),
  };
}
