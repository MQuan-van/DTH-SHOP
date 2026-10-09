import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useOutletContext, useSearchParams } from 'react-router-dom';
import { useStore } from '../useStore';
import { useExperiencePolicy } from '../../experience/interaction/useExperiencePolicy';
import { getPriceCeiling, readShopQuery, selectShopProducts, patchShopQuery, resetShopFilters } from '../catalog/catalog.logic.mjs';
import { MODES, LAYOUTS, readDiscovery, changeMode, changeLayout, changeSpotlight, discoveryHref, selectSpotlight, buildProducts, nvxChoices, buildContextKey, sanitizeDraft, pinProduct } from './discovery.logic.mjs';
import ExploreExperience from './ExploreExperience';
import BuildExperience from './BuildExperience';
import '../ux17/commerce17.css';
import './discovery174.css';
const CatalogPage = lazy(() => import('../catalog/ShopPage'));

/** One route, one StoreProvider, one cart. Catalog implementation remains untouched. */
export default function DiscoveryPage() {
  const store = useStore(), location = useLocation(), { chooseVehicle } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const state = readDiscovery(params), policy = useExperiencePolicy();
  const [paused, setPaused] = useState(false);
  const motion = !paused && !policy.reduced;
  const modeNav = useRef(null);
  const ceiling = useMemo(() => getPriceCeiling(store.data.products), [store.data.products]);
  const query = useMemo(() => readShopQuery(params, ceiling), [params, ceiling]);
  const products = useMemo(() => selectShopProducts(store.data.products, store.data.vehicles, store.vehicleId, query), [store.data, store.vehicleId, query]);
  const eligible = useMemo(() => buildProducts(store.data.products, store.data.vehicles, store.vehicleId), [store.data, store.vehicleId]);
  const matches = useMemo(() => selectShopProducts(eligible, store.data.vehicles, store.vehicleId, { ...query, fit: 'match' }), [eligible, store.data.vehicles, store.vehicleId, query]);
  const selected = selectSpotlight(state.mode === 'build' ? matches : products, state.spotlight);
  const key = buildContextKey(store.user?.id, store.vehicleId);
  const [savedDraft, setDraft] = useState({ key, ids: [] });
  // No localStorage: never leak another account/vehicle's draft in this page.
  const draft = savedDraft.key === key ? sanitizeDraft(savedDraft.ids, store.data.products, store.data.vehicles, store.vehicleId) : [];
  useEffect(() => { setDraft(previous => previous.key === key ? previous : { key, ids: [] }); }, [key]);
  useEffect(() => { document.title = `${state.mode === 'build' ? 'Build your NVX' : state.mode === 'explore' ? 'Explore parts' : 'Shop parts'} — DTH`; }, [state.mode]);
  const fromShop = `/shop${location.search}`;
  function onMode(mode) { setParams(previous => changeMode(previous, mode)); }
  function onSelect(id) { setParams(previous => changeSpotlight(previous, id), { replace: true }); }
  function onBuild(id) { setParams(previous => changeSpotlight(changeMode(previous, 'build'), id)); }
  function onVehicle(id) {
    if (!nvxChoices(store.data.vehicles).some(vehicle => vehicle.id === id)) return;
    store.setVehicle(id);
    setParams(previous => patchShopQuery(previous, { mode: 'build', fit: 'match', spotlight: '' }));
  }
  function onCategory(category) { setParams(previous => patchShopQuery(previous, { mode: state.mode === 'build' ? 'build' : 'shop', category, spotlight: '' })); }
  function onReset() { setParams(previous => { const next = resetShopFilters(previous); next.delete('spotlight'); return next; }); }
  function onPin(product) {
    setDraft(previous => ({ key, ids: pinProduct(previous.key === key ? previous.ids : [], product, eligible) }));
    store.setNotice('Build list updated. Your bag has not changed.');
  }
  function onRemove(id) { setDraft(previous => previous.key === key ? { key, ids: previous.ids.filter(item => item !== id) } : { key, ids: [] }); }
  return <div className="d174-root" data-discovery-shell data-mode={state.mode} data-layout={state.layout} data-motion={motion ? 'on' : 'off'}>
    <header className="d174-mode-bar" ref={modeNav}>
      <Link className="d174-home-mark" to="/">DTH <span>PARTS ATELIER</span></Link>
      <nav className="d174-mode-nav" aria-label="Shop experience">{MODES.map(mode => <Link key={mode} to={discoveryHref(changeMode(params, mode))} aria-current={state.mode === mode ? 'page' : undefined}>
        {mode[0].toUpperCase() + mode.slice(1)}<span aria-hidden="true">{mode === 'explore' ? '01' : mode === 'shop' ? '02' : '03'}</span>
      </Link>)}</nav>
      {state.mode !== 'shop' ? <button className="d174-motion-toggle" type="button" aria-pressed={motion} disabled={policy.reduced} onClick={() => setPaused(value => !value)}>{policy.reduced ? 'Reduced motion' : motion ? 'Pause motion' : 'Play motion'}</button>
        : <div className="d174-layouts" role="group" aria-label="Catalog layout">{LAYOUTS.map(layout => <button key={layout} type="button" aria-pressed={state.layout === layout} onClick={() => setParams(previous => changeLayout(previous, layout), { replace: true })}>{layout[0].toUpperCase() + layout.slice(1)}</button>)}</div>}
    </header>
    {state.mode === 'shop' ? <Suspense fallback={<div className="d174-empty" role="status">Opening catalog…</div>}><CatalogPage /></Suspense>
      : state.mode === 'explore' ? <ExploreExperience products={products} selected={selected} motion={motion} policy={policy} fromShop={fromShop}
        onSelect={onSelect} onMode={onMode} onCategory={onCategory} onBuild={onBuild} onChooseVehicle={chooseVehicle} />
      : <BuildExperience store={store} query={query} matches={matches} eligible={eligible} selected={selected} draft={draft} motion={motion} policy={policy} fromShop={fromShop}
        onSelect={id => { const pinned = draft.find(item => item.id === id); if (pinned && !matches.some(item => item.id === id)) setParams(previous => patchShopQuery(previous, { mode: 'build', category: pinned.category, q: '', max: '', spotlight: id })); else onSelect(id); }}
        onVehicle={onVehicle} onChooseVehicle={chooseVehicle} onCategory={onCategory} onReset={onReset} onPin={onPin} onRemove={onRemove} onMode={onMode} />}
  </div>;
}
