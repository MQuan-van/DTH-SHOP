/** Story-only composition. These values never change Home / Admin presets. */
export const STORY_HERO = Object.freeze({
  productId: 'apex-suspension',
  modelSize: 3.2,
  rotation: Object.freeze([-0.06, -0.48, -0.18]),
  cameraFov: 35,
  framePadding: 1.10,
  secondsPerTurn: 24,
  maxDpr: 1.5,
  loadTimeoutMs: 15000,
});

export function selectStoryProduct(products = []) {
  const active = products.filter(p => p && p.active !== false);
  return active.find(p => p.id === STORY_HERO.productId)
    || active.find(p => typeof p.modelUrl === 'string' && p.modelUrl)
    || active[0]
    || null;
}

/** Fit a rotating bounding sphere AND the entire stationary pedestal.
 * Camera looks straight at the origin, avoiding a separate visual centre.
 * All sizes are scene units, not measurements of a physical part.
 */
export function fitStoryDistance(aspect, radius, fov = STORY_HERO.cameraFov) {
  if (!Number.isFinite(aspect) || aspect <= 0) throw new Error('Invalid viewport aspect');
  if (!Number.isFinite(radius) || radius <= 0) throw new Error('Invalid model bounds');
  if (!Number.isFinite(fov) || fov < 15 || fov > 80) throw new Error('Invalid field of view');
  const halfV = fov * Math.PI / 360;
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  const padding = STORY_HERO.framePadding;
  const turnRadius = radius * padding;
  const sphereDistance = turnRadius / Math.sin(Math.min(halfV, halfH));
  const ringRadius = radius * 1.06;
  // Front edge is closest to the camera. Reserve room for its perspective.
  const floorDepth = radius * 0.62;
  const floorY = radius + 0.18;
  const floorDistance = floorDepth + Math.max(
    ringRadius * padding / Math.tan(halfH),
    floorY * padding / Math.tan(halfV),
  );
  return Math.max(sphereDistance, floorDistance);
}

/** Tiny observable used by the existing Support/dialog input gate.
 * No camera timeline, global store, requestAnimationFrame loop or database writes.
 */
export function createStorySignal() {
  const state = { active: true, motion: true, blocked: false, resetSerial: 0 };
  const listeners = new Set();
  return {
    state,
    set(patch) {
      let changed = false;
      for (const key of ['active', 'motion', 'blocked']) {
        if (typeof patch[key] === 'boolean' && state[key] !== patch[key]) {
          state[key] = patch[key]; changed = true;
        }
      }
      if (Number.isSafeInteger(patch.resetSerial) && patch.resetSerial >= 0
        && state.resetSerial !== patch.resetSerial) {
        state.resetSerial = patch.resetSerial; changed = true;
      }
      if (changed) listeners.forEach(listener => listener());
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    get listenerCount() { return listeners.size; },
  };
}

export function advanceStoryTurn(angle, delta, state) {
  if (!state.active || !state.motion || state.blocked) return angle;
  const dt = Number.isFinite(delta) ? Math.min(0.05, Math.max(0, delta)) : 0;
  return (angle - dt * Math.PI * 2 / STORY_HERO.secondsPerTurn) % (Math.PI * 2);
}
