import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useOutletContext } from 'react-router-dom';
import gsap from 'gsap';
import { useStore } from '../../shop/useStore.jsx';
import { fitment } from '../../../../shared/domain.mjs';
import { vehicleLabel } from '../../../../shared/nvx.mjs';
import { getPresentation21 } from '../../../../shared/productPresentation21.mjs';
import { CATEGORIES, categoryLabel } from '../../../../shared/categories.mjs';
import { useStartupAllowed } from '../loader/StartupRenderContext.jsx';
import { useExperiencePolicy } from '../interaction/useExperiencePolicy.js';
import useIntroCover from '../journey/useIntroCover.js';
import { createSignal22H2, href22H2 } from '../studio22h2/studio22h2.logic.mjs';
import { galleryKey24, galleryPrice } from '../galleryDemo24/gallery-demo.logic.mjs';
import { useGalleryInput24, useGalleryModal24 } from '../gallery24/useGalleryModal24.js';
import { family25, leaderPath25, selectionShelf25 } from '../studio25Preview/studio25.data.mjs';
import { spatialCatalog25, spatialSelection25 } from './spatial25.logic.mjs';
import { bundledStill25 } from './static-previews25.mjs';
import StudioColorWash25 from './StudioColorWash25.jsx';
import './spatial25.css';
const SpatialStage25 = lazy(() => import('../studio25Preview/SpatialStage25.jsx'));

