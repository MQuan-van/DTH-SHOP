/** Product taxonomy. Legacy asset IDs/URLs and stored records are never rewritten. */
export const CATEGORIES = Object.freeze(['suspension', 'rims', 'tires', 'exhausts', 'mirrors', 'brakes']);
export const CATEGORY_LABELS = Object.freeze({
  suspension: 'Suspension', rims: 'Rims', tires: 'Tires', exhausts: 'Exhausts',
  mirrors: 'Mirrors', brakes: 'Brakes',
  // Compatibility for pre-split records. This is a display alias, not a DB migration.
  wheels: 'Rims',
});
export const categoryId = value => value === 'wheels' ? 'rims' : value;
export const isCategory = value => typeof value === 'string' && CATEGORIES.includes(categoryId(value));
export const categoryLabel = value => isCategory(value) ? CATEGORY_LABELS[categoryId(value)] : 'Parts';
export const categorySearchText = value => categoryId(value) === 'rims' ? 'rims wheels' : categoryId(value) || '';
export const normalizeProductCategory = product => product?.category === 'wheels'
  ? { ...product, category: 'rims' } : product;
/** A view copy only: no invented Tire record, no changes to price, stock or asset. */
export function normalizeCatalogCategories(catalog) {
  return { ...catalog, products: catalog.products.map(normalizeProductCategory) };
}
