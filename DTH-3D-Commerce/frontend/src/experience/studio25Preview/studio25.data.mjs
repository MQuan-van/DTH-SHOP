import { categoryId } from '../../../../shared/categories.mjs';
import { catalog22H2 } from '../studio22h2/studio22h2.logic.mjs';
import { filterStudioSuspension22H2 } from '../studio22h2/studioSuspensionCatalog.mjs';
import { LOCAL_TTX } from '../galleryDemo24/gallery-demo.logic.mjs';

const MONO = Object.freeze({ id: 'asset-x1r-monoshock', slug: 'asset-x1r-monoshock', name: 'X1R GTR Monoshock',
  category: 'suspension', finish: 'Original asset', price: null, galleryAssetOnly: true,
  modelUrl: '/models/ai-products/40762c2a-50bd-4514-a523-1ff523c9a9f0.glb',
  imageUrl: '/previews/ai-products/40762c2a-50bd-4514-a523-1ff523c9a9f0.webp' });
export const PREVIEW_ASSETS25 = Object.freeze([LOCAL_TTX, MONO]);
const modelPath = p => String(p?.modelUrl || '').split('?')[0];
/** Live records remain authoritative. Local asset studies have no invented SKU price or fitment. */
export function previewCatalog25(records, source = 'live') {
  const list = filterStudioSuspension22H2(catalog22H2(records));
  const complete = source === 'live' ? list : [...list, ...PREVIEW_ASSETS25.filter(a => !list.some(p => modelPath(p) === a.modelUrl))];
  const rank = p => {
    const known = PREVIEW_ASSETS25.findIndex(a => a.modelUrl === modelPath(p));
    return known >= 0 ? known : modelPath(p).startsWith('/models/ai-products/') ? 2 : 3;
  };
  return [...complete].sort((a, b) => rank(a) - rank(b));
}
export const offlineCatalog25 = (records = []) => previewCatalog25(records, 'local');
export function family25(products, product) { return products.filter(p => categoryId(p.category) === categoryId(product?.category)); }
/** Keep the selected object central; show at most two neighbours, without duplicated two-item assets. */
export function selectionShelf25(products, selectedId) {
  const index = products.findIndex(p => p.id === selectedId);
  if (index < 0) return [];
  if (products.length === 1) return [{ product: products[index], role: 'current' }];
  if (products.length === 2) return [{ product: products[index], role: 'current' }, { product: products[1 - index], role: 'next' }];
  return [{ product: products[(index - 1 + products.length) % products.length], role: 'previous' },
    { product: products[index], role: 'current' }, { product: products[(index + 1) % products.length], role: 'next' }];
}
export function productPrice25(product) {
  if (!product || product.galleryAssetOnly || !Number.isSafeInteger(product.price) || product.price < 1 || product.price > 1e9 || product.currency && product.currency !== 'VND') return null;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(product.price);
}
export function productHref25(product) {
  return !product?.galleryAssetOnly && typeof product?.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug) && product.slug.length <= 80 ? `/products/${product.slug}` : null;
}
/** A generic leader to the rendered product, not an anatomical hotspot or installation point. */
export function leaderPath25(start, end, bounds) {
  if (![start?.x, start?.y, end?.x, end?.y, bounds?.width, bounds?.height].every(Number.isFinite) || bounds.width < 640 || bounds.height <= 0 || end.x < 0 || end.x > bounds.width || end.y < 0 || end.y > bounds.height || start.x >= end.x - 28) return null;
  const elbow = start.x + Math.min(56, (end.x - start.x) * .28);
  return `M${start.x.toFixed(1)},${start.y.toFixed(1)} L${elbow.toFixed(1)},${start.y.toFixed(1)} L${end.x.toFixed(1)},${end.y.toFixed(1)}`;
}
