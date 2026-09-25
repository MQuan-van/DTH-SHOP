import { useEffect } from 'react';
export function useSceneInputGate(director) {
  useEffect(()=>{
    const update=()=>director.set({blocked:!!document.querySelector('dialog[open], .dth-support-panel')});
    update();
    const observer=new MutationObserver(update);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
    return()=>{observer.disconnect();director.set({blocked:false});};
  },[director]);
}
