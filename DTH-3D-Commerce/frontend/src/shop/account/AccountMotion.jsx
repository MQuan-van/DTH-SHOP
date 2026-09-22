import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../useStore';
import s from './AccountPage.module.css';
import m from './AccountMotion.module.css';
import { ACCOUNT_MOTION as motion } from './motion.config.mjs';
const MotionContext = createContext({ phase: 'welcome', reduced: true });
export const useAccountMotion = () => useContext(MotionContext);
export default function AccountExperience({ children }) {
  const { user } = useStore(), location = useLocation();
  const root = useRef(null), animation = useRef(null);
  const [reduced, setReduced] = useState(true), [focus, setFocus] = useState('welcome');
  const view = new URLSearchParams(location.search).get('view') || 'overview';
  const phase = user ? view : focus;
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { setReduced(query.matches); if (query.matches) animation.current?.cancel(); };
    change(); query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  useLayoutEffect(() => {
    const panel = root.current.querySelector(`.${s.memberContent}`);
    const cards = root.current.querySelectorAll(`.${s.savedCard}, .${s.orderStat}, .${s.orderRow}`);
    cards.forEach(card => card.setAttribute('data-depth-card', ''));
    if (!panel || reduced || !panel.animate) return;
    panel.setAttribute('data-motion-panel', '');
    const receipt = new URLSearchParams(location.search).has('order');
    animation.current = panel.animate([
      { opacity: .2, transform: receipt ? 'perspective(1400px) translateX(18px) rotateY(-2deg)' : 'translateY(12px)' },
      { opacity: 1, transform: 'none' },
    ], { duration: motion.pageMs, easing: 'cubic-bezier(.2,.7,.2,1)' });
    return () => animation.current?.cancel();
  }, [location.key, user?.id, reduced]);
  function point(event) {
    if (reduced || event.pointerType !== 'mouse') return;
    const card = event.target.closest('[data-depth-card]');
    if (!card || !root.current.contains(card)) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--depth-x', `${(event.clientY - rect.top - rect.height / 2) / rect.height * -motion.tiltDeg}deg`);
    card.style.setProperty('--depth-y', `${(event.clientX - rect.left - rect.width / 2) / rect.width * motion.tiltDeg}deg`);
  }
  function leave(event) {
    const card = event.target.closest?.('[data-depth-card]');
    if (card && (!(event.relatedTarget instanceof Node) || !card.contains(event.relatedTarget))) { card.style.removeProperty('--depth-x'); card.style.removeProperty('--depth-y'); }
  }
  return <MotionContext.Provider value={{ phase, reduced }}><div className={m.experience} ref={root}
    data-reduced={reduced} data-account-phase={phase}
    style={{ '--account-enter-ms': `${motion.pageMs}ms`, '--account-stagger-ms': `${motion.staggerMs}ms` }}
    onPointerMove={point} onPointerOut={leave}
    onFocusCapture={event => { if (!user && event.target.tagName === 'INPUT') setFocus(event.target.autocomplete === 'email' ? 'identify' : 'password'); }}>
    {children}
  </div></MotionContext.Provider>;
}
export function ConfirmationSeal() {
  return <div className={m.seal} role="img" aria-label="Simulated order confirmed"><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="35"/><path d="M24 40 35 51 57 29"/></svg></div>;
}
