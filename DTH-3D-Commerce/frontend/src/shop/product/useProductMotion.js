import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** One page scope: never rewrites Motion preferences on Home/Story. */
export function useProductActivity(ref) {
  const [state, setState] = useState({ active: false, blocked: true });
  useEffect(() => {
    let disposed = false, frame = 0;
    const update = () => {
      if(disposed)return;
      const node=ref.current, rect=node?.getBoundingClientRect();
      const visible=!!rect && rect.width>0 && rect.height>0 && rect.bottom>0 && rect.top<window.innerHeight && rect.right>0 && rect.left<window.innerWidth;
      const blocked=!!(node?.closest('[inert]') || document.querySelector('dialog[open], .dth-support-panel'));
      const active=visible && !document.hidden && !blocked;
      setState(previous => previous.active===active && previous.blocked===blocked ? previous : {active,blocked});
    };
    const schedule=()=>{if(disposed||frame)return;frame=requestAnimationFrame(()=>{frame=0;update();});};
    const io=typeof IntersectionObserver==='function'?new IntersectionObserver(schedule,{threshold:[0,.01]}):null;
    if(ref.current)io?.observe(ref.current);
    const mo=new MutationObserver(schedule);
    mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','inert']});
    // Reconcile actual geometry after scrolling/resizing, rather than retaining a stale
    // isIntersecting value across section height changes or an inspector opening.
    window.addEventListener('scroll',schedule,{passive:true,capture:true});
    window.addEventListener('resize',schedule,{passive:true});
    document.addEventListener('visibilitychange',update);update();
    return()=>{disposed=true;cancelAnimationFrame(frame);io?.disconnect();mo.disconnect();
      window.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule);
      document.removeEventListener('visibilitychange',update);};
  }, [ref]);
  return state;
}
export function useProductEntrance(ref, enabled, key) {
  const played = useRef(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!enabled || !node || typeof node.animate !== 'function' || played.current === key) return;
    let animations = [];
    const frame = requestAnimationFrame(() => {
      played.current = key;
      animations = [...node.querySelectorAll('[data-product-enter]')].map((element, index) => element.animate([
        { opacity: 0, transform: 'perspective(1100px) translate3d(0,16px,0) rotateX(2deg)' },
        { opacity: 1, transform: 'none' },
      ], { duration: 480, delay: Math.min(index, 4) * 45, easing: 'cubic-bezier(.2,.75,.2,1)', fill: 'backwards' }));
      animations.forEach(animation => animation.finished.then(() => animation.cancel()).catch(() => {}));
    });
    return () => { cancelAnimationFrame(frame); animations.forEach(a => a.cancel()); };
  }, [ref, enabled, key]);
}
export function animateBagFeedback(button, enabled) {
  if (!enabled || typeof button?.animate !== 'function') return () => {};
  const nodes = [button, document.querySelector('.dth-bag-button')].filter(Boolean);
  const animations = nodes.map((node, index) => node.animate(index ? [
    { transform: 'scale(1)' }, { transform: 'scale(1.13)', offset: .4 }, { transform: 'scale(1)' },
  ] : [
    { transform: 'perspective(700px) translateZ(0)' },
    { transform: 'perspective(700px) translateZ(-14px)', offset: .3 },
    { transform: 'perspective(700px) translateZ(0)' },
  ], { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' }));
  animations.forEach(animation => animation.finished.then(() => animation.cancel()).catch(() => {}));
  return () => animations.forEach(a => a.cancel());
}
