import { useCallback, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export function useAtelierMotion22H(root, enabled, covered) {
  useLayoutEffect(() => {
    const element = root.current; if (!element || !enabled || covered) return undefined;
    let live = true, frame = 0; const ownedTriggers = [];
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-atelier-enter]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.72, stagger: 0.065, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
      element.querySelectorAll('[data-atelier-reveal]').forEach(node => {
        const tween = gsap.fromTo(node, { y: 36, autoAlpha: 0.3 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'power3.out', clearProps: 'transform,opacity,visibility',
          scrollTrigger: { trigger: node, start: 'top 92%', toggleActions: 'play none none none', once: true } });
        if (tween.scrollTrigger) ownedTriggers.push(tween.scrollTrigger);
      });
      const bridge = element.querySelector('[data-atelier-bridge]');
      if (bridge) { const t = gsap.fromTo(bridge, { scaleX: 0.08 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: bridge, start: 'top bottom', end: 'top 40%', scrub: 0.3 } }); ownedTriggers.push(t.scrollTrigger); }
    }, element);
    const refresh = () => { if (!live) return; cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { if (live) ownedTriggers.forEach(t => t?.refresh()); }); };
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(refresh) : null; observer?.observe(element);
    document.fonts?.ready.then(refresh);
    return () => { live = false; cancelAnimationFrame(frame); observer?.disconnect(); ctx.revert(); };
  }, [root, enabled, covered]);
}

/** Latest click wins. Never queue multiple model switches or lock the user's page scroll. */
export function usePartSwitch22H(layer, enabled, onCommit) {
  const transition = useRef(null), serial = useRef(0), live = useRef(true), commit = useRef(onCommit);
  commit.current = onCommit;
  useLayoutEffect(() => {
    live.current = true;
    return () => { live.current = false; serial.current++; transition.current?.kill(); };
  }, []);
  return useCallback(id => {
    const ticket = ++serial.current; transition.current?.kill();
    const finish = () => { if (live.current && ticket === serial.current) commit.current(id); };
    if (!enabled || !layer.current) { finish(); return; }
    transition.current = gsap.to(layer.current, { opacity: 0, y: 12, duration: 0.18, ease: 'power2.in', overwrite: 'auto', onComplete: finish });
  }, [layer, enabled]);
}
export function usePartEntrance22H(layer, key, enabled) {
  useLayoutEffect(() => {
    const node = layer.current; if (!node) return undefined;
    const ctx = gsap.context(() => {
      if (enabled) gsap.fromTo(node, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out', clearProps: 'transform,opacity' });
      else gsap.set(node, { clearProps: 'transform,opacity' });
    }, node);
    return () => ctx.revert();
  }, [layer, key, enabled]);
}
