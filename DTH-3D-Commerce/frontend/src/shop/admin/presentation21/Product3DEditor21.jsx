import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { studioRequest } from '../../api';
import { useStore } from '../../useStore';
import { defaultPresentation21, validatePresentation21, PRESENTATION_RANGES21 as R, productHref21, isProductId21 } from '../../../../../shared/productPresentation21.mjs';
import '../../presentation21/presentation21.css';
const Preview=lazy(()=>import('../../presentation21/ProductPresentationPreview21.jsx'));
const copy=value=>JSON.parse(JSON.stringify(value));
function Range({label,value,min,max,step=1,onChange,disabled}) {
  const [text,setText]=useState(String(value));useEffect(()=>setText(String(value)),[value]);
  function input(raw){setText(raw);const n=Number(raw);if(raw.trim()&&Number.isFinite(n)&&n>=min&&n<=max)onChange(n);}
  function finish(){const n=Number(text);const next=text.trim()&&Number.isFinite(n)?Math.max(min,Math.min(max,n)):value;onChange(next);setText(String(next));}
  return <label className="editor21-range"><span>{label}</span><input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e=>onChange(Number(e.target.value))}/>
    <input type="number" min={min} max={max} step={step} value={text} disabled={disabled} aria-label={`${label}: numeric value`} onChange={e=>input(e.target.value)} onBlur={finish}/></label>;
}
export default function Product3DEditor21() {
  const {id}=useParams(),store=useStore(),api=useRef(null),alive=useRef(true),loadSequence=useRef(0),locked=useRef(false);
  const [product,setProduct]=useState(null),[draft,setDraft]=useState(null),[saved,setSaved]=useState(null),[status,setStatus]=useState('automatic');
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [ready,setReady]=useState(false),[report,setReport]=useState(null),[previewError,setPreviewError]=useState(''),[resetToken,setResetToken]=useState(0);
  const dirty=!!draft&&JSON.stringify(draft)!==JSON.stringify(saved);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const load=useCallback(async()=>{
    const seq=++loadSequence.current;setLoading(true);setError('');setNotice('');
    try{if(!isProductId21(id))throw new Error('Invalid product ID.');
      const result=await studioRequest(`/admin/studio/products/${encodeURIComponent(id)}/presentation`);
      if(!alive.current||seq!==loadSequence.current)return;
      setProduct(result.data.product);setDraft(copy(result.data.settings));setSaved(copy(result.data.settings));setStatus(result.data.status);
      setReady(false);setReport(null);setPreviewError('');setResetToken(n=>n+1);
    }catch(e){if(alive.current&&seq===loadSequence.current)setError(e.message||'Unable to open 3D setup.');}
    finally{if(alive.current&&seq===loadSequence.current)setLoading(false);}
  },[id]);
  useEffect(()=>{void load();return()=>{loadSequence.current++;};},[load]);
  useEffect(()=>{if(!dirty)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  const loaded=useCallback(data=>{setReady(true);setReport(data);setPreviewError('');},[]);
  const failed=useCallback(message=>{setReady(false);setPreviewError(message||'Preview failed.');},[]);
  function change(key,value){setDraft(d=>({...d,[key]:value}));setNotice('');setError('');}
  function vector(key,index,value){change(key,draft[key].map((n,i)=>i===index?value:n));}
  function rotate(index,delta){vector('rotationDeg',index,((draft.rotationDeg[index]+delta+540)%360)-180);}
  function guard(event){if(dirty&&!window.confirm('Discard unsaved 3D setup changes?'))event.preventDefault();}
  function reload(){if(!dirty||window.confirm('Reload the saved setup and discard local edits?'))void load();}
  function capture(){const camera=api.current?.capture();if(camera){change('camera',camera);setNotice('Camera copied into the draft. Save setup to publish it.');}}
  async function save(){
    if(locked.current||!product||!draft||!ready)return;
    locked.current=true;setBusy(true);setError('');setNotice('');
    try{
      const settings=validatePresentation21(draft,product.modelUrl);
      const result=await studioRequest(`/admin/studio/products/${encodeURIComponent(id)}/presentation`,{method:'PUT',body:JSON.stringify({settings,expectedUpdatedAt:product.updatedAt,expectedRevision:product.presentation3d?.revision??null})});
      if(!alive.current)return;
      setProduct(result.data.product);setDraft(copy(result.data.settings));setSaved(copy(result.data.settings));setStatus('saved');
      setNotice('3D setup saved. The shop card and product page will use this setup after refreshing.');void store.refresh();
    }catch(e){if(alive.current)setError(e.message||'Could not save the 3D setup.');}
    finally{locked.current=false;if(alive.current)setBusy(false);}
  }
  if(loading)return <div className="dth-editor21"><p role="status">Opening 3D setup…</p></div>;
  if(!product||!draft)return <section className="dth-editor21"><h1>3D setup unavailable</h1><p role="alert">{error}</p><button type="button" onClick={reload}>Retry</button><Link to="/admin/products">Back to products</Link></section>;
  const href=productHref21(product);
  return <section className="dth-editor21">
    <header className="editor21-head"><div><Link to={`/admin/products/${id}`} onClick={guard}>← Product information</Link><p className="editor21-kicker">ADMIN / 3D MODEL SETUP</p><h1>{product.name}</h1></div><span className="dth-admin-pill" data-active={!dirty&&status==='saved'}>{dirty?'Unsaved changes':status==='saved'?'Saved setup':'Not configured'}</span></header>
    <p className="editor21-hint">Orient the model first, then choose the camera. Original geometry, textures and materials stay unchanged. These values are presentation settings, not physical measurements.</p>
    {status==='model-changed'&&<p className="editor21-alert warning">The GLB URL changed. The old setup is not being applied. Review and save a new setup for this model.</p>}
    {status==='invalid'&&<p className="editor21-alert warning">The previous setup is invalid. Automatic defaults are shown until a valid setup is saved.</p>}
    {error&&<p className="editor21-alert error" role="alert">{error} <button type="button" onClick={reload} disabled={busy}>Reload saved setup</button></p>}
    {notice&&<p className="editor21-alert" role="status">{notice}</p>}
    <div className="editor21-layout"><aside className="editor21-preview">
      <Suspense fallback={<p role="status">Preparing the 3D editor…</p>}><Preview key={`${id}:${product.modelUrl}:${resetToken}`} product={product} settings={draft} interactive api={api} onReady={loaded} onError={failed}/></Suspense>
      <div className="editor21-controls"><button type="button" disabled={!ready||busy} onClick={()=>api.current?.reset()}>Reset view</button><button type="button" disabled={!ready||busy} onClick={capture}>Use current view as default</button><button type="button" disabled={!ready||busy} onClick={()=>api.current?.resume()}>Resume rotation</button></div>
      <p className="editor21-hint">Drag to orbit; scroll to zoom. Dragging pauses preview rotation. A full turn checks whether the model is upright from all sides. System reduced-motion preferences are respected.</p>
      <p className="editor21-hint"><code>{product.modelUrl}</code></p>
      {report&&<p className="editor21-hint">{Number(report.triangles).toLocaleString('en-US')} triangles · {(Number(report.byteLength)/1048576).toFixed(2)} MiB · Original asset</p>}
      {previewError&&<p className="editor21-alert error" role="alert">{previewError}</p>}
      <div className="editor21-links">{href&&product.active!==false&&<a href={href} target="_blank" rel="noreferrer">Open product ↗</a>}<a href="/shop?mode=shop" target="_blank" rel="noreferrer">Open shop ↗</a></div>
    </aside><div>
      <div className="editor21-block"><h2>1 / Model orientation</h2><div className="editor21-fields">{['X','Y','Z'].map((axis,i)=><div key={axis}><Range label={`Rotation ${axis} (degrees)`} value={draft.rotationDeg[i]} min={R.rotation[0]} max={R.rotation[1]} onChange={n=>vector('rotationDeg',i,n)} disabled={busy}/><div className="editor21-controls"><button type="button" disabled={busy} onClick={()=>rotate(i,-90)}>−90° {axis}</button><button type="button" disabled={busy} onClick={()=>rotate(i,90)}>+90° {axis}</button><button type="button" disabled={busy} onClick={()=>vector('rotationDeg',i,0)}>Zero {axis}</button></div></div>)}</div>
        <p className="editor21-hint">No automatic axis guessing. Check the result from the front and side. Auto rotation always orbits the world Y axis.</p></div>
      <div className="editor21-block"><h2>2 / Framing</h2><div className="editor21-fields"><Range label="Model scale" value={draft.scale} min={R.scale[0]} max={R.scale[1]} step={.01} onChange={n=>change('scale',n)} disabled={busy}/>
        {['X','Y','Z'].map((axis,i)=><Range key={axis} label={`Offset ${axis} (viewer units)`} value={draft.offset[i]} min={R.offset[0]} max={R.offset[1]} step={.01} onChange={n=>vector('offset',i,n)} disabled={busy}/>)}</div></div>
      <div className="editor21-block"><h2>3 / Default camera</h2><div className="editor21-fields">{[['yawDeg','Yaw (degrees)',R.yaw,1],['pitchDeg','Pitch (degrees)',R.pitch,1],['zoom','Zoom',R.zoom,.01]].map(([key,label,range,step])=><Range key={key} label={label} value={draft.camera[key]} min={range[0]} max={range[1]} step={step} onChange={n=>change('camera',{...draft.camera,[key]:n})} disabled={busy}/>)}</div></div>
      <div className="editor21-block"><h2>4 / Auto rotation</h2><label className="editor21-toggle"><input type="checkbox" checked={draft.spin.enabled} disabled={busy} onChange={e=>change('spin',{...draft.spin,enabled:e.target.checked})}/>Start with auto rotation</label>
        <Range label="Seconds per full turn (higher = slower)" value={draft.spin.secondsPerTurn} min={R.turnSeconds[0]} max={R.turnSeconds[1]} onChange={n=>change('spin',{...draft.spin,secondsPerTurn:n})} disabled={busy}/></div>
      <div className="editor21-save"><span>{ready?'Preview ready':'Wait for the 3D preview before saving.'}</span><button type="button" disabled={busy} onClick={()=>{setDraft(defaultPresentation21(product.modelUrl));setNotice('Defaults applied to the draft only.');}}>Reset draft</button><button type="button" disabled={busy||!dirty} onClick={()=>{setDraft(copy(saved));setNotice('Local edits discarded.');}}>Undo edits</button><button type="button" className="editor21-primary" disabled={busy||!ready||(!dirty&&status==='saved')} onClick={save}>{busy?'Saving…':'Save 3D setup'}</button></div>
    </div></div>
  </section>;
}
