import { useEffect, useLayoutEffect, useRef } from 'react';
import { useStartupAllowed } from '../../experience/loader/StartupRenderContext';
import { revealNodes, pointerOffset } from './discoveryMotion.mjs';
export function useDiscoveryReveal(key, enabled) {
  const ref = useRef(null), allowed = useStartupAllowed();
  useLayoutEffect(() => {
    if (!allowed || !enabled || document.hidden) return undefined;
    const stop = revealNodes(ref.current);
    const hidden = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hidden);
    return () => { stop(); document.removeEventListener('visibilitychange', hidden); };
  }, [key, enabled, allowed]);
  return ref;
}
export function usePhotoParallax(enabled) {
  const ref = useRef(null), allowed = useStartupAllowed();
  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled || !allowed || !matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    let frame = 0, point = { x: 0, y: 0 };
    const apply = () => { frame = 0; node.style.setProperty('--photo-x', `${point.x}px`); node.style.setProperty('--photo-y', `${point.y}px`); };
    const move = event => {
      if (event.pointerType !== 'mouse' || document.hidden || node.closest('[inert]')) return;
      point = pointerOffset(event.clientX, event.clientY, node.getBoundingClientRect());
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const reset = () => { cancelAnimationFrame(frame); frame = 0; point = { x: 0, y: 0 }; apply(); };
    node.addEventListener('pointermove', move); node.addEventListener('pointerleave', reset);
    document.addEventListener('visibilitychange', reset);
    return () => { reset(); node.style.removeProperty('--photo-x'); node.style.removeProperty('--photo-y');
      node.removeEventListener('pointermove', move); node.removeEventListener('pointerleave', reset); document.removeEventListener('visibilitychange', reset); };
  }, [enabled, allowed]);
  return ref;
}
