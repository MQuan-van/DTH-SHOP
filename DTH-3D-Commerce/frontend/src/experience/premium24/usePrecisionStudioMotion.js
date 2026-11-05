import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** DOM choreography only. The existing R3F stage retains its renderer and camera ownership. */
export function usePrecisionStudioMotion(root, enabled) {
  useLayoutEffect(() => {
    const host = root.current;
    if (!host || !enabled || !host.querySelector('.s222-info')) return;
    const context = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: 'power3.out', duration: .55 } });
      intro.addLabel('identify', 0)
        .fromTo('.s222-edition', { opacity: 0 }, { opacity: 1, clearProps: 'opacity' }, 'identify')
        .fromTo('.s222-info h1', { opacity: 0, y: 18, rotationX: 8, transformPerspective: 700, transformOrigin: 'left bottom' },
          { opacity: 1, y: 0, rotationX: 0, clearProps: 'opacity,transform,transformOrigin' }, 'identify+=.06')
        .addLabel('choose', .18)
        .fromTo('.s222-info > :not(h1)', { opacity: 0 }, { opacity: 1, stagger: .035, clearProps: 'opacity' }, 'choose')
        .fromTo('.s222-console, .s222-selection', { opacity: 0, y: 6 },
          { opacity: 1, y: 0, stagger: .05, duration: .4, clearProps: 'opacity,transform' }, 'choose+=.08');

      for (const section of host.querySelectorAll('.s222-edit-head, .s222-edit-card')) {
        gsap.fromTo(section, { opacity: .3, y: 18 }, {
          opacity: 1, y: 0, duration: .55, clearProps: 'opacity,transform',
          scrollTrigger: { trigger: section, start: 'top 96%', once: true },
        });
      }
    }, host);
    return () => context.revert();
  }, [root, enabled]);
}
