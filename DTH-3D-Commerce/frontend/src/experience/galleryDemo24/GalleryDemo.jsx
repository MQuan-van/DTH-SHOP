import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import GalleryStage24 from './GalleryStage24.jsx';
import { CATEGORIES22H2, categoryLabel22H2, createSignal22H2 } from '../studio22h2/studio22h2.logic.mjs';
import fixture from '../../../../shared/catalog.json';
import { galleryProducts, gallerySelection, galleryProductHref, galleryPrice, publicProducts, galleryKey24, galleryPoster24, gallerySwitch24 } from './gallery-demo.logic.mjs';

function Icon({ name }) {
  const paths = {
    inspect: <><path d="m8 3 4-2 9 5v10l-9 5-9-5V6l5-3Z" /><path d="m3 6 9 5 9-5M12 11v10" /></>,
    reset: <><path d="M4 9a8 8 0 1 1 0 6M4 3v6h6" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    left: <><path d="M5 7v5h5M5 12a7 7 0 1 1 3 7" /></>,
    right: <><path d="M19 7v5h-5M19 12a7 7 0 1 0-3 7" /></>,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    play: <path d="m8 4 12 8-12 8Z" />,
    expand: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">{paths[name]}</svg>;
}
function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)'), update = () => setReduced(query.matches);
    query.addEventListener('change', update); return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

