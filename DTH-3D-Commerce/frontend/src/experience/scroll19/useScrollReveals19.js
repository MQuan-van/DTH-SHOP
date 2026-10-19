import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SCROLL19, canStickMedia } from './scroll19.logic.mjs';
import './scroll19.css';

gsap.registerPlugin(ScrollTrigger);
/** Only explicitly marked content; never the canvas, purchase form or route shell. */
export function useScrollReveals19(root, { enabled, compact, contentKey }) {
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return undefined;
    let disposed = false, frame = 0;
    const product = element.hasAttribute('data-scroll19-product');
    const media = element.querySelector('[data-scroll19-media]');
    const previousSticky = media?.getAttribute('data-scroll19-sticky');
    const previousHeader = element.style.getPropertyValue('--scroll19-header');
    const html = document.documentElement;
    const previousProduct = html.getAttribute('data-dth-scroll19-product');
    if (product) html.setAttribute('data-dth-scroll19-product', 'true');
    let triggers = [], refreshGeometry = () => {};
    function measure() {
      if (disposed) return;
      const header = Math.ceil(document.querySelector('.dth-header')?.getBoundingClientRect().height || 80);
      element.style.setProperty('--scroll19-header', `${header}px`);
      if (media) media.dataset.scroll19Sticky = String(canStickMedia({ compact,
        mediaHeight: media.getBoundingClientRect().height, viewportHeight: window.innerHeight, headerHeight: header }));
      refreshGeometry();
    }
    const schedule = () => {
      if (disposed || frame) return;
      frame = requestAnimationFrame(() => { frame = 0; measure(); });
    };
    const mm = gsap.matchMedia();
    if (enabled) mm.add('(prefers-reduced-motion: no-preference)', () => {
      const nodes = [...element.querySelectorAll('[data-scroll19-reveal]')];
      const records = new Map();
      const savedEnabled = element.getAttribute('data-scroll19-enabled');
      element.setAttribute('data-scroll19-enabled', 'true');
      // A bounded stagger in scroll space, not a queue of delayed entrance timers.
      nodes.forEach((node, index) => {
        const amount = compact ? SCROLL19.compactRevealPixels : SCROLL19.revealPixels;
        const offset = node.dataset.scroll19Reveal === 'card' ? (index % 3) * 2 : 0;
        const tween = gsap.fromTo(node, { y: amount, opacity: compact ? 0.65 : 0.4 }, {
          y: 0, opacity: 1, ease: 'none',
          scrollTrigger: { trigger: node, start: `top ${96 - offset}%`, end: 'top 72%',
            scrub: compact ? 0.18 : SCROLL19.scrubSeconds, invalidateOnRefresh: true },
        });
        records.set(node, tween);
      });
      triggers = [...records.values()].map(t => t.scrollTrigger).filter(Boolean);
      let open = true;
      function reconcile() {
        if (disposed) return;
        const next = !document.hidden && !element.closest('[inert]') &&
          !document.querySelector('dialog[open], .dth-support-panel');
        if (next === open) return;
        open = next;
        for (const tween of records.values()) {
          const st = tween.scrollTrigger;
          if (!st || !triggers.includes(st)) continue;
          if (open) { st.enable(false, false); st.update(); }
          else { st.getTween()?.pause(); st.disable(false); tween.pause(); }
        }
      }
      // Keyboard users never land on dimmed or translated interactive content.
      function focus(event) {
        const node = event.target.closest?.('[data-scroll19-reveal]');
        const tween = records.get(node);
        if (!tween) return;
        const st = tween.scrollTrigger;
        triggers = triggers.filter(item => item !== st);
        st?.getTween()?.pause(); st?.kill(false);
        tween.progress(1).pause();
      }
      element.addEventListener('focusin', focus);
      document.addEventListener('visibilitychange', reconcile);
      const observer = new MutationObserver(reconcile);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'inert'] });
      reconcile();
      refreshGeometry = () => { triggers.forEach(st => st.refresh()); };
      return () => {
        observer.disconnect(); element.removeEventListener('focusin', focus);
        document.removeEventListener('visibilitychange', reconcile);
        refreshGeometry = () => {}; triggers = [];
        if (savedEnabled === null) element.removeAttribute('data-scroll19-enabled'); else element.setAttribute('data-scroll19-enabled', savedEnabled);
        // matchMedia reverts only the animations created in this scope.
      };
    });
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    [element, media, document.querySelector('.dth-header')].filter(Boolean).forEach(node => ro?.observe(node));
    element.addEventListener('load', schedule, true);
    element.addEventListener('toggle', schedule, true);
    window.addEventListener('resize', schedule, { passive: true });
    document.fonts?.ready.then(() => { if (!disposed) schedule(); });
    measure();
    return () => {
      disposed = true; cancelAnimationFrame(frame); ro?.disconnect(); mm.revert();
      element.removeEventListener('load', schedule, true); element.removeEventListener('toggle', schedule, true);
      window.removeEventListener('resize', schedule);
      if (media) {
        if (previousSticky === null) media.removeAttribute('data-scroll19-sticky'); else media.setAttribute('data-scroll19-sticky', previousSticky);
      }
      if (previousHeader) element.style.setProperty('--scroll19-header', previousHeader); else element.style.removeProperty('--scroll19-header');
      if (product) {
        if (previousProduct === null) html.removeAttribute('data-dth-scroll19-product'); else html.setAttribute('data-dth-scroll19-product', previousProduct);
      }
    };
  }, [root, enabled, compact, contentKey]);
}
