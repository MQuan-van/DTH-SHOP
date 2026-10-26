/** DTH 21.2: visual presentation only. No price, fitment or physical measurements. */
export const PRESENTATION_VERSION21 = 1;
export const PRESENTATION_RANGES21 = Object.freeze({
  rotation: Object.freeze([-180, 180]), offset: Object.freeze([-0.2, 0.2]),
  scale: Object.freeze([0.75, 1.25]), yaw: Object.freeze([-180, 180]),
  pitch: Object.freeze([-65, 65]), zoom: Object.freeze([0.7, 1.25]),
  turnSeconds: Object.freeze([12, 120]),
});
export class PresentationError21 extends Error {
  constructor(message, status = 400) { super(message); this.name = 'PresentationError21'; this.status = status; }
}
const fail = message => { throw new PresentationError21(message); };
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
export const isProductId21 = value => typeof value === 'string' && value.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
export const isPresentationModel21 = value => typeof value === 'string' && value.length <= 256
  && /^\/models\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.glb(?:\?v=[a-zA-Z0-9_-]{1,128})?$/.test(value);
function object(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(`Invalid ${label}.`);
  if (Object.keys(value).length !== keys.length || Object.keys(value).some(k => !keys.includes(k))
    || keys.some(k => !own(value, k))) fail(`Unexpected or missing ${label} fields.`);
  return value;
}
function number(value, range, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < range[0] || value > range[1])
    fail(`${label} must be a number between ${range[0]} and ${range[1]}.`);
  return Math.round(value * 1e6) / 1e6;
}
function vector(value, range, label) {
  if (!Array.isArray(value) || value.length !== 3) fail(`${label} must contain X, Y and Z.`);
  return value.map((n, i) => number(n, range, `${label} ${'XYZ'[i]}`));
}
export function defaultPresentation21(modelUrl) {
  return { schemaVersion: 1, assetUrl: modelUrl, rotationDeg: [0, 0, 0], offset: [0, 0, 0], scale: 1,
    camera: { yawDeg: 16.042818, pitchDeg: 4.583662, zoom: 1 },
    spin: { enabled: true, secondsPerTurn: 32 } };
}
export function validatePresentation21(value, modelUrl) {
  object(value, ['schemaVersion', 'assetUrl', 'rotationDeg', 'offset', 'scale', 'camera', 'spin'], 'presentation');
  if (value.schemaVersion !== PRESENTATION_VERSION21) fail('Unsupported presentation version.');
  if (!isPresentationModel21(value.assetUrl) || value.assetUrl !== modelUrl) fail('The saved presentation must match the current model URL.');
  object(value.camera, ['yawDeg', 'pitchDeg', 'zoom'], 'camera');
  object(value.spin, ['enabled', 'secondsPerTurn'], 'rotation');
  if (typeof value.spin.enabled !== 'boolean') fail('Auto rotation must be true or false.');
  const R = PRESENTATION_RANGES21;
  return { schemaVersion: 1, assetUrl: value.assetUrl,
    rotationDeg: vector(value.rotationDeg, R.rotation, 'Model rotation'),
    offset: vector(value.offset, R.offset, 'Model offset'), scale: number(value.scale, R.scale, 'Scale'),
    camera: { yawDeg: number(value.camera.yawDeg, R.yaw, 'Camera yaw'),
      pitchDeg: number(value.camera.pitchDeg, R.pitch, 'Camera pitch'), zoom: number(value.camera.zoom, R.zoom, 'Camera zoom') },
    spin: { enabled: value.spin.enabled, secondsPerTurn: number(value.spin.secondsPerTurn, R.turnSeconds, 'Seconds per turn') } };
}
export function presentationState21(product) {
  const stored = product?.presentation3d;
  if (!stored) return { status: 'automatic', settings: null };
  if (stored.settings?.assetUrl !== product?.modelUrl) return { status: 'model-changed', settings: null };
  try { return { status: 'saved', settings: validatePresentation21(stored.settings, product.modelUrl) }; }
  catch { return { status: 'invalid', settings: null }; }
}
export const getPresentation21 = product => presentationState21(product).settings;
export function initialSpin21(product, policy = {}) {
  return !policy.reduced && !policy.compact && !policy.saveData && (getPresentation21(product)?.spin.enabled ?? true);
}
export function productHref21(product) {
  const id = product?.slug || product?.id;
  return isProductId21(id) ? `/products/${id}` : null;
}
export function presentationSaveCommand21(body, previous, revision) {
  object(body, ['settings', 'expectedUpdatedAt', 'expectedRevision'], 'save request');
  if (!previous || !isProductId21(previous.id)) throw new PresentationError21('Product not found.', 404);
  const previousTime = previous.updatedAt instanceof Date ? previous.updatedAt.toISOString() : previous.updatedAt;
  if (typeof body.expectedUpdatedAt !== 'string' || !previousTime || body.expectedUpdatedAt !== previousTime)
    throw new PresentationError21('This product changed elsewhere. Reload before saving the 3D setup.', 409);
  if (typeof revision !== 'string' || !/^[a-f0-9-]{36}$/.test(revision)) fail('Invalid presentation revision.');
  if (body.expectedRevision !== (previous.presentation3d?.revision ?? null))
    throw new PresentationError21('The 3D setup changed in another tab. Reload before saving.', 409);
  const settings = validatePresentation21(body.settings, previous.modelUrl);
  const filter = { id: previous.id, modelUrl: previous.modelUrl, updatedAt: previous.updatedAt };
  if (previous.presentation3d?.revision) filter['presentation3d.revision'] = previous.presentation3d.revision;
  else filter['presentation3d.revision'] = { $exists: false };
  return { filter, update: { $set: { presentation3d: { revision, settings } } } };
}
