import BuildFeedback232, { useBuildFeedback232 } from '../refinement232/BuildFeedback232';
import {lazy,Suspense,useCallback,useMemo,useRef,useState,useEffect} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {formatMoney} from '../../../../shared/domain.mjs';
import {NVX_MODELS} from '../../shop/discovery174/nvx3d/nvx3d.config.mjs';
import {usePublishedNVXModels} from '../../shop/discovery174/nvx3d/usePublishedNVXModels.mjs';
import {nvxChoices} from '../../shop/discovery174/discovery.logic.mjs';
import {modelSpec22A} from '../../shop/account22a/account22a.logic.mjs';
import ProductImage from '../../shop/catalog/components/ProductImage';
import {SYSTEMS23,isSystem23,estimate23,safeProductHref23} from './spatial23.logic.mjs';
import {useSurfaceMotion23} from './useMotion23';
import Icon23 from './Icon23';
import './commerce23.css';
const VehicleStage23=lazy(()=>import('./VehicleStage23'));
const PartPreview=lazy(()=>import('../../shop/presentation21/ProductPresentationPreview21'));
function useModalGate23(){const [blocked,set]=useState(false);useEffect(()=>{const read=()=>set(!!document.querySelector('dialog[open],.dth-support-panel'));const o=new MutationObserver(read);o.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});read();return()=>o.disconnect();},[]);return blocked;}
/** Presentation replacement. The DiscoveryPage still owns vehicle, filters and shortlist writes. */
export default function BuildExperience23({store,query,matches,eligible,draft,motion,policy,fromShop,onSelect,onVehicle,onCategory,onReset,onPin,onRemove}){
 const root=useRef(null),api=useRef(null),panel=useRef(null);const [params]=useSearchParams();
 const vehicles=nvxChoices(store.data.vehicles),selectedVehicle=vehicles.find(v=>v.id===store.vehicleId),preview=selectedVehicle||vehicles.find(v=>v.id==='yamaha-nvx-v3')||vehicles[0];
 const published=usePublishedNVXModels(),rawSpec=modelSpec22A(preview,NVX_MODELS,published),specKey=rawSpec?`${rawSpec.id}|${rawSpec.file}|${rawSpec.rotation.join(',')}`:'';
 const spec=useMemo(()=>rawSpec,[specKey]);const reduced=useSurfaceMotion23(root,spec?.id),blocked=useModalGate23();
 const system=isSystem23(query.categories?.[0])?query.categories[0]:'';
 const [part,setPart]=useState(null),[summary,setSummary]=useState(false),[partVisible,setPartVisible]=useState(true);const partHost=useRef(null);const heading=useRef(null),partTrigger=useRef(null);
 const selectSystem=useCallback(id=>{onCategory(id);},[onCategory]);
 const shown=system?matches.filter(p=>p.category===system):matches;
 const currentPart=part?store.data.products.find(p=>p.id===part&&p.active!==false):null;
 const estimate=estimate23(draft);const author=store.user?.role==='admin'&&params.get('focus-editor')==='1';
 useEffect(()=>{setPart(null);setSummary(false);},[store.user?.id,store.vehicleId]);
 useEffect(()=>{if(currentPart)heading.current?.focus({preventScroll:true});const el=partHost.current;if(!el)return;const io=new IntersectionObserver(entries=>setPartVisible(entries[0]?.isIntersecting===true),{threshold:.01});io.observe(el);return()=>io.disconnect();},[currentPart?.id]);
 useEffect(()=>{if(!part)return;const close=e=>{if(e.key==='Escape'){setPart(null);partTrigger.current?.focus();}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[part]);
 const summaryHeading232=useRef(null);
 const feedback232=useBuildFeedback232({draft,userId:store.user?.id,vehicleId:store.vehicleId,onPin:p=>onPin(p)});
 useEffect(()=>{if(summary)summaryHeading232.current?.focus({preventScroll:false});},[summary]);
 function inspect(p,event){partTrigger.current=event.currentTarget;setPart(p.id);onSelect(p.id);}
 function closeStudy(){setPart(null);partTrigger.current?.focus();}
 function chooseVehicle(id){if(id!==store.vehicleId&&draft.length&&!window.confirm('Changing vehicle clears this unsaved shortlist. Continue?'))return;onVehicle(id);}
 return <section ref={root} className="c23 c23-build p24-build" data-commerce-build="23.1" data-refinement232 data-study={!!currentPart}>
  <header className="c23-build-head" data-c23-enter><div><p className="c23-eyebrow">Build your NVX</p><h1>{preview?.model||'Build your NVX'}</h1></div>
   <div className="c23-version-switch" role="group" aria-label="Choose NVX version">{vehicles.map(v=><button key={v.id} type="button" aria-pressed={store.vehicleId===v.id} onClick={()=>chooseVehicle(v.id)} data-c23-light>{v.model.replace('NVX ','')}</button>)}</div>
   <Link to="/account?view=vehicle" className="c23-text-link">My garage</Link>
  </header>
  <ol className="p24-build-progress" aria-label="Build progress">
   <li data-complete={!!selectedVehicle} aria-current={!selectedVehicle?'step':undefined}><span>Vehicle</span><strong>{selectedVehicle?selectedVehicle.model:'Choose your version'}</strong></li>
   <li data-complete={!!system} aria-current={selectedVehicle&&!system?'step':undefined}><span>System</span><strong>{system?SYSTEMS23.find(s=>s.id===system).label:'Choose a detail'}</strong></li>
   <li data-complete={!!draft.length} aria-current={selectedVehicle&&!!system?'step':undefined}><span>Shortlist</span><strong>{draft.length?`${draft.length} selected`:'Your next part'}</strong></li>
  </ol>
  <div className="c23-build-workspace" data-has-panel={!!system}>
   <div className="c23-build-stage">
    {!currentPart&&spec&&<Suspense fallback={<div className="c23-scene-status" role="status">Opening vehicle…</div>}><VehicleStage23 spec={spec} system={system} onSystem={selectSystem} apiRef={api} reduced={reduced||!motion} compact={policy.compact||policy.saveData} blocked={blocked} author={author}/></Suspense>}
    {!spec&&<div className="c23-scene-status" role="status">No published vehicle is available.</div>}
    {currentPart&&<section ref={partHost} className="c23-part-study" aria-labelledby="c23-part-title"><div className="c23-part-study-top"><h2 ref={heading} tabIndex={-1} id="c23-part-title">{currentPart.name}</h2><button className="c23-tool" type="button" onClick={closeStudy}><Icon23 name="close"/>Return to vehicle</button></div><Suspense fallback={<div role="status">Opening part…</div>}><PartPreview key={`${currentPart.id}:${currentPart.modelUrl}`} product={currentPart} motion={!reduced&&!blocked&&motion&&partVisible} interactive={!blocked}/></Suspense><p>Individual part study. This model is not fitted to the vehicle.</p></section>}
    {!selectedVehicle&&<div className="c23-preview-state">Viewing {preview?.model||'vehicle'} <button type="button" disabled={!preview} onClick={()=>onVehicle(preview.id)}>Use this vehicle</button></div>}
   </div>
   <aside ref={panel} className="c23-parts-panel" aria-label="Choose a part" data-c23-enter>
    <div className="c23-panel-title"><span>{system?SYSTEMS23.find(s=>s.id===system).label:'Choose a system'}</span>{system&&<button type="button" aria-label="Close category" onClick={()=>onCategory('')}><Icon23 name="close"/></button>}</div>
    {!selectedVehicle?<div className="c23-panel-empty"><p>Select a vehicle version to see matching demo parts.</p><button type="button" className="c23-button" disabled={!preview} onClick={()=>onVehicle(preview.id)}>Use {preview?.model||'vehicle'}</button></div>:!system?<div className="c23-system-list">{SYSTEMS23.map(s=><button key={s.id} type="button" onClick={()=>onCategory(s.id)} data-c23-light><Icon23 name={s.id}/><span>{s.label}</span><small>{eligible.filter(p=>p.category===s.id).length}</small></button>)}</div>:<>
     <p className="c23-panel-count">{shown.length} matching {shown.length===1?'part':'parts'} · demo catalogue</p>
     {!shown.length?<div className="c23-panel-empty"><p>No matching parts with these filters.</p><button className="c23-button c23-secondary" type="button" onClick={onReset}>Clear filters</button></div>:<div className="c23-parts-list">{shown.map(p=>{const pinned=draft.some(d=>d.id===p.id),href=safeProductHref23(p);return <article className="c23-part-row" key={p.id} data-pinned={pinned}>
       <button className="c23-part-image" type="button" onClick={e=>inspect(p,e)} aria-label={`Inspect ${p.name} in 3D`}><ProductImage product={p}/></button>
       <div className="c23-part-copy"><h3>{p.name}</h3><p>{p.finish}</p><strong>{Number.isSafeInteger(p.price)?formatMoney(p.price):'Price unavailable'}</strong><div className="r232-part-actions"><button type="button" disabled={feedback232.pending} onClick={e=>pinned?onRemove(p.id):feedback232.add(p,e.currentTarget)} data-c23-light>{pinned?'Remove from build':'Add to build'}</button>{href&&<Link to={href} state={{fromShop}}>Details</Link>}</div></div>
      </article>;})}</div>}
    </>}
   </aside>
  </div>
  <nav className="c23-system-rail" aria-label="Vehicle systems">{SYSTEMS23.map(s=><button key={s.id} type="button" aria-pressed={system===s.id} onClick={()=>onCategory(system===s.id?'':s.id)} data-c23-light><Icon23 name={s.id}/><span>{s.label}</span>{draft.some(p=>p.category===s.id)&&<i className="c23-selected-dot" aria-label="Part shortlisted"/>}</button>)}</nav>
  <footer className="c23-build-footer"><div><strong>{draft.length?`${draft.length} selected ${draft.length===1?'part':'parts'}`:'Your shortlist'}</strong><span>{draft.length?'Unsaved shortlist · one per category':'Select a system on the vehicle or in the toolbar.'}</span></div><div className="c23-build-total"><span>Catalogue estimate</span><strong>{!draft.length?'—':estimate===null?'Unavailable':formatMoney(estimate)}</strong></div><button type="button" className="c23-button" disabled={!draft.length} onClick={()=>setSummary(v=>!v)} aria-expanded={summary}>Review build</button></footer>
  {summary&&<section className="c23-summary" aria-label="Build shortlist"><h2 ref={summaryHeading232} tabIndex={-1}>Your shortlist</h2>{draft.map(p=><div key={p.id}><span>{SYSTEMS23.find(s=>s.id===p.category)?.label}</span><Link to={safeProductHref23(p)||'/shop'} state={{fromShop}}>{p.name}</Link><strong>{formatMoney(p.price)}</strong><button type="button" onClick={()=>onRemove(p.id)}>Remove</button></div>)}<p>This list stays in this page only. It does not change your bag or reserve stock. Review each product before ordering.</p></section>}
  {feedback232.error&&<p className="r232-build-error" role="alert">{feedback232.error}</p>}
  <BuildFeedback232 receipt={feedback232.receipt} onClose={feedback232.close} onReview={()=>{feedback232.close();setSummary(true);requestAnimationFrame(()=>summaryHeading232.current?.focus({preventScroll:false}));}}/>
  <p className="c23-disclosure">Illustrative 3D and demo compatibility. Focus views are not installation guidance. No simulated part replacement is shown.</p>
 </section>;
}
