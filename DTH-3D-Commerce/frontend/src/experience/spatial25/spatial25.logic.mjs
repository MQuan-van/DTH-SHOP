import { studioGalleryCatalog24, studioGalleryDefault24 } from '../gallery24/studio-gallery24.logic.mjs';

/** Production uses published StoreProvider records and exact Admin binding, never demo fallbacks. */
export const spatialCatalog25 = (records, binding) => studioGalleryCatalog24(records, binding);
export function spatialSelection25(products, requestedId, configuredId) {
  return products.find(product => product.id === requestedId)
    || products.find(product => product.id === studioGalleryDefault24(products, configuredId)) || null;
}
