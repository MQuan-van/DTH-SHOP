import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { STORY214 } from './story214.config.mjs';
import { chapterIndex214 } from './story214.logic.mjs';
gsap.registerPlugin(ScrollTrigger);
/** Native scroll; no wheel interception, global snap, or scroll-lock. */
export function useStoryScroll214({root,runway,stage,bar,clock,count,signature,motion,initialChapter,products}) {
  const seek=useRef(()=>{}),initial=useRef(initialChapter),priorSignature=useRef(signature);
  useLayoutEffect(()=>{
    const el=runway.current,panel=stage.current,header=bar.current,container=root.current;
    if(!el||!panel||!header||!container||!count)return undefined;
    let live=true,refreshFrame=0,trigger,ctx,observer;
    const changed=priorSignature.current!==signature;priorSignature.current=signature;
    const style=container.style,oldTop=style.getPropertyValue('--story214-header'),oldBar=style.getPropertyValue('--story214-bar');
    function measure(){
      const top=document.querySelector('.dth-header');const css=top?getComputedStyle(top):null;
      const offset=top&&['sticky','fixed'].includes(css.position)?Math.ceil(top.getBoundingClientRect().height):0;
      style.setProperty('--story214-header',`${offset}px`);style.setProperty('--story214-bar',`${Math.ceil(header.getBoundingClientRect().height)}px`);
    }
    measure();
    const topOffset=()=>parseFloat(style.getPropertyValue('--story214-header'))+header.getBoundingClientRect().height+10;
    const duration=()=>Math.max(1,el.offsetHeight-panel.offsetHeight);
    const proxy={position:clock.read().position};
    ctx=gsap.context(()=>{
      if(count>1){
        const tween=gsap.fromTo(proxy,{position:0},{position:count-1,ease:'none',onUpdate:()=>clock.set(proxy.position),scrollTrigger:{
          trigger:el,start:()=>`top top+=${topOffset()}`,end:()=>`+=${duration()}`,scrub:motion?STORY214.scrubSeconds:true,
          invalidateOnRefresh:true,
        }});trigger=tween.scrollTrigger;
      } else clock.set(0);
          if(motion)gsap.fromTo(panel,{opacity:.35},{opacity:1,duration:.35,ease:'power2.out',clearProps:'opacity'});
    },container);
    seek.current=(index,{smooth=motion}={})=>{
      const i=Math.max(0,Math.min(count-1,index));
      const start=trigger?.start??(el.getBoundingClientRect().top+window.scrollY-topOffset());
      const end=trigger?.end??start;
      const top=start+(count>1?i/(count-1)*(end-start):0);
      window.scrollTo({top:Math.max(0,top),behavior:smooth?'smooth':'instant'});
      if(!smooth)ScrollTrigger.update();
    };
    const refresh=()=>{cancelAnimationFrame(refreshFrame);refreshFrame=requestAnimationFrame(()=>{if(!live)return;measure();trigger?.refresh();});};
    observer=typeof ResizeObserver==='function'?new ResizeObserver(refresh):null;
    observer?.observe(header);const appHeader=document.querySelector('.dth-header');if(appHeader)observer?.observe(appHeader);
    window.addEventListener('resize',refresh);
    refreshFrame=requestAnimationFrame(()=>{
      if(!live)return;measure();trigger?.refresh();
      if(initial.current){seek.current(chapterIndex214(products,initial.current),{smooth:false});initial.current=null;}
      else if(changed)seek.current(0,{smooth:false});
      ScrollTrigger.update();
    });
    return()=>{live=false;cancelAnimationFrame(refreshFrame);observer?.disconnect();window.removeEventListener('resize',refresh);seek.current=()=>{};
      ctx?.revert();style.setProperty('--story214-header',oldTop);style.setProperty('--story214-bar',oldBar);};
  },[clock,count,signature,motion,root,runway,stage,bar]);
  return seek;
}
