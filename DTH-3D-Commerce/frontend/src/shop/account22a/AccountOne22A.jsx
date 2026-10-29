import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { vehicleLabel } from '../../../../shared/nvx.mjs';
import { formatMoney } from '../../../../shared/domain.mjs';
import { FLOW } from '../api';
import useGarage from '../account/member/useGarage';
import ProductImage from '../catalog/components/ProductImage';
import { NVX_MODELS } from '../discovery174/nvx3d/nvx3d.config.mjs';
import { usePublishedNVXModels } from '../discovery174/nvx3d/usePublishedNVXModels.mjs';
import OneIcon from '../design22a/OneIcon22A';
import { ACCOUNT_VIEWS22A,accountHref22A,availableVehicles22A,previewVehicle22A,matchingParts22A,modelSpec22A,modelKey22A,productHref22A,safeDate22A } from './account22a.logic.mjs';
import { useAccountUI22A,useReduced22A } from './useAccountUI22A';
import AccountAtmosphere22A from './AccountAtmosphere22A';
import AccountVehicleStage22A from './AccountVehicleStage22A';
import { AccountDialog22A,OrdersPanel22A,ProfilePanel22A,OrderRows22A } from './AccountPanels22A';
import '../design22a/tokens22a.css';
import './account22a.css';

function useBlocked22A(){
  const [blocked,set]=useState(false);
  useEffect(()=>{const update=()=>set(!!document.querySelector('dialog[open],.dth-support-panel'));const observer=new MutationObserver(update);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});update();return()=>observer.disconnect();},[]);return blocked;
}

