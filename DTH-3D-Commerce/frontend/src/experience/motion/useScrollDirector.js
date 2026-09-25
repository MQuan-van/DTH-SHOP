import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CINEMATIC_CONFIG } from './motion.config.mjs';
import { chapterAt, clamp01 } from './story.mjs';
gsap.registerPlugin(ScrollTrigger);
/** Native page scrolling and CSS sticky. No wheel capture or forced snap. */
export function useScrollDirector(root,director,{cinematic,animated,onChapter,config=CINEMATIC_CONFIG}) {
  const trigger=useRef(null),choose=useRef(null);
  useLayoutEffect(()=>{
    const element=root.current;if(!element)return;let lastChapter=-1;const marker={p:director.state.progress};
    const update=()=>{const p=clamp01(marker.p);director.set({progress:p});element.style.setProperty('--story-progress',p);element.dataset.progress=p.toFixed(4);const chapter=chapterAt(p,config.chapters);if(lastChapter!==chapter){lastChapter=chapter;onChapter(chapter);}};
    let tween;
    const ctx=gsap.context(()=>{
      if(cinematic){tween=gsap.fromTo(marker,{p:0},{p:1,ease:'none',onUpdate:update,scrollTrigger:{id:'dth-cinematic-home',trigger:element,start:()=>`top ${element.style.getPropertyValue('--header-height')||'80px'}`,end:()=>`+=${element.offsetHeight-element.querySelector('[data-stage]').offsetHeight}`,scrub:config.scrubSeconds,invalidateOnRefresh:true}});trigger.current=tween.scrollTrigger;}else update();
      choose.current=p=>{if(trigger.current){const target=trigger.current.start+(trigger.current.end-trigger.current.start)*p;window.scrollTo({top:target,behavior:animated?'smooth':'instant'});}else{gsap.killTweensOf(marker);gsap.to(marker,{p,duration:animated?.6:0,ease:'power2.inOut',onUpdate:update});}};
    },element);
    const header=document.querySelector('.dth-header');
    const measure=()=>{element.style.setProperty('--header-height',`${Math.ceil(header?.getBoundingClientRect().height||80)}px`);element.style.setProperty('--banner-height',`${Math.ceil(document.querySelector('.dth-demo-banner')?.getBoundingClientRect().height||0)}px`);trigger.current?.refresh();};
    const ro=new ResizeObserver(measure);if(header)ro.observe(header);measure();
    return()=>{ro.disconnect();gsap.killTweensOf(marker);ctx.revert();trigger.current=null;choose.current=null;};
  },[root,director,cinematic,animated,onChapter,config]);return choose;
}
