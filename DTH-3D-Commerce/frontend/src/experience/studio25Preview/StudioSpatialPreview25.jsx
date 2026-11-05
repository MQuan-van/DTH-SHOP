import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import baseCatalog from '../../../../shared/catalog.json';
import Header25 from './Header25.jsx';
import { CATEGORIES, categoryLabel } from '../../../../shared/categories.mjs';
import { galleryPoster24 } from '../galleryDemo24/gallery-demo.logic.mjs';
import { family25, leaderPath25, offlineCatalog25, previewCatalog25, productHref25, productPrice25, selectionShelf25 } from './studio25.data.mjs';
import './studio25-preview.css';
const SpatialStage25 = lazy(() => import('./SpatialStage25.jsx'));
const VERSIONS = [1, 2, 3].map(n => ({ id: `yamaha-nvx-v${n}`, make: 'Yamaha', model: `NVX V${n}` }));
function Icon25({ name }) {
  const paths = { plus: 'M12 4v16M4 12h16', minus: 'M4 12h16', close: 'm5 5 14 14M19 5 5 19', pause: 'M8 5v14M16 5v14', play: 'm8 5 11 7-11 7Z', orbit: 'M5 7v5h5M5 12a7 7 0 1 1 3 7', reset: 'M4 9a8 8 0 1 1 0 6M4 3v6h6', inspect: 'm12 2 9 5v10l-9 5-9-5V7Zm-9 5 9 5 9-5M12 12v10' };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.plus} /></svg>;
}
function PreviewImage25({ product, ...props }) {
  return <img src={galleryPoster24(product)} alt="" width="512" height="512" {...props} onError={event => { if (event.currentTarget.getAttribute('src') !== product.imageUrl) event.currentTarget.src = product.imageUrl; }} />;
}
export default function StudioSpatialPreview25() {
  const root = useRef(null), hero = useRef(null), canvasHost = useRef(null), title = useRef(null), line = useRef(null), dot = useRef(null), lineLayer = useRef(null), sceneApi = useRef(null);
  const dialog = useRef(null), dialogTrigger = useRef(null), measurements = useRef(null), lastAnchor = useRef(null);
  const [products, setProducts] = useState([]), [source, setSource] = useState('loading'), [selectedId, setSelected] = useState('');
  const [status, setStatus] = useState({ phase: 'loading', displayProductId: '' }), [paused, setPaused] = useState(false), [inspect, setInspect] = useState(false);
  const [panel, setPanel] = useState(null), [filter, setFilter] = useState('all'), [search, setSearch] = useState(''), [vehicle, setVehicle] = useState(null), [active, setActive] = useState(true);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const selected = products.find(p => p.id === selectedId) || products[0] || null;
  const displayed = products.find(p => p.id === status.displayProductId) || selected;
  const displayRef = useRef(displayed), statusRef = useRef(status); displayRef.current = displayed; statusRef.current = status;
  const family = useMemo(() => family25(products, displayed), [products, displayed]);
  const shelf = useMemo(() => selectionShelf25(family, selected && displayed && selected.category === displayed.category ? selected.id : displayed?.id), [family, selected, displayed]);
  const price = productPrice25(displayed), href = productHref25(displayed), ready = status.phase === 'ready', moving = status.phase === 'transition';
  const canInspect = !!displayed && ready;
  const filtered = products.filter(p => (filter === 'all' || p.category === filter) && `${p.name} ${p.finish || ''}`.toLowerCase().includes(search.toLowerCase().trim()));
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)'), change = () => setReduced(media.matches);
    media.addEventListener('change', change); return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    const controller = new AbortController(); let live = true;
    const timer = setTimeout(() => controller.abort(), 12000);
    fetch('/api/shop/products', { signal: controller.signal, credentials: 'omit', headers: { Accept: 'application/json' } })
      .then(async response => { if (!response.ok) throw Error('Catalog unavailable'); const payload = await response.json(); if (!Array.isArray(payload?.data)) throw Error('Unreadable catalog'); return previewCatalog25(payload.data); })
      .then(items => { if (live) { setProducts(items); setSelected(items[0]?.id || ''); setSource('live'); } })
      .catch(() => { if (live) { const items = offlineCatalog25(baseCatalog.products); setProducts(items); setSelected(items[0]?.id || ''); setSource('local'); } })
      .finally(() => clearTimeout(timer));
    return () => { live = false; clearTimeout(timer); controller.abort(); };
  }, []);
  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: .01 });
    if (hero.current) io.observe(hero.current); return () => io.disconnect();
  }, []);
  useEffect(() => { sceneApi.current?.pauseRotation(paused); }, [paused, ready]);
  const report = useCallback(value => { setStatus(value); if (value.phase === 'transition' || value.phase === 'error') setInspect(false); }, []);
  const anchor = useCallback(value => {
    lastAnchor.current = value;
    const m = measurements.current;
    if (!lineLayer.current || !m || !value?.visible || value.productId !== displayRef.current?.id || statusRef.current.phase !== 'ready') { if (lineLayer.current) lineLayer.current.style.opacity = '0'; return; }
    const end = { x: m.canvasX + value.x, y: m.canvasY + value.y }, path = leaderPath25(m.start, end, m.bounds);
    lineLayer.current.style.opacity = path ? '1' : '0';
    if (!path) return;
    line.current?.setAttribute('d', path); dot.current?.setAttribute('cx', end.x); dot.current?.setAttribute('cy', end.y);
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
  }, [displayed?.id, anchor]);
  useLayoutEffect(() => {
    const context = gsap.context(() => {
      if (!reduced) gsap.timeline({ defaults: { ease: 'power3.out' } })
        .fromTo('.dsp25-callout-content > *', { y: 7, opacity: 0 }, { y: 0, opacity: 1, duration: .3, stagger: .025, clearProps: 'transform,opacity' });
    }, root);
    return () => context.revert();
  }, [displayed?.id, reduced]);
  useLayoutEffect(() => {
    const el = dialog.current;
    if (!panel || !el) return;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    if (!el.open) el.showModal();
    return () => { if (el.open) el.close(); document.body.style.overflow = overflow; dialogTrigger.current?.isConnected && dialogTrigger.current.focus({ preventScroll: true }); };
  }, [panel]);
  function showPanel(name, trigger) { dialogTrigger.current = trigger?.isConnected ? trigger : document.activeElement; setPanel(name); }
  function select(product) { if (product.id !== selected?.id) { setSelected(product.id); setInspect(false); } setPanel(null); }
  function toggleInspect() { const next = !inspect; setInspect(next); sceneApi.current?.setInspect(next); }
  function reset() { setInspect(false); setPaused(false); sceneApi.current?.reset(); }
  function step(delta) { if (!family.length) return; const index = family.findIndex(p => p.id === selected?.id); select(family[(Math.max(0, index) + delta + family.length) % family.length]); }
  const statusText = status.phase === 'error' ? status.message || 'The original 3D model could not load. Try again.' : status.phase === 'loading' ? `Opening ${selected?.name || 'the collection'}…` : moving ? `Moving to ${selected?.name || 'the next part'}…` : ready ? 'Original 3D model' : 'Opening the collection…';
  return <div className="dsp25" ref={root} data-preview="studio25" data-phase={status.phase}>
    <a className="dsp25-skip" href="#dsp25-main">Skip to collection</a>
    <div className="dsp25-preview-note"><span>Studio / spatial design preview</span><a href="/">Current website</a></div>
    <Header25 vehicle={vehicle} onVehicle={trigger => showPanel('vehicle', trigger)} onAccount={trigger => showPanel('account', trigger)} onBag={trigger => showPanel('bag', trigger)} bagCount={0} studioHref="/studio-spatial-preview.html" />
    <main id="dsp25-main">
      <div className="dsp25-page-intro"><span>Find your next detail.</span><a href="/shop?mode=build">Build your NVX</a></div>
      <section className="dsp25-hero" ref={hero} aria-label="Spatial product gallery" data-transition={moving}>
        <div className="dsp25-stage-halo" aria-hidden="true" />
        <div className="dsp25-canvas" ref={canvasHost} onKeyDownCapture={event => { if (event.key === 'Escape' && inspect) { event.preventDefault(); reset(); } }}>
          <Suspense fallback={<p className="dsp25-scene-message">Opening the 3D studio…</p>}>
            {!!products.length && <SpatialStage25 products={products} selectedId={selected?.id || ''} active={active} reduced={reduced} blocked={!!panel} onStatus={report} onAnchor={anchor} apiRef={sceneApi} />}
          </Suspense>
          {status.phase === 'loading' && !status.displayProductId && selected && <div className="dsp25-loading-poster" aria-hidden="true"><PreviewImage25 product={selected} /></div>}
        </div>
        <svg className="dsp25-leader" ref={lineLayer} aria-hidden="true"><path ref={line} /><circle ref={dot} r="3" /></svg>
        <article className="dsp25-callout" aria-label="Displayed product information">
          <div className="dsp25-callout-content">
            <p className="dsp25-category"><i />{displayed ? categoryLabel(displayed.category) : 'The collection'}</p>
            <h1 ref={title} data-long={(displayed?.name?.length || 0) > 14}>{displayed?.name || (source === 'loading' ? 'Opening the studio.' : 'Your next detail.')}</h1>
            {displayed && <>
              <p className="dsp25-finish">{displayed.finish || 'Original finish'}</p>
              <p className="dsp25-price">{price || 'Asset study'}<span>{price ? displayed.demoOnly ? 'Demo price' : 'Catalog price' : 'No catalog price assigned'}</span></p>
              <div className="dsp25-product-actions">{href ? <a className="dsp25-primary" href={href}>View product</a> : <button className="dsp25-primary" type="button" disabled={!canInspect} aria-pressed={inspect} onClick={toggleInspect}>{inspect ? 'Overview' : 'Study in 3D'}</button>}
                {href && <button className="dsp25-inspect" type="button" disabled={!canInspect} aria-pressed={inspect} onClick={toggleInspect}><Icon25 name="inspect" />{inspect ? 'Overview' : 'Inspect'}</button>}</div>
              <button className="dsp25-vehicle-context" type="button" onClick={e => showPanel('vehicle', e.currentTarget)}>{vehicle ? `${vehicle.make} ${vehicle.model}` : 'Choose your NVX'}</button>
            </>}
          </div>
        </article>
        <div className="dsp25-scene-meta"><span><i />{status.phase === 'ready' ? 'Original 3D' : '3D studio'}</span><span>{String(Math.max(0, products.findIndex(p => p.id === displayed?.id) + 1)).padStart(2, '0')}<small> / {String(products.length).padStart(2, '0')}</small></span></div>
        <div className="dsp25-tools" role="group" aria-label="3D viewing controls">
          {inspect ? <><button type="button" onClick={() => sceneApi.current?.orbit(-Math.PI / 8)}>Rotate left</button><button type="button" onClick={() => sceneApi.current?.orbit(Math.PI / 8)}>Rotate right</button><button type="button" aria-label="Zoom out" onClick={() => sceneApi.current?.zoom(1.12)}><Icon25 name="minus" /></button><button type="button" aria-label="Zoom in" onClick={() => sceneApi.current?.zoom(.89)}><Icon25 name="plus" /></button><button type="button" onClick={reset}>Reset</button></> : <><span>{reduced ? 'Reduced motion' : paused ? 'Rotation paused' : 'Slow orbit'}</span><button type="button" aria-label={paused ? 'Resume rotation' : 'Pause rotation'} disabled={reduced || !ready} onClick={() => setPaused(v => !v)}><Icon25 name={paused || reduced ? 'play' : 'pause'} /></button></>}
        </div>
        <p className="dsp25-status" role="status" aria-live="polite">{statusText}{status.phase === 'error' && <button type="button" onClick={() => sceneApi.current?.retry()}>Retry model</button>}</p>
      </section>
      <section className="dsp25-selection" aria-label="Choose a product">
        <div className="dsp25-selection-heading"><div><span>The collection</span><h2>{displayed ? categoryLabel(displayed.category) : 'Parts'}</h2></div><button type="button" className="dsp25-open-collection" onClick={e => showPanel('collection', e.currentTarget)}>All parts <span>{products.length}</span><Icon25 name="plus" /></button></div>
        <div className="dsp25-shelf" data-items={shelf.length}>
          {shelf.map(({ product, role }) => <button className="dsp25-shelf-item" type="button" key={product.id} data-position={role} data-selected={selected?.id === product.id} aria-pressed={selected?.id === product.id} aria-label={`View ${product.name}`} onClick={() => select(product)}>
            <span className="dsp25-shelf-image"><PreviewImage25 product={product} loading="lazy" /></span><span className="dsp25-shelf-copy"><small>{product.finish || categoryLabel(product.category)}</small><strong>{product.name}</strong></span><i aria-hidden="true" /></button>)}
          {!shelf.length && <p className="dsp25-empty">{source === 'loading' ? 'Reading the collection…' : 'No published 3D parts are available.'}</p>}
        </div>
        {family.length > 1 && <div className="dsp25-selection-navigation"><button type="button" onClick={() => step(-1)}>Previous part</button><span>{family.findIndex(p => p.id === selected?.id) + 1} of {family.length}</span><button type="button" onClick={() => step(1)}>Next part</button></div>}
      </section>
      <footer className="dsp25-footer"><span>{source === 'live' ? 'Design preview · public catalog · no checkout actions' : 'Design preview · local asset studies and demo catalog'}</span><span>Original 3D assets. Demo compatibility.</span><a href="/">Open current Studio</a></footer>
    </main>
    <dialog ref={dialog} className="dsp25-dialog" aria-labelledby="dsp25-dialog-title" onCancel={event => { event.preventDefault(); setPanel(null); }} onClose={() => setPanel(null)}>
      <header className="dsp25-dialog-header"><div><span>{panel === 'collection' ? 'The collection' : panel === 'vehicle' ? 'Your garage context' : 'DTH'}</span><h2 id="dsp25-dialog-title">{panel === 'collection' ? 'Find your next part.' : panel === 'vehicle' ? 'Choose your NVX.' : panel === 'account' ? 'Your DTH account.' : 'Your shopping bag.'}</h2></div><button type="button" aria-label="Close panel" onClick={() => setPanel(null)}><Icon25 name="close" /></button></header>
      {panel === 'collection' ? <><div className="dsp25-collection-tools"><label>Category<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All parts ({products.length})</option>{CATEGORIES.map(id => <option key={id} value={id}>{categoryLabel(id)} ({products.filter(p => p.category === id).length})</option>)}</select></label><label>Search parts<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Product name…" maxLength="120" autoComplete="off" /></label></div><div className="dsp25-collection-grid">{filtered.map(p => <button type="button" key={p.id} className="dsp25-collection-product" aria-pressed={selected?.id === p.id} onClick={() => select(p)}><PreviewImage25 product={p} loading="lazy" /><span><small>{categoryLabel(p.category)}</small><strong>{p.name}</strong><span>{productPrice25(p) || 'Asset study'}</span></span></button>)}</div>{!filtered.length && <div className="dsp25-empty"><h3>No parts here yet.</h3><p>Try another category or clear your search.</p><button type="button" onClick={() => { setFilter('all'); setSearch(''); }}>View all parts</button></div>}</> : panel === 'vehicle' ? <><p className="dsp25-dialog-intro">Preview the header with your NVX. This choice stays in this design preview.</p><div className="dsp25-vehicle-options">{VERSIONS.map(v => <button type="button" key={v.id} aria-pressed={vehicle?.id === v.id} onClick={() => { setVehicle(v); setPanel(null); }}><span>Yamaha</span><strong>{v.model}</strong><span>{vehicle?.id === v.id ? 'Selected' : 'Use this version'}</span></button>)}</div><a className="dsp25-dialog-link" href="/account?view=vehicle">Open current garage</a></> : panel === 'account' ? <div className="dsp25-account-preview"><div className="dsp25-account-emblem" aria-hidden="true">D</div><p>Your garage and orders live in your existing DTH account.</p><a className="dsp25-primary" href="/account">Open account</a></div> : <div className="dsp25-empty"><p>This design preview does not change your shopping bag.</p><a className="dsp25-primary" href="/bag">Open shopping bag</a></div>}
    </dialog>
  </div>;
}
