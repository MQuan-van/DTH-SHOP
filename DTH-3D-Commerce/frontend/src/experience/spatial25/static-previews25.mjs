import { previewSource } from '../../shop/catalog/catalog.logic.mjs';

// 352×352 transparent captures from the original Studio WebGL renderer.
// Each is valid only for the exact model and default presentation; tests verify file bytes.
export const STUDIO_STILLS25 = Object.freeze([
  Object.freeze({ id: 'ohlins', modelUrl: '/models/ai-products/0262d0bd-690d-439e-8132-8b07088abadb.glb',
    sha256: '79d2b2bdf8824a775e5cc8adffce313e2a687fb864fcef540c09eb084d536e98', src: '/previews/spatial25-stills/ohlins-ttx-0262d0bd.png' }),
  Object.freeze({ id: 'x1r-gtr', modelUrl: '/models/ai-products/40762c2a-50bd-4514-a523-1ff523c9a9f0.glb',
    sha256: 'd10bf8d005a9a648135e1b7a3cc2a2a2d3fcd7ed9da6102de98a3ae143acd0f0', src: '/previews/spatial25-stills/x1r-gtr-40762c2a.png' }),
  Object.freeze({ id: 'x1r-red', modelUrl: '/models/ai-products/587efa2d-8287-4fa2-aba4-9f075c521277.glb',
    sha256: 'b17864e59b39faf6455ded70018795d9fb972b4d618ca33fba82e1dd472e9aab', src: '/previews/spatial25-stills/x1r-gt4-587efa2d.png' }),
]);

/** Only prepared 3D renders. Never use catalog/reference photography on this shelf. */
export function bundledStill25(product) {
  if (!product || product.presentation3d) return '';
  const captured = STUDIO_STILLS25.find(record => record.id === product.id &&
    (product.modelUrl === record.modelUrl || product.modelUrl === `${record.modelUrl}?v=${record.sha256}`));
  if (captured) return captured.src;
  const demo = previewSource(product, true);
  return typeof demo === 'string' && demo.startsWith('/previews/shop-motion/') && demo !== product.imageUrl ? demo : '';
}
