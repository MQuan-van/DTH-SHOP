import { useLayoutEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

/** Two display zones, one live renderer lease. No offscreen 50 MB vehicle scene. */
export function useStageLease22H2(hero, garage, enabled) {
  const [owner, setOwner] = useState(null);
  useLayoutEffect(() => {
    if (!enabled) { setOwner(null); return; }
    let frame = 0, live = true;
    const area = ref => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return 0;
      return Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 80));
    };
    const measure = () => {
      frame = 0; if (!live) return;
      const h = area(hero), g = area(garage), next = Math.max(h, g) < 50 ? null : h >= g ? 'hero' : 'garage';
      setOwner(current => current === next ? current : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(schedule, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }) : null;
    [hero.current, garage.current].filter(Boolean).forEach(el => io?.observe(el));
    window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule, { passive: true }); schedule();
    return () => { live = false; cancelAnimationFrame(frame); io?.disconnect(); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [hero, garage, enabled]);
  return owner;
}
export function useShell22H2(root) {
  useLayoutEffect(() => {
    const html = document.documentElement, prior = html.getAttribute('data-dth-precision'); html.setAttribute('data-dth-precision', 'true');
    const header = document.querySelector('.dth-header'), nav = header?.querySelector('.dth-navigation');
    const props = ['--s222-nav-x','--s222-nav-y','--s222-nav-w','--s222-nav-h'];
    const oldProps = props.map(name => [name, nav?.style.getPropertyValue(name) || '']);
    const oldReady = nav?.getAttribute('data-precision-nav');
    let alive = true, frame = 0, hovered = null;
    const preferred = () => hovered || (nav?.contains(document.activeElement) ? document.activeElement.closest?.('a') : null) || nav?.querySelector('[aria-current="page"],a.active');
    const locate = node => {
      if (!alive || !nav || !node || !nav.contains(node)) return;
      const r = node.getBoundingClientRect(), parent = nav.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const values = [r.left-parent.left-nav.clientLeft,r.top-parent.top-nav.clientTop,r.width,r.height];
      props.forEach((name,i) => nav.style.setProperty(name, `${values[i]}px`)); nav.setAttribute('data-precision-nav','ready');
    };
    const measure = () => {
      root.current?.style.setProperty('--s222-header', `${Math.ceil(header?.getBoundingClientRect().height || 88)}px`);
      locate(preferred());
    };
    const over = e => { const a = e.target.closest?.('a'); if (a && nav.contains(a)) { hovered = a; locate(a); } };
    const leave = () => { hovered = null; locate(preferred()); };
    const focus = e => locate(e.target.closest?.('a'));
    const blur = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => locate(preferred())); };
    nav?.addEventListener('pointerover', over); nav?.addEventListener('pointerleave', leave);
    nav?.addEventListener('focusin', focus); nav?.addEventListener('focusout', blur);
    measure(); const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    if (header) observer?.observe(header); if (nav) observer?.observe(nav);
    document.fonts?.ready.then(() => { if (alive) measure(); });
    return () => {
      alive = false; cancelAnimationFrame(frame); observer?.disconnect();
      nav?.removeEventListener('pointerover', over); nav?.removeEventListener('pointerleave', leave);
      nav?.removeEventListener('focusin', focus); nav?.removeEventListener('focusout', blur);
      if (nav) {
        oldProps.forEach(([k,v]) => v ? nav.style.setProperty(k,v) : nav.style.removeProperty(k));
        oldReady === null ? nav.removeAttribute('data-precision-nav') : nav.setAttribute('data-precision-nav',oldReady);
      }
      if (prior === null) html.removeAttribute('data-dth-precision'); else html.setAttribute('data-dth-precision', prior);
    };
  }, [root]);
}
export function useStudioEffects22H2(root, enabled) {
  useLayoutEffect(() => {
    const host = root.current; if (!host || !enabled) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-studio-enter]', { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.07, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
      host.querySelectorAll('[data-studio-reveal]').forEach(el => {
        gsap.fromTo(el, { y: 28, autoAlpha: 0.4 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out', clearProps: 'transform,opacity,visibility', scrollTrigger: { trigger: el, start: 'top 95%', once: true } });
      });
    }, host);
    // Stable hit areas: only the light and inner glyph follow the pointer, never the button itself.
    const touched = new Set(); let raf = 0, target = null, point = null;
    const draw = () => { raf = 0; if (!target?.isConnected || !point) return;
      const r = target.getBoundingClientRect(), x = Math.max(0, Math.min(1, (point.x - r.left) / r.width)), y = Math.max(0, Math.min(1, (point.y - r.top) / r.height));
      target.style.setProperty('--mx', `${x * 100}%`); target.style.setProperty('--my', `${y * 100}%`);
      target.style.setProperty('--ix', `${(x - 0.5) * 5}px`); target.style.setProperty('--iy', `${(y - 0.5) * 5}px`); touched.add(target);
    };
    const move = e => { if (e.pointerType !== 'mouse') return; const node = e.target.closest?.('[data-precision-button]'); if (!node || node.disabled || !host.contains(node)) return; target = node; point = { x: e.clientX, y: e.clientY }; if (!raf) raf = requestAnimationFrame(draw); };
    const leave = e => { const node = e.target.closest?.('[data-precision-button]'); if (node && !node.contains(e.relatedTarget)) { node.style.removeProperty('--ix'); node.style.removeProperty('--iy'); } };
    host.addEventListener('pointermove', move, { passive: true }); host.addEventListener('pointerout', leave);
    return () => { cancelAnimationFrame(raf); ctx.revert(); host.removeEventListener('pointermove', move); host.removeEventListener('pointerout', leave); for (const el of touched) for (const p of ['--mx','--my','--ix','--iy']) el.style.removeProperty(p); };
  }, [root, enabled]);
}
export function useProductEntrance22H2(ref, key, enabled) {
  useLayoutEffect(() => {
    if (!ref.current || !enabled) return;
    const ctx = gsap.context(() => gsap.fromTo(ref.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', clearProps: 'opacity,transform' }), ref);
    return () => ctx.revert();
  }, [ref, key, enabled]);
}
