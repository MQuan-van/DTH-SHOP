import { fitment } from '../../../../shared/domain.mjs';
import { NVX_VEHICLES, isNVXId, publishedNVXVehicles } from '../../../../shared/nvx.mjs';

export function matchingNVXParts(products, vehicles, vehicleId) {
  if (!isNVXId(vehicleId)) return [];
  const catalogue = publishedNVXVehicles(vehicles);
  return (Array.isArray(products) ? products : []).filter(p => p && p.active !== false
    && (p.currency === undefined || p.currency === 'VND') && Number.isSafeInteger(p.price) && p.price > 0 && p.price <= 1_000_000_000
    && fitment(p, vehicleId, catalogue).status === 'compatible')
    .sort((a, b) => Number(a.vehicleIds.length > 1) - Number(b.vehicleIds.length > 1) || Number(!!b.featured) - Number(!!a.featured) || String(a.name).localeCompare(String(b.name)) || String(a.id).localeCompare(String(b.id)));
}
export function nvxOptions(products, vehicles) {
  const available = publishedNVXVehicles(vehicles);
  return NVX_VEHICLES.map(v => ({ ...v, available: available.some(record => record.id === v.id),
    count: matchingNVXParts(products, available, v.id).length }));
}
export function initialNVXSelection(vehicles, preferred) {
  const available = publishedNVXVehicles(vehicles);
  return available.some(v => v.id === preferred) ? preferred : available[0]?.id || '';
}
export function validLocalModel(product) {
  return !!product && typeof product.modelUrl === 'string'
    && /^\/models\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.glb$/.test(product.modelUrl);
}
