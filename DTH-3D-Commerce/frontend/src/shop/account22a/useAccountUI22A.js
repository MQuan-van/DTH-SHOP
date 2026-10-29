import { useEffect, useLayoutEffect, useState } from 'react';
import gsap from 'gsap';
export function useReduced22A(){
  const [reduced,set]=useState(()=>typeof matchMedia!=='function'||matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{const mq=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>set(mq.matches);update();mq.addEventListener('change',update);return()=>mq.removeEventListener('change',update);},[]);return reduced;
}
export function useAccountUI22A(root,key,reduced){
  useLayoutEffect(()=>{
    const host=root.current;if(!host)return;
    const ctx=gsap.context(()=>{if(reduced)return;const nodes=host.querySelectorAll('[data-aa-enter]');gsap.fromTo(nodes,{y:14,opacity:.25},{y:0,opacity:1,duration:.48,stagger:.045,ease:'power3.out',clearProps:'transform,opacity'});},host);
    return()=>ctx.revert();
  },[root,key,reduced]);
  useEffect(()=>{
    const host=root.current;if(!host||reduced)return;
    let frame=0,item=null,event=null;const touched=new Set();
    const paint=()=>{frame=0;if(!item?.isConnected||!event)return;const r=item.getBoundingClientRect();if(!r.width||!r.height)return;item.style.setProperty('--aa-x',`${Math.max(0,Math.min(100,(event.x-r.left)/r.width*100))}%`);item.style.setProperty('--aa-y',`${Math.max(0,Math.min(100,(event.y-r.top)/r.height*100))}%`);touched.add(item);};
    const move=e=>{if(e.pointerType!=='mouse')return;const next=e.target.closest?.('[data-aa-light]');if(!next||next.disabled||!host.contains(next))return;item=next;event={x:e.clientX,y:e.clientY};if(!frame)frame=requestAnimationFrame(paint);};
    host.addEventListener('pointermove',move,{passive:true});return()=>{cancelAnimationFrame(frame);host.removeEventListener('pointermove',move);for(const node of touched){node.style.removeProperty('--aa-x');node.style.removeProperty('--aa-y');}};
  },[root,reduced]);
}
