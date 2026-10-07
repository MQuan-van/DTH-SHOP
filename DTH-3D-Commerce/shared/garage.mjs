import { isNVXId, NVX_IDS } from './nvx.mjs';
import { InputError } from './domain.mjs';

/** Account-owned versions, not motorcycle registration records. No year or VIN. */
export class GarageError extends InputError {
  constructor(message, status = 400) { super(message, status); this.name = 'GarageError'; this.status = status; }
}
const actions = new Set(['add', 'remove', 'set-default', 'clear-default']);
const revisionOf = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const equalIds = (a, b) => a.length === b.length && a.every((id, i) => id === b[i]);

/** Read-only compatibility: a Step15 saved NVX is visible without a bulk migration.
 * An explicitly empty array remains empty; deleted vehicles are never resurrected.
 */
export function garageSnapshot(user = {}) {
  const ids = Array.isArray(user.garageVehicleIds)
    ? [...new Set(user.garageVehicleIds.filter(isNVXId))]
    : isNVXId(user.savedVehicleId) ? [user.savedVehicleId] : [];
  return { vehicleIds: ids.slice(0, NVX_IDS.length),
    defaultVehicleId: ids.includes(user.savedVehicleId) ? user.savedVehicleId : '',
    revision: revisionOf(user.garageRevision) };
}
export function publicGarageUser(user) {
  const garage = garageSnapshot(user);
  return { id: String(user._id ?? user.id), email: user.email, role: user.role,
    savedVehicleId: user.savedVehicleId || '', garageVehicleIds: garage.vehicleIds,
    garageRevision: garage.revision, createdAt: user.createdAt };
}
export const garageEnvelope = user => ({ user: publicGarageUser(user), garage: garageSnapshot(user) });
export function normalizeGarageCommand(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some(key => !['action','vehicleId','revision'].includes(key))) {
    throw new GarageError('Invalid garage request.');
  }
  const { action, vehicleId, revision } = body;
  if (!actions.has(action)) throw new GarageError('Unknown garage action.');
  if (action === 'clear-default' ? vehicleId !== '' : !isNVXId(vehicleId)) {
    throw new GarageError('Choose NVX V1, V2 or V3.');
  }
  if (!Number.isSafeInteger(revision) || revision < 0 || revision >= Number.MAX_SAFE_INTEGER) {
    throw new GarageError('Refresh your garage before making changes.', 409);
  }
  return { action, vehicleId, revision };
}
function nextState(previous, ids, defaultId) {
  const changed = !equalIds(previous.vehicleIds, ids) || previous.defaultVehicleId !== defaultId;
  if (changed && previous.revision >= Number.MAX_SAFE_INTEGER - 1) throw new GarageError('Garage revision limit reached.', 409);
  return { vehicleIds: ids, defaultVehicleId: defaultId, revision: previous.revision + Number(changed) };
}
export function applyGarageCommand(user, input, availableIds = NVX_IDS) {
  const command = normalizeGarageCommand(input), before = garageSnapshot(user);
  if (command.revision !== before.revision) throw new GarageError('Your garage changed in another tab. Refresh and try again.', 409);
  const { action, vehicleId } = command;
  if (['add','set-default'].includes(action) && !availableIds.includes(vehicleId)) {
    throw new GarageError('This NVX version is not available in the catalogue.', 409);
  }
  let ids = [...before.vehicleIds], defaultId = before.defaultVehicleId;
  if (action === 'add' && !ids.includes(vehicleId)) {
    if (ids.length >= NVX_IDS.length) throw new GarageError('All three NVX versions are already saved.');
    ids.push(vehicleId);
    // Only the first saved version becomes default. Adding another never changes it.
    if (before.vehicleIds.length === 0) defaultId = vehicleId;
  }
  if (action === 'remove') {
    ids = ids.filter(id => id !== vehicleId);
    // Do not silently choose another default.
    if (defaultId === vehicleId) defaultId = '';
  }
  if (action === 'set-default') {
    if (!ids.includes(vehicleId)) throw new GarageError('Add this version to your garage first.', 409);
    defaultId = vehicleId;
  }
  if (action === 'clear-default') defaultId = '';
  return nextState(before, ids, defaultId);
}
/** Keep the existing /account/vehicle writer consistent with the new list.
 * A legacy save adds + makes default in ONE revision; clearing only clears default.
 */
export function applyLegacyVehicle(user, id, availableIds = NVX_IDS) {
  if (id !== '' && !isNVXId(id)) throw new GarageError('Choose a Yamaha NVX version.');
  if (id && !availableIds.includes(id)) throw new GarageError('This NVX version is not available.', 409);
  const before = garageSnapshot(user), ids = [...before.vehicleIds];
  if (id && !ids.includes(id)) ids.push(id);
  const next = nextState(before, ids, id);
  if (next.revision === before.revision && (user.savedVehicleId || '') !== id) {
    if (before.revision >= Number.MAX_SAFE_INTEGER - 1) throw new GarageError('Garage revision limit reached.', 409);
    return { ...next, revision: before.revision + 1 };
  }
  return next;
}
export function garageFields(state) {
  return { garageVehicleIds: [...state.vehicleIds], savedVehicleId: state.defaultVehicleId, garageRevision: state.revision };
}
/** Reject malformed, foreign-owner or internally inconsistent API responses. */
export function verifyGarageEnvelope(value, ownerId) {
  const { user, garage } = value || {};
  if (!user || typeof user.id !== 'string' || user.id !== ownerId || typeof user.email !== 'string'
    || !garage || !Array.isArray(garage.vehicleIds) || garage.vehicleIds.length > 3
    || garage.vehicleIds.some(id => !isNVXId(id)) || new Set(garage.vehicleIds).size !== garage.vehicleIds.length
    || (garage.defaultVehicleId !== '' && !garage.vehicleIds.includes(garage.defaultVehicleId))
    || !Number.isSafeInteger(garage.revision) || garage.revision < 0
    || !Array.isArray(user.garageVehicleIds) || !equalIds(user.garageVehicleIds, garage.vehicleIds)
    || user.garageRevision !== garage.revision
    || !equalIds(garageSnapshot(user).vehicleIds, garage.vehicleIds)
    || garageSnapshot(user).defaultVehicleId !== garage.defaultVehicleId) {
    throw new GarageError('The garage response could not be verified. Refresh and try again.', 502);
  }
  return value;
}
