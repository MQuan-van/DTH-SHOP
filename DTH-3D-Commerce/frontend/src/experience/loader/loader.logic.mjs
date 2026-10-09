import { LOADER_CONFIG } from './loader.config.mjs';

/** No brand interruption for checkout, sign-in, admin or unknown/deep utility routes. */
export function isIntroRoute(pathname) {
  return typeof pathname === 'string' &&
    (/^\/(?:story\/?|shop\/?)?$/.test(pathname) || /^\/products\/[a-z0-9-]+\/?$/.test(pathname));
}
export function shouldShowIntro({ enabled = true, seen = false, hidden = false, pathname = '/' } = {}) {
  return Boolean(enabled && !seen && !hidden && isIntroRoute(pathname));
}
export function readSeen(storage, key = LOADER_CONFIG.sessionKey) {
  try { return storage?.getItem(key) === '1'; } catch { return false; }
}
export function writeSeen(storage, key = LOADER_CONFIG.sessionKey) {
  try { storage?.setItem(key, '1'); return Boolean(storage); } catch { return false; }
}
const nonnegative = n => Number.isFinite(n) ? Math.max(0, n) : 0;
/** Pure policy: no GLB, authentication request, fake percentages, or minimum error delay. */
export function loaderDecision(input, config = LOADER_CONFIG) {
  if (input.skipped) return { exit: true, reason: 'skip' };
  if (input.failed) return { exit: true, reason: 'error' };
  if (input.hidden) return { exit: true, reason: 'background' };
  if (input.routeChanged) return { exit: true, reason: 'navigation' };
  const elapsed = nonnegative(input.elapsed);
  if (elapsed >= config.maxCoverMs) return { exit: true, reason: 'timeout' };
  if (input.ready && input.logoReady && (input.reduced || nonnegative(input.brandElapsed) >= config.brandMs)) {
    return { exit: true, reason: 'ready' };
  }
  return { exit: false, reason: elapsed >= config.waitingLabelMs && !input.ready ? 'waiting' : 'brand' };
}
