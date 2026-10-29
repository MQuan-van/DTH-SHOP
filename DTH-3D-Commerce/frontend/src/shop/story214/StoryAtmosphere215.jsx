/* DTH21.5.1: patched */
import { useId, useLayoutEffect, useRef } from 'react';
import { atmosphere215, categoryWord215, trail215 } from './verticalMotion215.mjs';

/** Decorative only. Shares the SAME clock as the GLB and copy, never runs its own loop. */
export default function StoryAtmosphere215({ clock, products, motion }) {
  const root = useRef(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const glow = `dth215-glow-${uid}`;
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const path = element.querySelector('[data-215-track]');
    const trail = element.querySelector('[data-215-trail]');
    const core = element.querySelector('[data-215-core]');
    const dot = element.querySelector('[data-215-dot]');
    const first = element.querySelector('[data-215-word="first"]');
    const second = element.querySelector('[data-215-word="second"]');
    const length = path.getTotalLength();
    // DTH21.5.1: small fixed milestones make each product feel like its own chapter.
    const stopsGroup = element.querySelector('[data-215-stops]');
    const stops = products.map((_,i) => {
      const point = path.getPointAtLength(length * (products.length<=1 ? .5 : i/(products.length-1)));
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      node.setAttribute('cx', String(point.x));
      node.setAttribute('cy', String(point.y));
      node.setAttribute('r', '3.7');
      node.setAttribute('class', 'dth215-milestone');
      stopsGroup.append(node);
      return node;
    });
    let lastPrimary = -1;
    const paint = frame => {
      const state = atmosphere215(frame, products, motion);
      const segment = trail215(state.progress, length);
      const point = path.getPointAtLength(segment.end);
      trail.setAttribute('stroke-dasharray', `${segment.span} ${length + 1}`);
      trail.setAttribute('stroke-dashoffset', String(-segment.start));
      core.setAttribute('stroke-dasharray', `${segment.core} ${length + 1}`);
      core.setAttribute('stroke-dashoffset', String(-segment.coreStart));
      dot.setAttribute('transform', `translate(${point.x}, ${point.y})`);
      if (first.textContent !== state.first) first.textContent = state.first;
      if (second.textContent !== state.second) second.textContent = state.second;
      first.style.opacity = String(state.firstOpacity);
      second.style.opacity = String(state.secondOpacity);
      // DTH21.5.1: the ghosted category stays motionless for all products in its category.
      // Only opacity crossfades when the category actually changes.
      if (frame.primary !== lastPrimary) {
        lastPrimary = frame.primary;
        stops.forEach((node,i) => node.classList.toggle('is-active',i === frame.primary));
      }
      element.dataset.progress = state.progress.toFixed(5);
    };
    paint(clock.read());
    const unsubscribe = clock.subscribe(paint);
    return () => { unsubscribe(); stops.forEach(node => node.remove()); };
  }, [clock, products, motion]);
  const d = 'M 44 26 C 44 160, 103 207, 103 334 S 27 511, 27 650 S 69 833, 69 974';
  return <div ref={root} className="dth215-atmosphere" aria-hidden="true">
    <div className="dth215-category-backdrop">
      <span data-215-word="first">{categoryWord215(products[0])}</span>
      <span data-215-word="second" style={{ opacity: 0 }} />
    </div>
    <svg className="dth215-light-path" viewBox="0 0 130 1000" preserveAspectRatio="none" focusable="false">
      <defs><filter id={glow} x="-300%" y="-10%" width="700%" height="120%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation="3.5" />
      </filter></defs>
      <path data-215-track d={d} className="dth215-track" />
      <g data-215-stops aria-hidden="true" />
      <path data-215-trail d={d} className="dth215-trail" filter={`url(#${glow})`} strokeDasharray="0 2000" />
      <path data-215-core d={d} className="dth215-core" strokeDasharray="0 2000" />
      <g data-215-dot transform="translate(44,26)">
        <ellipse rx="12" ry="7" className="dth215-halo" />
        <ellipse rx="4.3" ry="2.7" className="dth215-light" />
      </g>
    </svg>
  </div>;
}
