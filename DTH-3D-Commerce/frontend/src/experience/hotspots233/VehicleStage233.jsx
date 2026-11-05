import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import gsap from 'gsap';
import {useStartupAllowed} from '../loader/StartupRenderContext.jsx';
import {publicAsset} from '../../shop/discovery174/nvx3d/nvx3d.config.mjs';
import {assetKey23,focusProfilePath23,profileDownloadName23} from '../commerce23/spatial23.logic.mjs';
import Icon23 from '../commerce23/Icon23.jsx';
import {SLOTS233,slot233,resolveSlot233,emptyProfile233,validateProfile233} from './hotspots233.logic.mjs';
import './hotspots233.css';

function download233(value,name){
 const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}

/** Same interface as VehicleStage23; Build's selection, shortlist and 23.2 popup remain untouched. */
export default function VehicleStage233({spec,system='',onSystem,apiRef,author=false,reduced=false,compact=false,blocked=false}){
 const root=useRef(null),host=useRef(null),stage=useRef(null),latest=useRef({}),live=useRef(false),fetchRef=useRef(null),metaRef=useRef(null),profileRef=useRef(null);
 const labels=useRef(new Map()),lines=useRef(new Map()),dots=useRef(new Map()),selector=useRef(null),editor=useRef(null),activeRef=useRef(''),key=assetKey23(spec);
 const [status,setStatus]=useState({phase:'idle'}),[attempt,setAttempt]=useState(0),[metadata,setMetadata]=useState(null),[profile,setProfile]=useState(null);
 const [view,setView]=useState({mode:'auto',slot:'',message:''}),[orbit,setOrbit]=useState(false),[armed,setArmed]=useState('');
 const [editorSlot,setEditorSlot]=useState('suspension-rear'),[pending,setPending]=useState(null),[pickRadius,setPickRadius]=useState(.18),[message,setMessage]=useState(''),[dirty,setDirty]=useState(false),[reload,setReload]=useState(0);
 const allowed=useStartupAllowed();
 latest.current={spec,system,onSystem,author,reduced,compact,blocked,orbit,armed};
 const ready=status.phase==='ready'&&status.key===key;
 const apply=useCallback((value,meta)=>{
   const parsed=validateProfile233(value,meta.spec,meta.sha256,{bounds:meta.bounds});
   stage.current?.setProfile(parsed);profileRef.current=parsed;setProfile(parsed);return parsed;
 },[]);
 const choose=useCallback((id,keyboard=false)=>{
   if(latest.current.blocked)return;
   const point=profileRef.current?.anchors[id],slot=slot233(id);if(!point||!slot||slot.legacy)return;
   activeRef.current=id;setArmed('');setOrbit(false);setPending(null);
   stage.current?.setOptions({interactive:false,authoring:''});stage.current?.focus(id);
   latest.current.onSystem?.(slot.category);
   if(!keyboard)selector.current?.focus({preventScroll:true});
 },[]);
 const project=useCallback(points=>{
   const shown=new Map(points.map(p=>[p.id,p]));
   for(const s of SLOTS233){const el=labels.current.get(s.id),path=lines.current.get(s.id),dot=dots.current.get(s.id),p=shown.get(s.id);if(!el||!path||!dot)continue;
    el.hidden=!p;path.style.display=p?'':'none';dot.style.display=p?'':'none';if(!p)continue;
    el.style.width=`${p.labelWidth}px`;el.style.transform=`translate3d(${p.labelX}px,${p.labelY}px,0) translateY(-50%)`;
    el.dataset.side=p.side;path.setAttribute('d',p.path);dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y);
   }
 },[]);
 useEffect(()=>{
   if(!allowed||!host.current)return;let alive=true,engine=null,started=false,inView=false;live.current=true;
   async function begin(){
     if(started||!alive)return;started=true;setStatus({phase:'loading'});
     try {
       const {createHotspotStage233}=await import('./createHotspotStage233.mjs');if(!alive)return;
       engine=createHotspotStage233(host.current,{compact:latest.current.compact,
         onStatus:s=>{if(alive)setStatus(s);},onView:v=>{if(alive){setView(v);if(v.mode==='orbit'&&v.message)setOrbit(true);}},onProjection:project,
         onSelect:id=>choose(id),
         onMetadata:meta=>{if(!alive)return;metaRef.current=meta;profileRef.current=null;setMetadata(meta);setProfile(null);setMessage('');},
         onPicked:hit=>{if(!alive||!latest.current.author)return;if(!hit){setMessage('No surface was hit. Choose a visible point on the vehicle.');return;}
           setPending(hit);setArmed('');setOrbit(true);engine.setOptions({authoring:'',interactive:true});engine.previewPose(hit.pose);
           if(editor.current)editor.current.open=true;setMessage('Point marked. Adjust the view, then confirm the point and camera.');
         },
       });
       stage.current=engine;engine.setVisible(inView);
       engine.setOptions({motion:!latest.current.reduced,interactive:latest.current.orbit,blocked:latest.current.blocked,authoring:''});
       void engine.select(latest.current.spec);
       if(apiRef)apiRef.current={reset:()=>{activeRef.current='';setOrbit(false);setArmed('');setPending(null);latest.current.onSystem?.('');engine.reset();},command:name=>engine.command(name),focus:id=>engine.focus(id)};
     }catch(e){if(alive)setStatus({phase:'error',message:e.message,fatal:true});}
   }
   const observer=new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting===true;engine?.setVisible(inView);if(inView)void begin();},{rootMargin:'120px 0px'});
   observer.observe(host.current);
   return()=>{alive=false;live.current=false;observer.disconnect();fetchRef.current?.abort();engine?.dispose();if(stage.current===engine)stage.current=null;if(apiRef)apiRef.current=null;};
 },[allowed,attempt,apiRef,project,choose]);
 useEffect(()=>{
   fetchRef.current?.abort();metaRef.current=null;profileRef.current=null;activeRef.current='';
   setMetadata(null);setProfile(null);setPending(null);setMessage('');setDirty(false);setOrbit(false);setArmed('');
   stage.current?.select(spec);
 },[key]);
 useEffect(()=>{
   if(!metadata||assetKey23(metadata.spec)!==key)return;
   const meta=metadata,controller=new AbortController();fetchRef.current?.abort();fetchRef.current=controller;
   async function load(){
    try{
     const response=await fetch(publicAsset(focusProfilePath23(meta.spec)),{signal:controller.signal,credentials:'same-origin',cache:'no-cache'});
     if(response.status===404){if(!controller.signal.aborted)setMessage('Focus points have not been published for this model.');return;}
     if(!response.ok)throw Error(`Focus profile request failed (${response.status}).`);
     const text=await response.text();if(text.length>65536)throw Error('Focus JSON exceeds 64 KB.');
     if(controller.signal.aborted||!live.current||metaRef.current!==meta)return;
     const parsed=apply(JSON.parse(text),meta);setMessage('');setDirty(false);
     const id=resolveSlot233(parsed,latest.current.system,activeRef.current);if(id){activeRef.current=id;stage.current?.focus(id);}
    }catch(e){if(!controller.signal.aborted&&live.current&&metaRef.current===meta)setMessage(e.name==='SyntaxError'?'No valid focus JSON is published for this model.':e.message);}
   }
   void load();return()=>controller.abort();
 },[metadata,key,reload,apply]);
 useEffect(()=>{
   stage.current?.setOptions({motion:!reduced,interactive:orbit||!!armed,blocked,authoring:author?armed:''});
 },[reduced,orbit,armed,blocked,author]);
 useEffect(()=>{
   if(!ready)return;
   if(!system){activeRef.current='';setOrbit(false);setArmed('');stage.current?.reset();return;}
   if(slot233(activeRef.current)?.category===system)return;
   const id=resolveSlot233(profileRef.current,system);activeRef.current=id;
   setOrbit(false);setArmed('');setPending(null);stage.current?.setOptions({interactive:false,authoring:''});stage.current?.focus(id||system);
   const available=SLOTS233.find(s=>s.category===system&&s.id!==s.category);if(available)setEditorSlot(available.id);
 },[system,ready]);
 function reset(){activeRef.current='';setArmed('');setPending(null);setOrbit(false);onSystem?.('');stage.current?.reset();}
 useEffect(()=>{
   const escape=event=>{if(event.key!=='Escape'||event.defaultPrevented||blocked||document.querySelector('dialog[open]')||!orbit&&!armed&&!system)return;reset();};
   window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
 },[orbit,armed,system,blocked,onSystem]);
 useEffect(()=>{
   if(!dirty||!author)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
 },[dirty,author]);
 useLayoutEffect(()=>{
   if(reduced||!ready)return;
   const context=gsap.context(()=>{gsap.from('[data-h233-enter]',{opacity:0,y:6,duration:.24,stagger:.035,ease:'power2.out'});},root);
   return()=>context.revert();
 },[ready,reduced]);
 function toggleOrbit(){const next=!orbit;setArmed('');setOrbit(next);stage.current?.setOptions({interactive:next,authoring:''});if(!next&&!activeRef.current)stage.current?.reset();}
 function mark(){if(!ready||blocked||!author)return;setPending(null);setArmed(editorSlot);setOrbit(true);if(editor.current)editor.current.open=false;setMessage('Drag to see the correct surface, then click once to mark it.');stage.current?.setOptions({interactive:true,authoring:editorSlot});}
 function confirmPoint(){
   if(!pending||!metadata||!author)return;
   try{const next=profileRef.current||emptyProfile233(metadata.spec,metadata.sha256),pose=stage.current.capture();
     if(Math.hypot(...pose.target.map((n,i)=>n-pending.point[i]))>.35)throw Error('Camera is not focused on the marked point. Mark it from an unobstructed angle and retry.');
     apply({...next,anchors:{...next.anchors,[pending.id]:{...pending,pose,pickRadius,viewAspect:host.current.clientWidth/Math.max(1,host.current.clientHeight),confirmed:true}}},metadata);
     setDirty(true);setPending(null);setMessage('Point and camera confirmed locally. Test the view, then export to publish.');
   }catch(e){setMessage(e.message);}
 }
 function captureAngle(){
   if(!profile?.anchors[editorSlot]||!metadata||!author)return;
   try{apply({...profile,anchors:{...profile.anchors,[editorSlot]:{...profile.anchors[editorSlot],pose:stage.current.capture(),viewAspect:host.current.clientWidth/Math.max(1,host.current.clientHeight),pickRadius}}},metadata);setDirty(true);setMessage('Camera updated locally. Export the profile to publish.');}catch(e){setMessage(e.message);}
 }
 function removePoint(){if(!profile?.anchors[editorSlot]||!metadata||!author)return;const anchors={...profile.anchors};delete anchors[editorSlot];apply({...profile,anchors},metadata);setDirty(true);setPending(null);setMessage('Point removed from this local profile.');}
 function exportProfile(){if(!metadata||!profile||!author)return;try{const parsed=validateProfile233(profile,metadata.spec,metadata.sha256,{bounds:metadata.bounds});download233(parsed,profileDownloadName23(metadata.spec.id));setDirty(false);setMessage('JSON exported, not published yet. Use PUBLISH-FOCUS-PC.cmd to validate and install it.');}catch(e){setMessage(e.message);}}
 async function importProfile(event){const input=event.currentTarget,file=input.files?.[0],meta=metadata;input.value='';if(!file||!meta||!author)return;try{if(file.size>65536)throw Error('Focus JSON must be 64 KB or smaller.');const data=JSON.parse(await file.text());if(!live.current||metaRef.current!==meta)return;apply(data,meta);setDirty(true);setPending(null);setMessage('Profile imported and validated against this loaded model. Export to publish.');}catch(e){if(live.current&&metaRef.current===meta)setMessage(e.message);}}
 const ids=Object.keys(profile?.anchors||{}).filter(id=>!slot233(id)?.legacy),selected=view.slot||activeRef.current;
 const legacyCount=Object.keys(profile?.anchors||{}).length-ids.length;
 return <div ref={root} className="c23-vehicle-stage h233" data-hotspots233 data-ready={ready} data-orbit={orbit} data-mode={view.mode} data-blocked={blocked}>
  <div className="c23-vehicle-shadow" aria-hidden="true"/>
  <div ref={host} className="c23-vehicle-host" role="img" aria-label={`${spec?.label||'Vehicle'} 3D preview. Use the view selector to explore authored points.`}/>
  {armed&&<div className="h233-marking" role="status">Click the {slot233(armed)?.label.toLowerCase()} surface<button type="button" onClick={()=>{setArmed('');if(editor.current)editor.current.open=true;}}>Cancel</button></div>}
  <svg className="h233-lines" aria-hidden="true">{SLOTS233.map(s=><g key={s.id} data-active={selected===s.id}><path ref={el=>el?lines.current.set(s.id,el):lines.current.delete(s.id)} style={{display:'none'}}/><circle r="4" ref={el=>el?dots.current.set(s.id,el):dots.current.delete(s.id)} style={{display:'none'}}/></g>)}</svg>
  <div className="h233-labels">{SLOTS233.map(s=><button key={s.id} hidden type="button" disabled={blocked} ref={el=>el?labels.current.set(s.id,el):labels.current.delete(s.id)} aria-pressed={selected===s.id} onClick={()=>choose(s.id)}><span>{s.label}</span><i aria-hidden="true"/></button>)}</div>
  {!ready&&<div className="c23-scene-status" role="status"><span>{!allowed?'Waiting for opening sequence…':status.message||'Preparing vehicle…'}</span>{status.phase==='error'&&<button type="button" className="c23-button c23-secondary" onClick={()=>setAttempt(n=>n+1)}>Retry 3D</button>}{status.phase==='unavailable'&&<small>Parts browsing remains available.</small>}</div>}
  <div className="h233-dock" data-h233-enter>
   {!!ids.length&&<label className="h233-selector"><span className="h233-sr">View a calibrated part</span><select ref={selector} aria-label="View a calibrated part" value={profile?.anchors[selected]?selected:''} disabled={!ready||blocked} onChange={e=>e.target.value?choose(e.target.value,true):reset()}><option value="">Full vehicle</option>{ids.map(id=><option key={id} value={id}>{slot233(id).label}</option>)}</select></label>}
   <button type="button" className="c23-tool" aria-pressed={orbit} disabled={!ready||blocked} onClick={toggleOrbit}><Icon23 name="orbit"/>{orbit?'Exit orbit':'Rotate vehicle'}</button>
   {orbit&&<><button type="button" className="c23-tool" aria-label="Zoom in" disabled={!ready||blocked} onClick={()=>stage.current?.command('in')}><Icon23 name="plus"/></button><button type="button" className="c23-tool" aria-label="Zoom out" disabled={!ready||blocked} onClick={()=>stage.current?.command('out')}><Icon23 name="minus"/></button><button type="button" className="c23-tool" disabled={!ready||blocked} onClick={()=>stage.current?.command('left')}>Left</button><button type="button" className="c23-tool" disabled={!ready||blocked} onClick={()=>stage.current?.command('right')}>Right</button></>}
   <button type="button" className="c23-tool" disabled={!ready||blocked} onClick={reset}><Icon23 name="reset"/>Full vehicle</button>
  </div>
  <p className="h233-feedback" role="status" aria-live="polite">{view.message || (ready&&!ids.length ? 'Choose a category below. Focus points are not yet published for this vehicle.' : '')}</p>
  {author&&ready&&<details className="h233-editor" ref={editor}><summary>Calibrate hotspots <span>{ids.length} authored{dirty?' · not exported':''}</span></summary>
   <div className="h233-editor-body">
    <p>Mark a real surface, frame the detail, then confirm. Geometry and database are not changed.</p>
    {!!legacyCount&&<p role="status">{legacyCount} legacy assembly points are preserved. Mark separate rim and tire surfaces to enable their focus views.</p>}
    <label>Part position<select value={editorSlot} onChange={e=>{setEditorSlot(e.target.value);setPending(null);setArmed('');setPickRadius(profile?.anchors[e.target.value]?.pickRadius||.18);}}>{SLOTS233.map(s=><option key={s.id} value={s.id}>{s.label}{profile?.anchors[s.id]?' · authored':''}</option>)}</select></label>
    <label className="h233-radius">Surface selection radius <output>{pickRadius.toFixed(2)}</output><input type="range" min="0.05" max="0.55" step="0.01" value={pickRadius} onChange={e=>setPickRadius(Number(e.target.value))}/><small>Normalized scene units, not real-world measurements. Keep small enough to avoid neighbouring parts.</small></label>
    <div className="h233-editor-actions"><button type="button" disabled={blocked||view.mode==='transition'} onClick={mark}>{armed?'Click the part':'Mark surface'}</button><button type="button" disabled={!pending||blocked||view.mode==='transition'} onClick={confirmPoint}>Confirm point & view</button><button type="button" disabled={!profile?.anchors[editorSlot]||blocked||view.mode==='transition'} onClick={captureAngle}>Update camera</button><button type="button" disabled={!profile?.anchors[editorSlot]||blocked} onClick={()=>choose(editorSlot)}>Test view</button><button type="button" disabled={!profile?.anchors[editorSlot]||blocked} onClick={removePoint}>Remove point</button></div>
    <div className="h233-editor-actions"><button type="button" disabled={!ids.length||!!pending||blocked} onClick={exportProfile}>Export JSON</button><label className="h233-import">Import JSON<input type="file" accept=".json,application/json" disabled={blocked} onChange={importProfile}/></label><button type="button" disabled={blocked} onClick={()=>{if(dirty&&!window.confirm('Discard unexported edits and reload the published profile?'))return;setReload(n=>n+1);}}>Reload published</button><button type="button" onClick={()=>download233(stage.current.metrics(),'dth-hotspots233-diagnostics.json')}>Diagnostics</button></div>
    <p className="h233-editor-message" role="status">{message||'Profiles bind to this exact model fingerprint.'}</p><code>models/nvx/focus/{spec?.id}.json</code>
   </div>
  </details>}
 </div>;
}
