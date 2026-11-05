import { catalog22H2, modelPath22H2, href22H2 } from '../studio22h2/studio22h2.logic.mjs';
import { filterStudioSuspension22H2 } from '../studio22h2/studioSuspensionCatalog.mjs';

// Local asset study only: no catalog record, invented price or commerce action.
export const LOCAL_TTX = Object.freeze({
  id: 'asset-ohlins-ttx', slug: 'asset-ohlins-ttx', name: 'Ohlins TTX',
  category: 'suspension', finish: 'Original asset', price: null,
  modelUrl: '/models/ai-products/0262d0bd-690d-439e-8132-8b07088abadb.glb',
  imageUrl: '/previews/ai-products/0262d0bd-690d-439e-8132-8b07088abadb.webp',
  galleryAssetOnly: true,
});

export function galleryProducts(values) {
  const catalog = filterStudioSuspension22H2(catalog22H2(values)).filter(p => modelPath22H2(p.modelUrl));
  const items = catalog.some(p => modelPath22H2(p.modelUrl) === LOCAL_TTX.modelUrl) ? catalog : [...catalog, LOCAL_TTX];
  // Uploaded real records first, then the asset study, then the illustrative collection.
  return [...items].sort((a, b) => rank(a) - rank(b));
}
function rank(p) { return p.galleryAssetOnly ? 1 : p.modelUrl.startsWith('/models/dth-demo/') ? 2 : 0; }
export function gallerySelection(products, category, requestedId) {
  const visible = products.filter(p => category === 'all' || p.category === category);
  return { visible, product: visible.find(p => p.id === requestedId) || visible[0] || null };
}
export function galleryProductHref(product, source) {
  return source === 'live' && !product?.galleryAssetOnly ? href22H2(product) : '';
}
export function galleryPrice(product) {
  if (product?.galleryAssetOnly || !Number.isFinite(product?.price) || product.price < 0) return null;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: product.currency || 'VND', maximumFractionDigits: 0 }).format(product.price);
}
export function publicProducts(payload) {
  if (!Array.isArray(payload?.data)) throw new TypeError('The product catalog is unavailable.');
  return payload.data;
}

const PREVIEW_VIEWS = Object.freeze({
  '/models/ai-products/40762c2a-50bd-4514-a523-1ff523c9a9f0.glb': [-0.52, 0.14],
  [LOCAL_TTX.modelUrl]: [-0.58, 0.12],
});
export function galleryCamera24(product, center, radius, hasSpatialProfile = false) {
  // Only a preview default for these known assets. Never override Admin/profile framing.
  if (product?.presentation3d || hasSpatialProfile || !Array.isArray(center) || center.length !== 3 || !center.every(Number.isFinite) || !(radius > 0) || !Number.isFinite(radius)) return null;
  const angles = PREVIEW_VIEWS[product?.modelUrl];
  if (!angles) return null;
  const [yaw, pitch] = angles, direction = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
  return { position: center.map((v, i) => v + direction[i] * radius * 4), target: [...center] };
}
export const galleryKey24 = product => product ? `${product.id}:${product.modelUrl}:${JSON.stringify(product.presentation3d || null)}` : '';

// Populated only with actual frames exported from this preview, never generated product art.
export function galleryPoster24(product) {
  if (!product?.presentation3d) {
    const file = {
      '/models/ai-products/40762c2a-50bd-4514-a523-1ff523c9a9f0.glb': 'x1r-gtr',
      [LOCAL_TTX.modelUrl]: 'ohlins-ttx',
    }[product?.modelUrl];
    if (file) return `/previews/gallery24/${file}.png`;
  }
  return product?.imageUrl || '';
}

/** Cancellable cosmetic delay; a new selection can never commit an older request. */
export function gallerySwitch24(commit, schedule = setTimeout, cancel = clearTimeout) {
  let handle = null, version = 0;
  return {
    request(value, immediate = false) {
      if (handle !== null) cancel(handle);
      const request = ++version;
      if (immediate) { handle = null; commit(value); return; }
      handle = schedule(() => { if (request === version) { handle = null; commit(value); } }, 150);
    },
    cancel() { version++; if (handle !== null) cancel(handle); handle = null; },
  };
}
