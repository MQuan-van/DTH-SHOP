import { applyGarageCommand, applyLegacyVehicle, garageEnvelope, garageFields } from '../../../../../shared/garage.mjs';
import { publishedNVXVehicles } from '../../../../../shared/nvx.mjs';
/** Explicit Flow-mode adapter only. It does not connect to the API or claim MongoDB storage. */
export function handleGarageFlow({ route, method, body, member, catalog, persist }) {
  if (route === '/account/garage' && method === 'GET') return garageEnvelope(member());
  if (route === '/account/garage' && method === 'POST') {
    const user = member(), next = applyGarageCommand(user, body, publishedNVXVehicles(catalog.vehicles).map(v => v.id));
    Object.assign(user, garageFields(next)); persist(); return garageEnvelope(user);
  }
  return undefined;
}
export function saveGarageFlowVehicle(user, id, catalog, persist) {
  const next = applyLegacyVehicle(user, id, publishedNVXVehicles(catalog.vehicles).map(v => v.id));
  Object.assign(user, garageFields(next)); persist(); return garageEnvelope(user);
}
