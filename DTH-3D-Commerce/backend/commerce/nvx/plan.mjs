import { NVX_VEHICLES, NVX_DEMO_RECIPES, NVX_IDS, sameVehicleIds, buildNVXDemoCatalog } from '../../../shared/nvx.mjs';
const unique = (rows, label) => {
  const map = new Map();
  for (const row of rows) { if (map.has(row.id)) throw new Error(`Duplicate ${label} id: ${row.id}`); map.set(row.id, row); }
  return map;
};
export function buildNVXMigrationPlan(base, currentProducts, currentVehicles) {
  const desired = buildNVXDemoCatalog(base);
  const products = unique(currentProducts, 'product'), vehicles = unique(currentVehicles, 'vehicle');
  const originals = unique(base.products, 'base product');
  const targets = unique(desired.products, 'target product');
  const operations = [], skipped = [], conflicts = [];
  for (const target of NVX_VEHICLES) {
    const previous = vehicles.get(target.id);
    if (!previous) operations.push({ collection: 'store_vehicles', kind: 'insert', id: target.id, document: { ...target } });
    else if (previous.make !== target.make || previous.model !== target.model || Object.hasOwn(previous, 'year'))
      conflicts.push(`Vehicle ${target.id} already exists with different identity/year fields. Review it before migration.`);
  }
  for (const recipe of NVX_DEMO_RECIPES) {
    const source = originals.get(recipe.productId), target = targets.get(recipe.productId), previous = products.get(recipe.productId);
    if (!source || !target) { skipped.push(`${recipe.productId}: absent from the base asset fixture.`); continue; }
    if (!sameVehicleIds(target.vehicleIds, recipe.newIds) || target.demoOnly !== true) {
      skipped.push(`${recipe.productId}: base fixture was customised; no inferred mapping.`); continue;
    }
    if (!previous) { operations.push({ collection: 'store_products', kind: 'insert', id: target.id, document: { ...target } }); continue; }
    if (Array.isArray(previous.vehicleIds) && previous.vehicleIds.length && previous.vehicleIds.every(id => NVX_IDS.includes(id))) {
      skipped.push(`${recipe.productId}: existing NVX mapping preserved.`); continue;
    }
    if (previous.demoOnly !== true || previous.modelUrl !== source.modelUrl || previous.assetLicense !== source.assetLicense
      || !sameVehicleIds(previous.vehicleIds, recipe.oldIds)) {
      skipped.push(`${recipe.productId}: custom product/fitment preserved; assign NVX manually in Admin if appropriate.`); continue;
    }
    operations.push({ collection: 'store_products', kind: 'fitment', id: previous.id,
      previousVehicleIds: [...previous.vehicleIds], nextVehicleIds: [...recipe.newIds],
      hadUpdatedAt: Object.hasOwn(previous, 'updatedAt'), previousUpdatedAt: previous.updatedAt || null });
  }
  return { operations, skipped, conflicts,
    note: 'Synthetic mappings only. Legacy vehicles, user documents, orders, prices, descriptions and 3D assets are NOT deleted or reassigned.' };
}
