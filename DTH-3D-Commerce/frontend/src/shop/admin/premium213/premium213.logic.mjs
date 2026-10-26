/** Presentation-only helpers. No requests, authentication or business calculations. */
export const PREMIUM213 = Object.freeze({
  breakpoint: 960, enterSeconds: 0.34, drawerSeconds: 0.38,
  maxTilt: 2.6, maxMagnet: 3.5,
});
export function sectionForPath(pathname, modules = []) {
  const path = typeof pathname === 'string' ? pathname.split(/[?#]/)[0] : '';
  const suffix = path.replace(/^\/admin\/?/, '');
  const first = suffix.split('/')[0];
  return modules.find(item => item[0] === first)?.[1] || 'Overview';
}
export function navHref(path) {
  if (typeof path !== 'string' || (path && !/^[a-z0-9-]+$/.test(path))) return '/admin';
  return path ? `/admin/${path}` : '/admin';
}
export function pointerPosition(x, y, rect) {
  if (![x, y, rect?.left, rect?.top, rect?.width, rect?.height].every(Number.isFinite)
      || rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  const clamp = n => Math.max(-1, Math.min(1, n));
  return { x: clamp((x - rect.left) / rect.width * 2 - 1), y: clamp((y - rect.top) / rect.height * 2 - 1) };
}
export function tiltAt(point) {
  return { rotateX: -point.y * PREMIUM213.maxTilt, rotateY: point.x * PREMIUM213.maxTilt };
}
export function initials(email) {
  const value = typeof email === 'string' ? email.trim() : '';
  return value ? value.slice(0, 1).toUpperCase() : 'A';
}
export function hasUnread(conversations) {
  return Array.isArray(conversations) && conversations.some(c => c?.unread > 0);
}
