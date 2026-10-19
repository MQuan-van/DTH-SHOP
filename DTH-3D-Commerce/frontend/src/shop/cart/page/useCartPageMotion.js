import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export function useCartPageMotion(root) {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() => typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    change(); media.addEventListener('change', change);
    let frame = 0;
    const measure = () => {
      frame = 0;
      const box = root.current?.getBoundingClientRect();
      setActive(!document.hidden && !!box && box.bottom > 0 && box.top < innerHeight &&
        !document.querySelector('dialog[open], .dth-support-panel'));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule);
    measure();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); media.removeEventListener('change', change);
      document.removeEventListener('visibilitychange', schedule); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [root]);
  return { motion: !reduced && !paused && active, paused, reduced, setPaused };
}

/** Finite FLIP on outer rows; hover only transforms the inner image. No artificial money counter. */
export function useBagListMotion(list, signature, motion) {
  const previous = useRef(new Map());
  useLayoutEffect(() => {
    const nodes = [...(list.current?.querySelectorAll('[data-bag-line]') || [])];
    const positions = new Map(nodes.map(node => [node.dataset.bagLine, { top: node.getBoundingClientRect().top + scrollY, width: node.offsetWidth }]));
    const old = previous.current, animations = [];
    const frame = requestAnimationFrame(() => {
      for (const [index, node] of nodes.entries()) {
        if (!motion || !node.isConnected || typeof node.animate !== 'function') continue;
        const from = old.get(node.dataset.bagLine), to = positions.get(node.dataset.bagLine);
        const delta = from && Math.abs(from.width - to.width) < 2 ? from.top - to.top : 0;
        if (!from || Math.abs(delta) > 1) animations.push(node.animate([
          { opacity: from ? 1 : 0.3, transform: `translateY(${from ? delta : 14}px)` },
          { opacity: 1, transform: 'translateY(0)' },
        ], { duration: 320, delay: from ? 0 : Math.min(index, 3) * 50, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }));
      }
      previous.current = positions;
    });
    return () => { cancelAnimationFrame(frame); animations.forEach(animation => animation.cancel()); };
  }, [list, signature, motion]);
}
