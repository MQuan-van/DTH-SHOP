/** DTH One 22A.1 — presentation helpers. No API writes, identity decisions or fake data. */
export const ACCOUNT_VIEWS22A = Object.freeze([
  Object.freeze({ id: 'overview', label: 'Overview', icon: 'overview' }),
  Object.freeze({ id: 'vehicle', label: 'Garage', icon: 'garage' }),
  Object.freeze({ id: 'orders', label: 'Orders', icon: 'orders' }),
  Object.freeze({ id: 'security', label: 'Profile', icon: 'profile' }),
]);
export const clamp22A = (n, lo, hi) => Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
export const view22A = value => ACCOUNT_VIEWS22A.some(v => v.id === value) ? value : 'overview';
export const validVehicle22A = id => typeof id === 'string' && /^yamaha-nvx-v[123]$/.test(id);
export function availableVehicles22A(records = []) {
  return [1, 2, 3].flatMap(n => {
    const item = records.find(v => v?.id === `yamaha-nvx-v${n}` && v.make === 'Yamaha' && v.model === `NVX V${n}`);
    return item ? [item] : [];
  });
}
export function previewVehicle22A({ vehicles = [], garage = {}, preferred = '', shopping = '' } = {}) {
  const byId = id => vehicles.find(v => v.id === id);
  // A deliberate local preview wins, without persisting or changing the shopping choice.
  return byId(preferred) || byId(garage.defaultVehicleId)
    || (garage.vehicleIds || []).map(byId).find(Boolean) || byId(shopping)
    || byId('yamaha-nvx-v3') || vehicles[0] || null;
}
export function matchingParts22A(products = [], vehicleId, vehicles = []) {
  if (!validVehicle22A(vehicleId) || !vehicles.some(v => v.id === vehicleId)) return [];
  return products.filter(p => p && p.active !== false && Array.isArray(p.vehicleIds) && p.vehicleIds.includes(vehicleId));
}
export function modelSpec22A(vehicle, models = {}, published = {}) {
  if (!vehicle || !validVehicle22A(vehicle.id)) return null;
  const local = models[vehicle.id];
  const file = published[vehicle.id]?.file;
  const version = vehicle.id.slice(-2);
  const safePublished = typeof file === 'string' && new RegExp(`^api/shop/ai-assets/models/${version}\\.glb\\?rev=[a-f0-9-]{36}$`).test(file);
  const safeLocal = typeof local?.file === 'string' && /^(?:models\/)(?:[\w-]+\/)*[\w-]+\.glb$/.test(local.file);
  const rotation = Array.isArray(local?.rotation) && local.rotation.length === 3 && local.rotation.every(Number.isFinite) ? [...local.rotation] : [0, 0, 0];
  return { id: vehicle.id, label: vehicle.model, file: safePublished ? file : safeLocal ? local.file : null, rotation };
}
export function modelKey22A(spec) { return spec ? `${spec.id}|${spec.file || ''}|${spec.rotation.join(',')}` : ''; }
export function accountHref22A(view) { return view22A(view) === 'overview' ? '/account' : `/account?view=${view22A(view)}`; }
export function productHref22A(product) {
  const slug = product?.slug || product?.id;
  return typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 80 ? `/products/${slug}` : null;
}
export function safeDate22A(value) {
  if (value === null || value === undefined || value === '') return 'Not available';
  const n = new Date(value); return Number.isFinite(n.getTime()) ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(n) : 'Not available';
}
export function pointerField22A(x, y, width, height) {
  if (!(width > 0 && height > 0) || ![x, y, width, height].every(Number.isFinite)) return { x: 0, y: 0, rotate: 0 };
  const px = clamp22A(x / width - 0.5, -0.5, 0.5), py = clamp22A(y / height - 0.5, -0.5, 0.5);
  return { x: px * Math.min(480, width * .44), y: py * Math.min(280, height * .35), rotate: px * 12 };
}
export function shortAngle22A(from, to) { return from + Math.atan2(Math.sin(to - from), Math.cos(to - from)); }
export function cameraPose22A({ radius, height, aspect, fov = 35, mode = 'overview' }) {
  if (![radius, height, aspect, fov].every(Number.isFinite) || radius <= 0 || height < 0 || aspect <= 0 || fov < 15 || fov > 80) throw new Error('Invalid camera bounds.');
  const halfV = fov * Math.PI / 360, halfH = Math.atan(Math.tan(halfV) * aspect);
  const distance = radius / Math.sin(Math.min(halfV, halfH)) * 1.13;
  return { radius: distance, phi: Math.PI * (mode === 'vehicle' ? .405 : .39), theta: Math.PI * (mode === 'vehicle' ? .36 : .22), target: [0, height / 2, 0] };
}
export function smooth22A(t) { const v = clamp22A(t, 0, 1); return v * v * (3 - 2 * v); }
export function interpolatePose22A(a, b, progress) {
  const t = smooth22A(progress), mix = (x, y) => x + (y - x) * t;
  return { radius: mix(a.radius, b.radius), phi: mix(a.phi, b.phi), theta: mix(a.theta, shortAngle22A(a.theta, b.theta)), target: a.target.map((n, i) => mix(n, b.target[i])) };
}
/** Active styling follows the real route; preview/hover never claims navigation occurred. */
export function navRoute22A(pathname = '/') {
  if (pathname === '/') return '/';
  if (pathname.startsWith('/story')) return '/story';
  if (/^\/(shop|products)(?:\/|$)/.test(pathname)) return '/shop';
  if (/^\/account(?:\/|$)/.test(pathname)) return '/account';
  return '';
}
