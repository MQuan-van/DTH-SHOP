import { verifyGarageEnvelope } from '../../../../../shared/garage.mjs';
/** Response checks are shared by the hook and its tests. */
export function acceptGarageResponse(value, { ownerId, epoch, currentEpoch, request, currentRequest }) {
  if (epoch !== currentEpoch || request !== currentRequest) return null;
  return verifyGarageEnvelope(value, ownerId);
}
export function pickGarageVehicle(state, preferred, shopId) {
  if (state.vehicleIds.includes(preferred)) return preferred;
  if (state.vehicleIds.includes(shopId)) return shopId;
  return state.defaultVehicleId || state.vehicleIds[0] || '';
}
