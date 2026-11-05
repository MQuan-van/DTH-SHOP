import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import './studio-color-wash25.css';

export default function StudioColorWash25({ pageRoot, enabled }) {
  const wash = useRef(null);
  const pool = useRef(null);
  const ink = useRef(null);

  useEffect(() => {
    const page = pageRoot.current;
    const field = wash.current;
    const light = pool.current;
    const color = ink.current;
    if (!enabled || !page || !field || !light || !color) return;

    const media = gsap.matchMedia(field);
    media.add('(min-width: 641px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
      gsap.set(light, { xPercent: -50, yPercent: -50 });
      const xTo = gsap.quickTo(light, 'x', { duration: .42, ease: 'power3.out' });
      const yTo = gsap.quickTo(light, 'y', { duration: .42, ease: 'power3.out' });
      const bloom = gsap.timeline({ paused: true })
        .fromTo(color, { scale: .82, opacity: 0 }, { scale: 1, opacity: 1, duration: .58, ease: 'power2.out' });
      let bounds = field.getBoundingClientRect();
      let tracking = false;
      let fresh = true;

      const measure = () => { bounds = field.getBoundingClientRect(); };
      const follow = event => {
        if (event.pointerType !== 'mouse' || event.buttons || document.hidden || !bounds.width || !bounds.height) return;
        const x = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
        const y = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
        if (fresh) {
          xTo(x, x);
          yTo(y, y);
          fresh = false;
        } else {
          xTo(x);
          yTo(y);
        }
        if (!tracking) {
          tracking = true;
          bloom.play();
        }
      };
      const leave = () => {
        if (!tracking) return;
        tracking = false;
        bloom.reverse();
      };
      const visibility = () => {
        if (!document.hidden) return;
        tracking = false;
        fresh = true;
        bloom.pause(0);
        xTo.tween.pause(); yTo.tween.pause();
      };

      const observer = new ResizeObserver(measure);
      observer.observe(field);
      page.addEventListener('pointerenter', measure, { passive: true });
      page.addEventListener('pointermove', follow, { passive: true });
      page.addEventListener('pointerleave', leave, { passive: true });
      page.addEventListener('pointercancel', leave, { passive: true });
      window.addEventListener('scroll', measure, { passive: true, capture: true });
      window.addEventListener('resize', measure, { passive: true });
      document.addEventListener('visibilitychange', visibility);
      return () => {
        observer.disconnect();
        page.removeEventListener('pointerenter', measure);
        page.removeEventListener('pointermove', follow);
        page.removeEventListener('pointerleave', leave);
        page.removeEventListener('pointercancel', leave);
        window.removeEventListener('scroll', measure, true);
        window.removeEventListener('resize', measure);
        document.removeEventListener('visibilitychange', visibility);
      };
    });
    return () => media.revert();
  }, [pageRoot, enabled]);

  return <div className="dsp25-color-wash" ref={wash} aria-hidden="true">
    <div className="dsp25-color-wash-pool" ref={pool}><div className="dsp25-color-wash-ink" ref={ink}/></div>
  </div>;
}
