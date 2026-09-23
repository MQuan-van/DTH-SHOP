import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useStore } from '../../shop/useStore';
import { studioRequest, loadAdminProducts } from '../../shop/api';
import { createDirector, sampleStory } from '../motion/story.mjs';
import { hasWebGL, useExperiencePolicy } from '../interaction/useExperiencePolicy';
import { DEFAULT_EXPERIENCE, FRAME_NAMES, makeExperiencePreset, validateExperience } from '../../../../shared/experience.mjs';
import './experience-studio.css';
const Scene=lazy(()=>import('../world/CinematicScene'));

class PreviewBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onFailure();}
  render(){return this.state.failed?null:this.props.children;}
}
function Preview({product,config,director,api,onReady,onStatus,wireframe}) {
  const [capable]=useState(hasWebGL),[status,setStatus]=useState('loading'),[attempt,setAttempt]=useState(0);
  const statusRef=useRef(onStatus);statusRef.current=onStatus;
  const readyRef=useRef(onReady);readyRef.current=onReady;
  const loaded=useCallback(supported=>{setStatus('ready');readyRef.current(supported);},[]);
  const failed=useCallback(()=>{setStatus('fallback');director.set({inspecting:false});},[director]);
  useEffect(()=>{statusRef.current(capable?status:'fallback');},[status,capable]);
  useEffect(()=>{if(status!=='loading')return;const timer=setTimeout(failed,config.loadTimeoutMs);return()=>clearTimeout(timer);},[status,attempt,config.loadTimeoutMs,failed]);
  async function retry(){try{const module=await import('../world/CinematicScene');module.clearCinematicModel(product.modelUrl);setAttempt(n=>n+1);setStatus('loading');}catch{failed();}}
  return <div className="dth-exp-viewport" data-preview-scene={capable?status:'fallback'}>
    <div className="dth-exp-stage-mark" aria-hidden="true">DTH</div>
    {capable&&status!=='fallback'&&<PreviewBoundary key={attempt} onFailure={failed}><Suspense fallback={null}><Scene product={product} director={director} api={api} config={config} onReady={loaded} onFailure={failed} wireframe={wireframe}/></Suspense></PreviewBoundary>}
    {(status!=='ready'||!capable)&&<div className="dth-exp-poster"><img src={product.imageUrl} alt={product.name}/><p role="status">{status==='loading'&&capable?'Preparing 3D…':'3D unavailable. Your draft is still safe.'}</p>{capable&&status==='fallback'&&<button type="button" onClick={retry}>Retry 3D</button>}</div>}
  </div>;
}
function Confirm({action,onClose,onConfirm,busy}) {
  const ref=useRef(null);
  useEffect(()=>{const dialog=ref.current;dialog.showModal();return()=>dialog.close();},[]);
  return <dialog className="dth-exp-dialog" ref={ref} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
    <h2>{action.type==='publish'?'Publish this Home?':`Restore version ${action.version}?`}</h2>
    <p>{action.type==='publish'?'New visits will use your saved draft. Existing shop, orders and chat data are not changed.':'This creates a new publication and replaces the current draft. The selected version stays in history.'}</p>
    <div><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="button" disabled={busy} className="dth-exp-primary" onClick={onConfirm}>{busy?'Saving…':action.type==='publish'?'Confirm publish':'Confirm restore'}</button></div>
  </dialog>;
}
const ranges={storyScreens:[1.5,5,.1],scrubSeconds:[0,1,.05],returnSeconds:[.2,1.2,.05],maxExplode:[0,1,.05],pointerRadians:[0,.08,.005],maxDpr:[1,1.75,.05]};
function Range({label,value,limits,onChange,disabled=false}) {
  return <label className="dth-exp-range"><span>{label}<output>{value}</output></span><input aria-label={label} type="range" min={limits[0]} max={limits[1]} step={limits[2]} value={value} disabled={disabled} onChange={e=>onChange(Number(e.target.value))}/></label>;
}
function VectorField({label,value,onChange}) {
  return <fieldset className="dth-exp-vector"><legend>{label}</legend>{['X','Y','Z'].map((axis,i)=><label key={axis}>{axis}<input aria-label={`${label} ${axis}`} type="number" step="0.05" value={typeof value[i]==='number'?Math.round(value[i]*1000)/1000:value[i]} onChange={e=>onChange(value.map((v,j)=>i===j?(e.target.value===''?'':Number(e.target.value)):v))}/></label>)}</fieldset>;
}
export default function ExperienceStudio() {
  const {user}=useStore(),policy=useExperiencePolicy();
  const director=useMemo(createDirector,[]),api=useRef(null),slider=useRef(null),progressOutput=useRef(null);
  const [document,setDocument]=useState(null),[products,setProducts]=useState([]),[value,setValue]=useState(structuredClone(DEFAULT_EXPERIENCE));
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[tab,setTab]=useState('scene');
  const [frame,setFrame]=useState(0),[chapter,setChapter]=useState(0),[playing,setPlaying]=useState(false),[inspect,setInspect]=useState(false),[wireframe,setWireframe]=useState(false);
  const [previewExplode,setPreviewExplode]=useState(0);
  useEffect(()=>director.subscribe(()=>setPreviewExplode(director.state.manualExplode)),[director]);
  const [sceneStatus,setSceneStatus]=useState('loading'),[rigged,setRigged]=useState(false),[action,setAction]=useState(null),[recovery,setRecovery]=useState(null),[recoveryRevision,setRecoveryRevision]=useState(null);
  useEffect(()=>{if(sceneStatus!=='ready'){setInspect(false);setPlaying(false);}},[sceneStatus]);
  const active=useRef(true),submitting=useRef(false),key=`dth.experience.draft.v1:${user.id}`;
  const dirty=!!document&&JSON.stringify(value)!==JSON.stringify(document.draft);
  const parsed=useMemo(()=>{try{return {config:validateExperience(value),error:''};}catch(e){return {config:null,error:e.message};}},[value]);
  const [lastValid,setLastValid]=useState(DEFAULT_EXPERIENCE);
  useEffect(()=>{if(parsed.config)setLastValid(parsed.config);},[parsed]);
  const config=parsed.config||lastValid,product=products.find(p=>p.id===config.productId);
  const previewProduct=useMemo(()=>product?{...product,modelUrl:config.modelUrl}:null,[product,config.modelUrl]);
  const load=useCallback(async()=>{
    setError('');
    try {
      const [response,catalog]=await Promise.all([studioRequest('/admin/experience/home'),loadAdminProducts()]);
      if(!active.current)return;
      setDocument(response.data);setValue(response.data.draft);setProducts(catalog);setRecoveryRevision(null);
      try {
        const local=JSON.parse(sessionStorage.getItem(key));
        if(local&&Date.now()-local.savedAt<86400000&&JSON.stringify(local.config)!==JSON.stringify(response.data.draft)){validateExperience(local.config);setRecovery(local);}
      }catch{/* Storage is optional; no account credentials are stored here. */}
    }catch(e){if(active.current)setError(e.message);}
  },[key]);
  useEffect(()=>{active.current=true;void load();return()=>{active.current=false;};},[load]);
  useEffect(()=>{
    if(!dirty)return;
    const timer=setTimeout(()=>{try{sessionStorage.setItem(key,JSON.stringify({baseRevision:recoveryRevision??document.revision,config:value,savedAt:Date.now()}));}catch{}},350);
    const beforeUnload=e=>{e.preventDefault();e.returnValue='';};
    const clicked=e=>{const a=e.target.closest?.('a[href]');if(!a||a.target==='_blank'||e.ctrlKey||e.metaKey)return;const url=new URL(a.href,location.href);if(url.pathname!==location.pathname&&!window.confirm('Leave with unsaved changes? A valid draft is recoverable in this tab when storage is available.')){e.preventDefault();e.stopPropagation();}};
    window.addEventListener('beforeunload',beforeUnload);globalThis.document.addEventListener('click',clicked,true);
    return()=>{clearTimeout(timer);window.removeEventListener('beforeunload',beforeUnload);globalThis.document.removeEventListener('click',clicked,true);};
  },[dirty,value,key,document,recoveryRevision]);
  useEffect(()=>{
    const update=()=>director.set({motion:!policy.reduced,active:!globalThis.document.hidden,blocked:!!action});
    update();globalThis.document.addEventListener('visibilitychange',update);return()=>globalThis.document.removeEventListener('visibilitychange',update);
  },[director,policy.reduced,action]);
  useEffect(()=>{director.set({inspecting:inspect});},[inspect,director]);
  const progress=p=>{director.set({progress:p});if(slider.current)slider.current.value=p;if(progressOutput.current)progressOutput.current.textContent=`${Math.round(p*100)}%`;};
  useEffect(()=>{
    if(!playing||policy.reduced)return;
    setInspect(false);director.set({inspecting:false});const signal={p:director.state.progress>=.999?0:director.state.progress};
    const tween=gsap.to(signal,{p:1,duration:8*(1-signal.p),ease:'none',onUpdate:()=>progress(signal.p),onComplete:()=>setPlaying(false)});
    const gatePlayback=()=>tween.paused(!director.state.active||director.state.blocked||director.state.inspecting||!director.state.motion);
    gatePlayback();const unsubscribe=director.subscribe(gatePlayback);
    return()=>{unsubscribe();tween.kill();};
  },[playing,policy.reduced,director]);
  function set(key,next){setValue(v=>({...v,[key]:next}));setNotice('');}
  function setFrameField(key,next){set('frames',value.frames.map((f,i)=>i===frame?{...f,[key]:next}:f));}
  function selectFrame(index){setFrame(index);setPlaying(false);setInspect(false);director.set({inspecting:false});progress(value.frames[index].at);}
  function preset(name){if(dirty&&!window.confirm('Replace camera, light and motion settings with this preset?'))return;setValue({...makeExperiencePreset(name),productId:value.productId,modelUrl:value.modelUrl,chapters:value.chapters});setNotice('Preset applied to your draft only.');}
  function capture(){
    const pose=api.current?.capture?.();if(!pose)return;
    const next={...value,frames:value.frames.map((f,i)=>i===frame?{...f,...pose}:f)};
    try{validateExperience(next);setValue(next);setNotice(`Captured ${FRAME_NAMES[frame]}. Save draft to keep this angle.`);setError('');}catch(e){setError(e.message);}
  }
  async function write(type='draft',version){
    if(submitting.current||!document)return;
    submitting.current=true;setBusy(true);setError('');setNotice('');
    try{
      const body={expectedRevision:recoveryRevision??document.revision,...(type==='draft'?{config:validateExperience(value)}:{}),...(version?{version}:{})};
      const response=await studioRequest(`/admin/experience/home/${type}`,{method:type==='draft'?'PUT':'POST',body:JSON.stringify(body)});
      if(!active.current)return;
      setDocument(response.data);setValue(response.data.draft);setRecovery(null);setRecoveryRevision(null);
      try{sessionStorage.removeItem(key);}catch{}
      setNotice(type==='draft'?'Draft saved. The live Home has not changed.':type==='publish'?'Home published. Open the storefront to review this version.':'Previous scene restored as a new publication.');setAction(null);
    }catch(e){if(active.current){setError(e.message);setAction(null);}}finally{submitting.current=false;if(active.current)setBusy(false);}
  }
  function resetDraft(){if(dirty&&!window.confirm('Discard unsaved scene changes?'))return;setValue(document.draft);setRecoveryRevision(null);setRecovery(null);try{sessionStorage.removeItem(key);}catch{}setNotice('Saved draft restored.');}
  if(!document)return <section className="dth-exp"><h1>Experience</h1>{error?<p role="alert">{error}<button onClick={load}>Retry</button></p>:<p role="status">Loading the studio…</p>}</section>;
  return <section className="dth-exp">
    <header className="dth-exp-header"><div><p>HOME / DIRECTION STUDIO</p><h1>Experience</h1></div><div className="dth-exp-header-actions"><Link to="/" target="_blank" rel="noreferrer">Open Home ↗</Link><button type="button" onClick={resetDraft} disabled={busy||!dirty}>Discard changes</button><button type="button" onClick={()=>write()} disabled={busy||!dirty||!!parsed.error}>{busy?'Saving…':'Save draft'}</button><button type="button" className="dth-exp-primary" onClick={()=>setAction({type:'publish'})} disabled={busy||dirty||!document.revision||!!parsed.error}>Publish Home ↗</button></div></header>
    <div className="dth-exp-meta"><span data-dirty={dirty}>{dirty?'● Unsaved changes':'✓ Saved draft'}</span><span>Draft revision {document.revision}</span><span>{document.published?`Live version ${document.published.version}`:'Live: bundled defaults'}</span></div>
    {recovery&&<div className="dth-exp-recovery"><span>A local draft from revision {recovery.baseRevision} is available. A newer server revision will not be overwritten silently.</span><button type="button" onClick={()=>{setValue(recovery.config);setRecoveryRevision(recovery.baseRevision);setRecovery(null);}}>Recover draft</button><button type="button" onClick={()=>{setRecovery(null);try{sessionStorage.removeItem(key);}catch{}}}>Dismiss</button></div>}
    {(error||parsed.error)&&<div className="dth-exp-error" role="alert">{error||parsed.error}{error&&<button type="button" onClick={()=>{if(!dirty||window.confirm('Reload server state? Your valid local draft remains recoverable in this tab.'))void load();}}>Reload server state</button>}</div>}
    {notice&&<p className="dth-exp-notice" role="status">{notice}</p>}
    <div className="dth-exp-layout">
      <div className="dth-exp-screen">
        <div className="dth-exp-preview-heading"><span>LIVE PREVIEW / {product?.name||'SELECT PRODUCT'}</span><span>{sceneStatus==='ready'?'3D ready':sceneStatus==='fallback'?'Image fallback':'Loading'}</span></div>
        {previewProduct?<Preview key={previewProduct.modelUrl} product={previewProduct} config={config} director={director} api={api} onStatus={setSceneStatus} wireframe={wireframe} onReady={supported=>setRigged(supported)}/>:<div className="dth-exp-viewport dth-exp-empty">Choose a product with a local GLB.</div>}
        <div className="dth-exp-preview-tools"><button type="button" aria-pressed={inspect} disabled={sceneStatus!=='ready'} onClick={()=>{setPlaying(false);if(!inspect)director.set({manualExplode:rigged?(director.state.renderedExplode??sampleStory(director.state.progress,config.frames).explode):0});setInspect(v=>!v);}}>{inspect?'Return to timeline':'Inspect / drag'}</button><button type="button" aria-pressed={wireframe} disabled={sceneStatus!=='ready'} onClick={()=>setWireframe(v=>!v)}>Wireframe</button>{inspect&&<><button type="button" onClick={()=>{if(api.current?.('reset'))setWireframe(false);}}>Reset view</button><button type="button" className="dth-exp-capture" onClick={capture}>Capture camera → {FRAME_NAMES[frame]}</button></>}</div>
        {inspect&&<div className="dth-exp-preview-tools" role="group" aria-label="Preview named views">{['front','side','rear','top'].map(view=><button type="button" key={view} disabled={sceneStatus!=='ready'} onClick={()=>api.current?.(`view-${view}`)}>{view[0].toUpperCase()+view.slice(1)}</button>)}</div>}
        <div className="dth-exp-timeline"><button type="button" disabled={policy.reduced||sceneStatus!=='ready'} onClick={()=>setPlaying(v=>!v)}>{playing?'Pause':'Play story'}</button><input ref={slider} aria-label="Preview timeline" type="range" min="0" max="1" step=".001" defaultValue="0" onChange={e=>{setPlaying(false);setInspect(false);director.set({inspecting:false});progress(Number(e.target.value));}}/><output ref={progressOutput}>0%</output></div>
        <div className="dth-exp-keyframes" role="group" aria-label="Camera keyframes">{FRAME_NAMES.map((name,i)=><button type="button" aria-pressed={frame===i} key={name} onClick={()=>selectFrame(i)}><small>{String(i+1).padStart(2,'0')}</small>{name}</button>)}</div>
        <p className="dth-exp-help">{rigged?'Apex part profile: assembly + part focus available.':'Unrigged asset: safe whole-model viewing; no Apex assembly is applied.'} {policy.reduced?'Reduced motion: use the timeline manually.':''}</p>
        {inspect&&rigged&&<Range label="Preview separation" limits={[0,1,.01]} value={previewExplode} onChange={n=>{director.set({manualExplode:n});setNotice('Inspection is not saved until you capture a keyframe.');}}/>}
      </div>
      <aside className="dth-exp-settings">
        <nav className="dth-exp-tabs" aria-label="Studio panels">{['scene','camera','copy','history'].map(name=><button key={name} type="button" aria-pressed={tab===name} onClick={()=>setTab(name)}>{name[0].toUpperCase()+name.slice(1)}</button>)}</nav>
        <fieldset disabled={busy} className="dth-exp-fields">
          {tab==='scene'&&<>
            <h2>Scene direction</h2>
            <label className="dth-exp-field"><span>Hero product</span><select aria-label="Hero product" value={value.productId} onChange={e=>{const selected=products.find(p=>p.id===e.target.value);if(!selected)return;setValue({...makeExperiencePreset(value.preset),productId:selected.id,modelUrl:selected.modelUrl,chapters:value.chapters});setInspect(false);setPlaying(false);setRigged(false);setSceneStatus('loading');}}>{products.map(p=><option value={p.id} key={p.id}>{p.name}{p.active===false?' (hidden)':''}</option>)}</select></label>
            <label className="dth-exp-field"><span>Scene preset</span><select aria-label="Scene preset" value={value.preset} onChange={e=>preset(e.target.value)}><option value="studio">Studio / balanced</option><option value="detail">Detail / directional light</option><option value="assembly">Assembly / extended reveal</option></select></label>
            <label className="dth-exp-check"><input type="checkbox" checked={value.enabled} onChange={e=>set('enabled',e.target.checked)}/>Cinematic Home enabled</label>
            <label className="dth-exp-check"><input type="checkbox" checked={value.rings} onChange={e=>set('rings',e.target.checked)}/>Stage rings</label>
            <h3>Motion</h3>
            {Object.entries({storyScreens:'Scroll length',scrubSeconds:'Scroll response lag',returnSeconds:'Return transition',maxExplode:'Maximum separation',pointerRadians:'Pointer influence',maxDpr:'Maximum pixel ratio'}).map(([key,label])=><Range key={key} label={label} value={value[key]} limits={ranges[key]} onChange={v=>set(key,v)}/>)}
            <h3>Surface lighting</h3>
            {Object.entries({exposure:[.6,1.3,.05],environment:[.2,1.2,.05],key:[.5,4,.1],rim:[0,2,.1],azimuth:[-90,90,1]}).map(([key,limits])=><Range key={key} label={`Light ${key}`} value={value.lighting[key]} limits={limits} onChange={v=>set('lighting',{...value.lighting,[key]:v})}/>)}
            <h3>User controls</h3><Range label="Drag sensitivity" value={value.controls.rotateSpeed} limits={[.25,3,.05]} onChange={v=>set('controls',{...value.controls,rotateSpeed:v})}/><Range label="Zoom sensitivity" value={value.controls.zoomSpeed} limits={[.25,2,.05]} onChange={v=>set('controls',{...value.controls,zoomSpeed:v})}/>
          </>}
          {tab==='camera'&&<><h2>{FRAME_NAMES[frame]}</h2><p className="dth-exp-help">Choose a keyframe, enter Inspect, then drag to frame the product. Capture stores the actual displayed angle.</p><button type="button" className="dth-exp-primary" disabled={!inspect||sceneStatus!=='ready'} onClick={capture}>Capture this angle</button><VectorField label="Camera" value={value.frames[frame].camera} onChange={v=>setFrameField('camera',v)}/><VectorField label="Target" value={value.frames[frame].target} onChange={v=>setFrameField('target',v)}/><details><summary>Advanced object framing</summary><VectorField label="Position" value={value.frames[frame].position} onChange={v=>setFrameField('position',v)}/><VectorField label="Rotation" value={value.frames[frame].rotation} onChange={v=>setFrameField('rotation',v)}/><Range label="Object scale" limits={[.6,1.6,.05]} value={value.frames[frame].scale} onChange={v=>setFrameField('scale',v)}/></details><Range label="Keyframe separation" limits={[0,1,.01]} value={value.frames[frame].explode} onChange={v=>setFrameField('explode',v)}/><p className="dth-exp-help">Values use scene units and radians, not physical measurements. Unsafe camera paths are rejected.</p></>}
          {tab==='copy'&&<><h2>Chapter copy</h2><label className="dth-exp-field"><span>Chapter</span><select aria-label="Chapter" value={chapter} onChange={e=>setChapter(Number(e.target.value))}>{value.chapters.map((c,i)=><option value={i} key={c.id}>{i+1}. {c.label}</option>)}</select></label>{['label','line1','line2','note'].map(key=><label className="dth-exp-field" key={key}>{{label:'Navigation label',line1:'Headline line 1',line2:'Headline line 2',note:'Description'}[key]}<input maxLength={key==='note'?130:key==='label'?24:28} value={key==='line1'?value.chapters[chapter].title[0]:key==='line2'?value.chapters[chapter].title[1]:value.chapters[chapter][key]} onChange={e=>set('chapters',value.chapters.map((c,i)=>i!==chapter?c:key.startsWith('line')?{...c,title:c.title.map((t,j)=>j===(key==='line1'?0:1)?e.target.value:t)}:{...c,[key]:e.target.value}))}/></label>)}<div className="dth-exp-copy-proof"><small>{value.chapters[chapter].label}</small><h3>{value.chapters[chapter].title[0]}<br/>{value.chapters[chapter].title[1]}</h3><p>{value.chapters[chapter].note}</p></div><p className="dth-exp-help">This is a typesetting proof. Open Home after publication to verify copy in the final layout.</p></>}
          {tab==='history'&&<><h2>Published versions</h2><p className="dth-exp-help">Up to 20 publications are retained. Restoring creates a new version; it never rewrites old orders or the product catalogue.</p>{!document.history.length?<p>No publications yet.</p>:<ol className="dth-exp-history">{[...document.history].reverse().map(item=><li key={item.version}><div><strong>Version {item.version}</strong><small>{item.productId} · {item.enabled?item.preset:'Legacy Home'}</small><time>{new Date(item.createdAt).toLocaleString()}</time></div><button type="button" disabled={dirty||item.version===document.published?.version} onClick={()=>setAction({type:'restore',version:item.version})}>Restore</button></li>)}</ol>}</>}
        </fieldset>
      </aside>
    </div>
    {action&&<Confirm action={action} busy={busy} onClose={()=>setAction(null)} onConfirm={()=>write(action.type,action.version)}/>}
  </section>;
}
