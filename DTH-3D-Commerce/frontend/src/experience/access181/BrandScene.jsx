import { useEffect, useRef, useState } from 'react';
import { scenePolicy } from './access.logic.mjs';
/** Renderer imports only after the startup gate and user/device policy permit it. */
export default function BrandScene({ policy, phase, focusing }) {
  const host=useRef(null),canvas=useRef(null),engine=useRef(null);
  const [visible,setVisible]=useState(false),[optedIn,setOptedIn]=useState(false),[failed,setFailed]=useState(''),[ready,setReady]=useState(false),[attempt,setAttempt]=useState(0);
  const mountPolicy=scenePolicy({...policy,visible,optedIn,focusing,failed:!!failed});
  // Once requested, don't destroy the scene merely because a field gained focus or the tab hid.
  const [requested,setRequested]=useState(false);
  useEffect(()=>{if(mountPolicy.mount)setRequested(true);},[mountPolicy.mount]);
  useEffect(()=>{
    if(typeof IntersectionObserver!=='function'){setVisible(true);return;}
    const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:'0px'});if(host.current)observer.observe(host.current);return()=>observer.disconnect();
  },[]);
  const allowed=policy.allowed&&requested&&!failed;
  useEffect(()=>{
    if(!allowed||!canvas.current)return;
    let alive=true,observer,api;
    setReady(false);
    import('./brandScene.webgl.mjs').then(({createBrandScene})=>{
      if(!alive)return;
      api=createBrandScene(canvas.current,{pointer:policy.pointer,onReady:()=>{if(alive)setReady(true);},onFailure:message=>{if(alive)setFailed(message);}});
      engine.current=api;api.setPhase(phase);
      if(typeof ResizeObserver==='function'){observer=new ResizeObserver(()=>api.resize());observer.observe(canvas.current);}
      else window.addEventListener('resize',api.resize);
    }).catch(()=>{if(alive)setFailed('3D is unavailable on this device. You can still sign in.');});
    return()=>{alive=false;observer?.disconnect();if(api){window.removeEventListener('resize',api.resize);api.dispose();}if(engine.current===api)engine.current=null;};
  },[allowed,attempt]);
  const running=allowed&&ready&&visible&&!policy.hidden&&!policy.reduced&&!policy.paused&&!focusing;
  useEffect(()=>{engine.current?.setRunning(running);},[running,ready]);
  useEffect(()=>{engine.current?.setPhase(phase);},[phase,ready]);
  useEffect(()=>{
    if(!allowed||ready||policy.hidden)return;
    const timer=setTimeout(()=>setFailed('3D took too long to start. You can still sign in.'),12000);
    return()=>clearTimeout(timer);
  },[allowed,ready,policy.hidden,attempt]);
  function retry(){setFailed('');setRequested(false);setReady(false);setOptedIn(true);setAttempt(n=>n+1);}
  return <section ref={host} className="dth-access181-art" aria-label="DTH brand sculpture" data-ready={ready&&!failed}>
    <div className="dth-access181-poster" aria-hidden="true"><img src="/branding/access181/dth-mark.svg" alt="" width="960" height="144" draggable="false"/><i/><i/></div>
    {allowed&&<canvas key={attempt} ref={canvas} className="dth-access181-canvas" aria-hidden="true" data-access181-canvas/>}
    <div className="dth-access181-arttools">
      <span role="status">{failed?'Still view':!requested?'Brand study':!ready?'Preparing 3D':focusing?'Focus mode':policy.reduced||policy.paused?'Still view':'Interactive 3D'}</span>
      {failed?<button type="button" onClick={retry}>Retry 3D ↻</button>:!requested?<button type="button" disabled={!policy.allowed} onClick={()=>setOptedIn(true)}>View in 3D ↗</button>:ready?<button type="button" onClick={()=>engine.current?.reset()}>Reset view ↻</button>:null}
    </div>
    {failed&&<p className="dth-access181-sr" role="status">{failed}</p>}
  </section>;
}
