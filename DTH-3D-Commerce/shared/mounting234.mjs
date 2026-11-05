/** Visual assembly authoring contract. No database, inferred coordinates or physical certification. */
import { categoryId, CATEGORIES } from './categories.mjs';

export const MOUNT_SPACE234 = 'vehicle-source-root-v1';
export const DISPLAY_SPACE234 = 'normalized-stage-4-v1';
export const MOUNT_SLOTS234 = Object.freeze([
  ['suspension-rear', 'suspension'], ['suspension-front', 'suspension'],
  ['rims-front', 'rims'], ['rims-rear', 'rims'], ['tires-front', 'tires'], ['tires-rear', 'tires'],
  ['brakes-front', 'brakes'], ['brakes-rear', 'brakes'], ['exhaust', 'exhausts'],
  ['mirror-left', 'mirrors'], ['mirror-right', 'mirrors'],
].map(([id, category]) => Object.freeze({ id, category })));
const fail = message => { throw new TypeError(message); };
const slug = v => typeof v === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length <= 80;
export const vector234 = v => Array.isArray(v) && v.length === 3 && v.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e6);
function keys(value, allowed, title) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) fail(`Invalid ${title}.`);
}
function text(value, max, title) { if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`Invalid ${title}.`); return value.trim(); }
function vector(value, title) { if (!vector234(value)) fail(`Invalid ${title}.`); return [...value]; }
function review(value) {
  keys(value, ['reviewer', 'evidence', 'reviewedAt'], 'manual review');
  if (typeof value.reviewedAt !== 'string' || !Number.isFinite(Date.parse(value.reviewedAt)) || new Date(value.reviewedAt).toISOString() !== value.reviewedAt) fail('Manual review needs an ISO timestamp.');
  return { reviewer: text(value.reviewer, 120, 'reviewer'), evidence: text(value.evidence, 2000, 'review evidence'), reviewedAt: value.reviewedAt };
}
/** URLs are exact asset identities, including published revision; no network requests are made. */
export function validateAssetBinding234(value, kind) {
  const vehicle = kind === 'vehicle';
  if (!vehicle && kind !== 'product') fail('Unknown asset binding kind.');
  keys(value, vehicle ? ['id', 'assetUrl', 'sha256', 'rotationXYZ'] : ['id', 'assetUrl', 'sha256', 'category'], 'asset binding');
  if (!slug(value.id) || typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sha256)) fail('Asset needs an ID and exact SHA-256.');
  const local = typeof value.assetUrl === 'string' && value.assetUrl.length <= 512 && /^\/models\/(?:[\w-]+\/)*[\w-]+\.glb(?:\?v=[a-f0-9]{64})?$/.test(value.assetUrl);
  if (value.assetUrl?.includes('?v=') && value.assetUrl.split('?v=')[1] !== value.sha256) fail('Asset URL version differs from its SHA-256.');
  let valid = local;
  if (vehicle) {
    if (!/^yamaha-nvx-v[123]$/.test(value.id)) fail('Unknown NVX vehicle ID.');
    const version = value.id.slice(-2);
    valid = value.assetUrl === `/models/nvx/nvx-${version}.glb` || new RegExp(`^/api/shop/ai-assets/models/${version}\\.glb\\?rev=[a-f0-9-]{36}$`).test(value.assetUrl);
  }
  if (!valid) fail('Asset URL is not an approved local or version-bound model path.');
  const result = { id: value.id, assetUrl: value.assetUrl, sha256: value.sha256 };
  if (vehicle) result.rotationXYZ = vector(value.rotationXYZ, 'vehicle orientation');
  else {
    result.category = categoryId(value.category);
    if (!CATEGORIES.includes(result.category)) fail('Unknown product category.');
  }
  return result;
}
export function sameAssetBinding234(a, b, kind) {
  try { return JSON.stringify(validateAssetBinding234(a, kind)) === JSON.stringify(validateAssetBinding234(b, kind)); } catch { return false; }
}
function transform(value, withScale) {
  keys(value, withScale ? ['position', 'rotationXYZ', 'scale'] : ['position', 'rotationXYZ'], 'mount transform');
  const result = { position: vector(value.position, 'position'), rotationXYZ: vector(value.rotationXYZ, 'rotation') };
  if (result.rotationXYZ.some(n => Math.abs(n) > 100 * Math.PI)) fail('Rotation must be XYZ radians.');
  if (withScale) {
    if (typeof value.scale !== 'number' || !Number.isFinite(value.scale) || value.scale < 1e-6 || value.scale > 1e6) fail('Use a finite positive uniform visual scale.');
    result.scale = value.scale;
  }
  return result;
}
function stockDefinition(value) {
  keys(value, ['classification', 'nodeIndices', 'review'], 'stock definition');
  if (!['separable', 'merged', 'indeterminate'].includes(value.classification) || !Array.isArray(value.nodeIndices) || value.nodeIndices.length > 32 || value.nodeIndices.some(n => !Number.isSafeInteger(n) || n < 0 || n > 100000) || new Set(value.nodeIndices).size !== value.nodeIndices.length) fail('Invalid stock node allowlist.');
  if (value.classification !== 'separable' && value.nodeIndices.length) fail('Merged or unknown geometry cannot have hide selectors.');
  if (value.classification === 'separable' && (!value.nodeIndices.length || !value.review)) fail('Separable stock needs reviewed node identities.');
  return { classification: value.classification, nodeIndices: [...value.nodeIndices], review: value.review === null ? null : review(value.review) };
}
/** Registry vocabulary is not evidence that a given motorcycle has these mounts. */
export function createMountDraft234({ vehicle, product, mountId }) {
  return validateMountCalibration234({
    schemaVersion: 1, vehicle, product, mountId, coordinateSpace: MOUNT_SPACE234,
    displaySpace: DISPLAY_SPACE234, assetScope: 'whole-asset',
    mountFrame: null, partTransform: null, calibrationStatus: 'unverified', review: null,
    stock: { classification: 'indeterminate', nodeIndices: [], review: null },
    physicalCompatibility: 'not-assessed',
  });
}
export function createVehicleAssembly234(vehicle) {
  return { schemaVersion: 1, vehicle: validateAssetBinding234(vehicle, 'vehicle'), coordinateSpace: MOUNT_SPACE234, mounts: [] };
}
export function validateMountCalibration234(value) {
  keys(value, ['schemaVersion', 'vehicle', 'product', 'mountId', 'coordinateSpace', 'displaySpace', 'assetScope', 'mountFrame', 'partTransform', 'calibrationStatus', 'review', 'stock', 'physicalCompatibility'], 'calibration definition');
  if (value.schemaVersion !== 1 || value.coordinateSpace !== MOUNT_SPACE234 || value.displaySpace !== DISPLAY_SPACE234 || value.assetScope !== 'whole-asset') fail('Unsupported mounting schema, space or asset scope.');
  if (value.physicalCompatibility !== 'not-assessed') fail('Visual calibration cannot certify physical compatibility.');
  const vehicle = validateAssetBinding234(value.vehicle, 'vehicle'), product = validateAssetBinding234(value.product, 'product');
  if (!MOUNT_SLOTS234.some(s => s.id === value.mountId && s.category === product.category)) fail('Product category does not match the mount slot.');
  if (!['unverified', 'draft', 'reviewed'].includes(value.calibrationStatus)) fail('Unknown visual calibration status.');
  const unverified = value.calibrationStatus === 'unverified';
  if (unverified && (value.mountFrame !== null || value.partTransform !== null || value.review !== null)) fail('Unverified mount coordinates must remain unresolved.');
  if (!unverified && (!value.mountFrame || !value.partTransform)) fail('Authored calibration needs both transforms.');
  if (value.calibrationStatus === 'reviewed' && !value.review || value.calibrationStatus !== 'reviewed' && value.review !== null) fail('Reviewed calibration needs a manual evidence record.');
  return {
    schemaVersion: 1, vehicle, product, mountId: value.mountId, coordinateSpace: MOUNT_SPACE234,
    displaySpace: DISPLAY_SPACE234, assetScope: 'whole-asset',
    mountFrame: unverified ? null : transform(value.mountFrame, false),
    partTransform: unverified ? null : transform(value.partTransform, true),
    calibrationStatus: value.calibrationStatus, review: value.review === null ? null : review(value.review),
    stock: stockDefinition(value.stock), physicalCompatibility: 'not-assessed',
  };
}
/** Three independent facts: catalog match, visual review, and physical evidence. */
export function mountingReadiness234(value, { vehicle, product, catalogStatus = 'unknown', allowDraft = false } = {}) {
  const definition = validateMountCalibration234(value);
  if (!['compatible', 'incompatible', 'unknown', 'unselected'].includes(catalogStatus)) fail('Unknown demo catalog compatibility.');
  const identityMatches = sameAssetBinding234(definition.vehicle, vehicle, 'vehicle') && sameAssetBinding234(definition.product, product, 'product');
  const visualAllowed = definition.calibrationStatus === 'reviewed' || allowDraft === true && definition.calibrationStatus === 'draft';
  const canPreview = identityMatches && catalogStatus === 'compatible' && visualAllowed;
  return { identityMatches, catalog: catalogStatus, visual: definition.calibrationStatus,
    physical: 'not-assessed', stock: definition.stock.classification, canPreview,
    canReplaceStock: canPreview && definition.calibrationStatus === 'reviewed' && definition.stock.classification === 'separable' };
}
