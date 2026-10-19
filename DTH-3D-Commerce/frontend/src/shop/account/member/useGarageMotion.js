import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animateGarage } from './garageMotion.mjs';
export default function useGarageMotion(key, selector = '[data-garage-enter]') {
  const ref = useRef(null);
  const [reduced, setReduced] = useState(() => typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)').matches : true);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(query.matches); change(); query.addEventListener?.('change', change);
    return () => query.removeEventListener?.('change', change);
  }, []);
  useLayoutEffect(() => animateGarage(ref.current, !reduced, selector), [key, reduced, selector]);
  return { ref, reduced };
}
