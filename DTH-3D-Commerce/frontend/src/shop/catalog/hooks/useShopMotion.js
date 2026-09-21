import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export function useShopMotion(enabled) {
  const [reduced, setReduced] = useState(() => typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(query.matches);
    change(); query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  return { motion: enabled && !reduced && !paused, paused, reduced, setPaused };
}

/** FLIP on OUTER grid items only. Inner card hover transforms do not conflict. */
export function useGridMotion(signature, motion, settings) {
  const gridRef = useRef(null), previous = useRef(new Map()), previousWidth = useRef(0);
  useLayoutEffect(() => {
    const grid = gridRef.current; if (!grid) return undefined;
    const nodes = [...grid.querySelectorAll('[data-shop-id]')];
    const current = new Map(), animations = [];
    const width = grid.clientWidth;
    const resized = Math.abs(width - previousWidth.current) > 2;
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      current.set(node.dataset.shopId, { x: rect.left + window.scrollX, y: rect.top + window.scrollY });
    }
    // Schedule once, so React StrictMode's setup/cleanup/setup does not consume
    // the entrance animation before the first visible frame.
    const frame = requestAnimationFrame(() => {
      for (const [index, node] of nodes.entries()) {
        if (!node.isConnected || !motion || typeof node.animate !== 'function') continue;
        const position = current.get(node.dataset.shopId);
        const old = resized ? undefined : previous.current.get(node.dataset.shopId);
        if (old) {
          const dx = old.x - position.x, dy = old.y - position.y;
          if (Math.abs(dx) + Math.abs(dy) > 1) animations.push(node.animate([
            { transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' },
          ], { duration: settings.gridDurationMs, easing: 'cubic-bezier(.2,.7,.2,1)' }));
        } else {
          animations.push(node.animate([
            { opacity: 0, transform: 'translateY(14px) scale(.98)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' },
          ], { duration: settings.gridDurationMs, delay: Math.min(index, 5) * settings.staggerMs, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }));
        }
      }
      previous.current = current;
      previousWidth.current = width;
    });
    return () => { cancelAnimationFrame(frame); animations.forEach(animation => animation.cancel()); };
  }, [signature, motion, settings.gridDurationMs, settings.staggerMs]);
  return gridRef;
}
