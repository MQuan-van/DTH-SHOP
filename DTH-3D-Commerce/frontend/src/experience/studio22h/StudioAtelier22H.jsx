import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useStore } from '../../shop/useStore';
import ProductImage from '../../shop/catalog/components/ProductImage';
import { formatMoney, fitment } from '../../../../shared/domain.mjs';
import { vehicleLabel } from '../../../../shared/nvx.mjs';
import { useStartupWebGL } from '../loader/StartupRenderContext.jsx';
import { hasWebGL, useExperiencePolicy } from '../interaction/useExperiencePolicy';
import { useStageActivity } from '../../shop/home/hooks/useStudioMotion.js';
import { useSceneInputGate } from '../interaction/useSceneInputGate.js';
import useIntroCover from '../journey/useIntroCover.js';
import { STUDIO_CATEGORIES, catalog22H, playable22H, choose22H, gallery22H, boundProduct22H, categoryName22H, swatch22H, quality22H, productHref22H, createDirector22H } from './studio22h.logic.mjs';
import { useAtelierMotion22H, usePartSwitch22H, usePartEntrance22H } from './useAtelierMotion22H.js';
import './studio22h.css';
const StudioScene22H = lazy(() => import('./StudioScene22H.jsx'));

function Price22H({ product }) {
  return Number.isSafeInteger(product?.price) && product.price >= 0 ? <span>{formatMoney(product.price)}</span> : <span>Price unavailable</span>;
}
function Gallery22H({ products, currentId }) {
  const items = useMemo(() => gallery22H(products, currentId), [products, currentId]);
  if (!items.length) return null;
  return <section className="a22-edit" id="atelier-edit" aria-labelledby="atelier-edit-title">
    <div className="a22-section-head" data-atelier-reveal><h2 id="atelier-edit-title">The edit<span>.</span></h2><Link className="a22-text-link" to="/shop">All parts</Link></div>
    <div className="a22-editorial-grid" data-count={items.length}>
      {items.map((product, i) => <article className={`a22-edit-item ${i === 0 ? 'a22-edit-lead' : ''}`} key={product.id} data-atelier-reveal>
        <Link className="a22-edit-image" to={productHref22H(product)} aria-label={`View ${product.name}`}>
          <ProductImage product={product} className="a22-preview" />
          <span className="a22-edit-cta" aria-hidden="true">View part</span>
        </Link>
        <div className="a22-edit-caption"><div><p>{categoryName22H(product.category)}</p><h3><Link to={productHref22H(product)}>{product.name}</Link></h3></div><Price22H product={product} /></div>
      </article>)}
    </div>
  </section>;
}
function Garage22H({ products, vehicles, vehicleId, setVehicle, chooseVehicle }) {
  const vehicle = vehicles.find(v => v.id === vehicleId);
  const choices = vehicles.filter(v => /^yamaha-nvx-v[123]$/.test(v?.id || ''));
  const matching = vehicle ? products.filter(p => fitment(p, vehicle.id, vehicles).status === 'compatible').length : null;
  return <section className="a22-garage" aria-labelledby="atelier-garage-title">
    <div className="a22-garage-mark" aria-hidden="true"><i /><i /><i /></div>
    <div className="a22-garage-copy" data-atelier-reveal><h2 id="atelier-garage-title">Your garage<span>.</span></h2>
      <p>{vehicle ? vehicleLabel(vehicle) : 'Choose your NVX'}</p></div>
    <div className="a22-garage-actions" data-atelier-reveal>
      {choices.length > 0 && <div className="a22-vehicle-choices" role="group" aria-label="Choose your demo vehicle">
        {choices.map(v => <button key={v.id} type="button" aria-pressed={v.id === vehicleId} onClick={() => setVehicle(v.id)}>{v.model}</button>)}
      </div>}
      <p className="a22-garage-count" role="status">{vehicle ? `${matching} ${matching === 1 ? 'part' : 'parts'} in the demo fitment catalog` : 'A starting point for your next build.'}</p>
      {vehicle ? <Link to="/shop?mode=shop&fit=match" className="a22-button a22-blue">Explore matching parts</Link>
        : <button type="button" onClick={chooseVehicle} className="a22-button a22-blue">Choose vehicle</button>}
      <small>Demo compatibility. Verify installation with your supplier.</small>
    </div>
  </section>;
}

