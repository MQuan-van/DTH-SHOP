import { useEffect, useRef, useState } from 'react';
import { useStartupAllowed } from '../../experience/loader/StartupRenderContext.jsx';
import OneIcon from '../design22a/OneIcon22A';
import { modelKey22A } from './account22a.logic.mjs';
/** The same mounted renderer survives Overview / Garage / Orders. No remount key tied to view. */
export default function AccountVehicleStage22A({ spec, view, active, blocked, reduced }) {
  const allowed=useStartupAllowed(),host=useRef(null),api=useRef(null),latest=useRef(null),selected=useRef('');
  const [attempt,retry]=useState(0),[armed,setArmed]=useState(false),[status,setStatus]=useState({phase:'idle'}),[inspect,setInspect]=useState(false),[inView,setInView]=useState(true);
  const key=modelKey22A(spec),hasSpec=!!spec;
  latest.current={spec,key,view,active,blocked,reduced,inspect,inView};
  useEffect(()=>{if(active&&allowed&&hasSpec)setArmed(true);},[active,allowed,hasSpec]);
  useEffect(()=>{const node=host.current;if(!node)return;const io=new IntersectionObserver(entries=>setInView(entries[0]?.isIntersecting===true),{threshold:.01});io.observe(node);return()=>io.disconnect();},[]);
  useEffect(()=>{
    if(!armed||!allowed||!hasSpec||!host.current)return;
    let live=true,stage=null;const node=host.current;selected.current='';
    setStatus({phase:'loading',id:latest.current.spec.id});
    import('./createAccountStage22A.mjs').then(({createAccountStage22A})=>{
      if(!live)return;
      stage=createAccountStage22A(node,{compact:matchMedia('(max-width: 700px)').matches||!!navigator.connection?.saveData,onStatus:value=>{if(live)setStatus(value);}});
      api.current=stage; const current=latest.current;
      stage.setOptions({motion:!current.reduced,autoRotate:!current.inspect,interactive:current.inspect&&!current.blocked});
      stage.setComposition(current.view==='vehicle'?'vehicle':'overview');stage.setVisible(current.active&&current.inView&&!current.blocked);
      selected.current=current.key; void stage.select(current.spec,1);
    }).catch(error=>{if(live)setStatus({phase:'error',fatal:true,id:latest.current.spec?.id,message:error.message||'The 3D renderer could not start.'});});
    return()=>{live=false;stage?.dispose();if(api.current===stage)api.current=null;selected.current='';};
  },[armed,allowed,hasSpec,attempt]);
  useEffect(()=>{if(api.current&&spec&&selected.current!==key){selected.current=key;setInspect(false);void api.current.select(spec,1);}},[key,spec]);
  useEffect(()=>{const stage=api.current;stage?.setVisible(active&&inView&&!blocked);stage?.setOptions({motion:!reduced,autoRotate:!inspect,interactive:inspect&&!blocked&&active});if(active)stage?.setComposition(view==='vehicle'?'vehicle':'overview');},[view,active,inView,blocked,reduced,inspect,status.phase==='idle']);
  useEffect(()=>{if(!active)setInspect(false);},[active]);
  useEffect(()=>{if(!inspect)return;const escape=e=>{if(e.key==='Escape'&&!blocked){setInspect(false);api.current?.command('reset');host.current?.closest('[data-account-vehicle]')?.querySelector('[data-inspect-toggle]')?.focus({preventScroll:true});}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[inspect,blocked]);
  const ready=status.phase==='ready'&&status.id===spec?.id;
  const failed=status.phase==='error';
  function reset(){setInspect(false);api.current?.command('reset');}
  return <div className="aa22-vehicle" data-account-vehicle data-inspecting={inspect} data-model-key={key} data-state={ready?'ready':!spec?.file?'missing':status.phase}>
    <div className="aa22-vehicle-host" ref={host} role="img" aria-label={spec?`${spec.label}: interactive vehicle preview`:'No vehicle selected'} />
    {!ready&&<div className="aa22-stage-message" role="status">
      {!spec?<><span className="aa22-empty-mark" aria-hidden="true">///</span><strong>No NVX available</strong><p>The catalog has not supplied a vehicle yet.</p></>:
      !spec.file?<><span className="aa22-empty-mark" aria-hidden="true">{spec.label}</span><strong>3D model not supplied</strong><p>You can still save this version and browse its parts.</p></>:
      failed?<><strong>Vehicle preview unavailable</strong><p>{status.message}</p><button type="button" className="aa22-action aa22-secondary" data-aa-light onClick={()=>retry(n=>n+1)}>Retry 3D</button></>:
      <><span className="aa22-loader" aria-hidden="true"/><strong>{allowed?`Preparing ${spec.label}`:'Preparing the studio'}</strong><p>The account remains usable while 3D loads.</p></>}
    </div>}
    <div className="aa22-view-controls" role="group" aria-label="Vehicle inspection">
      <button type="button" data-inspect-toggle className="aa22-control aa22-inspect" disabled={!ready||blocked} aria-pressed={inspect} data-aa-light onClick={()=>setInspect(v=>!v)}><OneIcon name="orbit"/>{inspect?'Finish inspection':'Explore 3D'}</button>
      {inspect&&<><button type="button" className="aa22-control" disabled={!ready||blocked} onClick={()=>api.current?.command('left')} aria-label="Rotate vehicle left">↶</button><button type="button" className="aa22-control" disabled={!ready||blocked} onClick={()=>api.current?.command('right')} aria-label="Rotate vehicle right">↷</button><button type="button" className="aa22-control" disabled={!ready||blocked} onClick={()=>api.current?.command('in')} aria-label="Zoom vehicle in">+</button><button type="button" className="aa22-control" disabled={!ready||blocked} onClick={()=>api.current?.command('out')} aria-label="Zoom vehicle out">−</button></>}
      <button type="button" className="aa22-control" disabled={!ready||blocked} data-aa-light onClick={reset} aria-label="Reset vehicle view"><OneIcon name="reset"/><span>Reset</span></button>
    </div>
    {inspect&&<p className="aa22-inspection-help">Drag to rotate. Use the buttons to zoom. Esc returns to the full view.</p>}
  </div>;
}
