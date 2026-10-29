import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useStore } from '../../shop/useStore';
import ProductImage from '../../shop/catalog/components/ProductImage';
import { fitment, formatMoney } from '../../../../shared/domain.mjs';
import { vehicleLabel } from '../../../../shared/nvx.mjs';
import { useStartupAllowed } from '../loader/StartupRenderContext.jsx';
import { useExperiencePolicy } from '../interaction/useExperiencePolicy.js';
import { useSceneInputGate } from '../interaction/useSceneInputGate.js';
import useIntroCover from '../journey/useIntroCover.js';
import Garage22H2 from './Garage22H2.jsx';
import StudioIcon from './StudioIcons22H2.jsx';
import { CATEGORIES22H2, catalog22H2, playable22H2, choose22H2, bindProduct22H2, gallery22H2, categoryLabel22H2, href22H2, swatch22H2, createSignal22H2 } from './studio22h2.logic.mjs';
import { useShell22H2, useStageLease22H2, useStudioEffects22H2, useProductEntrance22H2 } from './useStudioEffects22H2.js';
import './studio22h2.css';
const ProductStage22H2 = lazy(() => import('./ProductStage22H2.jsx'));
const modeNames = { overview: 'Full view', pick: 'Pick a detail', orbit: 'Free orbit' };
const price = p => Number.isSafeInteger(p?.price) && p.price >= 0 ? formatMoney(p.price) : 'Price unavailable';
function Gallery22H2({ products, currentId }) {
  const edit = useMemo(() => gallery22H2(products, currentId), [products, currentId]);
  if (!edit.length) return null;
  return <section className="s222-edit" aria-labelledby="s222-edit-title">
    <header className="s222-edit-head" data-studio-reveal><h2 id="s222-edit-title">The selected edit.</h2><Link to="/shop" className="s222-button s222-ink" data-precision-button>View collection</Link></header>
    <div className="s222-edit-grid" data-count={edit.length}>{edit.map((p, index) => <article key={p.id} className={`s222-edit-card ${index === 0 ? 's222-edit-lead' : ''}`} data-studio-reveal>
      <Link to={href22H2(p)} className="s222-edit-media" aria-label={`View ${p.name}`}><ProductImage product={p}/><span>View part</span></Link>
      <div className="s222-edit-caption"><div><p>{categoryLabel22H2(p.category)}</p><h3><Link to={href22H2(p)}>{p.name}</Link></h3></div><span>{price(p)}</span></div>
    </article>)}</div>
  </section>;
}
export default function StudioAtelier22H2({ config, version = 0, binding }) {
  const store = useStore(), outlet = useOutletContext(), policy = useExperiencePolicy(), covered = useIntroCover(), startup = useStartupAllowed();
  const root = useRef(null), hero = useRef(null), garage = useRef(null), sceneLayer = useRef(null), api = useRef(null), inspectButton = useRef(null);
  const signal = useMemo(createSignal22H2, []); useSceneInputGate(signal); useShell22H2(root);
  const catalog = useMemo(() => catalog22H2(store.data?.products), [store.data?.products]);
  const candidates = useMemo(() => playable22H2(catalog), [catalog]);
  const [selected, setSelected] = useState(''), [mode, setMode] = useState('overview'), [readyKey, setReadyKey] = useState(''), [pickState, setPickState] = useState('');
  const record = choose22H2(candidates, selected, config?.productId);
  const product = useMemo(() => bindProduct22H2(record, binding), [record, binding]);
  const key = product ? `${product.id}:${product.modelUrl}` : '';
  const owner = useStageLease22H2(hero, garage, startup && !covered);
  const ready = !!key && key === readyKey && owner === 'hero';
  const vehicles = store.data?.vehicles || [], vehicle = vehicles.find(v => v.id === store.vehicleId);
  const match = product ? fitment(product, store.vehicleId, vehicles) : null;
  const chooseVehicle = outlet?.chooseVehicle || (() => {});
  const siblings = candidates.filter(p => p.category === product?.category);
  useStudioEffects22H2(root, !policy.reduced && !covered);
  useProductEntrance22H2(sceneLayer, key, !policy.reduced && !covered);
  useLayoutEffect(() => { signal.set({ active: owner === 'hero' && !covered, reduced: policy.reduced, mode }); }, [signal, owner, covered, policy.reduced, mode]);
  useEffect(() => { setMode('overview'); setPickState(''); setReadyKey(''); signal.set({ mode: 'overview', serial: signal.state.serial + 1 }); }, [key, signal]);
  useEffect(() => { if (owner !== 'hero') { setReadyKey(''); setMode('overview'); setPickState(''); } }, [owner]);
  useEffect(() => {
    const escape = e => { if (e.key !== 'Escape' || mode === 'overview' || document.querySelector('dialog[open], .dth-support-panel')) return; setMode('overview'); signal.set({ mode: 'overview', serial: signal.state.serial + 1 }); inspectButton.current?.focus({ preventScroll: true }); };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, [mode, signal]);
  const onStatus = useCallback(state => { setReadyKey(state === 'ready' ? key : ''); }, [key]);
  const onPicked = useCallback(hit => setPickState(hit ? 'focused' : 'miss'), []);
  function setView(next) { if (!ready) return; setMode(next); setPickState(''); signal.set({ mode: next, serial: signal.state.serial + 1 }); }
  function selectPart(id) { if (candidates.some(p => p.id === id)) { setSelected(id); setMode('overview'); signal.set({ mode: 'overview', serial: signal.state.serial + 1 }); } }
  function selectCategory(id) { const p = candidates.find(p => p.category === id && p.featured) || candidates.find(p => p.category === id); if (p) selectPart(p.id); }
  return <div ref={root} className="s222" data-studio="22H.2" data-motion={policy.reduced ? 'reduced' : 'auto'} data-experience-version={version}>
    {product ? <section className="s222-hero" ref={hero} aria-label="Interactive parts atelier" data-mode={mode}>
      <div className="s222-stage-light" aria-hidden="true"/><div className="s222-category-word" aria-hidden="true">{categoryLabel22H2(product.category)}</div>
      <div className="s222-edition" data-studio-enter><span>Atelier</span><i/><span>{String(candidates.findIndex(p => p.id === product.id) + 1).padStart(2, '0')} / {String(candidates.length).padStart(2, '0')}</span></div>
      <div className="s222-scene" ref={sceneLayer} data-mode={mode}>
        <div className="s222-ground" aria-hidden="true"/>
        {owner === 'hero' ? <Suspense fallback={<div className="s222-loading" role="status">Opening 3D</div>}>
          <ProductStage22H2 product={product} signal={signal} api={api} active={owner === 'hero'} reduced={policy.reduced || policy.saveData} mode={mode} onStatus={onStatus} onPicked={onPicked}/>
        </Suspense> : <div className="s222-parked" aria-hidden="true"/>}
      </div>
      <div className="s222-info" data-studio-enter><p className="s222-overline">{categoryLabel22H2(product.category)}</p><h1>{product.name}</h1>
        <p className="s222-finish"><i style={{ background: swatch22H2(product.accent) }}/>{product.finish || 'Original finish'}</p>
        <p className="s222-price">{price(product)}<small>Demo price</small></p>
        <div className="s222-actions"><Link className="s222-button s222-primary" data-precision-button to={href22H2(product)}>View part</Link>
          <button ref={inspectButton} className="s222-button s222-ghost" type="button" data-precision-button disabled={!ready} aria-pressed={mode !== 'overview'} onClick={() => setView(mode === 'overview' ? 'orbit' : 'overview')}><StudioIcon name={mode === 'overview' ? 'orbit' : 'close'}/>{mode === 'overview' ? 'Inspect 3D' : 'Exit inspection'}</button></div>
        <button className="s222-fit-link" type="button" onClick={chooseVehicle}>{vehicle ? vehicleLabel(vehicle) : 'Select vehicle'}</button>
        {vehicle && <p className="s222-fit-status" data-match={match.status}>{match.text}</p>}
      </div>
      <div className="s222-console" data-studio-enter>
        <div className="s222-mode-dock" role="group" aria-label="3D viewing mode">
          {['overview','pick','orbit'].map((id, i) => <button key={id} type="button" aria-pressed={mode === id} data-precision-button disabled={!ready} onClick={() => setView(id)}><StudioIcon name={id}/><span>{modeNames[id]}</span><small aria-hidden="true">0{i+1}</small></button>)}
        </div>
        {mode !== 'overview' && <div className="s222-inspector" role="group" aria-label="Inspection controls">
          <p role="status">{mode === 'pick' ? pickState === 'focused' ? 'Selected detail' : pickState === 'miss' ? 'Choose a point on the visible model.' : 'Choose a detail on the model.' : 'Drag to rotate. Scroll to browse.'}</p>
          <div><button type="button" onClick={() => api.current?.zoom(0.88)} disabled={!ready} aria-label="Zoom product in">+</button><button type="button" onClick={() => api.current?.zoom(1.14)} disabled={!ready} aria-label="Zoom product out">−</button>
            {mode === 'pick' ? <button type="button" onClick={() => api.current?.centerDetail()} disabled={!ready}>Center detail</button> : <><button type="button" onClick={() => api.current?.rotate(-Math.PI/6)} disabled={!ready}>Rotate left</button><button type="button" onClick={() => api.current?.rotate(Math.PI/6)} disabled={!ready}>Rotate right</button></>}
            <button type="button" onClick={() => setView('overview')} disabled={!ready}><StudioIcon name="reset"/>Reset</button></div>
        </div>}
      </div>
      <div className="s222-selection" data-studio-enter>
        <nav className="s222-category-dock" aria-label="Choose part category">{CATEGORIES22H2.map(c => { const count = candidates.filter(p => p.category === c.id).length;
          return <button key={c.id} type="button" data-precision-button disabled={!count} aria-pressed={product.category === c.id} onClick={() => selectCategory(c.id)}><StudioIcon name={c.id}/><span>{c.label}</span><b>{String(count).padStart(2, '0')}</b></button>; })}</nav>
        {siblings.length > 1 && <div className="s222-product-switch" role="group" aria-label="Choose product">{siblings.map(p => <button key={p.id} type="button" aria-pressed={p.id === product.id} onClick={() => selectPart(p.id)}>{p.name}</button>)}</div>}
      </div>
    </section> : <section className="s222-empty"><h1>The atelier.</h1><p>No published 3D product is available.</p><Link to="/shop" className="s222-button s222-primary">Explore parts</Link></section>}
    <Gallery22H2 products={catalog} currentId={product?.id}/>
    <Garage22H2 sectionRef={garage} active={owner === 'garage'} reduced={policy.reduced} signal={signal} products={catalog} vehicles={vehicles} vehicleId={store.vehicleId} setVehicle={store.setVehicle} chooseVehicle={chooseVehicle}/>
  </div>;
}
