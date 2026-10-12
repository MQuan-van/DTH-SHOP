import { PRODUCT_VIEW } from './productDecision.logic.mjs';
const TAU = Math.PI * 2;
export const limit = (n, a, b) => Math.max(a, Math.min(b, n));
export function frameDistance(width, height, radius = PRODUCT_VIEW.radius, fov = PRODUCT_VIEW.fov) {
  const w = Number.isFinite(width) && width > 0 ? width : 1;
  const h = Number.isFinite(height) && height > 0 ? height : 1;
  const r = Number.isFinite(radius) && radius > 0 ? radius : PRODUCT_VIEW.radius;
  const v = limit(Number.isFinite(fov) ? fov : PRODUCT_VIEW.fov, 10, 90) * Math.PI / 180;
  const horizontal = 2 * Math.atan(Math.tan(v / 2) * w / h);
  return r / Math.sin(Math.min(v, horizontal) / 2) * PRODUCT_VIEW.padding;
}
export function sphereNormalization(center, radius, target = PRODUCT_VIEW.radius) {
  if (!Array.isArray(center) || center.length !== 3 || !center.every(Number.isFinite)
    || !Number.isFinite(radius) || radius <= 0 || !Number.isFinite(target) || target <= 0) {
    throw new Error('Model has no usable finite bounds.');
  }
  const scale = target / radius;
  if (!Number.isFinite(scale) || !center.every(n => Number.isFinite(n * scale))) throw new Error('Model bounds exceed supported limits.');
  return { center: center.slice(), scale, offset: center.map(n => -n) };
}
const commands = new Set(['left', 'right', 'in', 'out', 'reset', 'front', 'side', 'rear', 'detail']);
export function createInspection(initialDistance) {
  let distance = Number.isFinite(initialDistance) && initialDistance > 0 ? initialDistance : frameDistance(800, 600);
  const bounds = () => ({ min: Math.max(PRODUCT_VIEW.radius * 1.55, distance * 0.57), max: distance * 1.9 });
  const home = () => ({ theta: 0.28, phi: Math.PI / 2 - 0.08, radius: distance });
  let current = home(), target = { ...current };
  let moving = false;
  const constrained = pose => {
    const b = bounds();
    return { theta: pose.theta, phi: limit(pose.phi, .18, Math.PI - .18), radius: limit(pose.radius, b.min, b.max) };
  };
  const nearest = (angle, previous) => previous + Math.atan2(Math.sin(angle - previous), Math.cos(angle - previous));
  return {
    read: () => ({ ...current }),
    target: () => ({ ...target }),
    get moving() { return moving; },
    limits: bounds,
    sync(pose) {
      if (!pose || !['theta','phi','radius'].every(k => Number.isFinite(pose[k]))) return false;
      current = constrained(pose); target = { ...current }; moving = false; return true;
    },
    reframe(next) {
      if (!Number.isFinite(next) || next <= 0) return false;
      const ratio = current.radius / distance;
      distance = next; current = constrained({ ...current, radius: next * ratio });
      target = { ...current }; moving = false; return true;
    },
    cancel() { target = { ...current }; moving = false; },
    settle() { current = { ...target }; moving = false; return { ...current }; },
    command(name, enabled = true) {
      if (!enabled || !commands.has(name)) return false;
      const next = { ...target };
      if (name === 'left') next.theta -= .32;
      if (name === 'right') next.theta += .32;
      if (name === 'in') next.radius *= .86;
      if (name === 'out') next.radius /= .86;
      if (name === 'reset' || name === 'front') Object.assign(next, home(), { theta: nearest(home().theta, target.theta) });
      if (name === 'side') Object.assign(next, { theta: nearest(Math.PI / 2, target.theta), phi: Math.PI / 2, radius: distance });
      if (name === 'rear') Object.assign(next, { theta: nearest(Math.PI, target.theta), phi: Math.PI / 2 - .08, radius: distance });
      if (name === 'detail') Object.assign(next, { radius: distance * .76, phi: Math.PI / 2 - .16 });
      target = constrained(next); moving = true; return true;
    },
    tick(delta, { enabled = true, motion = true, spin = false } = {}) {
      if (!enabled) return { ...current };
      if (!motion) return this.settle();
      const dt = Number.isFinite(delta) ? limit(delta, 0, .05) : 0;
      if (moving) {
        const alpha = 1 - Math.exp(-12 * dt);
        for (const key of ['theta','phi','radius']) current[key] += (target[key] - current[key]) * alpha;
        if (['theta','phi','radius'].every(k => Math.abs(target[k] - current[k]) < .0002)) this.settle();
      } else if (spin && dt > 0) {
        current.theta = (current.theta + TAU * dt / PRODUCT_VIEW.secondsPerTurn) % TAU;
        target = { ...current };
      }
      return { ...current };
    },
  };
}
