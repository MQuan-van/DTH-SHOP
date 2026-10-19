import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pointerVector } from '../../../experience/cinematic/motion.tokens.mjs';
import { loginPhase } from './login.logic.mjs';

function reducedNow() {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; }
}

export default function useLoginCinematic({ registering, busy, error }) {
  const ref = useRef(null);
  const [field, setField] = useState('');
  const [reduced, setReduced] = useState(reducedNow);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return undefined;
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update(); query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  useEffect(() => { if (busy) setField(''); }, [busy]);
  const phase = loginPhase({ field, registering, busy, error: Boolean(error) });
  const fieldEvents = useCallback(name => ({
    onFocus: () => setField(name),
    onBlur: event => { if (!event.currentTarget.form?.contains(event.relatedTarget)) setField(''); },
  }), []);
  const pointer = useCallback(event => {
    if (reduced || event.pointerType === 'touch' || !ref.current) return;
    const value = pointerVector(event.clientX, event.clientY, ref.current.getBoundingClientRect());
    ref.current.style.setProperty('--auth-pointer-x', value.x.toFixed(4));
    ref.current.style.setProperty('--auth-pointer-y', value.y.toFixed(4));
    ref.current.style.setProperty('--auth-light-x', `${((value.x + 1) * 50).toFixed(2)}%`);
    ref.current.style.setProperty('--auth-light-y', `${((value.y + 1) * 50).toFixed(2)}%`);
  }, [reduced]);
  const leave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.setProperty('--auth-pointer-x', '0');
    ref.current.style.setProperty('--auth-pointer-y', '0');
    ref.current.style.setProperty('--auth-light-x', '50%');
    ref.current.style.setProperty('--auth-light-y', '50%');
  }, []);
  return useMemo(() => ({ ref, phase, reduced, field: fieldEvents, pointer, leave }), [phase, reduced, fieldEvents, pointer, leave]);
}
