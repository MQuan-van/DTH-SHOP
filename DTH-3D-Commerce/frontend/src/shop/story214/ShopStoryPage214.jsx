import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { formatMoney, fitment } from '../../../../shared/domain.mjs';
import { commerceAvailability } from '../../../../shared/productCommerce.mjs';
import { productHref21 } from '../../../../shared/productPresentation21.mjs';
import { useStore } from '../useStore';
import { useExperiencePolicy } from '../../experience/interaction/useExperiencePolicy';
import { SHOP_CONFIG } from '../catalog/catalog.config.mjs';
import { getPriceCeiling, readShopQuery, selectShopProducts, patchShopQuery, resetShopFilters } from '../catalog/catalog.logic.mjs';
import FilterPanel from '../catalog/components/FilterPanel';
import ShopDialog from '../catalog/components/ShopDialog';
import { compactFitLabel, displayPrice } from '../ux17/commerce17.logic.mjs';
import { vehicleCaption } from '../catalog/fitment/fitment.logic.mjs';
import { createStoryClock214, returnToChapter214 } from './story214.logic.mjs';
import { useStoryScroll214 } from './useStoryScroll214';
import { STORY214 } from './story214.config.mjs';
import './story214.css';
const StoryScene214=lazy(()=>import('./StoryScene214.jsx'));
const pad=n=>String(n).padStart(2,'0');

