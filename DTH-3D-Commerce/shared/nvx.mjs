/**
 * Step 15: the storefront sells a DEMONSTRATION of NVX fitment, not installation advice.
 * NVX V1 / V2 / V3 are the user's chosen catalogue versions. No model year is stored.
 * Keep shared/catalog.json unchanged as the provenance/test fixture for existing assets.
 */
export const NVX_CATALOG_VERSION = 'yamaha-nvx-no-year-v1';
export const NVX_VEHICLES = Object.freeze([1, 2, 3].map(n => Object.freeze({
  id: `yamaha-nvx-v${n}`, make: 'Yamaha', model: `NVX V${n}`, demoOnly: true,
})));
export const NVX_IDS = Object.freeze(NVX_VEHICLES.map(v => v.id));
export const isNVXId = id => typeof id === 'string' && NVX_IDS.includes(id);
const categories = ['suspension', 'wheels', 'exhausts', 'mirrors', 'brakes'];
const legacy = Object.freeze({
  apex: ['street155-2022', 'street155-2023'],
  vector: ['road300-2023', 'road300-2024'],
  touring: ['touring16-2021', 'touring16-2022'],
  studio: ['sport20-2023', 'sport20-2024'],
});
// Explicitly SYNTHETIC authoring. These are not translations of real vehicle fitment.
const target = { apex: [NVX_IDS[0]], vector: [NVX_IDS[1]], touring: [NVX_IDS[2]], studio: [...NVX_IDS] };
export const NVX_DEMO_RECIPES = Object.freeze(Object.keys(legacy).flatMap(series => categories.map(category =>
  Object.freeze({ productId: `${series}-${category}`, oldIds: Object.freeze([...legacy[series]]), newIds: Object.freeze([...target[series]]) }))));
export function sameVehicleIds(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.every(v => typeof v === 'string') && b.every(v => typeof v === 'string')
    && a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
}
export function vehicleLabel(vehicle) {
  if (!vehicle) return '';
  const name = [vehicle.make, vehicle.model].filter(v => typeof v === 'string' && v.trim()).map(v => v.trim()).join(' ');
  // Old receipts may legitimately retain a year. NVX storefront records never display it.
  const year = !isNVXId(vehicle.id) && (typeof vehicle.year === 'number' || typeof vehicle.year === 'string')
    ? String(vehicle.year).trim() : '';
  return [name, year].filter(Boolean).join(' · ') || (typeof vehicle.id === 'string' ? vehicle.id : '');
}
export function nvxVehicleQuery(ids = NVX_IDS) {
  return { id: { $in: NVX_IDS.filter(id => Array.isArray(ids) && ids.includes(id)) } };
}
export function publishedNVXVehicles(records) {
  const list = Array.isArray(records) ? records : [];
  // Do not manufacture a database record that has not been provisioned yet.
  return NVX_VEHICLES.filter(v => list.some(r => r?.id === v.id && r.make === v.make && r.model === v.model))
    .map(v => ({ ...v }));
}
export function assertNVXCatalog(data) {
  if (!Array.isArray(data?.products) || publishedNVXVehicles(data?.vehicles).length !== 3) {
    throw new Error('NVX catalogue is not ready. Run the Step 15 database check/apply, then restart the API. No preview data has been substituted.');
  }
  return { ...data, vehicleSystem: NVX_CATALOG_VERSION, vehicles: publishedNVXVehicles(data.vehicles) };
}
export function buildNVXDemoCatalog(base) {
  if (!base || !Array.isArray(base.products)) throw new Error('A base product catalogue is required.');
  const recipes = new Map(NVX_DEMO_RECIPES.map(r => [r.productId, r]));
  const products = structuredClone(base.products).map(product => {
    const recipe = recipes.get(product?.id);
    // Never silently overwrite a custom mapping or a non-demo product.
    if (!recipe || product.demoOnly !== true || !sameVehicleIds(product.vehicleIds, recipe.oldIds)) return product;
    return { ...product, vehicleIds: [...recipe.newIds] };
  });
  return { ...structuredClone(base), vehicleSystem: NVX_CATALOG_VERSION, demoOnly: true,
    vehicles: NVX_VEHICLES.map(v => ({ ...v })), products };
}
