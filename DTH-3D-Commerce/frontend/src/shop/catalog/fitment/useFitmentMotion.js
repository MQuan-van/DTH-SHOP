import { useLayoutEffect } from 'react';

/** Finite decoration only; no animation delays the data or an action. */
export function useFitmentMotion(ref, signature, enabled) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    let frame = 0, disposed = false, inView = true;
    const running = new Set();
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const cancel = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      for (const animation of running) animation.cancel();
      running.clear();
    };
    const allowed = () => !!enabled && !media?.matches && !document.hidden && inView
      && !document.querySelector('.dth-support-panel')
      && (!document.querySelector('dialog[open]') || !!root.closest('dialog[open]'));
    const sync = () => {
      root.dataset.fitmentMotion = allowed() ? 'on' : 'off';
      if (!allowed()) cancel();
    };
    const play = (node, frames, duration) => {
      if (!node?.animate) return;
      const animation = node.animate(frames, {
        duration, easing: 'cubic-bezier(.2,.75,.2,1)', fill: 'none',
      });
      running.add(animation);
      animation.finished.then(() => running.delete(animation), () => running.delete(animation));
    };
    sync();
    frame = requestAnimationFrame(() => {
      frame = 0;
      const rect = root.getBoundingClientRect();
      if (disposed || !allowed() || rect.bottom <= 0 || rect.top >= window.innerHeight) return;
      for (const node of root.querySelectorAll('[data-fitment-enter]')) {
        play(node, [
          { transform: 'perspective(700px) translateY(5px) rotateX(-6deg)', opacity: .75 },
          { transform: 'perspective(700px) translateY(0) rotateX(0)', opacity: 1 },
        ], 420);
      }
      for (const node of root.querySelectorAll('[data-fitment-scan]')) {
        play(node, [
          { transform: 'translateX(-105%)', opacity: 0 },
          { transform: 'translateX(-20%)', opacity: .9, offset: .45 },
          { transform: 'translateX(105%)', opacity: 0 },
        ], 680);
      }
    });
    const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting; sync();
    }) : null;
    io?.observe(root);
    const observer = typeof MutationObserver === 'function' ? new MutationObserver(sync) : null;
    observer?.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    document.addEventListener('visibilitychange', sync);
    media?.addEventListener('change', sync);
    return () => {
      disposed = true; cancel(); io?.disconnect(); observer?.disconnect();
      document.removeEventListener('visibilitychange', sync);
      media?.removeEventListener('change', sync);
      delete root.dataset.fitmentMotion;
    };
  }, [ref, signature, enabled]);
}
