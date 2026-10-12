import {useEffect,useRef,useState} from 'react';
import ProIcon from './ProIcon';
import s from './adminPro.module.css';

export default function Mechanism({motion,compact,reduced,connected,hidden=false}) {
  const root=useRef(null),canvas=useRef(null),api=useRef(null);
  const [visible,setVisible]=useState(false),[covered,setCovered]=useState(true),[tab,setTab]=useState(true),[typing,setTyping]=useState(false);
  const [requested,setRequested]=useState(false),[ready,setReady]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    const el=root.current,shell=document.querySelector('[data-dth-app-shell]');
    const cover=()=>setCovered(!!shell&&shell.dataset.dthIntroState!=='complete');cover();
    const observer=shell?new MutationObserver(cover):null;observer?.observe(shell,{attributes:true,attributeFilter:['data-dth-intro-state']});
    const view=new IntersectionObserver(([e])=>setVisible(e.isIntersecting));view.observe(el);
    const update=()=>{setTab(!document.hidden);setTyping(!!document.activeElement?.matches('input,textarea,[contenteditable="true"]')||!!document.querySelector('dialog[open]'));};update();
    document.addEventListener('visibilitychange',update);document.addEventListener('focusin',update);document.addEventListener('focusout',update);
    return()=>{observer?.disconnect();view.disconnect();document.removeEventListener('visibilitychange',update);document.removeEventListener('focusin',update);document.removeEventListener('focusout',update);};
  },[]);
  useEffect(()=>{
    const saveData=!!navigator.connection?.saveData;
    if(covered||!visible||hidden||compact||reduced||saveData)return;
    const timer=setTimeout(()=>setRequested(true),320);return()=>clearTimeout(timer);
  },[covered,visible,hidden,compact,reduced]);
  useEffect(()=>{
    if(!requested||covered||failed)return;
    let current=true,instance=null,resize=null;
    import('./mechanism.webgl.mjs').then(({createMechanism})=>{
      if(!current)return;
      instance=createMechanism(canvas.current,{onReady:()=>{if(current)setReady(true);},onFailure:()=>{if(current){setFailed(true);setReady(false);}}});
      api.current=instance;instance.setConnected(connected);resize=new ResizeObserver(()=>instance.resize());resize.observe(root.current);
    }).catch(()=>{if(current){setFailed(true);setReady(false);}});
    return()=>{current=false;resize?.disconnect();instance?.dispose();if(api.current===instance)api.current=null;};
  },[requested,covered,failed,attempt]);
  useEffect(()=>{api.current?.setRunning(ready&&motion&&visible&&tab&&!covered&&!typing&&!hidden);},[ready,motion,visible,tab,covered,typing,hidden]);
  useEffect(()=>api.current?.setConnected(connected),[connected,ready]);
  return <div className={s.mechanism} ref={root} data-pro-scene={failed?'fallback':ready?'ready':'poster'}
    onPointerMove={e=>{if(e.pointerType==='touch'||!motion)return;const r=e.currentTarget.getBoundingClientRect();api.current?.setPointer((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);}}
    onPointerLeave={()=>api.current?.setPointer(0,0)}>
    <div className={s.orbShadow} aria-hidden="true"/>
    <div className={s.orbFallback} aria-hidden="true" data-hidden={ready&&!failed}><i/><i/><b>DTH</b></div>
    <canvas key={attempt} ref={canvas} className={s.webgl} data-ready={ready&&!failed} aria-hidden="true"/>
    <span className={s.orbCaption}>{ready?'MECHANICAL STUDY · LIVE 3D':'MECHANICAL STUDY'}</span>
    {(!requested||failed)&&<button type="button" className={s.orbButton} disabled={covered} onClick={()=>{setFailed(false);setReady(false);setRequested(true);setAttempt(x=>x+1);}}><ProIcon name="cube" size={14}/>{failed?'Retry 3D':'View in 3D'}</button>}
    {ready&&!failed&&<button type="button" className={s.orbReset} onClick={()=>api.current?.reset()} aria-label="Reset mechanical view"><ProIcon name="refresh" size={14}/></button>}
  </div>;
}
