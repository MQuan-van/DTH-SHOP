/** Camera presentation state only. No identity, form values, storage or network. */
export function createAccessDirector245(registering = false) {
  const listeners = new Set();
  const state = { intro: 1, mode: registering ? 1 : 0, detail: 0, active: false, blocked: true, motion: false };
  return { state, intent: { modeInstant: false }, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    emit() { listeners.forEach(listener => listener(state)); },
    clear() { listeners.clear(); } };
}
export function studioProduct245(products) {
  return Array.isArray(products) ? products.find(product => product?.id === 'ohlins' && product.active === true
    && product.category === 'suspension' && typeof product.modelUrl === 'string' && product.modelUrl.startsWith('/models/')) || null : null;
}
/** Native screenshot of the original GLB, not a generated or retouched product image.
 * Captured 2026-11-05 through the existing profiled loader with default presentation.
 * Re-capture when model bytes or the authored presentation change.
 */
export const STUDY_POSTER245 = Object.freeze({
  productId: 'ohlins',
  modelUrl: '/models/ai-products/0262d0bd-690d-439e-8132-8b07088abadb.glb',
  sha256: '79d2b2bdf8824a775e5cc8adffce313e2a687fb864fcef540c09eb084d536e98',
  src: '/branding/access245/ohlins-study-79d2b2bd.png',
  width: 500, height: 480,
});
export function studioPoster245(product) {
  return product?.id === STUDY_POSTER245.productId && product.modelUrl === STUDY_POSTER245.modelUrl
    && product.presentation3d == null ? STUDY_POSTER245 : null;
}
export function directorPermission245(policy, { focusing = false, busy = false } = {}) {
  const motion = Boolean(policy.allowed && policy.motion && !policy.compact && !policy.reduced && !policy.saveData);
  return { motion, blocked: !motion || Boolean(policy.hidden || policy.paused || focusing || busy) };
}