export default function StudioAtelier22H({ config, version = 0, binding }) {
  const store = useStore(), outlet = useOutletContext(), policy = useExperiencePolicy(), covered = useIntroCover();
  const root = useRef(null), hero = useRef(null), sceneLayer = useRef(null), api = useRef(null), inspectButton = useRef(null);
  const director = useMemo(createDirector22H, []);
  const active = useStageActivity(hero);
  const { capable, allow3D } = useStartupWebGL(hasWebGL);
  useSceneInputGate(director);
  const all = useMemo(() => catalog22H(store.data?.products), [store.data?.products]);
  const candidates = useMemo(() => playable22H(all), [all]);
  const [selectedId, setSelectedId] = useState(''), [pending, setPending] = useState(''), [switchSerial, setSwitchSerial] = useState(0);
  const record = choose22H(candidates, selectedId, config?.productId);
  const product = useMemo(() => boundProduct22H(record, binding), [record, binding]);
  const [motion, setMotion] = useState(true), [inspect, setInspect] = useState(false), [view, setView] = useState('front');
  const [readyKey, setReadyKey] = useState('');
  const key = product ? `${product.id}:${product.modelUrl}` : '';
  const ready = readyKey === key && !!key;
  const enabled = motion && !policy.reduced && !covered;
  const vehicles = store.data?.vehicles || [], vehicle = vehicles.find(v => v.id === store.vehicleId);
  const match = product ? fitment(product, store.vehicleId, vehicles) : null;
  const chooseVehicle = outlet?.chooseVehicle || (() => {});
  const sameCategory = candidates.filter(p => p.category === product?.category);
  const index = candidates.findIndex(p => p.id === product?.id);
  const onStatus = useCallback(state => { setReadyKey(state === 'ready' ? key : ''); }, [key]);

  useLayoutEffect(() => {
    const html = document.documentElement, previous = html.getAttribute('data-dth-atelier');
    html.setAttribute('data-dth-atelier', 'true');
    const measure = () => { const h = document.querySelector('.dth-header'); root.current?.style.setProperty('--a22-header', `${Math.ceil(h?.getBoundingClientRect().height || 80)}px`); };
    measure(); const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    const header = document.querySelector('.dth-header'); if (header) observer?.observe(header);
    return () => { observer?.disconnect(); if (previous === null) html.removeAttribute('data-dth-atelier'); else html.setAttribute('data-dth-atelier', previous); };
  }, []);
  useLayoutEffect(() => { director.set({ motion: enabled, active: active && !covered, inspect, view }); }, [director, enabled, active, covered, inspect, view]);
  useEffect(() => { setInspect(false); setView('front'); setReadyKey(''); director.set({ inspect: false, view: 'front', serial: director.state.serial + 1 }); }, [key, director]);
  useEffect(() => {
    if (!inspect) return undefined;
    const escape = event => {
      if (event.key !== 'Escape' || document.querySelector('dialog[open], .dth-support-panel')) return;
      setInspect(false); inspectButton.current?.focus({ preventScroll: true });
    };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, [inspect]);
  const commit = useCallback(id => { setSelectedId(id); setPending(''); setSwitchSerial(n => n + 1); }, []);
  const transition = usePartSwitch22H(sceneLayer, enabled, commit);
  usePartEntrance22H(sceneLayer, `${key}:${switchSerial}`, enabled);
  useAtelierMotion22H(root, enabled, covered);
  function selectPart(id) {
    if (!candidates.some(p => p.id === id) || (id === product?.id && !pending)) return;
    setPending(id); setInspect(false); transition(id);
  }
  function selectCategory(category) {
    const candidate = candidates.find(p => p.category === category && p.featured) || candidates.find(p => p.category === category);
    if (candidate) selectPart(candidate.id);
  }
  const modelCount = sameCategory.length;
  return <div className="a22" ref={root} data-studio="22H.1" data-motion={enabled ? 'on' : 'off'} data-experience-version={version}>
    {product ? <section className="a22-hero" ref={hero} data-inspect={inspect} data-long-name={(product.name || "").length > 28} aria-label="DTH interactive parts studio">
      <div className="a22-atmosphere" aria-hidden="true"><div /><i /></div>
      <div className="a22-category-word" aria-hidden="true">{categoryName22H(product.category)}</div>
      <div className="a22-top" data-atelier-enter>
        <span className="a22-edition">DTH Atelier<span className="a22-separator" />{String(index + 1).padStart(2, '0')} / {String(candidates.length).padStart(2, '0')}</span>
        <div className="a22-top-actions"><button type="button" onClick={() => setMotion(v => !v)} disabled={policy.reduced} aria-pressed={enabled}>{policy.reduced ? 'Reduced motion' : motion ? 'Pause motion' : 'Play motion'}</button><a href="#atelier-edit">Browse the edit</a></div>
      </div>
      <div className="a22-scene-layer" ref={sceneLayer}>
        <div className="a22-ground" aria-hidden="true" />
        <Suspense fallback={<div className="a22-load" role="status"><p>Preparing your view</p></div>}>
          <StudioScene22H product={product} director={director} api={api} dpr={quality22H(policy)} allowed={allow3D} capable={capable} onStatus={onStatus} />
        </Suspense>
      </div>
      <div className="a22-info" data-atelier-enter>
        <p className="a22-product-category">{categoryName22H(product.category)}</p>
        <h1>{product.name}</h1>
        <p className="a22-finish"><span style={{ backgroundColor: swatch22H(product.accent) }} aria-hidden="true" />{product.finish || 'Original finish'}</p>
        <div className="a22-price"><Price22H product={product} /><small>Demo price</small></div>
        <div className="a22-actions"><Link to={productHref22H(product)} className="a22-button a22-blue a22-product-link">View part</Link>
          <button type="button" ref={inspectButton} className="a22-button a22-outline" onClick={() => setInspect(v => !v)} disabled={!ready} aria-pressed={inspect}>{inspect ? 'Exit inspect' : 'Inspect 3D'}</button></div>
        <button type="button" onClick={chooseVehicle} className="a22-fit-link">{vehicle ? vehicleLabel(vehicle) : 'Select your vehicle'}</button>
        {vehicle && <p className="a22-match" data-match={match.status}>{match.text}</p>}
      </div>
      <div className="a22-view-rail" role="group" aria-label="Camera views" data-atelier-enter>
        {['front', 'detail', 'rear'].map((id, i) => <button key={id} type="button" disabled={!ready} aria-pressed={view === id} onClick={() => { setView(id); setMotion(false); director.set({ view: id, motion: false, serial: director.state.serial + 1 }); }}><span aria-hidden="true">0{i+1}</span>{id === 'front' ? 'Front' : id === 'rear' ? 'Rear' : 'Detail'}</button>)}
      </div>
      {inspect && <div className="a22-inspection" role="group" aria-label="3D inspection tools">
        <span>Drag to rotate</span><button type="button" onClick={() => api.current?.zoom(0.88)}>Zoom in</button><button type="button" onClick={() => api.current?.zoom(1.14)}>Zoom out</button>
        <button type="button" onClick={() => { setView('front'); api.current?.reset(); }}>Reset view</button>
      </div>}
      <div className="a22-selection" data-atelier-enter>
        <div className="a22-selection-meta"><span>{pending ? 'Changing part' : ready ? 'Original 3D model' : '3D studio'}</span><span>{modelCount} {modelCount === 1 ? 'part' : 'parts'} in {categoryName22H(product.category).toLowerCase()}</span></div>
        <nav className="a22-category-rail" aria-label="Choose part category">
          {STUDIO_CATEGORIES.map(c => { const count = candidates.filter(p => p.category === c.id).length; return <button key={c.id} type="button" disabled={!count} aria-pressed={product.category === c.id} onClick={() => selectCategory(c.id)}>{c.label}<span>{String(count).padStart(2, '0')}</span></button>; })}
        </nav>
        {modelCount > 1 && <div className="a22-part-choices" role="group" aria-label={`Choose ${categoryName22H(product.category).toLowerCase()} product`}>
          {sameCategory.map(p => <button key={p.id} type="button" aria-pressed={p.id === product.id} onClick={() => selectPart(p.id)}>{p.name}</button>)}
        </div>}
      </div>
    </section> : <section className="a22-empty"><h1>The studio is taking shape.</h1><p>No published 3D part is available.</p><Link to="/shop" className="a22-button a22-blue">Explore parts</Link></section>}
    <div className="a22-bridge" data-atelier-bridge aria-hidden="true" />
    <Gallery22H products={all} currentId={product?.id} />
    <Garage22H products={all} vehicles={vehicles} vehicleId={store.vehicleId} setVehicle={store.setVehicle} chooseVehicle={chooseVehicle} />
    <p className="a22-footnote">Illustrative 3D models. Demo prices and vehicle compatibility. No real payment or shipment.</p>
  </div>;
}
