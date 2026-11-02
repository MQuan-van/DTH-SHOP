import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import StoryPhoto22S from '../story22s/StoryPhoto22S';
import './refinement232.css';

/** BrandScene presentation replacement: real existing photography, never password values. */
export default function AccessBackdrop232({ policy, focusing }) {
  const root = useRef(null);
  useEffect(() => {
    const el = root.current, host = el?.closest('[data-access232]');
    if (!el || !host || !policy.allowed || !policy.motion || focusing || matchMedia('(pointer: coarse)').matches) return;
    const context = gsap.context(() => {}, el);
    let x, y;
    context.add(() => {
      x = gsap.quickTo(el, 'x', { duration: .9, ease: 'power3.out' });
      y = gsap.quickTo(el, 'y', { duration: 1.1, ease: 'power3.out' });
    });
    const move = event => {
      if (event.pointerType !== 'mouse' || document.hidden) return;
      const b = host.getBoundingClientRect();
      x(Math.max(-12, Math.min(12, ((event.clientX - b.left) / b.width - .5) * 24)));
      y(Math.max(-9, Math.min(9, ((event.clientY - b.top) / b.height - .5) * 18)));
    };
    const leave = () => { x(0); y(0); };
    const hidden = () => { if (document.hidden) { x.tween.pause(); y.tween.pause(); } else leave(); };
    host.addEventListener('pointermove', move); host.addEventListener('pointerleave', leave); document.addEventListener('visibilitychange', hidden);
    return () => { host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); document.removeEventListener('visibilitychange', hidden); context.revert(); };
  }, [policy.allowed, policy.motion, focusing]);
  return <div ref={root} className="r232-access-photo" aria-hidden="true"><StoryPhoto22S name="lineup" eager decorative sizes="100vw"/><div className="r232-access-veil"/></div>;
}
