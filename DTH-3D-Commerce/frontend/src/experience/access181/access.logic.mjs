/** Presentation routing only. Server session/role/CSRF checks remain authoritative. */
export const ACCESS_VERSION = '18.1';
export const ACCESS_MODES = Object.freeze(['api', 'flow', 'preview']);
const STORE_PATH = /^(?:\/|\/login\/?|\/account\/?|\/story\/?|\/shop\/?|\/bag\/?|\/checkout\/?|\/order-complete\/?|\/products\/[a-z0-9]+(?:-[a-z0-9]+)*\/?|\/admin(?:\/[a-zA-Z0-9-]+)*\/?)$/;
const KEEP_QUERY = new Set(['mode', 'layout', 'q', 'category', 'max', 'sort', 'fit', 'page', 'view', 'order', 'thread', 'status', 'focus']);
export function guardsAccess(pathname) { return typeof pathname === 'string' && STORE_PATH.test(pathname); }
export function safeAccessReturn(value, role = 'customer') {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/u.test(value)) return '';
  try {
    const url = new URL(value, 'https://dth.invalid');
    if (url.origin !== 'https://dth.invalid' || url.hash || !guardsAccess(url.pathname)) return '';
    if (['/', '/login', '/login/'].includes(url.pathname)) return '';
    if (url.pathname.startsWith('/admin') && role !== 'admin') return '';
    const query = new URLSearchParams();
    for (const [key, item] of url.searchParams) {
      if (KEEP_QUERY.has(key) && item.length <= 300 && !/[\u0000-\u001f\u007f]/u.test(item)) query.append(key, item);
    }
    const path = url.pathname.replace(/\/$/, '');
    return path + (query.size ? `?${query}` : '');
  } catch { return ''; }
}
export function accessDestination({ pathname = '/', search = '', user } = {}) {
  const role = user?.role === 'admin' ? 'admin' : 'customer';
  const requested = new URLSearchParams(search).get('return');
  const explicit = safeAccessReturn(requested, role);
  if (explicit) return explicit;
  // Plain Account is sign-in entry, but an explicit account tab remains a useful return.
  const plainEntry = ['/', '/login', '/login/'].includes(pathname)
    || (['/account', '/account/'].includes(pathname) && !new URLSearchParams(search).has('view'));
  if (!plainEntry) {
    const direct = safeAccessReturn(pathname + search, role);
    if (direct) return direct;
  }
  return role === 'admin' ? '/admin' : '/shop';
}
export function accessDecision({ pathname = '/', user = null, authLoading = false, authError = '', mode = 'api' } = {}) {
  if (!guardsAccess(pathname)) return 'pass';
  // Read-only preview never becomes simulated authentication without explicit flow mode.
  if (mode === 'preview') return ['/', '/login', '/login/', '/account', '/account/'].includes(pathname) ? 'configure' : 'pass';
  if (authLoading) return 'checking';
  if (authError) return 'connection-error';
  if (!user) return 'login';
  if (/^\/login\/?$/.test(pathname)) return 'redirect';
  return 'pass';
}
export function visualPhase({ busy, error, register, focus } = {}) {
  if (busy) return 'working';
  if (error) return 'error';
  if (focus === 'password' || focus === 'confirm') return 'secure';
  if (focus === 'email') return 'identify';
  return register ? 'register' : 'idle';
}
export function scenePolicy({ allowed = true, visible = true, hidden = false, reduced = false, compact = false, saveData = false, optedIn = false, paused = false, focusing = false, failed = false } = {}) {
  const mount = allowed && visible && !hidden && !failed && (optedIn || (!reduced && !compact && !saveData));
  return { mount, run: mount && !paused && !reduced && !focusing };
}
export function validateScenePhase(phase) { return ['idle','identify','secure','register','working','error'].includes(phase) ? phase : 'idle'; }
