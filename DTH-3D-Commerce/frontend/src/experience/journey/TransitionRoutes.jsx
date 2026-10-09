import { useLayoutEffect, useRef, useState } from 'react';
import { Routes, useLocation } from 'react-router-dom';
import { useStore } from '../../shop/useStore';
import useIntroCover from './useIntroCover';
import { TRANSITION, animatePage, routeKey, shouldTransition } from './transition.logic.mjs';

const reducedNow = () => typeof matchMedia !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches;
export default function TransitionRoutes({ children }) {
  const actual = useLocation(), store = useStore(), covered = useIntroCover();
  const [shown, setShown] = useState(actual), [reduced, setReduced] = useState(reducedNow);
  const [hidden, setHidden] = useState(() => document.hidden);
  const identity = store.user?.id || '';
  const previousIdentity = useRef(identity), pendingIn = useRef(false), currentAnimation = useRef(null);
  useLayoutEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useLayoutEffect(() => {
    if (typeof matchMedia !== 'function') return undefined;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    mq.addEventListener?.('change', update); return () => mq.removeEventListener?.('change', update);
  }, []);
  useLayoutEffect(() => {
    const changedUser = previousIdentity.current !== identity;
    previousIdentity.current = identity;
    if (changedUser) { currentAnimation.current?.cancel(); pendingIn.current = false; }
    if (shown === actual) return undefined;
    const main = document.querySelector('#dth-content');
    if (!shouldTransition({ from: shown, to: actual, reduced, hidden, covered, identityChanged: changedUser })) {
      // Authentication changes must not retain the previous account view. Animate only the new page.
      pendingIn.current = changedUser && routeKey(shown) !== routeKey(actual) && !reduced && !hidden && !covered;
      currentAnimation.current?.cancel(); setShown(actual); return undefined;
    }
    // Header navigation remains active: a newer route cancels this timer and wins.
    const oldInert = main?.inert;
    if (main) main.inert = true;
    currentAnimation.current?.cancel();
    const out = animatePage(main, false, TRANSITION.outMs);
    currentAnimation.current = out;
    const timer = setTimeout(() => { pendingIn.current = true; setShown(actual); }, TRANSITION.outMs);
    return () => {
      clearTimeout(timer); out.cancel();
      if (main) main.inert = oldInert;
    };
  }, [actual, shown, reduced, covered, identity, hidden]);
  useLayoutEffect(() => {
    if (shown !== actual || !pendingIn.current) return undefined;
    if (hidden || covered) { pendingIn.current = false; return undefined; }
    pendingIn.current = false;
    const main = document.querySelector('#dth-content');
    const motion = animatePage(main, true, reduced ? TRANSITION.shortMs : TRANSITION.inMs);
    currentAnimation.current = motion;
    // No timer ever owns navigation readiness or network requests.
    const timer = setTimeout(() => {
      motion.cancel();
      const active = document.activeElement;
      if (main && (active === document.body || active?.closest?.('.dth-navigation'))) main.focus({ preventScroll: true });
    }, (reduced ? TRANSITION.shortMs : TRANSITION.inMs) + 30);
    return () => { clearTimeout(timer); motion.cancel(); };
  }, [actual, shown, reduced, hidden, covered]);
  useLayoutEffect(() => () => currentAnimation.current?.cancel(), []);
  // No keyed outer div: Shell, StoreProvider and cart/session state are not remounted.
  return <Routes location={shown}>{children}</Routes>;
}
