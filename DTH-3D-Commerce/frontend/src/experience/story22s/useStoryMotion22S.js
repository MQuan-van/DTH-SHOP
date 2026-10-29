import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { STORY22S, sampleStudy22S } from './story22s.logic.mjs';

gsap.registerPlugin(ScrollTrigger);

/** All animation ownership is scoped to this route. No wheel capture or global killAll. */
export function useStoryMotion22S({ root, study, stage, nav, director, enabled, compact, onChapter }) {
  const seek = useRef(() => {}), onChapterRef = useRef(onChapter);
  onChapterRef.current = onChapter;
  useLayoutEffect(() => {
    const page = root.current, runway = study.current, panel = stage.current, navigation = nav.current;
    if (!page || !navigation) return undefined;
    let live = true, refreshFrame = 0, ctx, tween, resizeObserver;
    let lastChapter = '';
    const notify = key => { if (key !== lastChapter) { lastChapter = key; onChapterRef.current(key); } };
    const owned = [], listeners = [], proxy = { progress: director.state.progress };
    const header = document.querySelector('.dth-header');
    const original = ['--s22-header', '--s22-nav'].map(key => [key, page.style.getPropertyValue(key)]);
    function measure() {
      const style = header ? getComputedStyle(header) : null;
      const headerHeight = style && ['sticky', 'fixed'].includes(style.position)
        ? Math.ceil(header.getBoundingClientRect().height) + (parseFloat(style.top) || 0) : 0;
      page.style.setProperty('--s22-header', `${Math.max(0, headerHeight)}px`);
      page.style.setProperty('--s22-nav', `${Math.ceil(navigation.getBoundingClientRect().height)}px`);
    }
    const topOffset = () => (parseFloat(page.style.getPropertyValue('--s22-header')) || 0) + navigation.getBoundingClientRect().height;
    const paint = state => {
      const pose = sampleStudy22S(state.progress, enabled);
      page.style.setProperty('--s22-study-p', String(pose.progress));
      const form = page.querySelector('[data-s22-form]'), detail = page.querySelector('[data-s22-detail]');
      for (const [el, opacity, y, active] of [[form, pose.formAlpha, pose.formY, !pose.detail], [detail, pose.detailAlpha, pose.detailY, pose.detail]]) {
        if (!el) continue;
        el.style.opacity = String(opacity);
        el.style.transform = `translate3d(0,${y}px,0)`;
        el.setAttribute('aria-hidden', String(!active));
      }
      const line = page.querySelector('[data-s22-study-progress]');
      if (line) line.style.transform = `scaleX(${pose.progress})`;
      if (state.active) notify(pose.detail ? 'detail' : 'craft');
    };
    measure();
    const off = director.subscribe(paint);
    director.set({ motion: enabled });
    ctx = gsap.context(() => {
      if (enabled) {
        const heroImage = page.querySelector('[data-s22-hero-image]');
        const heroCopy = page.querySelector('[data-s22-hero-copy]');
        if (heroImage) {
          const t = gsap.fromTo(heroImage, { yPercent: 0, scale: 1.025 }, { yPercent: -4, scale: 1.09, ease: 'none', scrollTrigger: {
            trigger: page.querySelector('#s22-opening'), start: () => `top top+=${topOffset()}`, end: 'bottom top', scrub: 0.65,
          }}); owned.push(t.scrollTrigger);
        }
        if (heroCopy) {
          const t = gsap.fromTo(heroCopy, { y: 0, opacity: 1 }, { y: -24, opacity: 0.45, ease: 'none', scrollTrigger: {
            trigger: page.querySelector('#s22-opening'), start: 'top top', end: 'bottom top', scrub: 0.5,
          }}); owned.push(t.scrollTrigger);
        }
        for (const figure of page.querySelectorAll('[data-s22-reveal]')) {
          const t = gsap.fromTo(figure, { clipPath: 'inset(7% 0 0 0)', y: compact ? 12 : 32 }, {
            clipPath: 'inset(0% 0 0 0)', y: 0, ease: 'none', scrollTrigger: {
              trigger: figure, start: 'top 94%', end: 'top 38%', scrub: 0.5,
            },
          }); owned.push(t.scrollTrigger);
        }
        for (const frame of page.querySelectorAll('[data-s22-parallax]')) {
          const inner = frame.querySelector('img'); if (!inner) continue;
          const t = gsap.fromTo(inner, { yPercent: -2, scale: 1.055 }, { yPercent: 2, scale: 1.055, ease: 'none', scrollTrigger: {
            trigger: frame, start: 'top bottom', end: 'bottom top', scrub: 0.6,
          }}); owned.push(t.scrollTrigger);
        }
      }
      if (runway && panel) {
        const t = gsap.fromTo(proxy, { progress: 0 }, { progress: 1, ease: 'none', onUpdate: () => director.set({ progress: proxy.progress }),
          scrollTrigger: { trigger: runway,
            start: () => `top top+=${topOffset()}`,
            end: () => `+=${Math.max(1, runway.offsetHeight - (compact ? Math.min(panel.offsetHeight, window.innerHeight * 0.65) : panel.offsetHeight))}`,
            scrub: enabled ? STORY22S.scrubSeconds : true, invalidateOnRefresh: true,
            onToggle: self => director.set({ active: self.isActive }),
          },
        }); tween = t; owned.push(t.scrollTrigger);
      }
      for (const [id, key] of [['s22-opening', 'opening'], ['s22-riders', 'riders'], ['s22-closing', 'closing']]) {
        const el = page.querySelector(`#${id}`); if (!el) continue;
        const t = ScrollTrigger.create({ trigger: el, start: () => `top top+=${topOffset() + 100}`, end: 'bottom center',
          onEnter: () => notify(key), onEnterBack: () => notify(key) });
        owned.push(t);
      }
    }, page);
    seek.current = (chapter, smooth = enabled) => {
      if (!live) return;
      if (chapter === 'craft' || chapter === 'detail') {
        const t = tween?.scrollTrigger;
        if (!t) return;
        const p = chapter === 'detail' ? 0.84 : 0.12;
        window.scrollTo({ top: Math.max(0, t.start + (t.end - t.start) * p), behavior: smooth ? 'smooth' : 'instant' });
      } else {
        const el = page.querySelector(`#s22-${chapter === 'riders' ? 'riders' : chapter === 'closing' ? 'closing' : 'opening'}`);
        if (!el) return;
        window.scrollTo({ top: Math.max(0, window.scrollY + el.getBoundingClientRect().top - topOffset()), behavior: smooth ? 'smooth' : 'instant' });
      }
      if (!smooth) ScrollTrigger.update();
    };
    const refresh = () => {
      if (!live || refreshFrame) return;
      refreshFrame = requestAnimationFrame(() => {
        refreshFrame = 0; if (!live) return;
        measure(); for (const trigger of owned) trigger?.refresh();
        // Reconcile restored scroll immediately; no flash back to chapter zero.
        if (tween?.scrollTrigger) { tween.scrollTrigger.update(); tween.progress(tween.scrollTrigger.progress); }
        paint(director.state);
      });
    };
    resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(refresh) : null;
    if (header) resizeObserver?.observe(header);
    resizeObserver?.observe(navigation);
    window.addEventListener('resize', refresh, { passive: true });
    for (const image of page.querySelectorAll('img')) { image.addEventListener('load', refresh); listeners.push(() => image.removeEventListener('load', refresh)); }
    document.fonts?.ready.then(() => { if (live) refresh(); });
    refresh(); paint(director.state);
    return () => {
      live = false; cancelAnimationFrame(refreshFrame); resizeObserver?.disconnect(); off();
      window.removeEventListener('resize', refresh); listeners.forEach(stop => stop());
      seek.current = () => {}; ctx?.revert(); director.set({ active: false });
      for (const [key, value] of original) value ? page.style.setProperty(key, value) : page.style.removeProperty(key);
      for (const key of ['--s22-study-p']) page.style.removeProperty(key);
      for (const node of page.querySelectorAll('[data-s22-form], [data-s22-detail]')) { node.style.removeProperty('opacity'); node.style.removeProperty('transform'); }
    };
  }, [root, study, stage, nav, director, enabled, compact]);
  return seek;
}
