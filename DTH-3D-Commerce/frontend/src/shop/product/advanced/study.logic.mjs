/** Product-only presentation state. None of this data is used for fitment or price. */
export const STUDY = Object.freeze({
  scanSeconds: 3.6, revealSeconds: 1.4, settleRate: 10,
  maxTriangles: 120000, maxVertices: 240000, maxMeshes: 80,
  hotSpotLimit: 6, maxFocusOffset: .88, minCameraClearance: 2.05,
});
export const MODE_IDS = Object.freeze(['explore', 'surface', 'technical', 'hotspots']);
export const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
export const finiteDelta = dt => Number.isFinite(dt) ? clamp(dt, 0, .05) : 0;
export function permittedMode(mode, capabilities = {}) {
  if (!MODE_IDS.includes(mode)) return false;
  if (mode === 'technical' || mode === 'surface') return capabilities.effects === true && capabilities[mode] !== false;
  if (mode === 'hotspots') return Array.isArray(capabilities.hotspots) && capabilities.hotspots.length > 0;
  return true;
}
export function createStudyClock() {
  let mode = 'explore', technical = 0, surface = 0, progress = 1, running = false;
  const goals = () => ({ technical: mode === 'technical' ? 1 : 0, surface: mode === 'surface' ? 1 : 0 });
  const snapshot = () => ({ mode, technical, surface, progress, running,
    busy: running || Math.abs(technical - goals().technical) > 1e-4 || Math.abs(surface - goals().surface) > 1e-4 });
  function settle() { technical = goals().technical; surface = goals().surface; progress = 1; running = false; return snapshot(); }
  return {
    read: snapshot,
    mode(next, capabilities = {}, motion = true) {
      if (!permittedMode(next, capabilities)) return false;
      if (mode === next) return false;
      mode = next; progress = (next === 'surface' || next === 'technical') && motion ? 0 : 1;
      running = progress === 0;
      if (!motion) settle();
      return true;
    },
    replay(motion = true) {
      if (!motion || !['technical', 'surface'].includes(mode)) return false;
      progress = 0; running = true; return true;
    },
    scrub(value) {
      if (mode !== 'technical' || !Number.isFinite(value)) return false;
      progress = clamp(value, 0, 1); running = false; return true;
    },
    settle,
    tick(dt, {active = true, motion = true} = {}) {
      if (!motion) { if(running) return settle(); technical=goals().technical; surface=goals().surface; return snapshot(); }
      if (!active) return snapshot();
      const delta = finiteDelta(dt), a = 1 - Math.exp(-STUDY.settleRate * delta), goal = goals();
      technical += (goal.technical - technical) * a;
      surface += (goal.surface - surface) * a;
      if (Math.abs(technical - goal.technical) < 1e-4) technical = goal.technical;
      if (Math.abs(surface - goal.surface) < 1e-4) surface = goal.surface;
      if (running) { progress = Math.min(1, progress + delta / (mode === 'technical' ? STUDY.scanSeconds : STUDY.revealSeconds)); if (progress >= 1) running = false; }
      return snapshot();
    },
  };
}
export function normalizeHotspot(point, fit) {
  if (!Array.isArray(point) || point.length !== 3 || !point.every(Number.isFinite)
    || !fit?.center || !Number.isFinite(fit.scale) || fit.scale <= 0) return null;
  const result = point.map((n, i) => (n - fit.center[i]) * fit.scale);
  return result.every(Number.isFinite) && Math.hypot(...result) <= 1.36 ? result : null;
}
