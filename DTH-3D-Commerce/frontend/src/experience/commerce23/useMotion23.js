import {useEffect,useLayoutEffect,useState} from 'react';
import gsap from 'gsap';
export function useReduced23(){
 const [reduced,set]=useState(()=>typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)').matches:true);
 useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>set(m.matches);m.addEventListener('change',update);return()=>m.removeEventListener('change',update);},[]);return reduced;
}
/** One finite entrance; no wheel capture, no per-pointer React updates. */
export function useSurfaceMotion23(ref,key=''){
 const reduced=useReduced23();
 useLayoutEffect(()=>{const el=ref.current;if(!el||reduced)return;
  const context=gsap.context(()=>{gsap.fromTo('[data-c23-enter]',{opacity:.15,y:14},{opacity:1,y:0,duration:.55,stagger:.05,ease:'power3.out',clearProps:'opacity,transform'});},el);
  return()=>context.revert();
 },[ref,key,reduced]);
 useEffect(()=>{const root=ref.current;if(!root||reduced)return;
  const move=e=>{if(e.pointerType!=='mouse')return;const el=e.target.closest('[data-c23-light]');if(!el||!root.contains(el))return;const r=el.getBoundingClientRect();el.style.setProperty('--px',`${e.clientX-r.left}px`);el.style.setProperty('--py',`${e.clientY-r.top}px`);};
  root.addEventListener('pointermove',move,{passive:true});return()=>root.removeEventListener('pointermove',move);
 },[ref,reduced]);return reduced;
}