/** Member logic is supplied by the existing MemberArea. Authentication, orders and delete API paths stay unchanged. */
export default function AccountOne22A({member:m,orderDetail}) {
  const root=useRef(null),garageState=useGarage(),{garage,loading,busy,error,message}=garageState;
  const published=usePublishedNVXModels(),reduced=useReduced22A(),blocked=useBlocked22A();
  const [preferred,setPreferred]=useState(''),[dialog,setDialog]=useState(null),[candidate,setCandidate]=useState('');
  const mutationLock=useRef(false);
  const vehicles=useMemo(()=>availableVehicles22A(m.store.data.vehicles),[m.store.data.vehicles]);
  const selected=previewVehicle22A({vehicles,garage,preferred,shopping:m.store.vehicleId});
  const saved=vehicles.find(v=>v.id===garage.defaultVehicleId),shopping=vehicles.find(v=>v.id===m.store.vehicleId);
  const choices=vehicles.filter(v=>!garage.vehicleIds.includes(v.id));
  const rawSpec=modelSpec22A(selected,NVX_MODELS,published),key=modelKey22A(rawSpec);
  const spec=useMemo(()=>rawSpec,[key]);
  const parts=useMemo(()=>matchingParts22A(m.store.data.products,selected?.id,vehicles),[m.store.data.products,selected?.id,vehicles]);
  const sceneView=m.view==='overview'||m.view==='vehicle',isSaved=!!selected&&garage.vehicleIds.includes(selected.id),isDefault=!!selected&&garage.defaultVehicleId===selected.id;
  const writing=loading||busy||m.store.loading||!!m.store.error;
  useAccountUI22A(root,`${m.view}:${m.orderId}`,reduced);
  useEffect(()=>{const el=document.documentElement,prior=el.getAttribute('data-dth-account-one');el.setAttribute('data-dth-account-one','true');return()=>{prior===null?el.removeAttribute('data-dth-account-one'):el.setAttribute('data-dth-account-one',prior);};},[]);
  useEffect(()=>{if(dialog?.kind==='add'&&!choices.some(v=>v.id===candidate))setCandidate(choices[0]?.id||'');},[dialog?.kind,candidate,choices.map(v=>v.id).join('|')]);
  useEffect(()=>{setDialog(null);},[m.view]);
  function addDialog(){setCandidate(choices[0]?.id||'');setDialog({kind:'add'});}
  async function commit(action,id){
    if(writing||mutationLock.current)return false;mutationLock.current=true;
    try {const ok=await garageState.mutate(action,id);if(ok){if(action==='add')setPreferred(id);if(action==='remove'&&preferred===id)setPreferred('');setDialog(null);}return ok;}
    finally{mutationLock.current=false;}
  }
  function shop(){if(selected&&vehicles.some(v=>v.id===selected.id)&&!m.store.loading&&!m.store.error)m.store.setVehicle(selected.id);}
  function startAddSelected(){if(selected&&!isSaved){setCandidate(selected.id);setDialog({kind:'add'});}}
  const welcomeCount=m.records?.total;
  return <div ref={root} className="aa22" data-account-one data-view={m.view} data-reduced={reduced}>
    <AccountAtmosphere22A root={root} calm={!sceneView}/>
    <div className="aa22-shell">
      <aside className="aa22-sidebar" aria-label="Your account">
        <div className="aa22-identity"><span className="aa22-avatar" aria-hidden="true">{m.store.user.email.slice(0,1).toUpperCase()}</span><div><strong>My DTH</strong><span title={m.store.user.email}>{m.store.user.email}</span></div></div>
        <nav className="aa22-nav" aria-label="Account navigation">{ACCOUNT_VIEWS22A.map(item=><Link key={item.id} to={accountHref22A(item.id)} aria-current={m.view===item.id?'page':undefined} data-aa-light><OneIcon name={item.icon}/><span>{item.label}</span><i aria-hidden="true"/></Link>)}</nav>
        <div className="aa22-sidebar-bottom"><p>Member since<br/><strong>{safeDate22A(m.store.user.createdAt)}</strong></p>{m.store.user.role==='admin'&&<Link to="/admin" className="aa22-admin">Manage catalog</Link>}<button type="button" className="aa22-signout" disabled={m.loggingOut} onClick={m.signOut}><OneIcon name="signout"/>{m.loggingOut?'Signing out…':'Sign out'}</button>{m.exitError&&<p className="aa22-inline-error" role="alert">{m.exitError}</p>}</div>
      </aside>
      <div className="aa22-workspace">
        <div className="aa22-workspace-top"><span className="aa22-location">Account<span aria-hidden="true"> / </span>{ACCOUNT_VIEWS22A.find(v=>v.id===m.view)?.label}</span><span className="aa22-session"><i aria-hidden="true"/>Signed in</span></div>
        {FLOW&&<p className="aa22-feedback" role="note">Demo session. Garage changes are not saved to MongoDB.</p>}
        {/* Stage stays mounted even when the data view changes; hidden views suspend rendering. */}
        <div className="aa22-spatial" hidden={!sceneView} aria-hidden={!sceneView?true:undefined}>
          <div className="aa22-stage-pane">
            <header className="aa22-hero-title"><p className="aa22-label">{isSaved?'In your garage':'Vehicle preview'}</p><h1 ref={sceneView?m.heading:undefined} tabIndex={-1}>{selected?.model||'Your garage'}<span className="aa22-title-dot">.</span></h1><span className="aa22-hero-make">{selected?.make||'Choose a vehicle to begin'}</span></header>
            <div className="aa22-stage-sheen" aria-hidden="true"/><div className="aa22-stage-floor" aria-hidden="true"/>
            <AccountVehicleStage22A spec={spec} view={m.view} active={sceneView} blocked={blocked} reduced={reduced}/>
          </div>
          <aside className="aa22-context" data-aa-enter>
            <div className="aa22-context-heading"><span className="aa22-label">{m.view==='vehicle'?'Vehicle settings':'At a glance'}</span><OneIcon name={m.view==='vehicle'?'settings':'overview'}/></div>
            {m.view==='overview'?<>
              <div className="aa22-context-field"><span>Saved default</span><strong>{saved?vehicleLabel(saved):'No vehicle saved'}</strong></div>
              <div className="aa22-context-field"><span>Shopping with</span><strong>{shopping?vehicleLabel(shopping):'Not selected'}</strong>{saved&&shopping&&saved.id!==shopping.id&&<small>Your shopping choice is separate from your garage default.</small>}</div>
              <div className="aa22-context-actions"><button type="button" className="aa22-action aa22-primary" data-aa-light onClick={()=>m.go('vehicle')}>{garage.vehicleIds.length?'Open garage':'Create your garage'}</button><Link to="/shop" className="aa22-text-action">Explore parts</Link></div>
              <div className="aa22-compact-stat"><span>Saved vehicles</span><strong>{loading?'—':garage.vehicleIds.length}<small> / 3</small></strong></div>
            </>:<>
              <div className="aa22-selected-status"><i aria-hidden="true"/><span>{isSaved?(isDefault?'Your default vehicle':'Saved in your garage'):'Preview only · not saved'}</span></div>
              <div className="aa22-match-count"><strong>{parts.length}</strong><span>matching parts<br/>in the demo catalog</span></div>
              <div className="aa22-context-actions">
                {selected&&<Link className="aa22-action aa22-primary" data-aa-light to="/shop?mode=shop&fit=match" onClick={e=>{if(m.store.loading||m.store.error){e.preventDefault();return;}shop();}}>Shop for this vehicle</Link>}
                {isSaved&&!isDefault&&<button type="button" className="aa22-action aa22-secondary" data-aa-light disabled={writing} onClick={()=>void commit('set-default',selected.id)}>{busy?'Saving…':'Set as default'}</button>}
                {!isSaved&&selected&&<button type="button" className="aa22-action aa22-secondary" data-aa-light disabled={writing} onClick={startAddSelected}>Save to garage</button>}
                {selected&&<Link className="aa22-text-action" to="/shop?mode=build" onClick={shop}>Open build studio</Link>}
              </div>
              {isSaved&&<details className="aa22-vehicle-menu"><summary>Manage this vehicle</summary>{isDefault&&<button type="button" disabled={writing} onClick={()=>void commit('clear-default','')}>Clear default</button>}<button type="button" className="aa22-remove-link" disabled={writing} onClick={()=>setDialog({kind:'remove',id:selected.id,label:selected.model})}>Remove from garage</button></details>}
              <p className="aa22-fit-note">Demo compatibility. Verify real fitment with your supplier.</p>
            </>}
          </aside>
        </div>
        {sceneView&&<>
          {(error||message)&&<div className={`aa22-feedback ${error?'is-error':'is-success'}`} role={error?'alert':'status'}>{error||message}{error&&<button type="button" disabled={writing} onClick={()=>void garageState.refresh()}>Refresh garage</button>}</div>}
          <section className="aa22-fleet" aria-label="Your saved vehicles" data-aa-enter>
            <div className="aa22-section-head"><h2>{m.view==='vehicle'?'Your vehicles':'Saved garage'}</h2><button type="button" className="aa22-text-action" disabled={writing||!choices.length} onClick={addDialog}><OneIcon name="plus"/>Add vehicle</button></div>
            <div className="aa22-vehicle-strip">{garage.vehicleIds.map(id=>{const v=vehicles.find(x=>x.id===id);return v?<button type="button" className="aa22-vehicle-option" key={id} aria-pressed={selected?.id===id} data-aa-light onClick={()=>{setPreferred(id);if(m.view!=='vehicle')m.go('vehicle');}}><span className="aa22-option-mark" aria-hidden="true">{v.model.replace('NVX ','')}</span><span><strong>{v.model}</strong><small>{id===garage.defaultVehicleId?'Default vehicle':'Saved vehicle'}</small></span>{id===m.store.vehicleId&&<span className="aa22-shopping-tag">Shopping</span>}</button>:<div key={id} className="aa22-vehicle-unavailable"><strong>{id.replace('yamaha-','').toUpperCase()}</strong><small>Not currently in the catalog</small><button type="button" disabled={writing} onClick={()=>setDialog({kind:'remove',id,label:id})}>Remove</button></div>;})}
            {!garage.vehicleIds.length&&<button type="button" className="aa22-first-vehicle" data-aa-light disabled={writing||!choices.length} onClick={addDialog}><span className="aa22-plus-outline"><OneIcon name="plus"/></span><span><strong>{loading?'Syncing your garage…':'Start with your NVX'}</strong><small>{choices.length?'Save a version to make this space yours.':'No available NVX version in the catalog.'}</small></span></button>}</div>
          </section>
          {m.view==='overview'?<section className="aa22-activity" aria-label="Recent orders" data-aa-enter><div className="aa22-section-head"><h2>Recent activity</h2><button type="button" className="aa22-text-action" onClick={()=>m.go('orders')}>View orders{typeof welcomeCount==='number'?` (${welcomeCount})`:''}</button></div>
            {m.error?<div className="aa22-inline-error" role="alert">{m.error}<button type="button" onClick={m.retry}>Try again</button></div>:!m.records?<p className="aa22-muted" role="status">Loading orders…</p>:m.records.data.length?<OrderRows22A rows={m.records.data.slice(0,2)} openOrder={m.openOrder}/>:<div className="aa22-activity-empty"><OneIcon name="orders"/><div><strong>No orders yet.</strong><p>Your next build starts with a part.</p></div><Link to="/shop" className="aa22-action aa22-secondary" data-aa-light>Explore parts</Link></div>}
          </section>:<section className="aa22-parts" aria-label="Parts for the previewed vehicle" data-aa-enter><div className="aa22-section-head"><h2>For {selected?.model||'your ride'}</h2><span className="aa22-muted">Demo fitment</span></div><div className="aa22-parts-strip">{parts.slice(0,3).filter(productHref22A).map(p=><Link className="aa22-part" key={p.id} to={productHref22A(p)}><div><ProductImage product={p}/></div><span><strong>{p.name}</strong><small>{formatMoney(p.price)}</small></span></Link>)}{!parts.length&&<p className="aa22-muted">No matching parts in this demo catalog.</p>}</div></section>}
        </>}
        {m.view==='orders'&&<OrdersPanel22A member={m} detail={orderDetail}/>}
        {m.view==='security'&&<ProfilePanel22A member={m} defaultVehicle={saved} shoppingVehicle={shopping}/>}
        <p className="aa22-disclosure">Illustrative 3D. Demo prices and fitment. No real payment or shipment.</p>
      </div>
    </div>
    {dialog?.kind==='add'&&<AccountDialog22A title="Add your NVX" busy={busy} onClose={()=>setDialog(null)}><form onSubmit={e=>{e.preventDefault();if(choices.some(v=>v.id===candidate))void commit('add',candidate);}}><p className="aa22-dialog-note">Choose the version to save. {garage.vehicleIds.length===0?'Your first vehicle becomes the default.':'Your current default will stay unchanged.'}</p><fieldset className="aa22-add-choices" disabled={writing}><legend>Available versions</legend>{choices.map(v=><label key={v.id} data-selected={v.id===candidate}><input type="radio" name="aa22-add" value={v.id} checked={candidate===v.id} onChange={()=>setCandidate(v.id)}/><strong>{v.model}</strong><span>Yamaha</span></label>)}</fieldset>{error&&<p className="aa22-inline-error" role="alert">{error}</p>}<div className="aa22-dialog-actions"><button type="button" data-initial-focus className="aa22-action aa22-secondary" disabled={busy} onClick={()=>setDialog(null)}>Cancel</button><button type="submit" className="aa22-action aa22-primary" disabled={writing||!choices.some(v=>v.id===candidate)}>{busy?'Saving…':'Add to garage'}</button></div></form></AccountDialog22A>}
    {dialog?.kind==='remove'&&<AccountDialog22A title={`Remove ${dialog.label}?`} busy={busy} onClose={()=>setDialog(null)}><p className="aa22-dialog-note">{garage.defaultVehicleId===dialog.id?'This also clears your saved default. ':''}Your shopping selection, bag and orders will not be changed.</p>{error&&<p className="aa22-inline-error" role="alert">{error}</p>}<div className="aa22-dialog-actions"><button type="button" data-initial-focus className="aa22-action aa22-secondary" disabled={busy} onClick={()=>setDialog(null)}>Cancel</button><button type="button" className="aa22-action aa22-danger" disabled={writing} onClick={()=>void commit('remove',dialog.id)}>{busy?'Removing…':'Remove vehicle'}</button></div></AccountDialog22A>}
  </div>;
}
