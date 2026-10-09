import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStartupAllowed } from '../loader/StartupRenderContext.jsx';
export default function useAccessMotion(root) {
  const allowed = useStartupAllowed();
  const [reduced, setReduced] = useState(() => typeof matchMedia !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [compact, setCompact] = useState(() => typeof matchMedia !== 'function' || matchMedia('(max-width: 800px)').matches);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [paused, setPaused] = useState(false);
  const pointer = useRef({ x: 0, y: 0 }), frame = useRef(0), activeAnimations = useRef([]);
  const saveData = Boolean(navigator.connection?.saveData);
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)'), s = matchMedia('(max-width: 800px)');
    const update = () => { setReduced(m.matches); setCompact(s.matches); };
    const tab = () => setHidden(document.hidden);
    m.addEventListener('change', update); s.addEventListener('change', update); document.addEventListener('visibilitychange', tab);
    return () => { m.removeEventListener('change', update); s.removeEventListener('change', update); document.removeEventListener('visibilitychange', tab); cancelAnimationFrame(frame.current); };
  }, []);
  const motion = allowed && !reduced && !hidden && !paused;
  useLayoutEffect(() => {
    if (!motion || !root.current) return;
    const nodes = [...root.current.querySelectorAll('[data-access-enter]')];
    const animations = nodes.map((node, i) => {
      try { const a = node.animate([{ opacity: 0, transform: 'translate3d(0,14px,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }], { duration: 580, delay: i * 65, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }); a.finished?.catch(() => {}); return a; } catch { return null; }
    });
    activeAnimations.current = animations;
    return () => { animations.forEach(a => a?.cancel()); activeAnimations.current = []; };
  }, [allowed]); // One entry per intro release, not on every keystroke.
  useEffect(() => { if (!motion) activeAnimations.current.forEach(a => a?.cancel()); }, [motion]);
  function move(event) {
    if (!motion || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointer.current.x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - .5) * 2));
    pointer.current.y = Math.max(-1, Math.min(1, .5 - (event.clientY - bounds.top) / bounds.height)) * 2;
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => { frame.current = 0; root.current?.style.setProperty('--access-x', `${pointer.current.x * 32}px`); root.current?.style.setProperty('--access-y', `${-pointer.current.y * 24}px`); });
  }
  function leave() { pointer.current = { x: 0, y: 0 }; root.current?.style.setProperty('--access-x', '0px'); root.current?.style.setProperty('--access-y', '0px'); }
  useEffect(() => { if (!motion) leave(); }, [motion]);
  return { allowed, reduced, compact, hidden, paused, setPaused, pointer, saveData, motion, move, leave };
}
