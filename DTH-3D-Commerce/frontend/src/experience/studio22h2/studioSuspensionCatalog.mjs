/**
 * DTH Studio display policy for Suspension only.
 *
 * Products do not currently store an upload provenance flag. The bundled assets
 * live under /models/dth-demo/ (and motorcycle assets under /models/nvx/).
 * Any other valid local GLB path represents a separately supplied model, such
 * as a GLB exported by an admin to /models/ai-products/.
 *
 * This is a UI catalogue filter, not proof that a remote file exists or that
 * its binary bytes pass validation. The 3D viewer still performs that check.
 */
const LOCAL_GLB = /^\/models\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.glb$/;
const BUNDLED_MODEL_DIRS = /^\/models\/(?:dth-demo|nvx)\//;

export function isUploadedSuspensionGLB22H2(product) {
  if (!product || product.category !== 'suspension') return false;
  const url = product.modelUrl;
  if (typeof url !== 'string' || url.length > 512) return false;
  const pathname = url.split(/[?#]/, 1)[0];
  return LOCAL_GLB.test(pathname) && !BUNDLED_MODEL_DIRS.test(pathname);
}

export function filterStudioSuspension22H2(products) {
  return (Array.isArray(products) ? products : []).filter(
    product => product?.category !== 'suspension' || isUploadedSuspensionGLB22H2(product)
  );
}
