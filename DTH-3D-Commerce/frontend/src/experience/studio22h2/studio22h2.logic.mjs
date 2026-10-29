/** Studio 22H.2. Pure camera/presentation functions, no catalogue mutations. */
export const CATEGORIES22H2 = Object.freeze([
  ['suspension', 'Suspension'], ['wheels', 'Wheels'], ['brakes', 'Brakes'],
  ['exhausts', 'Exhausts'], ['mirrors', 'Mirrors'],
].map(([id, label]) => Object.freeze({ id, label })));
export const MODES22H2 = Object.freeze(['overview', 'pick', 'orbit']);
const ids = new Set(CATEGORIES22H2.map(v => v.id));
const validId = v => typeof v === 'string' && v.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);
const vec = v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
export const clamp22H2 = (v, a, b) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
export const categoryLabel22H2 = id => CATEGORIES22H2.find(c => c.id === id)?.label || 'Parts';
export const href22H2 = p => validId(p?.slug) ? `/products/${p.slug}` : '';
export const modelPath22H2 = v => typeof v === 'string' && v.length <= 512 && /^\/models\/(?:[\w-]+\/)*[\w-]+\.glb$/.test(v.split(/[?#]/)[0]) ? v.split(/[?#]/)[0] : '';
export const swatch22H2 = v => typeof v === 'string' && /^#[a-f\d]{6}$/i.test(v) ? v : '#a7c8e1';
export function catalog22H2(values) {
  const seen = new Set();
  return (Array.isArray(values) ? values : []).filter(p => {
    if (!p || p.active === false || !validId(p.id) || !href22H2(p) || !ids.has(p.category) || seen.has(p.id)) return false;
    seen.add(p.id); return true;
  });
}
export const playable22H2 = list => catalog22H2(list).filter(p => modelPath22H2(p.modelUrl));
export function choose22H2(list, requested, configured) {
  const candidates = playable22H2(list);
  return candidates.find(p => p.id === requested) || candidates.find(p => p.id === configured) || candidates.find(p => p.featured) || candidates[0] || null;
}
export function bindProduct22H2(p, binding) {
  if (!p || !/^[a-f\d]{64}$/i.test(binding?.sha256 || '') || p.modelUrl !== binding?.modelUrl) return p;
  const modelUrl = `${p.modelUrl.split('?')[0]}?v=${binding.sha256}`;
  const stored = p.presentation3d;
  const presentation3d = stored?.settings?.assetUrl === p.modelUrl ? { ...stored, settings: { ...stored.settings, assetUrl: modelUrl } } : stored;
  return { ...p, modelUrl, ...(stored ? { presentation3d } : {}) };
}
export function gallery22H2(list, currentId) {
  const data = catalog22H2(list), ordered = [...data.filter(p => p.featured), ...data.filter(p => !p.featured)];
  return [...ordered.filter(p => p.id !== currentId), ...ordered.filter(p => p.id === currentId)].slice(0, 3);
}
export function matching22H2(products, vehicleId, vehicles) {
  const vehicle = (Array.isArray(vehicles) ? vehicles : []).find(v => v?.id === vehicleId);
  const list = vehicle ? catalog22H2(products).filter(p => Array.isArray(p.vehicleIds) && p.vehicleIds.includes(vehicleId)) : [];
  return { vehicle: vehicle || null, count: vehicle ? list.length : null,
    categories: CATEGORIES22H2.map(c => ({ ...c, count: list.filter(p => p.category === c.id).length })) };
}
export function garageSpec22H2(vehicle, local = {}, published = {}) {
  if (!vehicle || !/^yamaha-nvx-v[123]$/.test(vehicle.id || '')) return null;
  const preset = local[vehicle.id] || {}, approved = published[vehicle.id] || {};
  const candidate = approved.file || preset.file;
  const version = vehicle.id.slice(-2);
  const ok = typeof candidate === 'string' && (/^\/?models\/[\w/-]+\.glb$/.test(candidate) || new RegExp(`^/?api/shop/ai-assets/models/${version}\\.glb\\?rev=[a-f\\d-]{36}$`).test(candidate));
  return { ...preset, id: vehicle.id, label: vehicle.model || 'NVX', rotation: Array.isArray(preset.rotation) ? [...preset.rotation] : [0, 0, 0], file: ok ? candidate : null };
}

const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const addScaled = (a, b, k) => a.map((x, i) => x + b[i] * k);
export const distance22H2 = (a, b) => Math.hypot(...sub(a, b));
export function direction22H2(yaw, pitch) { return [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)]; }
export function spherical22H2(position, target) {
  if (!vec(position) || !vec(target)) throw new TypeError('Invalid camera coordinates.');
  const v = sub(position, target), distance = Math.hypot(...v);
  if (distance < 1e-8) throw new TypeError('Camera overlaps its target.');
  return { yaw: Math.atan2(v[0], v[2]), pitch: Math.asin(clamp22H2(v[1] / distance, -1, 1)), distance };
}
export function fullDistance22H2(radius, width, height, fov = 36) {
  if (![radius, width, height, fov].every(n => Number.isFinite(n) && n > 0) || fov >= 120) throw new TypeError('Invalid framing bounds.');
  const vertical = fov * Math.PI / 360, horizontal = Math.atan(Math.tan(vertical) * width / height);
  return radius * 1.12 / Math.sin(Math.min(vertical, horizontal));
}
/** Distance along a target ray required to stay OUTSIDE the complete model sphere. */
export function clearance22H2(target, direction, bounds) {
  if (!vec(target) || !vec(direction) || !vec(bounds?.center) || !(bounds.radius > 0) || !Number.isFinite(bounds.radius)) throw new TypeError('Invalid focus bounds.');
  const n = Math.hypot(...direction);
  if (Math.abs(n - 1) > 1e-5) throw new TypeError('Focus direction must be normalized.');
  const v = sub(target, bounds.center), projected = dot(v, direction), safe = bounds.radius * 1.08;
  const discriminant = projected * projected + safe * safe - dot(v, v);
  return Math.max(bounds.radius * 0.12, -projected + Math.sqrt(Math.max(0, discriminant)));
}
export function protectPose22H2(pose, bounds) {
  const direction = direction22H2(pose.yaw, pose.pitch);
  return { ...pose, target: pose.target.slice(), distance: Math.max(pose.distance, clearance22H2(pose.target, direction, bounds)) };
}
export function position22H2(pose) { return addScaled(pose.target, direction22H2(pose.yaw, pose.pitch), pose.distance); }
export function overview22H2(bounds, width, height, front, fov = 36) {
  const dir = front && vec(front.position) && vec(front.target) ? spherical22H2(front.position, front.target) : { yaw: 0.28, pitch: 0.08 };
  return { target: bounds.center.slice(), yaw: dir.yaw, pitch: clamp22H2(dir.pitch, -1.25, 1.25), distance: fullDistance22H2(bounds.radius, width, height, fov) };
}
export function focus22H2(point, current, bounds, width, height, fov = 36) {
  if (!vec(point) || distance22H2(point, bounds.center) > bounds.radius * 1.02) throw new TypeError('Focus point is outside this model.');
  const currentPosition = position22H2(current), aim = spherical22H2(currentPosition, point);
  const focusedRadius = bounds.radius * 0.30;
  return protectPose22H2({ target: point.slice(), yaw: aim.yaw, pitch: clamp22H2(aim.pitch, -1.25, 1.25), distance: fullDistance22H2(focusedRadius, width, height, fov) }, bounds);
}
export function interpolate22H2(a, b, progress, bounds) {
  const p = clamp22H2(progress, 0, 1), eased = p * p * (3 - 2 * p);
  const dyaw = Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw));
  return protectPose22H2({ target: a.target.map((v, i) => v + (b.target[i] - v) * eased), yaw: a.yaw + dyaw * eased,
    pitch: a.pitch + (b.pitch - a.pitch) * eased, distance: a.distance + (b.distance - a.distance) * eased }, bounds);
}
/** Pure state machine; exactly one owner: scripted transition OR user orbit OR idle turntable. */
export function createCamera22H2(bounds, width, height, front, { fov = 36, reduced = false, seconds = 38 } = {}) {
  let base = overview22H2(bounds, width, height, front, fov), pose = { ...base, target: base.target.slice() };
  let transition = null, mode = 'overview', focusPoint = null, focused = false;
  const copy = p => ({ ...p, target: p.target.slice() });
  function move(next, immediate = false) {
    next = protectPose22H2(next, bounds);
    if (reduced || immediate) { pose = copy(next); transition = null; }
    else transition = { from: copy(pose), to: copy(next), elapsed: 0, duration: 0.65 };
  }
  const api = {
    read: () => ({ ...copy(pose), mode, moving: !!transition, focused, position: position22H2(pose) }),
    mode(value) {
      if (!MODES22H2.includes(value)) return false;
      if (value === 'overview') { focusPoint = null; focused = false; mode = value; move(base); }
      else { mode = value; transition = null; } // entering Inspect preserves the current pose
      return true;
    },
    focus(point) { if (mode !== 'pick') return false; const next = focus22H2(point, pose, bounds, width, height, fov); focusPoint = point.slice(); focused = true; move(next); return true; },
    absorb(position, target) { if (mode !== 'orbit') return; pose = protectPose22H2({ ...spherical22H2(position, target), target: target.slice() }, bounds); transition = null; },
    zoom(factor) { if (mode === 'overview' || !Number.isFinite(factor) || factor <= 0) return false; move({ ...pose, distance: clamp22H2(pose.distance * factor, clearance22H2(pose.target, direction22H2(pose.yaw, pose.pitch), bounds), base.distance * 2.4) }); return true; },
    rotate(amount) { if (mode === 'overview' || !Number.isFinite(amount)) return false; move({ ...pose, yaw: pose.yaw + amount }); return true; },
    resize(w, h) {
      const oldBase = base.distance; width = w; height = h; base = overview22H2(bounds, w, h, front, fov);
      if (mode === 'overview') move({ ...base, yaw: pose.yaw, pitch: pose.pitch }, true);
      else if (focused && focusPoint && mode === 'pick') move(focus22H2(focusPoint, pose, bounds, width, height, fov), true);
      else move({ ...pose, distance: pose.distance * base.distance / oldBase }, true);
    },
    setReduced(value) { reduced = !!value; if (reduced && transition) { pose = copy(transition.to); transition = null; } },
    tick(dt, running = true) {
      if (!running) return false;
      const delta = clamp22H2(dt, 0, 0.05);
      if (transition) {
        transition.elapsed = Math.min(transition.duration, transition.elapsed + delta);
        pose = interpolate22H2(transition.from, transition.to, transition.elapsed / transition.duration, bounds);
        if (transition.elapsed >= transition.duration) { pose = copy(transition.to); transition = null; }
        return true;
      }
      if (mode === 'overview' && !reduced) { pose.yaw += delta * Math.PI * 2 / clamp22H2(seconds, 12, 120); return delta > 0; }
      return false;
    },
    limits() { return { min: clearance22H2(pose.target, direction22H2(pose.yaw, pose.pitch), bounds), max: base.distance * 2.4 }; },
  };
  return api;
}
export function createSignal22H2() {
  const state = { active: true, blocked: false, reduced: false, mode: 'overview', serial: 0 }, listeners = new Set();
  return { state, set(patch = {}) { let changed = false;
    for (const k of ['active', 'blocked', 'reduced']) if (typeof patch[k] === 'boolean' && state[k] !== patch[k]) { state[k] = patch[k]; changed = true; }
    if (MODES22H2.includes(patch.mode) && state.mode !== patch.mode) { state.mode = patch.mode; changed = true; }
    if (Number.isSafeInteger(patch.serial) && patch.serial >= 0 && state.serial !== patch.serial) { state.serial = patch.serial; changed = true; }
    if (changed) [...listeners].forEach(f => f(state));
  }, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, get listenerCount() { return listeners.size; } };
}