export default function GalleryDemo() {
  const root = useRef(null), stage = useRef(null), api = useRef(null), inspectButton = useRef(null), closeButton = useRef(null), expandButton = useRef(null), thumbnails = useRef(null);
  const signal = useMemo(createSignal22H2, []);
  const reduced = useReducedMotion();
  const [catalog, setCatalog] = useState([]), [source, setSource] = useState('loading');
  const [category, setCategory] = useState('all'), [selected, setSelected] = useState('');
  const [mode, setMode] = useState('overview'), [paused, setPaused] = useState(false);
  const [active, setActive] = useState(true), [status, setStatus] = useState('loading');
  const [picked, setPicked] = useState(false), [expanded, setExpanded] = useState(false), [posters, setPosters] = useState({});
  const products = useMemo(() => galleryProducts(catalog), [catalog]);
  const { visible, product: requested } = gallerySelection(products, category, selected);
  const requestedKey = source === 'loading' ? '' : galleryKey24(requested);
  const [product, setProduct] = useState(null), displayed = useRef(null); displayed.current = product;
  const switcher = useMemo(() => gallerySwitch24(setProduct), []);
  const productKey = galleryKey24(product), pending = productKey !== requestedKey;
  const [loadedKey, setLoadedKey] = useState('');
  const ready = loadedKey === productKey && status === 'ready' && !pending;
  const price = galleryPrice(product), href = galleryProductHref(product, source);
  const current = visible.findIndex(p => p.id === product?.id) + 1;

  useLayoutEffect(() => {
    const next = source === 'loading' ? null : requested;
    switcher.request(next, reduced || !displayed.current || !next || galleryKey24(displayed.current) === requestedKey);
    return () => switcher.cancel();
  }, [requestedKey, source, reduced, switcher]);
  useEffect(() => {
    const strip = thumbnails.current;
    const button = strip && [...strip.querySelectorAll('[data-gallery-id]')].find(el => el.dataset.galleryId === requested?.id);
    if (!button) return;
    const target = button.offsetLeft - strip.offsetLeft - (strip.clientWidth - button.offsetWidth) / 2;
    strip.scrollTo({ left: Math.max(0, target), behavior: reduced ? 'instant' : 'smooth' });
  }, [requestedKey, category, reduced]);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; closeButton.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = overflow; const target = expandButton.current || (previous?.isConnected ? previous : null); target?.focus({ preventScroll: true }); };
  }, [expanded]);

  useEffect(() => {
    const controller = new AbortController(); let live = true;
    const timer = setTimeout(() => controller.abort(), 12000);
    fetch('/api/shop/products', { signal: controller.signal, credentials: 'omit', headers: { Accept: 'application/json' } })
      .then(r => { if (!r.ok) throw new Error('Catalog unavailable'); return r.json(); })
      .then(data => { const values = publicProducts(data); if (live) { setCatalog(values); setSource('live'); } })
      .catch(() => { if (live) { setCatalog(fixture.products); setSource('fixture'); } })
      .finally(() => clearTimeout(timer));
    return () => { live = false; clearTimeout(timer); controller.abort(); };
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.05 });
    if (stage.current) observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { signal.set({ active, reduced: reduced || paused, mode }); }, [signal, active, reduced, paused, mode]);
  useEffect(() => () => signal.set({ active: false }), [signal]);
  useEffect(() => {
    setMode('overview'); setPicked(false); setStatus('loading');
    signal.set({ mode: 'overview', serial: signal.state.serial + 1 });
  }, [productKey, signal]);
  useLayoutEffect(() => {
    const context = gsap.context(() => {
      if (!reduced) gsap.timeline({ defaults: { ease: 'power2.out' } })
        .fromTo('.gd-info > *', { y: 11, opacity: 0 }, { y: 0, opacity: 1, duration: 0.36, stagger: 0.025, clearProps: 'transform,opacity' });
    }, root);
    return () => context.revert();
  }, [productKey, reduced]);
  const report = useCallback(next => { setStatus(next); if (next === 'ready') setLoadedKey(productKey); }, [productKey]);
  const capture = useCallback(url => setPosters(previous => previous[productKey] ? previous : { ...previous, [productKey]: url }), [productKey]);
  function overview(restoreFocus = false) {
    setExpanded(false); setMode('overview'); setPicked(false); api.current?.reset();
    if (restoreFocus) inspectButton.current?.focus();
  }
  function choose(p) { setSelected(p.id); }
  function chooseCategory(id) { setCategory(id); setSelected(''); }
  function keyDown(event) {
    if (event.key === 'Escape') {
      if (expanded) { event.stopPropagation(); setExpanded(false); }
      else if (mode !== 'overview') overview(true);
    }
    if (expanded && event.key === 'Tab') {
      const focusable = [...stage.current.querySelectorAll('a[href],button:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }

  return <div className="gd" ref={root} onKeyDown={keyDown}>
    <a className="gd-skip" href="#gallery">Skip to gallery</a>
    <header className="gd-header" inert={expanded}>
      <a className="gd-brand" href="/" aria-label="DTH current Studio"><i aria-hidden="true" /><strong>DTH</strong><span>Motorcycle parts</span></a>
      <nav aria-label="Main navigation"><a className="gd-current" href="/studio-gallery-demo.html" aria-current="page">Studio</a><a href="/shop?mode=build">Build</a><a href="/shop">Shop</a><a href="/story">Story</a></nav>
      <span className="gd-preview"><i /> Gallery preview / 02</span>
    </header>
    <main id="gallery">
      <div className="gd-topline" inert={expanded}><span>The parts gallery</span><span>Move closer.</span></div>
      <section className="gd-hero" ref={stage} data-expanded={expanded} role={expanded ? 'dialog' : 'region'} aria-modal={expanded || undefined} aria-label={expanded ? `${product?.name || 'Product'} expanded 3D view` : 'Product gallery'}>
        <div className="gd-stage" data-ready={ready}>
          <div className="gd-light" aria-hidden="true" />
          <div className="gd-floor" aria-hidden="true" />
          <div className="gd-scene-layer" data-phase={pending ? 'leaving' : 'arriving'}>
            {product && <GalleryStage24 product={product} signal={signal} api={api} active={active} reduced={reduced || paused} mode={mode} onStatus={report} onPicked={setPicked} onPoster={capture} />}
            {!ready && !pending && product && <img className="gd-loading-image" src={posters[productKey] || galleryPoster24(product)} width="512" height="512" alt="" aria-hidden="true" onError={event => { if (event.currentTarget.getAttribute('src') !== product.imageUrl) event.currentTarget.src = product.imageUrl; }} />}
          </div>
        </div>
        <div className="gd-info" aria-live="polite" aria-atomic="true">
          <p className="gd-eyebrow"><i /> {product ? categoryLabel22H2(product.category) : 'Collection'}</p>
          <h1>{source === 'loading' ? 'Opening\nthe gallery.' : product?.name || 'No parts here.'}</h1>
          {product && <>
            <p className="gd-finish">{product.finish || 'Original finish'}</p>
            {price ? <p className="gd-price">{price}<span>{product.demoOnly ? 'Demo price' : 'Catalog price'}</span></p> : <p className="gd-asset-note">Local asset preview<span>No catalog price assigned</span></p>}
            <div className="gd-actions">
              {href && <a className="gd-button gd-primary" href={href}>View product</a>}
              <button className="gd-button gd-inspect" type="button" ref={inspectButton} disabled={!ready} aria-pressed={mode !== 'overview'} onClick={() => mode === 'overview' ? setMode('orbit') : overview()}><Icon name="inspect" />{mode === 'overview' ? 'Inspect 3D' : 'Overview'}</button>
            </div>
            <p className="gd-disclosure">{product.galleryAssetOnly ? 'Asset study · not a shop listing' : product.demoOnly ? 'Illustrative model · synthetic fitment' : 'Original uploaded model'}</p>
          </>}
        </div>
        <div className="gd-stage-top"><span><i />{ready ? 'Original 3D' : source === 'loading' ? 'Opening catalog…' : 'Loading original 3D…'}</span><span className="gd-index">{String(current).padStart(2, '0')}<b> / {String(visible.length).padStart(2, '0')}</b></span></div>
        {expanded && <div className="gd-expanded-header"><span>{product?.name}</span><button className="gd-button" ref={closeButton} type="button" onClick={() => setExpanded(false)}><Icon name="close" />Close expanded view</button></div>}
        <div className="gd-view-controls">
          {mode === 'overview' ? <>
            <span>{reduced ? 'Reduced motion' : paused ? 'Rotation paused' : 'Slow rotation'}</span>
            <button type="button" className="gd-icon" aria-label={paused ? 'Resume rotation' : 'Pause rotation'} disabled={reduced || !ready} onClick={() => setPaused(v => !v)}><Icon name={paused || reduced ? 'play' : 'pause'} /></button>
          </> : <div className="gd-toolbar" role="group" aria-label="3D inspection controls">
            <button className="gd-icon" type="button" aria-label="Rotate left" onClick={() => api.current?.rotate(-Math.PI / 6)}><Icon name="left" /></button>
            <button className="gd-icon" type="button" aria-label="Rotate right" onClick={() => api.current?.rotate(Math.PI / 6)}><Icon name="right" /></button>
            <span className="gd-divider" />
            <button className="gd-icon" type="button" aria-label="Zoom out" onClick={() => api.current?.zoom(1.14)}><Icon name="minus" /></button>
            <button className="gd-icon" type="button" aria-label="Zoom in" onClick={() => api.current?.zoom(0.88)}><Icon name="plus" /></button>
            <button className="gd-tool" type="button" aria-pressed={mode === 'pick'} onClick={() => { setMode(mode === 'pick' ? 'orbit' : 'pick'); setPicked(false); }}>{mode === 'pick' ? 'Free orbit' : 'Focus surface'}</button>
            <button className="gd-icon" type="button" aria-label="Reset view" onClick={() => overview(true)}><Icon name="reset" /></button>
          </div>}
        </div>
        {!expanded && <button className="gd-expand" ref={expandButton} type="button" disabled={!ready} aria-label="Expand 3D view" onClick={() => { setMode('orbit'); setExpanded(true); }}><Icon name="expand" /><span>Expand</span></button>}
        <p className="gd-hint" role="status">{!ready ? '' : mode === 'pick' ? picked ? 'Surface selected · use + to get closer' : 'Click a surface on the model' : mode === 'orbit' ? 'Drag to rotate · use + / − to zoom · Esc to reset' : ''}</p>
      </section>
      <section className="gd-collection" aria-label="Choose a part" inert={expanded}>
        <div className="gd-collection-head">
          <div className="gd-categories" role="group" aria-label="Part category">
            {[{ id: 'all', label: 'All parts' }, ...CATEGORIES22H2].map(c => <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => chooseCategory(c.id)}>{c.label}<sup>{products.filter(p => c.id === 'all' || p.category === c.id).length}</sup></button>)}
          </div><span className="gd-select-label">Select a part</span>
        </div>
        <div className="gd-thumbnails" ref={thumbnails}>
          {visible.map(p => <button className="gd-thumbnail" type="button" key={p.id} data-gallery-id={p.id} aria-label={`Show ${p.name}`} aria-pressed={requested?.id === p.id} onClick={() => choose(p)}>
            <span className="gd-thumb-image"><img src={posters[galleryKey24(p)] || galleryPoster24(p)} width="512" height="512" alt="" loading="lazy" onError={event => { if (event.currentTarget.getAttribute('src') !== p.imageUrl) event.currentTarget.src = p.imageUrl; }} /></span>
            <span className="gd-thumb-copy"><small>{p.galleryAssetOnly ? 'Asset study' : categoryLabel22H2(p.category)}</small><strong>{p.name}</strong></span><i aria-hidden="true" />
          </button>)}
          {!visible.length && <p className="gd-empty">No 3D products in this category.</p>}
        </div>
      </section>
      <footer className="gd-footer" inert={expanded}><span>{source === 'fixture' ? 'Offline demo catalog · illustrative models · no payments' : source === 'loading' ? 'Reading public catalog…' : 'Read-only preview · existing catalog + local asset study'}</span>{posters[productKey] && <a className="gd-download" href={posters[productKey]} download={`${product.id}-gallery-preview.png`}>Save preview image</a>}<a href="/">Open current Studio</a></footer>
    </main>
  </div>;
}
