import { fitment } from '../../../../../shared/domain.mjs';
import { patchShopQuery, selectShopProducts } from '../catalog.logic.mjs';

const safeVehicles = vehicles => Array.isArray(vehicles)
  ? vehicles.filter(v => v && typeof v.id === 'string') : [];
const text = value => typeof value === 'string' ? value.trim() : '';
export function vehicleCaption(vehicle) {
  if (!vehicle) return '';
  const name = [text(vehicle.make), text(vehicle.model)].filter(Boolean).join(' ');
  const year = typeof vehicle.year === 'number' || typeof vehicle.year === 'string'
    ? String(vehicle.year).slice(0, 12) : '';
  return [name, year].filter(Boolean).join(' · ') || vehicle.id || 'Selected demo vehicle';
}

/** Presentation around the existing domain rule, not a new compatibility authority. */
export function explainFitment(product, vehicleId, vehicles) {
  const known = safeVehicles(vehicles);
  const vehicle = known.find(v => v.id === vehicleId) || null;
  let status, reason;
  if (!vehicleId) { status = 'unselected'; reason = 'no-vehicle'; }
  else if (!vehicle) { status = 'unknown'; reason = 'missing-vehicle'; }
  else if (!product || !Array.isArray(product.vehicleIds)
    || product.vehicleIds.some(id => typeof id !== 'string' || !id)) {
    status = 'unknown'; reason = 'missing-fitment';
  } else {
    status = fitment(product, vehicleId, known).status;
    reason = status === 'compatible' ? 'listed' : 'not-listed';
  }
  const content = {
    listed: ['Matches selected demo vehicle', 'This part lists your selected vehicle in the demo catalog.'],
    'not-listed': ['No match in demo data', 'Your selected vehicle is not listed for this part. This is not a real-world fitment verdict.'],
    'no-vehicle': ['Select a vehicle to check fit', 'Choose a demo vehicle to see the recorded compatibility.'],
    'missing-vehicle': ['Vehicle data unavailable', 'The saved vehicle is not in this dataset. Choose a listed vehicle; nothing has been removed from your bag.'],
    'missing-fitment': ['Compatibility not established', 'This part has no usable compatibility record. Unknown does not mean incompatible.'],
  }[reason];
  return { status, reason, title: content[0], detail: content[1], vehicle,
    vehicleLabel: vehicleCaption(vehicle), canAdd: status === 'compatible',
    canExplore: !!vehicle && (status === 'incompatible' || status === 'unknown') };
}

/** Counts reflect search/category/price; only the fit filter is omitted. */
export function summarizeFitment(products, vehicles, vehicleId, query) {
  const safe = Array.isArray(products) ? products.filter(p => p && typeof p === 'object') : [];
  const pool = selectShopProducts(safe, safeVehicles(vehicles), vehicleId, { ...query, fit: 'all' });
  const counts = { compatible: 0, incompatible: 0, unknown: 0, unselected: 0, total: pool.length };
  for (const product of pool) counts[explainFitment(product, vehicleId, vehicles).status]++;
  return counts;
}

/** Does not clear query, category, max price, sort, unrelated keys or the saved vehicle. */
export function matchingQuery(input) {
  return patchShopQuery(input, { fit: 'match' });
}
