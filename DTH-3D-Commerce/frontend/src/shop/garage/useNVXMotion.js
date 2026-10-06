import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animateNVXEntry } from './nvxMotion.mjs';
export default function useNVXMotion(key = '') {
  const ref = useRef(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() => typeof matchMedia !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update(); media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  const motion = !paused && !reduced;
  useLayoutEffect(() => animateNVXEntry(ref.current, motion), [key, motion]);
  return { ref, motion, reduced, paused, setPaused };
}