function Icon25({ name }) {
  const paths = { plus: 'M12 4v16M4 12h16', minus: 'M4 12h16', close: 'm5 5 14 14M19 5 5 19', pause: 'M8 5v14M16 5v14', play: 'm8 5 11 7-11 7Z', inspect: 'm12 2 9 5v10l-9 5-9-5V7Zm-9 5 9 5 9-5M12 12v10', expand: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5' };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.plus}/></svg>;
}
function StillFrame25({ src, pending = false, eager = false }) {
  const [failedSrc, setFailedSrc] = useState('');
  if (src && src !== failedSrc) return <img src={src} alt="" width="352" height="352" loading={eager ? 'eager' : 'lazy'} decoding="async" draggable="false" onError={() => setFailedSrc(src)}/>;
  return <span className="dsp25-still-placeholder"><Icon25 name="inspect"/><span>{pending ? 'Preparing 3D preview…' : '3D preview unavailable'}</span></span>;
}

/** Live Studio presentation. StoreProvider, published experience and original model validators own facts. */
export default function StudioSpatial25({ config, version = 0, binding }) {
  const store = useStore(), outlet = useOutletContext(), policy = useExperiencePolicy();
  const startup = useStartupAllowed(), covered = useIntroCover(), allowed = startup && !covered, reduced = policy.reduced;
  const root = useRef(null), hero = useRef(null), canvasHost = useRef(null), title = useRef(null), line = useRef(null), dot = useRef(null), lineLayer = useRef(null), sceneApi = useRef(null);
  const dialog = useRef(null), dialogTrigger = useRef(null), measurements = useRef(null), lastAnchor = useRef(null), revealSelection = useRef(false);
  const slot = useRef(null), expandedDialog = useRef(null), expandButton = useRef(null), closeExpanded = useRef(null), expandedMode = useRef(false), restoreExpandFocus = useRef(false);
  const shelfRegion = useRef(null);
  const signal = useMemo(createSignal22H2, []);
  const [selectedId, setSelected] = useState(''), [status, setStatus] = useState({ phase: 'loading', displayProductId: '' });
  const [paused, setPaused] = useState(false), [inspect, setInspect] = useState(false), [active, setActive] = useState(true), [sceneStarted, setSceneStarted] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false), [expanded, setExpanded] = useState(false), [filter, setFilter] = useState('all'), [search, setSearch] = useState('');
  const [shelfNear, setShelfNear] = useState(false), [stills, setStills] = useState(() => new Map());
  expandedMode.current = expanded;
  // Exclude the active gallery dialog from the external gate; collectionOpen still blocks its scene.
  const ownDialog = useMemo(() => ({ get current() { return expandedMode.current ? expandedDialog.current : dialog.current; } }), []);
  const externalBlocked = useGalleryInput24(signal, ownDialog);
  const portalHost = useGalleryModal24(expanded, setExpanded, slot, expandedDialog, closeExpanded, expandButton);
  const products = useMemo(() => spatialCatalog25(store.data?.products, binding), [store.data?.products, binding]);
  const selected = spatialSelection25(products, selectedId, config?.productId);
  const displayed = products.find(product => product.id === status.displayProductId) || selected;
  const displayRef = useRef(displayed), statusRef = useRef(status); displayRef.current = displayed; statusRef.current = status;
  const family = useMemo(() => family25(products, displayed), [products, displayed]);
  const shelfId = selected && displayed && selected.category === displayed.category ? selected.id : displayed?.id;
  const shelf = useMemo(() => selectionShelf25(family, shelfId), [family, shelfId]);
  const blocked = externalBlocked || collectionOpen, ready = status.phase === 'ready', moving = status.phase === 'transition';
  const captureShelf = shelfNear && allowed && !blocked && !expanded && !policy.saveData;
  const shelfProducts = useMemo(() => captureShelf ? shelf.map(({ product }) => product)
    .filter(product => !bundledStill25(product) && !stills.has(galleryKey24(product))) : [], [captureShelf, shelf, stills]);
  const onShelfPoster = useCallback((key, url) => {
    if (typeof key !== 'string' || !key || (url !== null && (typeof url !== 'string' || !url.startsWith('data:image/png;base64,')))) return;
    setStills(previous => {
      if (previous.has(key)) return previous;
      const next = new Map(previous); next.set(key, url);
      if (next.size > 24) next.delete(next.keys().next().value);
      return next;
    });
  }, []);
  const stillSrc = product => stills.get(galleryKey24(product)) || bundledStill25(product);
  const loadingStill = stillSrc(selected);
  const canInspect = !!displayed && ready && allowed && active && !blocked;
  const price = galleryPrice(displayed), href = href22H2(displayed), vehicle = store.data?.vehicles?.find(item => item.id === store.vehicleId);
  const match = displayed ? fitment(displayed, store.vehicleId, store.data?.vehicles || []) : null;
  const authoredStop = getPresentation21(displayed)?.spin.enabled === false, rotationOff = reduced || policy.saveData || authoredStop;
  const specs = Object.entries(displayed?.specs || {}).filter(([key, value]) => key && (typeof value === 'string' || typeof value === 'number' && Number.isFinite(value))).slice(0, 2);
  const filtered = products.filter(product => (filter === 'all' || product.category === filter) && `${product.name} ${product.finish || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const owner = JSON.stringify([store.user?.id || '', store.vehicleId || '']);
  const anchorGate = useRef(null); anchorGate.current = { allowed, active, blocked, expanded };

  useLayoutEffect(() => {
    const html = document.documentElement, previous = html.getAttribute('data-studio-spatial25');
    html.setAttribute('data-studio-spatial25', 'true');
    return () => { previous === null ? html.removeAttribute('data-studio-spatial25') : html.setAttribute('data-studio-spatial25', previous); };
  }, []);
  useEffect(() => { if (allowed) setSceneStarted(true); }, [allowed]);
  useEffect(() => {
    if (typeof IntersectionObserver !== 'function') { setShelfNear(true); return; }
    const node = shelfRegion.current;
    if (!node) return;
    let live = true;
    const observer = new IntersectionObserver(([entry]) => { if (live && entry?.target === node) setShelfNear(entry.isIntersecting); }, { rootMargin: '180px 0px' });
    observer.observe(node);
    return () => { live = false; observer.disconnect(); };
  }, []);
  useEffect(() => {
    let live = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (live && entry?.target === hero.current && entry.target.isConnected) setActive(entry.isIntersecting);
    }, { threshold: .01 });
    if (hero.current) observer.observe(hero.current);
    return () => { live = false; observer.disconnect(); };
  }, [portalHost, expanded, collectionOpen]);
  useEffect(() => { sceneApi.current?.pauseRotation(paused); }, [paused, ready]);
  useEffect(() => { restoreExpandFocus.current = false; setCollectionOpen(false); setExpanded(false); setInspect(false); setPaused(false); sceneApi.current?.reset(); }, [owner]);
  useEffect(() => {
    if (!restoreExpandFocus.current || expanded || !canInspect) return;
    restoreExpandFocus.current = false;
    if (document.activeElement === document.body || document.activeElement === expandedDialog.current) expandButton.current?.focus({ preventScroll: true });
  }, [expanded, canInspect]);
  useEffect(() => {
    if (!expanded || !canInspect || inspect) return;
    setInspect(true); sceneApi.current?.setInspect(true);
  }, [expanded, canInspect, inspect]);
  const report = useCallback(value => { setStatus(value); if (value.phase === 'transition' || value.phase === 'error') setInspect(false); }, []);
  const anchor = useCallback(value => {
    lastAnchor.current = value;
    const m = measurements.current;
    const gate = anchorGate.current;
    if (!lineLayer.current || !m || !value?.visible || value.productId !== displayRef.current?.id || statusRef.current.phase !== 'ready' || !gate.allowed || !gate.active || gate.blocked || gate.expanded) { if (lineLayer.current) lineLayer.current.style.opacity = '0'; return; }
    const end = { x: m.canvasX + value.x, y: m.canvasY + value.y }, path = leaderPath25(m.start, end, m.bounds);
    lineLayer.current.style.opacity = path ? '1' : '0';
    if (path) { line.current?.setAttribute('d', path); dot.current?.setAttribute('cx', end.x); dot.current?.setAttribute('cy', end.y); }
  }, []);
  useLayoutEffect(() => {
    let live = true;
    const measure = () => {
      if (!live || !hero.current || !canvasHost.current || !title.current) return;
      const h = hero.current.getBoundingClientRect(), c = canvasHost.current.getBoundingClientRect(), t = title.current.getBoundingClientRect();
      measurements.current = { canvasX: c.left - h.left, canvasY: c.top - h.top, start: { x: t.right - h.left + 15, y: t.top - h.top + Math.min(32, t.height * .5) }, bounds: { width: h.width, height: h.height } };
      anchor(lastAnchor.current);
    };
    const observer = new ResizeObserver(measure);
    [hero.current, canvasHost.current, title.current].filter(Boolean).forEach(el => observer.observe(el));
    measure(); document.fonts?.ready.then(measure);
    return () => { live = false; observer.disconnect(); };
  }, [displayed?.id, anchor, portalHost]);
  // A stationary/reduced scene may not emit a new projection after the ready state commits.
  useLayoutEffect(() => { anchor(lastAnchor.current); }, [status.phase, displayed?.id, allowed, active, blocked, expanded, anchor]);
  useLayoutEffect(() => {
    const context = gsap.context(() => {
      if (!reduced && allowed) gsap.timeline({ defaults: { ease: 'power3.out' } })
        .fromTo('.dsp25-callout-content > *', { y: 7, opacity: 0 }, { y: 0, opacity: 1, duration: .3, stagger: .025, clearProps: 'transform,opacity' });
    }, root);
    return () => context.revert();
  }, [displayed?.id, reduced, allowed]);
  useLayoutEffect(() => {
    const el = dialog.current;
    if (!collectionOpen || !el) return;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    if (!el.open) el.showModal();
    return () => { if (el.open) el.close(); document.body.style.overflow = overflow; if (dialogTrigger.current?.isConnected) dialogTrigger.current.focus({ preventScroll: true }); };
  }, [collectionOpen]);
  const modalOpen = collectionOpen || expanded;
  useLayoutEffect(() => {
    if (!modalOpen) return;
    const html = document.documentElement, previous = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { html.style.overflow = previous; };
  }, [modalOpen]);
  useEffect(() => {
    if (collectionOpen || !revealSelection.current) return;
    revealSelection.current = false;
    const rect = canvasHost.current?.getBoundingClientRect();
    if (rect && (rect.bottom < Math.min(220, rect.height * .5) || rect.top < -rect.height * .3 || rect.top > innerHeight)) hero.current?.scrollIntoView({ block: 'start', behavior: reduced ? 'instant' : 'smooth' });
  }, [selected?.id, collectionOpen, reduced]);

  function select(product) {
    if (!allowed || externalBlocked) return;
    restoreExpandFocus.current = false;
    if (product.id !== selected?.id) { setSelected(product.id); setInspect(false); revealSelection.current = true; }
    setCollectionOpen(false);
  }
  function toggleInspect() { if (!canInspect) return; const next = !inspect; setInspect(next); sceneApi.current?.setInspect(next); }
  function reset() { setInspect(false); setPaused(false); sceneApi.current?.reset(); }
  function endExpanded() { restoreExpandFocus.current = true; setExpanded(false); reset(); }
  function step(delta) { if (!family.length) return; const index = family.findIndex(product => product.id === shelfId); select(family[(Math.max(0, index) + delta + family.length) % family.length]); }
  const statusText = !selected ? 'No published 3D parts are available.' : !allowed ? 'Preparing the studio…' : status.phase === 'error' ? status.message || 'The original model could not load. Try again.' : blocked ? '3D paused' : status.phase === 'loading' ? `Opening ${selected.name}…` : moving ? `Moving to ${selected.name}…` : ready ? 'Original 3D model' : 'Opening the collection…';

  return <div className="dsp25" data-studio="spatial25" data-live="true" data-experience-version={version} data-phase={status.phase} data-active={active} data-allowed={allowed} data-blocked={blocked} ref={root}>
    <StudioColorWash25 pageRoot={root} enabled={allowed && !blocked && !expanded && !reduced && !policy.saveData}/>
    <div className="dsp25-page-intro"><span>The parts gallery</span><Link to="/shop?mode=build">Build your NVX</Link></div>
    <div ref={slot} className="dsp25-stage-slot"/>
    <dialog ref={expandedDialog} className="dsp25-expanded-shell" aria-label="Expanded 3D product inspection" onCancel={event => { event.preventDefault(); endExpanded(); }}/>
    {createPortal(<section className="dsp25-hero" ref={hero} aria-label="Spatial product gallery" data-transition={moving} data-expanded={expanded}>
      <div className="dsp25-stage-halo" aria-hidden="true"/>
      <div className="dsp25-canvas" ref={canvasHost} onKeyDownCapture={event => { if (event.key === 'Escape') { if (expanded) { event.preventDefault(); event.stopPropagation(); endExpanded(); } else if (inspect) { event.preventDefault(); reset(); } } }}>
        <Suspense fallback={<p className="dsp25-scene-message">Opening the 3D studio…</p>}>
          {!!products.length && (allowed || sceneStarted) && <SpatialStage25 key={store.user?.id || 'guest'} products={products} selectedId={selected?.id || ''} active={active && allowed} reduced={reduced} orbitDisabled={policy.saveData} blocked={blocked} onStatus={report} onAnchor={anchor} apiRef={sceneApi} shelfProducts={shelfProducts} onShelfPoster={onShelfPoster}/>}
        </Suspense>
        {loadingStill && (!sceneStarted || status.phase === 'loading' && !status.displayProductId) && <div className="dsp25-loading-poster" aria-hidden="true"><StillFrame25 src={loadingStill} eager/></div>}
      </div>
      <svg className="dsp25-leader" ref={lineLayer} aria-hidden="true"><path ref={line}/><circle ref={dot} r="3"/></svg>
      <article className="dsp25-callout" aria-label="Displayed product information"><div className="dsp25-callout-content">
        <p className="dsp25-category"><i/>{displayed ? categoryLabel(displayed.category) : 'The collection'}</p>
        <h1 ref={title} data-long={(displayed?.name?.length || 0) > 14}>{displayed?.name || 'No 3D parts here.'}</h1>
        {displayed ? <>
          <p className="dsp25-finish">{displayed.finish || 'Original finish'}</p>
          <p className="dsp25-price">{price || 'Price unavailable'}<span>{price ? displayed.demoOnly ? 'Demo price' : 'Catalog price' : 'Check product details'}</span></p>
          {!!specs.length && <dl className="dsp25-specs">{specs.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl>}
          <div className="dsp25-product-actions">{href && <Link className="dsp25-primary" to={href}>View product</Link>}<button className="dsp25-inspect" type="button" disabled={!canInspect} aria-pressed={inspect} onClick={toggleInspect}><Icon25 name="inspect"/>{inspect ? 'Overview' : 'Inspect'}</button></div>
          <button className="dsp25-vehicle-context" type="button" disabled={!allowed || externalBlocked} onClick={outlet?.chooseVehicle}>{vehicle ? vehicleLabel(vehicle) : 'Choose your NVX'}</button>
          {vehicle && match && <p className="dsp25-fit" data-match={match.status}>{match.text}</p>}
          <p className="dsp25-disclosure">{displayed.demoOnly ? 'Illustrative model · synthetic fitment' : 'Original uploaded model'}</p>
        </> : <><p className="dsp25-finish">No published 3D products are available.</p><Link className="dsp25-primary" to="/shop">Open collection</Link></>}
      </div></article>
      <div className="dsp25-scene-meta"><span><i/>{ready ? 'Original 3D' : '3D studio'}</span><span>{String(Math.max(0, products.findIndex(product => product.id === displayed?.id) + 1)).padStart(2, '0')}<small> / {String(products.length).padStart(2, '0')}</small></span></div>
      {expanded ? <div className="dsp25-expanded-top"><span>{displayed?.name}</span><strong>{price || 'Price unavailable'}{price && <small>{displayed?.demoOnly ? 'Demo price' : 'Catalog price'}</small>}</strong><button type="button" ref={closeExpanded} onClick={endExpanded}><Icon25 name="close"/>Close expanded view</button></div> : <button className="dsp25-expand" type="button" ref={expandButton} disabled={!canInspect} aria-label="Expand 3D view" onClick={() => setExpanded(true)}><Icon25 name="expand"/><span>Expand</span></button>}
      <div className="dsp25-tools" role="group" aria-label="3D viewing controls">{inspect ? <>
        <button type="button" disabled={!canInspect} onClick={() => sceneApi.current?.orbit(-Math.PI / 8)}>Rotate left</button><button type="button" disabled={!canInspect} onClick={() => sceneApi.current?.orbit(Math.PI / 8)}>Rotate right</button>
        <button type="button" disabled={!canInspect} aria-label="Zoom out" onClick={() => sceneApi.current?.zoom(1.12)}><Icon25 name="minus"/></button><button type="button" disabled={!canInspect} aria-label="Zoom in" onClick={() => sceneApi.current?.zoom(.89)}><Icon25 name="plus"/></button><button type="button" disabled={!canInspect} onClick={reset}>Reset</button>
      </> : <><span>{reduced ? 'Reduced motion' : rotationOff ? 'Rotation off' : paused ? 'Rotation paused' : 'Slow orbit'}</span><button type="button" aria-label={paused ? 'Resume rotation' : 'Pause rotation'} disabled={rotationOff || !canInspect} onClick={() => setPaused(value => !value)}><Icon25 name={paused || rotationOff ? 'play' : 'pause'}/></button></>}</div>
      <p className="dsp25-status" role="status" aria-live="polite">{statusText}{status.phase === 'error' && <button type="button" disabled={!allowed || blocked} onClick={() => sceneApi.current?.retry()}>Retry model</button>}</p>
    </section>, portalHost)}
    <section className="dsp25-selection" ref={shelfRegion} aria-label="Choose a product" inert={expanded}>
      <div className="dsp25-selection-heading"><div><span>The collection</span><h2>{displayed ? categoryLabel(displayed.category) : 'Parts'}</h2></div><button type="button" className="dsp25-open-collection" disabled={!allowed || externalBlocked || !products.length} onClick={event => { dialogTrigger.current = event.currentTarget; setCollectionOpen(true); }}>All parts <span>{products.length}</span><Icon25 name="plus"/></button></div>
      <div className="dsp25-shelf" data-items={shelf.length}>{shelf.map(({ product, role }) => {
        const src = stillSrc(product);
        return <button className="dsp25-shelf-item" type="button" key={product.id} data-position={role} data-selected={shelfId === product.id} disabled={!allowed || externalBlocked} aria-pressed={shelfId === product.id} aria-label={`View ${product.name}`} onClick={() => select(product)}>
          <span className="dsp25-shelf-image" aria-hidden="true"><StillFrame25 src={src} pending={shelfProducts.includes(product)}/></span><span className="dsp25-shelf-copy"><small>{product.finish || categoryLabel(product.category)}</small><strong>{product.name}</strong></span><i aria-hidden="true"/>
        </button>;
      })}</div>
      {family.length > 1 && <div className="dsp25-selection-navigation"><button type="button" disabled={!allowed || externalBlocked} onClick={() => step(-1)}>Previous part</button><span>{Math.max(0, family.findIndex(product => product.id === shelfId) + 1)} of {family.length}</span><button type="button" disabled={!allowed || externalBlocked} onClick={() => step(1)}>Next part</button></div>}
    </section>
    <div className="dsp25-live-end"><Link to="/shop">View collection</Link><p>Demo compatibility, not installation advice.</p><Link to="/shop?mode=build">Open interactive Build</Link></div>
    <dialog ref={dialog} className="dsp25-dialog" aria-labelledby="dsp25-live-collection-title" onCancel={event => { event.preventDefault(); setCollectionOpen(false); }} onClose={event => { if (!event.currentTarget.open) setCollectionOpen(false); }}>
      <header className="dsp25-dialog-header"><div><span>The collection</span><h2 id="dsp25-live-collection-title">Find your next part.</h2></div><button type="button" aria-label="Close collection" onClick={() => setCollectionOpen(false)}><Icon25 name="close"/></button></header>
      <div className="dsp25-collection-tools"><label>Category<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All parts ({products.length})</option>{CATEGORIES.map(id => <option key={id} value={id}>{categoryLabel(id)} ({products.filter(product => product.category === id).length})</option>)}</select></label><label>Search parts<input type="search" name="studio-product-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Product name…" maxLength="120" autoComplete="off"/></label></div>
      <div className="dsp25-collection-grid">{filtered.map(product => {
        const src = stillSrc(product);
        return <button type="button" key={product.id} className="dsp25-collection-product" aria-pressed={selected?.id === product.id} onClick={() => select(product)}><span className="dsp25-dialog-still" aria-hidden="true"><StillFrame25 src={src}/></span><span><small>{categoryLabel(product.category)}</small><strong>{product.name}</strong><span>{galleryPrice(product) || 'Price unavailable'}</span></span></button>;
      })}</div>
      {!filtered.length && <div className="dsp25-empty"><h3>No parts here yet.</h3><p>Try another category or clear your search.</p><button type="button" onClick={() => { setFilter('all'); setSearch(''); }}>View all parts</button></div>}
    </dialog>
  </div>;
}