function ProductCopy214({product,vehicleId,vehicles,fromShop,onChooseVehicle,index,register}) {
  const match=fitment(product,vehicleId,vehicles),vehicle=vehicles.find(v=>v.id===vehicleId);
  const availability=commerceAvailability(product),price=displayPrice(product),href=productHref21(product);
  const accent=/^#[a-f0-9]{6}$/i.test(product.accent||'')?product.accent:'#2563eb';
  return <article ref={node=>register(index,node)} className="dth-story214-copy" data-story214-copy={index} aria-hidden={index!==0} inert={index!==0}>
    <div className="dth-story214-copy-inner">
      <p className="dth-story214-category">{SHOP_CONFIG.categories.find(c=>c.id===product.category)?.label||'Part'}</p>
      <h2>{product.name}</h2>
      <p className="dth-story214-finish"><span style={{backgroundColor:accent}} aria-hidden="true"/>{product.finish||'Original finish'}</p>
      <p className="dth-story214-price">{price===null?'Price unavailable':formatMoney(price)}<small>Demo price</small></p>
      <p className="dth-story214-availability">{availability.label}</p>
      <p className="dth-story214-fit" data-status={match.status}>{compactFitLabel(match.status,vehicleCaption(vehicle))}</p>
      <div className="dth-story214-actions">
        {href?<Link to={href} state={{fromShop}} className="dth-story214-primary"><span>View details</span><span aria-hidden="true">↗</span></Link>:<span>Product link unavailable</span>}
        <button type="button" className="dth-story214-text-button" onClick={onChooseVehicle}>{vehicleId?'Change vehicle':'Check fit'}<span aria-hidden="true">↗</span></button>
      </div>
    </div>
  </article>;
}
export default function ShopStoryPage214() {
  const store=useStore(),{chooseVehicle}=useOutletContext();
  const [params,setParams]=useSearchParams(),policy=useExperiencePolicy();
  const root=useRef(null),runway=useRef(null),stage=useRef(null),bar=useRef(null),filterTrigger=useRef(null),copies=useRef(new Map()),sceneApi=useRef(null),line=useRef(null);
  const [paused,setPaused]=useState(false),[filters,setFilters]=useState(false),[search,setSearch]=useState(params.get('q')||''),[statuses,setStatuses]=useState({});
  const motion=!paused&&!policy.reduced;
  const ceiling=useMemo(()=>getPriceCeiling(store.data.products,SHOP_CONFIG.priceStep),[store.data.products]);
  const query=useMemo(()=>readShopQuery(params,ceiling),[params,ceiling]);
  const products=useMemo(()=>selectShopProducts(store.data.products,store.data.vehicles,store.vehicleId,query),[store.data.products,store.data.vehicles,store.vehicleId,query]);
  const counts=useMemo(()=>{const pool=selectShopProducts(store.data.products,store.data.vehicles,store.vehicleId,query,{ignoreCategories:true});return Object.fromEntries(SHOP_CONFIG.categories.map(c=>[c.id,pool.filter(p=>p.category===c.id).length]));},[store.data.products,store.data.vehicles,store.vehicleId,query]);
  const signature=products.map(p=>`${p.id}:${p.modelUrl}:${p.presentation3d?.revision||''}`).join('|');
  const clock=useMemo(()=>createStoryClock214(products.length,motion),[signature,motion]);
  const [current,setCurrent]=useState(0),lastPrimary=useRef(-1);
  const seek=useStoryScroll214({root,runway,stage,bar,clock,count:products.length,signature,motion,initialChapter:params.get('chapter'),products});
  useEffect(()=>setSearch(query.search),[query.search]);
  useEffect(()=>{const old=document.title;document.title='Parts — DTH 3D Studio';return()=>{document.title=old;};},[]);
  const register=useCallback((i,node)=>{if(node)copies.current.set(i,node);else copies.current.delete(i);},[]);
  const onStatus=useCallback((id,value)=>setStatuses(previous=>({...previous,[id]:value})),[]);
  useLayoutEffect(()=>{
    const paint=frame=>{
      if(frame.primary!==lastPrimary.current){lastPrimary.current=frame.primary;setCurrent(Math.max(0,frame.primary));}
      for(const [index,node] of copies.current){
        const isLeft=index===frame.left,isRight=index===frame.right&&frame.right!==frame.left;
        const opacity=isLeft?1-frame.mix:isRight?frame.mix:0,shift=isLeft?-30*frame.mix:isRight?30*(1-frame.mix):30;
        node.style.opacity=String(opacity);node.style.transform=`translate3d(0,${motion?shift:0}px,0)`;
        const active=index===frame.primary;node.inert=!active;node.setAttribute('aria-hidden',String(!active));node.style.pointerEvents=active?'auto':'none';
      }
      if(line.current)line.current.style.transform=`scaleX(${products.length>1?frame.position/(products.length-1):1})`;
    };
    paint(clock.read());return clock.subscribe(paint);
  },[clock,motion,signature,products.length]);
  const change=(patch)=>setParams(previous=>{const next=patchShopQuery(previous,patch);next.delete('chapter');return next;});
  const reset=()=>{setSearch('');setParams(previous=>{const next=resetShopFilters(previous);next.delete('chapter');return next;});};
  const openVehicle=()=>{setFilters(false);requestAnimationFrame(()=>chooseVehicle());};
  const vehicle=store.data.vehicles.find(v=>v.id===store.vehicleId),active=products[Math.min(current,Math.max(0,products.length-1))];
  const status=active&&statuses[active.id]?.url===active.modelUrl?statuses[active.id]:null;
  const filterProps={query,counts,ceiling,vehicle,vehicleId:store.vehicleId,onPatch:change,onChooseVehicle:openVehicle,onReset:reset};
  const runwayStyle={'--story214-steps':Math.max(0,products.length-1),'--story214-segment':`${STORY214.segmentViewport*100}svh`};
  return <section ref={root} className="dth-story214" data-story-shop="21.4" data-motion={motion?'on':'off'}>
    <div className="dth-story214-heading"><h1>Parts<span>.</span></h1><span>{products.length} {products.length===1?'part':'parts'}</span>
      <form onSubmit={e=>{e.preventDefault();change({q:search});}} role="search"><label className="dth-story214-sr" htmlFor="story214-search">Search parts</label><input id="story214-search" type="search" placeholder="Find your next detail" value={search} maxLength={160} onChange={e=>setSearch(e.target.value)}/><button type="submit" aria-label="Search parts">↗</button></form>
    </div>
    <div ref={bar} className="dth-story214-bar">
      <nav aria-label="Part categories" className="dth-story214-categories">
        <button type="button" aria-pressed={!query.categories.length} onClick={()=>change({category:[]})}>All</button>
        {SHOP_CONFIG.categories.map(c=><button type="button" key={c.id} aria-pressed={query.categories.includes(c.id)} onClick={()=>change({category:[c.id]})}>{c.label}<small>{counts[c.id]||0}</small></button>)}
      </nav>
      <div className="dth-story214-bar-actions"><button type="button" onClick={openVehicle} className="dth-story214-vehicle">{vehicle?vehicleCaption(vehicle):'Your NVX'}<span aria-hidden="true">↗</span></button>
        <button type="button" ref={filterTrigger} onClick={()=>setFilters(true)} aria-haspopup="dialog">Filters</button>
        <button type="button" aria-pressed={motion} disabled={policy.reduced} onClick={()=>setPaused(v=>!v)}>{policy.reduced?'Reduced motion':motion?'Pause motion':'Play motion'}</button></div>
      <div className="dth-story214-progress" aria-hidden="true"><i ref={line}/></div>
    </div>
    {products.length?<div ref={runway} className="dth-story214-runway" style={runwayStyle}>
      <div ref={stage} className="dth-story214-stage">
        <div className="dth-story214-model-space">
          <div className="dth-story214-ring" aria-hidden="true"/><div className="dth-story214-ground" aria-hidden="true"/>
          <Suspense fallback={<div className="dth-story214-model-status">Preparing 3D…</div>}><StoryScene214 products={products} clock={clock} compact={policy.compact} motion={motion} onStatus={onStatus} api={sceneApi}/></Suspense>
          {status?.state!=='prepared'&&<div className="dth-story214-model-status" role="status"><p>{status?.error||'Loading full-detail 3D…'}</p>
            {status?.state==='error'&&<button type="button" onClick={()=>{onStatus(active.id,{url:active.modelUrl,state:'loading'});sceneApi.current?.retry(active.id);}}>Retry 3D</button>}</div>}
          <span className="dth-story214-original">Original model · Scroll to explore</span>
        </div>
        <div className="dth-story214-copy-space">{products.map((p,i)=><ProductCopy214 key={p.id} product={p} index={i} register={register} vehicleId={store.vehicleId} vehicles={store.data.vehicles} onChooseVehicle={openVehicle} fromShop={returnToChapter214(params,p.id)}/>)}</div>
        <footer className="dth-story214-stage-footer"><span aria-live="polite" aria-atomic="true">{pad(current+1)} <span className="dth-story214-divider">/</span> {pad(products.length)}</span>
          <label className="dth-story214-jump"><span className="dth-story214-sr">Jump to product</span><select aria-label="Jump to product" value={active?.id||''} onChange={e=>seek.current(products.findIndex(p=>p.id===e.target.value))}>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <div className="dth-story214-step-buttons"><button type="button" aria-label="Previous product" disabled={current<=0} onClick={()=>seek.current(current-1)}>↑</button><button type="button" aria-label="Next product" disabled={current>=products.length-1} onClick={()=>seek.current(current+1)}>↓</button></div>
        </footer>
      </div>
    </div>:<div className="dth-story214-empty"><h2>No matching parts.</h2><p>Your vehicle selection is kept.</p><button type="button" onClick={reset}>Clear filters</button></div>}
    <p className="dth-story214-fine">Demo prices and vehicle mappings. No real payment or shipment.</p>
    {filters&&<ShopDialog title="Refine parts" onClose={()=>setFilters(false)} restoreFocus={filterTrigger.current} motion={motion} duration={240} className="dth-story214-filter-dialog"><div className="dth-story214-filters"><FilterPanel {...filterProps}/>
      <label className="dth-story214-sort">Sort by<select aria-label="Sort parts" value={query.sort} onChange={e=>change({sort:e.target.value})}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name: A–Z</option></select></label>
      <button type="button" className="dth-story214-primary" onClick={()=>setFilters(false)}>Show {products.length} parts <span aria-hidden="true">↗</span></button></div></ShopDialog>}
  </section>;
}
