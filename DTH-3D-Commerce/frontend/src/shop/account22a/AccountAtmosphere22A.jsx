import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { pointerField22A } from './account22a.logic.mjs';
/** Two compositor layers follow input; no per-pointer React state and no idle ticker. */
export default function AccountAtmosphere22A({ root, calm = false }) {
  const light = useRef(null), echo = useRef(null);
  useLayoutEffect(()=>{
    const host=root.current, a=light.current, b=echo.current; if(!host||!a||!b)return;
    const policy=matchMedia('(prefers-reduced-motion: reduce)'), fine=matchMedia('(hover: hover) and (pointer: fine)');
    const ctx=gsap.context(()=>{},host);let raf=0, point=null, bounds=null;
    let ax,ay,ar,bx,by,br;
    ctx.add(()=>{ax=gsap.quickTo(a,'x',{duration:.8,ease:'power3.out'});ay=gsap.quickTo(a,'y',{duration:.8,ease:'power3.out'});ar=gsap.quickTo(a,'rotation',{duration:1.2,ease:'power2.out'});
      bx=gsap.quickTo(b,'x',{duration:1.5,ease:'power3.out'});by=gsap.quickTo(b,'y',{duration:1.5,ease:'power3.out'});br=gsap.quickTo(b,'rotation',{duration:1.8,ease:'power2.out'});});
    const allowed=()=>!policy.matches&&fine.matches&&!document.hidden;
    const reset=()=>{[ax,ay,ar,bx,by,br].forEach(f=>f.tween.pause());gsap.set([a,b],{x:0,y:0,rotation:0});};
    const draw=()=>{raf=0;if(!point||!allowed())return;bounds=host.getBoundingClientRect();const p=pointerField22A(point.x-bounds.left,point.y-bounds.top,bounds.width,Math.min(bounds.height,1000));ax(p.x);ay(p.y);ar(p.rotate);bx(-p.x*.55);by(p.y*.42);br(-p.rotate*.6);};
    const move=e=>{if(e.pointerType!=='mouse'||!allowed())return;point={x:e.clientX,y:e.clientY};if(!raf)raf=requestAnimationFrame(draw);};
    const leave=()=>{if(allowed()){ax(0);ay(0);ar(0);bx(0);by(0);br(0);}};
    const change=()=>{cancelAnimationFrame(raf);raf=0;if(!allowed())reset();};
    host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerleave',leave);policy.addEventListener('change',change);fine.addEventListener('change',change);document.addEventListener('visibilitychange',change);
    return()=>{cancelAnimationFrame(raf);host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);policy.removeEventListener('change',change);fine.removeEventListener('change',change);document.removeEventListener('visibilitychange',change);ctx.revert();};
  },[root]);
  return <div className="aa22-atmosphere" aria-hidden="true" data-calm={calm}><div ref={light} className="aa22-light aa22-light-primary"/><div ref={echo} className="aa22-light aa22-light-echo"/><div className="aa22-light-weave"/></div>;
}
