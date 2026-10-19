import { useEffect, useLayoutEffect, useRef } from 'react';
import { recommendationTilt } from './recommendation.logic.mjs';

/** Finite animation only; stale recommendations are removed by React immediately. */
export function useRecommendationEntrance(ref, signature, enabled) {
  const seen = useRef(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!enabled || !root || typeof root.animate !== 'function' || seen.current === signature) return;
    let animations = [];
    const frame = requestAnimationFrame(() => {
      if (!root.isConnected || document.hidden) return;
      seen.current = signature;
      const children = [...root.querySelectorAll('[data-rec-enter]')];
      animations = children.map((node, index) => node.animate([
        { opacity: 0, transform: 'perspective(1000px) translate3d(0,14px,0) rotateX(2deg)' },
        { opacity: 1, transform: 'none' },
      ], { duration: 420, delay: Math.min(index, 3) * 65,
        easing: 'cubic-bezier(.2,.75,.2,1)', fill: 'backwards' }));
      const line = root.querySelector('[data-rec-sweep]');
      if (line) animations.push(line.animate([
        { opacity: 0, transform: 'translateX(-100%)' },
        { opacity: 1, offset: .2 },
        { opacity: 0, transform: 'translateX(400%)' },
      ], { duration: 650, easing: 'ease-out' }));
      for (const animation of animations) animation.finished.then(() => animation.cancel()).catch(() => {});
    });
    return () => { cancelAnimationFrame(frame); animations.forEach(animation => animation.cancel()); };
  }, [ref, signature, enabled]);
}

/** At most one queued frame per card; no React state updates on pointer movement. */
export function useRecommendationTilt(ref, enabled) {
  const frame = useRef(0), pending = useRef({ x: 0, y: 0 });
  const reset = () => {
    cancelAnimationFrame(frame.current); frame.current = 0;
    const node = ref.current;
    node?.style.removeProperty('--rec-rx'); node?.style.removeProperty('--rec-ry');
  };
  useEffect(() => { if (!enabled) reset(); return reset; }, [enabled]);
  return {
    onPointerMove(event) {
      if (!enabled || document.hidden || event.pointerType !== 'mouse'
        || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      const rect = event.currentTarget.getBoundingClientRect();
      pending.current = recommendationTilt(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        if (!ref.current?.isConnected) return;
        ref.current.style.setProperty('--rec-rx', `${pending.current.x.toFixed(2)}deg`);
        ref.current.style.setProperty('--rec-ry', `${pending.current.y.toFixed(2)}deg`);
      });
    },
    onPointerLeave: reset,
    onPointerCancel: reset,
    onBlur: reset,
  };
}
