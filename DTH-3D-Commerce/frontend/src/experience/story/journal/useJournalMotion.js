import { useLayoutEffect } from 'react';
import { clampParallax } from './journal.logic.mjs';
import useIntroCover from '../../journey/useIntroCover';
/** One-shot mask reveals and event-driven parallax. No permanent animation loop. */
export default function useJournalMotion(root, enabled) {
  const covered = useIntroCover();
  useLayoutEffect(() => {
    const element = root.current;
    if (!element || !enabled || covered) return undefined;
    const animations = new Set(), revealed = new WeakSet();
    const reveal = node => {
      if (revealed.has(node)) return;
      revealed.add(node);
      if (typeof node.animate !== 'function') return;
      const mask = node.dataset.journalReveal === 'mask';
      try {
        const a = node.animate(mask ? [
          { clipPath: 'inset(0 0 100% 0)', transform: 'translateY(16px)' },
          { clipPath: 'inset(0 0 0% 0)', transform: 'translateY(0)' },
        ] : [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: mask ? 780 : 580, delay: Number(node.dataset.delay || 0), easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards', iterations: 1 });
        animations.add(a);
        a.finished?.then?.(() => { animations.delete(a); }, () => { animations.delete(a); });
      } catch { /* Content is visible by default. */ }
    };
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { reveal(entry.target); observer.unobserve(entry.target); }
    }, { threshold: .08, rootMargin: '0px 0px -3% 0px' }) : null;
    element.querySelectorAll('[data-journal-reveal]').forEach(node => observer?.observe(node));
    const fields = [...element.querySelectorAll('[data-journal-parallax]')];
    let raf = 0;
    const update = () => {
      raf = 0;
      if (document.hidden) return;
      const mobile = window.innerWidth < 760;
      for (const node of fields) {
        const box = node.getBoundingClientRect();
        if (box.bottom < -30 || box.top > window.innerHeight + 30) continue;
        node.style.setProperty('--journal-y', `${mobile ? 0 : clampParallax(box.top + box.height / 2, window.innerHeight)}px`);
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    const visibility = () => {
      for (const a of animations) { try { document.hidden ? a.pause() : a.play(); } catch {} }
      if (!document.hidden) schedule();
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    schedule();
    return () => {
      observer?.disconnect(); cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule);
      document.removeEventListener('visibilitychange', visibility);
      for (const a of animations) { try { a.cancel(); } catch {} }
      for (const node of fields) node.style.removeProperty('--journal-y');
    };
  }, [root, enabled, covered]);
}
