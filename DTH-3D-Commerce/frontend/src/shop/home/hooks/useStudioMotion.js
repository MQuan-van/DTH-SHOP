import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** Pauses rendering/ambient motion outside the viewport AND in background tabs. */
export function useStageActivity(ref) {
  const [active, setActive] = useState(() => !document.hidden);
  useEffect(() => {
    let intersecting = true;
    const update = () => setActive(intersecting && !document.hidden);
    const observer = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; update(); }, { threshold: 0.03 }) : null;
    if (ref.current) observer?.observe(ref.current);
    document.addEventListener('visibilitychange', update);
    update();
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, [ref]);
  return active;
}

/** Progressive enhancement: elements remain visible if animations are unavailable. */
export function useEntrance(ref, enabled, { duration, stagger }, replayKey = '') {
  const animations = useRef([]);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !enabled || typeof Element.prototype.animate !== 'function') return;
    const elements = Array.from(root.querySelectorAll('[data-enter]'));
    animations.current = elements.map((element, index) => element.animate([
      { opacity: 0, transform: 'translate3d(0, 18px, 0)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' },
    ], { duration, delay: index * stagger, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }));
    const visibility = () => animations.current.forEach(animation => {
      if (animation.playState === 'finished') return;
      if (document.hidden) animation.pause(); else animation.play();
    });
    document.addEventListener('visibilitychange', visibility);
    visibility();
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      animations.current.forEach(a => a.cancel()); animations.current = [];
    };
  }, [ref, enabled, duration, stagger, replayKey]);
}

export function useSectionReveal(ref, enabled, motion) {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled || typeof IntersectionObserver !== 'function' || typeof element.animate !== 'function') return;
    let animation;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      animation = element.animate([
        { opacity: 0, transform: `translateY(${motion.revealDistancePx}px)` },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: motion.revealMs, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'none' });
      observer.disconnect();
    }, { threshold: 0.06 });
    observer.observe(element);
    return () => { observer.disconnect(); animation?.cancel(); };
  }, [ref, enabled, motion.revealDistancePx, motion.revealMs]);
}
