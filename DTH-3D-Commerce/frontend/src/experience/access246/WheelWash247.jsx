import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { advanceWheelWash247, wheelWashDelta247, wheelWashDestination247 } from './wheelWash247.logic.mjs';

const rest = { x: 42, y: 34, scale: .76, rotation: -14, opacity: [0, 0, 0] };
const colorStops = [
  { x: -52, y: -8, scale: 1.14, rotation: -4, opacity: [.88, 0, .12] },
  { x: -13, y: 24, scale: 1.23, rotation: 10, opacity: [.11, .91, .12] },
  { x: 53, y: -23, scale: 1.06, rotation: 19, opacity: [.06, .19, .89] },
  rest,
];
const formTargets = '[data-a243-form],.a245-help,button,a,input,textarea,select,[contenteditable]';

export default function WheelWash247({ blocked }) {
  const layer = useRef(null), driver = useRef(null);
  useLayoutEffect(() => {
    const node = layer.current;
    const dyes = Array.from(node.children);
    const state = { phase: 0 };
    let target = 0;
    const context = gsap.context(() => {
      const { opacity, ...start } = rest;
      gsap.set(node, start);
      dyes.forEach((dye, i) => gsap.set(dye, { opacity: opacity[i] }));

      // A paused palette track, sampled by one finite tween. Never a second render loop.
      const palette = gsap.timeline({ paused: true, defaults: { duration: 1, ease: 'sine.inOut' } });
      colorStops.forEach(({ opacity: weights, ...spread }, index) => {
        palette.to(node, spread, index);
        dyes.forEach((dye, i) => palette.to(dye, { opacity: weights[i] }, index));
      });
      const follow = gsap.quickTo(state, 'phase', {
        duration: .62, ease: 'power3.out',
        onUpdate: () => palette.time(advanceWheelWash247(state.phase, 0), true),
      });
      driver.current = {
        move(delta) { target = wheelWashDestination247(state.phase, target, delta); follow(target); },
        park() { follow.tween.pause(); target = state.phase; },
      };
    }, node);
    return () => { driver.current = null; context.revert(); };
  }, []);

  useLayoutEffect(() => {
    if (blocked) { driver.current?.park(); return; }
    const page = layer.current?.closest('main[data-access246]');
    if (!page) return;
    const onWheel = event => {
      if (event.defaultPrevented || event.target?.closest?.(formTargets)) return;
      const delta = wheelWashDelta247(event, window.innerHeight);
      if (delta) driver.current?.move(delta);
    };
    page.addEventListener('wheel', onWheel, { passive: true });
    return () => page.removeEventListener('wheel', onWheel);
  }, [blocked]);

  return <div ref={layer} className="a247-wheel-wash" aria-hidden="true">
    <span className="a247-dye a247-dye--ice"/>
    <span className="a247-dye a247-dye--iris"/>
    <span className="a247-dye a247-dye--cobalt"/>
  </div>;
}
