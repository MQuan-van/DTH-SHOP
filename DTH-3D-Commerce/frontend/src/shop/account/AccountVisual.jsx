import { Component, lazy, Suspense, useCallback, useEffect, useId, useRef, useState } from 'react';
import s from './AccountPage.module.css';
import { useAccountMotion } from './AccountMotion';
import { ACCOUNT_MOTION as motion } from './motion.config.mjs';
const Scene = lazy(() => import('./AccountScene'));
class VisualBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onFailure();}
  render(){return this.state.failed?null:this.props.children;}
}
/** Abstract DTH bearing; NOT the selected vehicle or a product specification. */
export default function AccountVisual({ phase: suppliedPhase, compact=false }) {
  const root=useRef(null), pointer=useRef({x:0,y:0}), gradient=useId();
  const signal=useAccountMotion();
  const [visible,setVisible]=useState(false),[paused,setPaused]=useState(false),[failed,setFailed]=useState(false);
  const [ready,setReady]=useState(false),[inTab,setInTab]=useState(true),[expanded,setExpanded]=useState(false);
  const [capable,setCapable]=useState(false);
  const onReady=useCallback(()=>setReady(true),[]),onFailure=useCallback(()=>setFailed(true),[]);
  useEffect(()=>{
    const tab=()=>setInTab(!document.hidden);
    const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting));
    observer.observe(root.current);tab();document.addEventListener('visibilitychange',tab);
    return ()=>{observer.disconnect();document.removeEventListener('visibilitychange',tab);};
  },[]);
  // Detect unsupported devices before mounting the renderer. SVG and form stay usable immediately.
  useEffect(()=>{
    if(!visible||capable||failed)return;
    try{
      const gl=document.createElement('canvas').getContext('webgl2');
      if(!gl){onFailure();return;}
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      setCapable(true);
    }catch{onFailure();}
  },[visible,capable,failed,onFailure]);
  useEffect(()=>{
    if(!visible||ready||failed)return;
    const timer=setTimeout(onFailure,motion.sceneTimeoutMs);
    return ()=>clearTimeout(timer);
  },[visible,ready,failed,onFailure]);
  const running=visible&&inTab&&!paused&&!signal.reduced&&!failed;
  const phase=suppliedPhase||signal.phase;
  return <div className={s.visual} ref={root} data-compact={compact} data-account-scene={failed?'fallback':ready?'ready':'loading'} data-motion={running?'on':'off'} data-assembly={expanded?'expanded':'assembled'} data-phase={phase}
    onPointerMove={event=>{if(event.pointerType!=='mouse'||!running)return;const rect=event.currentTarget.getBoundingClientRect();pointer.current={x:(event.clientX-rect.left)/rect.width*2-1,y:1-(event.clientY-rect.top)/rect.height*2};}}
    onPointerLeave={()=>{pointer.current={x:0,y:0};}}>
    <div className={s.visualShadow} aria-hidden="true"/>
    <div className={s.visualFallback} data-hidden={ready&&!failed} aria-hidden="true"><svg viewBox="0 0 400 400"><defs><linearGradient id={gradient}><stop stopColor="#edf7fc"/><stop offset=".5" stopColor="#7197ae"/><stop offset="1" stopColor="#dcebf3"/></linearGradient></defs><g transform="translate(200 190) rotate(-24) scale(1 .85)" fill="none" stroke={`url(#${gradient})`}><circle r="120" strokeWidth="24"/><circle r="67" strokeWidth="20"/>{Array.from({length:12},(_,i)=><circle key={i} cx={94*Math.cos(i*Math.PI/6)} cy={94*Math.sin(i*Math.PI/6)} r="13" fill="#deecf3" strokeWidth="3"/>)}<circle r="137" stroke="#00a4db" strokeWidth="4"/></g></svg></div>
    {visible&&capable&&!failed&&<div className={s.visualCanvas} data-ready={ready} aria-hidden="true"><VisualBoundary onFailure={onFailure}><Suspense fallback={null}><Scene running={running} phase={phase} expanded={expanded} pointer={pointer} onReady={onReady} onFailure={onFailure}/></Suspense></VisualBoundary></div>}
    {ready&&!failed&&<div className={s.visualControls}>
      {!signal.reduced&&<button type="button" className={s.motionButton} aria-label={paused?'Play studio animation':'Pause studio animation'} aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?'Play':'Pause'}</button>}
      {!compact&&<button type="button" className={s.motionButton} aria-label={expanded?'Assemble 3D bearing':'Explode 3D bearing'} aria-pressed={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?'Assemble':'Explode'}</button>}
    </div>}
  </div>;
}
