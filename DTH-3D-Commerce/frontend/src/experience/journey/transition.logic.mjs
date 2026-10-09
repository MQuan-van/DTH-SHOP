import { DTH_MOTION } from '../cinematic/motion.tokens.mjs';
export const TRANSITION = Object.freeze({ outMs:DTH_MOTION.routeOutMs, inMs:DTH_MOTION.routeInMs, shortMs:90 });
export function routeKey(location = {}) {
  const pathname = location.pathname || '/';
  if (pathname !== '/account') return pathname;
  const q = new URLSearchParams(location.search || '');
  return `${pathname}:${q.get('view') || 'overview'}:${q.get('order') || ''}`;
}
export function isCommerceCritical(path) { return /^(?:\/bag|\/checkout|\/order-complete|\/admin)(?:\/|$)/.test(path || ''); }
export function shouldTransition({ from, to, reduced, hidden, covered, identityChanged } = {}) {
  return Boolean(from && to && routeKey(from) !== routeKey(to) && !reduced && !hidden && !covered
    && !identityChanged && !isCommerceCritical(from.pathname) && !isCommerceCritical(to.pathname));
}
export function animatePage(node, entering, duration) {
  if (!node || typeof node.animate !== 'function') return { cancel() {} };
  try {
    const frames = entering ? [
      { opacity:0, transform:'translate3d(0,14px,0) scale(.992)' },
      { opacity:1, transform:'translate3d(0,0,0) scale(1)' },
    ] : [
      { opacity:1, transform:'translate3d(0,0,0) scale(1)' },
      { opacity:0, transform:'translate3d(0,-8px,0) scale(.994)' },
    ];
    const a=node.animate(frames,{duration,easing:DTH_MOTION.ease,fill:'none',iterations:1});
    a.finished?.catch?.(()=>{});return a;
  } catch { return { cancel() {} }; }
}
