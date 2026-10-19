import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CINEMATIC_CONFIG } from '../motion/motion.config.mjs';
import { chapterAt } from '../motion/story.mjs';
import { SCROLL19, clamp, copyPose, canWriteStory, scrollTarget, storyDistance } from './scroll19.logic.mjs';

gsap.registerPlugin(ScrollTrigger);
/** Same contract as the old director. One camera writer; native page scrolling. */
export function useScrollDirector(root, director, { cinematic, animated, onChapter, config = CINEMATIC_CONFIG }) {
  const choose = useRef(null), callback = useRef(onChapter);
  callback.current = onChapter;
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return undefined;
    const stage = element.querySelector('[data-stage]');
    if (!stage) return undefined;
    let disposed = false, frame = 0, trigger = null, tween = null;
    let lastChapter = -1, lastMeasure = '', writing = false;
    const marker = { p: clamp(director.state.progress) };
    const ownedProperties = ['--story-progress', '--scroll19-copy-opacity', '--scroll19-copy-y',
      '--header-height', '--banner-height', '--scroll19-stage-height', '--scroll19-distance'];
    const previousProperties = ownedProperties.map(name => [name, element.style.getPropertyValue(name), element.style.getPropertyPriority(name)]);
    const previousProgress = element.getAttribute('data-progress');
    let allowed = canWriteStory(director.state, document.hidden);
    function update() {
      if (disposed || writing || !canWriteStory(director.state, document.hidden)) return;
      writing = true;
      try {
        const p = clamp(marker.p);
        director.set({ progress: p });
        element.style.setProperty('--story-progress', String(p));
        element.dataset.progress = p.toFixed(5);
        const pose = cinematic ? copyPose(p, config.chapters) : { opacity: 1, y: 0 };
        element.style.setProperty('--scroll19-copy-opacity', String(pose.opacity));
        element.style.setProperty('--scroll19-copy-y', `${pose.y.toFixed(3)}px`);
        const chapter = chapterAt(p, config.chapters);
        if (chapter !== lastChapter) { lastChapter = chapter; callback.current?.(chapter); }
      } finally { writing = false; }
    }
    function gateChanged() {
      const next = canWriteStory(director.state, document.hidden);
      if (next === allowed || disposed) return;
      allowed = next;
      // While Inspect owns the camera, only marker.p follows scrolling. The next
      // story frame is reconciled on exit; the renderer already eases that return.
      if (allowed) update();
    }
    function measure() {
      if (disposed) return;
      const header = Math.ceil(document.querySelector('.dth-header')?.getBoundingClientRect().height || 80);
      const banner = Math.ceil(document.querySelector('.dth-demo-banner')?.getBoundingClientRect().height || 0);
      const h = Math.max(320, window.innerHeight - header - banner);
      const distance = storyDistance(h, config.storyScreens);
      const next = `${header}:${banner}:${h}:${distance}:${element.offsetWidth}`;
      if (next === lastMeasure) return;
      lastMeasure = next;
      element.style.setProperty('--header-height', `${header}px`);
      element.style.setProperty('--banner-height', `${banner}px`);
      element.style.setProperty('--scroll19-stage-height', `${h}px`);
      element.style.setProperty('--scroll19-distance', `${distance}px`);
      trigger?.refresh();
    }
    const scheduleMeasure = () => {
      if (disposed || frame) return;
      frame = requestAnimationFrame(() => { frame = 0; measure(); });
    };
    measure();
    const ctx = gsap.context(() => {
      if (cinematic) {
        tween = gsap.fromTo(marker, { p: 0 }, {
          p: 1, ease: 'none', onUpdate: update,
          scrollTrigger: {
            id: 'dth-cinematic-home', trigger: element,
            start: () => `top ${element.style.getPropertyValue('--header-height') || '80px'}`,
            end: () => `+=${Math.max(1, element.offsetHeight - stage.offsetHeight)}`,
            scrub: SCROLL19.scrubSeconds, invalidateOnRefresh: true,
          },
        });
        trigger = tween.scrollTrigger;
        // Initial/history-restored positions should be correct before scrubbing.
        if (trigger) { trigger.refresh(); trigger.update(); tween.progress(trigger.progress); }
      } else update();
    }, element);
    choose.current = progress => {
      if (disposed || !canWriteStory(director.state, document.hidden)) return;
      if (trigger) {
        window.scrollTo({ top: scrollTarget(trigger.start, trigger.end, progress), behavior: animated ? 'smooth' : 'instant' });
      } else {
        gsap.killTweensOf(marker);
        // Event-created tween is explicitly killed on cleanup as well.
        tween = gsap.to(marker, { p: clamp(progress), duration: animated ? 0.6 : 0, ease: 'power2.inOut', onUpdate: update });
      }
    };
    const unsubscribe = director.subscribe(gateChanged);
    document.addEventListener('visibilitychange', gateChanged);
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(scheduleMeasure) : null;
    const header = document.querySelector('.dth-header'), banner = document.querySelector('.dth-demo-banner');
    [element, stage, header, banner].filter(Boolean).forEach(node => ro?.observe(node));
    window.addEventListener('resize', scheduleMeasure, { passive: true });
    document.fonts?.ready.then(() => { if (!disposed) { lastMeasure = ''; scheduleMeasure(); } });
    return () => {
      disposed = true; unsubscribe(); ro?.disconnect(); cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', gateChanged);
      window.removeEventListener('resize', scheduleMeasure);
      choose.current = null;
      tween?.kill(); gsap.killTweensOf(marker); ctx.revert();
      previousProperties.forEach(([name, value, priority]) => value ? element.style.setProperty(name, value, priority) : element.style.removeProperty(name));
      if (previousProgress === null) element.removeAttribute('data-progress'); else element.setAttribute('data-progress', previousProgress);
    };
  }, [root, director, cinematic, animated, config]);
  return choose;
}
