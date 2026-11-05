import { useCallback, useEffect, useRef, useState } from 'react';
import { useStartupAllowed } from '../loader/StartupRenderContext.jsx';
import { accessMotion243, accessPointer243 } from './access243.logic.mjs';

const query = value => typeof matchMedia === 'function' && matchMedia(value).matches;
export default function useAccessPolicy243(root, { focusing = false, busy = false } = {}) {
  const allowed = useStartupAllowed();
  const [device, setDevice] = useState(() => ({ reduced: query('(prefers-reduced-motion: reduce)'),
    compact: query('(max-width: 860px)'), finePointer: query('(hover: hover) and (pointer: fine)'), hidden: document.hidden,
    saveData: Boolean(navigator.connection?.saveData) }));
  const [paused, setPaused] = useState(false);
  const pointer = useRef({ x: 0, y: 0, active: false }), listeners = useRef(new Set());
  const notify = useCallback(() => listeners.current.forEach(listener => listener()), []);
  const subscribe = useCallback(listener => { listeners.current.add(listener); return () => listeners.current.delete(listener); }, []);
  const leave = useCallback(() => { pointer.current = { x: 0, y: 0, active: false }; notify(); }, [notify]);
  useEffect(() => {
    const queries = ['(prefers-reduced-motion: reduce)', '(max-width: 860px)', '(hover: hover) and (pointer: fine)'].map(value => matchMedia(value));
    const update = () => setDevice({ reduced: queries[0].matches, compact: queries[1].matches,
      finePointer: queries[2].matches, hidden: document.hidden, saveData: Boolean(navigator.connection?.saveData) });
    queries.forEach(media => media.addEventListener('change', update));
    document.addEventListener('visibilitychange', update);
    window.addEventListener('blur', leave);
    navigator.connection?.addEventListener?.('change', update);
    return () => {
      queries.forEach(media => media.removeEventListener('change', update));
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('blur', leave);
      navigator.connection?.removeEventListener?.('change', update);
    };
  }, [leave]);
  const state = accessMotion243({ allowed, ...device, paused, focusing, busy });
  useEffect(() => { if (!state.interactive) leave(); }, [state.interactive, leave]);
  const move = event => {
    if (!state.interactive || event.pointerType !== 'mouse') return;
    if (event.target.closest?.('[data-a243-form],button,a,input,textarea,select')) { leave(); return; }
    pointer.current = accessPointer243(event.clientX, event.clientY, root.current.getBoundingClientRect());
    notify();
  };
  return { allowed, ...device, ...state, paused, setPaused, pointer, subscribe, move, leave };
}
