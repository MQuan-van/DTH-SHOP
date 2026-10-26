import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { PREMIUM213, pointerPosition, tiltAt } from './premium213.logic.mjs';

/** Scoped pointer effects. No render loop; no event handler or state is replaced. */
export function usePremiumMotion213(root, pathname = '') {
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return undefined;
    const media = gsap.matchMedia();
    media.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
      const bindings = new Map();
      let current = null;
      const context = gsap.context(() => {}, element);
      context.add('bind', (host, tilt) => {
        if (bindings.has(host)) return bindings.get(host);
        const visual = host.querySelector(tilt ? '[data-premium-tilt-inner]' : '[data-premium-magnet-inner]');
        if (!visual) return null;
        const config = { duration: .35, ease: 'power3.out' };
        const binding = { host, visual, tilt,
          a: gsap.quickTo(visual, tilt ? 'rotationX' : 'x', config),
          b: gsap.quickTo(visual, tilt ? 'rotationY' : 'y', config) };
        bindings.set(host, binding);
        return binding;
      });
      const reset = () => { if (current) { current.a(0); current.b(0); current = null; } };
      const move = event => {
        if (event.pointerType === 'touch') return;
        const host = event.target.closest?.('[data-premium-magnet], [data-premium-tilt]');
        if (!host || !element.contains(host) || host.matches(':disabled,[aria-disabled="true"]')) { reset(); return; }
        if (current?.host !== host) reset();
        current = context.bind(host, host.hasAttribute('data-premium-tilt'));
        if (!current) return;
        const point = pointerPosition(event.clientX, event.clientY, host.getBoundingClientRect());
        if (current.tilt) { const angles = tiltAt(point); current.a(angles.rotateX); current.b(angles.rotateY); }
        else { current.a(point.x * PREMIUM213.maxMagnet); current.b(point.y * PREMIUM213.maxMagnet); }
      };
      const out = event => { if (current && !current.host.contains(event.relatedTarget)) reset(); };
      const visibility = () => { if (document.hidden) reset(); };
      element.addEventListener('pointermove', move, { passive: true });
      element.addEventListener('pointerout', out, { passive: true });
      element.addEventListener('pointerleave', reset, { passive: true });
      document.addEventListener('visibilitychange', visibility);
      window.addEventListener('blur', reset);
      return () => {
        element.removeEventListener('pointermove', move); element.removeEventListener('pointerout', out);
        element.removeEventListener('pointerleave', reset); document.removeEventListener('visibilitychange', visibility);
        window.removeEventListener('blur', reset); current = null; context.revert(); bindings.clear();
      };
    }, element);
    return () => media.revert();
  }, [root, pathname]);
}

/** Entry-only enhancement: no navigation timers, keyed routes or hidden old pages. */
export function usePremiumEntry213(root, pathname) {
  useLayoutEffect(() => {
    if (!root.current) return undefined;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      if (document.hidden) return;
      const tween = gsap.fromTo(root.current, { opacity: .5, y: 10 },
        { opacity: 1, y: 0, duration: PREMIUM213.enterSeconds, ease: 'power3.out', clearProps: 'opacity,transform' });
      return () => tween.revert();
    }, root.current);
    return () => media.revert();
  }, [root, pathname]);
}
