/** Camera-only presentation math. Stations are display locations, never mounting coordinates. */
const vector = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const add = (a, b) => a.map((v, i) => v + b[i]);
const subtract = (a, b) => a.map((v, i) => v - b[i]);
const length = value => Math.hypot(...value);
const unit = value => { const n = length(value); return n > 1e-8 ? value.map(v => v / n) : [0, 0, 1]; };
const multiply = (value, n) => value.map(v => v * n);
export function scenePermitted25({ active = false, blocked = false, hidden = false, failed = false } = {}) {
  return active === true && !blocked && !hidden && !failed;
}
/** Save-Data/paused/authored-stop disable idle work, not a deliberate camera selection. */
export function allowIdleOrbit25({ paused = false, reduced = false, orbitDisabled = false, inspect = false, spinEnabled = true } = {}) {
  return !paused && !reduced && !orbitDisabled && !inspect && spinEnabled !== false;
}
/** One full turn per authored period, rather than a barely visible sine sway. */
export function idleOrbitAngle25(elapsed, secondsPerTurn) {
  if (!Number.isFinite(elapsed) || elapsed < 0 || !Number.isFinite(secondsPerTurn) || secondsPerTurn <= 0) return 0;
  return (elapsed % secondsPerTurn) / secondsPerTurn * Math.PI * 2;
}
export const smooth25 = value => { const t = Math.max(0, Math.min(1, value)); return t * t * t * (t * (t * 6 - 15) + 10); };
export function station25(index) {
  if (!Number.isSafeInteger(index) || index < 0 || index > 1000) throw new TypeError('Invalid gallery station.');
  return [index * 12, 0, 0];
}
export function fitDistance25(radius, width, height, fov = 36) {
  if (![radius, width, height, fov].every(Number.isFinite) || radius <= 0 || width <= 0 || height <= 0 || fov < 20 || fov > 70) throw new TypeError('Invalid gallery camera bounds.');
  const vertical = fov * Math.PI / 360, horizontal = Math.atan(Math.tan(vertical) * width / height);
  return radius / Math.sin(Math.min(vertical, horizontal)) * 1.14;
}
export function stationPose25(descriptor, station, width, height) {
  if (!vector(descriptor?.center) || !(descriptor.radius > 0) || !vector(station)) throw new TypeError('Invalid gallery model descriptor.');
  const center = add(descriptor.center, station), front = descriptor.front;
  const validFront = vector(front?.position) && vector(front?.target) && length(subtract(front.position, front.target)) > descriptor.radius;
  const targetLocal = validFront ? front.target : descriptor.center;
  const target = add(targetLocal, station), offset = length(subtract(target, center));
  const direction = validFront ? unit(subtract(front.position, front.target)) : unit([-.50, .14, 1]);
  // The authored orientation/target are preserved. Responsive fit reserves the complete model hull.
  const distance = fitDistance25(descriptor.radius + offset, width, height, descriptor.fov || 36);
  return { position: add(target, multiply(direction, distance)), target, center, radius: descriptor.radius, distance, fov: descriptor.fov || 36 };
}
export function guardCamera25(position, spheres = []) {
  if (!vector(position)) throw new TypeError('Invalid camera position.');
  let result = [...position];
  for (const sphere of spheres) {
    if (!vector(sphere?.center) || !(sphere.radius > 0)) continue;
    const offset = subtract(result, sphere.center), minimum = sphere.radius * 1.18;
    if (length(offset) < minimum) result = add(sphere.center, multiply(unit(offset), minimum));
  }
  return result;
}
/** Camera travels through space; original product station/model transforms never animate. */
export function createTravel25(from, to, { seconds = 1.18, spheres = [], reduced = false } = {}) {
  if (![from?.position, from?.target, to?.position, to?.target].every(vector) || !Number.isFinite(seconds) || seconds <= 0) throw new TypeError('Invalid gallery camera journey.');
  const startFov = from.fov ?? 36, endFov = to.fov ?? 36;
  if (![startFov, endFov].every(n => Number.isFinite(n) && n >= 20 && n <= 70)) throw new TypeError('Invalid gallery field of view.');
  const start = { position: [...from.position], target: [...from.target], fov: startFov }, end = { position: [...to.position], target: [...to.target], fov: endFov };
  const distance = length(subtract(end.target, start.target));
  const retreat = Math.min(5.5, Math.max(1.25, distance * .34));
  const a = add(start.position, multiply(unit(subtract(start.position, start.target)), retreat));
  const b = add(end.position, multiply(unit(subtract(end.position, end.target)), retreat));
  a[1] += .5; b[1] += .5;
  return {
    seconds: reduced ? 0 : seconds,
    sample(elapsed) {
      const raw = reduced ? 1 : Math.max(0, Math.min(1, elapsed / seconds)), t = smooth25(raw), s = 1 - t;
      const point = raw === 0 ? start.position : raw === 1 ? end.position : start.position.map((v, i) => s * s * s * v + 3 * s * s * t * a[i] + 3 * s * t * t * b[i] + t * t * t * end.position[i]);
      return { position: guardCamera25(point, spheres), target: mix(start.target, end.target, t), fov: start.fov + (end.fov - start.fov) * t, done: raw === 1, progress: raw };
    },
  };
}
export function nearestResident25(entries, position, preferred = '') {
  if (!vector(position)) return preferred || '';
  const ready = entries.filter(e => e && e.rendered && vector(e.center));
  ready.sort((a, b) => length(subtract(a.center, position)) - length(subtract(b.center, position)));
  return ready[0]?.id || preferred || '';
}
export function residents25(retainedId, selectedId) {
  return [...new Set([retainedId, selectedId].filter(id => typeof id === 'string' && id))].slice(-2);
}
export function projectPoint25(ndc, width, height, { facing = true } = {}) {
  if (!vector(ndc) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return { x: 0, y: 0, visible: false };
  return { x: (ndc[0] + 1) * width / 2, y: (1 - ndc[1]) * height / 2,
    visible: facing && ndc[2] >= -1 && ndc[2] <= 1 && Math.abs(ndc[0]) <= 1 && Math.abs(ndc[1]) <= 1 };
}
