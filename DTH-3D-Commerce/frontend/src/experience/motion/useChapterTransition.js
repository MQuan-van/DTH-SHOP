import { useCallback, useLayoutEffect, useReducer, useRef } from 'react';
import gsap from 'gsap';
import { useScrollDirector } from './useScrollDirector';
import { clamp01 } from './story.mjs';

/** Seconds. The renderer, camera presets and page layout are not changed. */
export const CHAPTER_TRANSITION = Object.freeze({
  exit: 0.18,
  camera: 0.82,
  headline: 0.62,
  lineStagger: 0.055,
  enterDelay: 0.10,
  detailsDelay: 0.25,
  details: 0.36,
});

/**
 * Home-only chapter choreography.
 * - The most recent valid click wins; no queue of old destinations.
 * - React owns text; GSAP only owns temporary presentation styles.
 * - The existing director still owns the rendered 3D camera.
 * - Native-scroll mode is delegated to the existing hook, not enabled here.
 */
export function useChapterTransition(root, copy, director, options) {
  const latest = useRef(options);
  latest.current = options;
  const engine = useRef(null);
  const [commitTicket, committed] = useReducer(value => value + 1, 0);

  // A manual camera path can pass through other chapters' waypoints.
  // Those samples must not change the selected label or flash other headlines.
  const followScroll = useCallback(index => {
    if (latest.current.cinematic) latest.current.onChapter(index);
  }, []);
  const legacyChoose = useScrollDirector(root, director, {
    cinematic: options.cinematic,
    animated: options.animated,
    onChapter: followScroll,
    config: options.config,
  });

  useLayoutEffect(() => {
    const host = root.current;
    if (!host) return undefined;

    let disposed = false;
    let serial = 0;
    let request = null;
    let exitTween = null;
    let cameraTween = null;
    let enterTween = null;
    let previous = null;
    let lastContent = '';
    let quietNext = false;
    const savedStyles = new Map();

    function phase(value) {
      host.dataset.chapterTransition = value;
    }
    function writeProgress(value) {
      if (disposed) return;
      const p = clamp01(value);
      director.set({ progress: p });
      host.style.setProperty('--story-progress', String(p));
      host.dataset.progress = p.toFixed(4);
    }
    function validIndex(index) {
      return Number.isInteger(index) && index >= 0 &&
        index < latest.current.config.chapters.length;
    }
    function canAnimate() {
      const o = latest.current;
      return o.animated && o.active !== false && !o.inspect &&
        !document.hidden && director.state.active && !director.state.blocked;
    }
    function killTweens() {
      exitTween?.kill();
      cameraTween?.kill();
      enterTween?.kill();
      exitTween = cameraTween = enterTween = null;
    }
    function remember(elements) {
      for (const element of elements) {
        if (element && !savedStyles.has(element)) {
          savedStyles.set(element, element.getAttribute('style'));
        }
      }
    }
    function restoreStyles() {
      for (const [element, original] of savedStyles) {
        // Clear GSAP's transform cache as well as the temporary CSS properties.
        gsap.set(element, { clearProps: 'opacity,transform,transformOrigin,filter' });
        if (original === null) element.removeAttribute('style');
        else element.setAttribute('style', original);
      }
      savedStyles.clear();
    }
    function targets() {
      const element = copy.current;
      return {
        element,
        lines: element ? Array.from(element.querySelectorAll('[data-copy-line]')) : [],
        details: element ? Array.from(element.children).filter(child => child.tagName !== 'H1') : [],
      };
    }
    function cancel() {
      ++serial;
      request = null;
      killTweens();
      restoreStyles();
      phase('idle');
    }
    function finishIfReady(id) {
      if (disposed || request?.id !== id || !request.cameraDone || !request.copyDone) return;
      request = null;
      restoreStyles();
      phase('idle');
    }
    function instant(index, leaveInspect = false) {
      if (!validIndex(index)) return;
      cancel();
      quietNext = true;
      if (leaveInspect) {
        latest.current.setInspect(false);
        director.set({ inspecting: false });
      }
      latest.current.onChapter(index);
      writeProgress(latest.current.config.chapters[index].at);
      committed();
    }
    function enter(id, direction, initial = false) {
      const { element, lines, details } = targets();
      restoreStyles();
      if (!element) {
        if (request?.id === id) request.copyDone = true;
        finishIfReady(id);
        return;
      }
      if (!canAnimate()) {
        if (request?.id === id) request.copyDone = true;
        finishIfReady(id);
        return;
      }
      remember([element, ...lines, ...details]);
      gsap.set(element, { opacity: 1 });
      const delay = initial ? 0 : CHAPTER_TRANSITION.enterDelay;
      enterTween = gsap.timeline({
        onComplete() {
          if (disposed || serial !== id) return;
          enterTween = null;
          if (request?.id === id) {
            request.copyDone = true;
            finishIfReady(id);
          } else {
            restoreStyles();
            phase('idle');
          }
        },
      });
      if (lines.length) {
        enterTween.fromTo(lines, {
          yPercent: 108 * direction,
          rotationX: -24 * direction,
          transformPerspective: 850,
          transformOrigin: direction > 0 ? '50% 100%' : '50% 0%',
          opacity: 0,
          filter: 'blur(3px)',
        }, {
          yPercent: 0, rotationX: 0, opacity: 1, filter: 'blur(0px)',
          duration: CHAPTER_TRANSITION.headline,
          stagger: CHAPTER_TRANSITION.lineStagger,
          ease: 'power3.out',
        }, delay);
      }
      if (details.length) {
        enterTween.fromTo(details, { y: 9 * direction, opacity: 0 }, {
          y: 0, opacity: 1,
          duration: CHAPTER_TRANSITION.details,
          stagger: 0.045, ease: 'power2.out',
        }, delay + CHAPTER_TRANSITION.detailsDelay);
      }
      if (!lines.length && !details.length) {
        enterTween.to(element, { opacity: 1, duration: 0.01 });
      }
    }
    function beginArrival(current) {
      const { id, index, direction } = current;
      if (disposed || request?.id !== id) return;
      current.phase = 'entering';
      phase('arriving');
      const marker = { p: director.state.progress };
      cameraTween = gsap.to(marker, {
        p: latest.current.config.chapters[index].at,
        duration: CHAPTER_TRANSITION.camera,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (request?.id === id) writeProgress(marker.p);
        },
        onComplete: () => {
          if (disposed || request?.id !== id) return;
          cameraTween = null;
          current.cameraDone = true;
          finishIfReady(id);
        },
      });
      enter(id, direction);
    }
    function swap(id) {
      if (disposed || request?.id !== id) return;
      request.phase = 'awaiting-react';
      exitTween = null;
      latest.current.onChapter(request.index);
      // Forces a commit even when a rapid A -> B -> A selects the visible A again.
      committed();
    }
    function choose(index) {
      const o = latest.current;
      if (disposed || !validIndex(index) || director.state.blocked) return false;
      if (o.cinematic) {
        cancel();
        o.setInspect(false);
        director.set({ inspecting: false });
        legacyChoose.current?.(o.config.chapters[index].at);
        return true;
      }
      if (request?.index === index) return true;
      if (!request && !o.inspect && o.chapter === index) return true;
      if (!canAnimate()) {
        instant(index, o.inspect);
        return true;
      }
      // kill(), not progress(1): old callbacks must never select an old target.
      killTweens();
      const id = ++serial;
      const direction = index >= o.chapter ? 1 : -1;
      request = { id, index, direction, phase: 'leaving', copyDone: false, cameraDone: false };
      phase('leaving');
      const { element, lines, details } = targets();
      if (!element) {
        swap(id);
        return true;
      }
      remember([element, ...lines, ...details]);
      exitTween = gsap.timeline({ onComplete: () => swap(id) });
      if (lines.length) {
        exitTween.to(lines, {
          yPercent: -88 * direction, rotationX: 12 * direction,
          opacity: 0, filter: 'blur(2px)',
          duration: CHAPTER_TRANSITION.exit, ease: 'power2.in',
        }, 0);
      }
      if (details.length) {
        exitTween.to(details, { opacity: 0, y: -6 * direction, duration: 0.13 }, 0);
      }
      // Hides the whole old copy during the React swap, including its current CTA.
      exitTween.to(element, { opacity: 0, duration: CHAPTER_TRANSITION.exit }, 0);
      return true;
    }
    function sync() {
      const o = latest.current;
      const flags = { animated: o.animated, active: o.active, inspect: o.inspect, cinematic: o.cinematic, config: o.config };
      const changedConfig = previous && previous.config !== o.config;
      const returned = previous?.inspect && !o.inspect;
      const enteredInspect = !previous?.inspect && o.inspect;
      const changedMode = previous && previous.cinematic !== o.cinematic;
      previous = flags;
      if (enteredInspect) {
        cancel(); // Preserve the actually displayed camera; do not snap on entering Inspect.
        quietNext = true;
      } else if (changedMode) {
        cancel();
        quietNext = true;
      } else if (request && (!canAnimate() || changedConfig)) {
        const index = request.index;
        instant(index);
        return;
      } else if ((returned || changedConfig) && !o.cinematic && validIndex(o.chapter)) {
        cancel();
        quietNext = true;
        writeProgress(o.config.chapters[o.chapter].at);
      }
      const key = `${o.chapter}:${o.inspect}`;
      if (request?.phase === 'awaiting-react' && o.chapter === request.index && !o.inspect) {
        lastContent = key;
        if (canAnimate()) beginArrival(request);
        else instant(request.index);
        return;
      }
      if (request) return;
      if (key !== lastContent) {
        lastContent = key;
        killTweens();
        restoreStyles();
        if (!quietNext && canAnimate()) {
          phase('arriving');
          enter(++serial, 1, true);
        }
        quietNext = false;
      } else if (!canAnimate()) {
        killTweens();
        restoreStyles();
        phase('idle');
      }
    }
    function gateChanged() {
      if (disposed || (!document.hidden && director.state.active && !director.state.blocked)) return;
      if (request) instant(request.index);
      else {
        ++serial;
        killTweens();
        restoreStyles();
        phase('idle');
      }
    }
    engine.current = { choose, sync };
    phase('idle');
    const unsubscribe = director.subscribe(gateChanged);
    document.addEventListener('visibilitychange', gateChanged);
    return () => {
      disposed = true;
      ++serial;
      request = null;
      unsubscribe();
      document.removeEventListener('visibilitychange', gateChanged);
      killTweens();
      restoreStyles();
      delete host.dataset.chapterTransition;
      engine.current = null;
    };
  }, [root, copy, director, legacyChoose]);

  useLayoutEffect(() => {
    engine.current?.sync();
  }, [commitTicket, options.chapter, options.inspect, options.animated,
    options.active, options.cinematic, options.config]);

  return useCallback(index => engine.current?.choose(index) ?? false, []);
}
