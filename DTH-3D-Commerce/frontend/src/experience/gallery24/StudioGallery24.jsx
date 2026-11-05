import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useOutletContext } from 'react-router-dom';
import { useStore } from '../../shop/useStore';
import { fitment } from '../../../../shared/domain.mjs';
import { vehicleLabel } from '../../../../shared/nvx.mjs';
import { getPresentation21 } from '../../../../shared/productPresentation21.mjs';
import { useStartupAllowed } from '../loader/StartupRenderContext.jsx';
import { useExperiencePolicy } from '../interaction/useExperiencePolicy.js';
import useIntroCover from '../journey/useIntroCover.js';
import StoryPhoto22S from '../story22s/StoryPhoto22S.jsx';
import { studioGalleryCatalog24, studioGalleryDefault24 } from './studio-gallery24.logic.mjs';
import { useGalleryInput24, useGalleryModal24 } from './useGalleryModal24.js';
import './studio-gallery24.css';
import gsap from 'gsap';
const GalleryStage24 = lazy(() => import('../galleryDemo24/GalleryStage24.jsx'));
import { CATEGORIES22H2, categoryLabel22H2, href22H2, createSignal22H2 } from '../studio22h2/studio22h2.logic.mjs';

import { gallerySelection, galleryPrice, galleryKey24, galleryPoster24, gallerySwitch24 } from '../galleryDemo24/gallery-demo.logic.mjs';

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
export default function StudioGallery24({ config, version = 0, binding }) {
  const store = useStore(), outlet = useOutletContext(), policy = useExperiencePolicy(), covered = useIntroCover(), startup = useStartupAllowed();
  const allowed = startup && !covered, reduced = policy.reduced;
  const root = useRef(null), stage = useRef(null), api = useRef(null), inspectButton = useRef(null), closeButton = useRef(null), expandButton = useRef(null), thumbnails = useRef(null);
  const signal = useMemo(createSignal22H2, []);

  const [category, setCategory] = useState('all'), [selected, setSelected] = useState('');
  const [mode, setMode] = useState('overview'), [paused, setPaused] = useState(false);
  const [active, setActive] = useState(true), [status, setStatus] = useState('loading');
  const [picked, setPicked] = useState(false), [expanded, setExpanded] = useState(false), [posters, setPosters] = useState({});
  const products = useMemo(() => studioGalleryCatalog24(store.data?.products, binding), [store.data?.products, binding]);
  const defaultId = studioGalleryDefault24(products, config?.productId);
  const slot = useRef(null), modal = useRef(null);
  const blocked = useGalleryInput24(signal, modal);
  const portalHost = useGalleryModal24(expanded, setExpanded, slot, modal, closeButton, expandButton);
  const [sceneStarted, setSceneStarted] = useState(false);
  useEffect(() => { if (allowed) setSceneStarted(true); }, [allowed]);
  const { visible, product: requested } = gallerySelection(products, category, selected || defaultId);
  const requestedKey = galleryKey24(requested);
  const [product, setProduct] = useState(null), displayed = useRef(null); displayed.current = product;
  const switcher = useMemo(() => gallerySwitch24(next => {
    // Clear readiness in the same commit as model identity, before a cached GLB can draw.
    if (galleryKey24(displayed.current) !== galleryKey24(next)) {
      setStatus('loading'); setLoadedKey('');
    }
    setProduct(next);
  }), []);
  const productKey = galleryKey24(product), pending = productKey !== requestedKey;
  const [loadedKey, setLoadedKey] = useState('');
  const ready = loadedKey === productKey && status === 'ready' && !pending && allowed && active && !blocked;
  const price = galleryPrice(product), href = href22H2(product);
  const vehicle = store.data?.vehicles?.find(v => v.id === store.vehicleId);
  const match = product ? fitment(product, store.vehicleId, store.data?.vehicles || []) : null;
  const authoredStop = getPresentation21(product)?.spin.enabled === false;
  const stopped = reduced || policy.saveData || paused || authoredStop;
  const current = visible.findIndex(p => p.id === product?.id) + 1;

  useLayoutEffect(() => {
    const next = requested;
    switcher.request(next, reduced || !displayed.current || !next || galleryKey24(displayed.current) === requestedKey);
    return () => switcher.cancel();
  }, [requested, requestedKey, reduced, switcher]);
  useEffect(() => {
    const strip = thumbnails.current;
    const button = strip && [...strip.querySelectorAll('[data-gallery-id]')].find(el => el.dataset.galleryId === requested?.id);
    if (!button) return;
    const target = button.offsetLeft - strip.offsetLeft - (strip.clientWidth - button.offsetWidth) / 2;
    strip.scrollTo({ left: Math.max(0, target), behavior: reduced ? 'instant' : 'smooth' });
  }, [requestedKey, category, reduced]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.05 });
    if (stage.current) observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => { signal.set({ active: active && allowed, reduced: stopped, mode }); }, [signal, active, allowed, stopped, mode]);
  useEffect(() => () => signal.set({ active: false }), [signal]);
  useEffect(() => {
    setMode('overview'); setPicked(false);
    signal.set({ mode: 'overview', serial: signal.state.serial + 1 });
  }, [productKey, signal]);
  useLayoutEffect(() => {
    const context = gsap.context(() => {
      if (!reduced && allowed) gsap.timeline({ defaults: { ease: 'power2.out' } })
        .fromTo('.dgs24-info > *', { y: 11, opacity: 0 }, { y: 0, opacity: 1, duration: 0.36, stagger: 0.025, clearProps: 'transform,opacity' });
    }, root);
    return () => context.revert();
  }, [productKey, reduced, allowed]);
  const report = useCallback(next => { setStatus(next); if (next === 'ready') setLoadedKey(productKey); }, [productKey]);
  const capture = useCallback(url => setPosters(previous => previous[productKey] ? previous : { ...previous, [productKey]: url }), [productKey]);
  function overview(restoreFocus = false) {
    setExpanded(false); setPaused(false); setMode('overview'); setPicked(false); api.current?.reset();
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

  return <div className="dgs24" data-studio="gallery24" data-experience-version={version} data-active={active} data-blocked={blocked} data-allowed={allowed} data-model-status={status} ref={root} onKeyDown={keyDown}>
    <div id="studio-gallery24">
      <div className="dgs24-topline"><span>The parts gallery</span><Link to="/shop?mode=build">Build your NVX</Link></div>
      <div ref={slot} className="dgs24-slot" />
      <dialog ref={modal} className="dgs24-expanded-shell" aria-label="Expanded 3D product inspection" onCancel={event => { event.preventDefault(); setExpanded(false); }} />
      {createPortal(<section className="dgs24-hero" ref={stage} data-expanded={expanded} role="region" aria-label={expanded ? `${product?.name || 'Product'} expanded 3D view` : 'Product gallery'}>
        <div className="dgs24-stage" data-ready={ready}>
          <div className="dgs24-light" aria-hidden="true" />
          <div className="dgs24-floor" aria-hidden="true" />
          <div className="dgs24-scene-layer" data-phase={pending ? 'leaving' : 'arriving'}>
            {product && (allowed || sceneStarted) && <Suspense fallback={<div className="s222-loading" role="status">Opening 3D…</div>}><GalleryStage24 product={product} signal={signal} api={api} active={active && allowed} reduced={stopped} mode={mode} onStatus={report} onPicked={setPicked} onPoster={capture} /></Suspense>}
            {!ready && !pending && product && <img className="dgs24-loading-image" src={posters[productKey] || galleryPoster24(product)} width="512" height="512" alt="" aria-hidden="true" onError={event => { if (event.currentTarget.getAttribute('src') !== product.imageUrl) event.currentTarget.src = product.imageUrl; }} />}
          </div>
        </div>
        <div className="dgs24-info" aria-live="polite" aria-atomic="true">
          <p className="dgs24-eyebrow"><i /> {product ? categoryLabel22H2(product.category) : 'Collection'}</p>
          <h1>{product?.name || 'No 3D parts here.'}</h1>
          {!product && <><p className="dgs24-finish">No published 3D products in this category.</p><div className="dgs24-actions"><button type="button" className="dgs24-button" disabled={!products.length} onClick={() => chooseCategory('all')}>View all parts</button><Link className="dgs24-button dgs24-primary" to="/shop">Open collection</Link></div></>}
          {product && <>
            <p className="dgs24-finish">{product.finish || 'Original finish'}</p>
            {price ? <p className="dgs24-price">{price}<span>{product.demoOnly ? 'Demo price' : 'Catalog price'}</span></p> : <p className="dgs24-asset-note">Price unavailable</p>}
            <div className="dgs24-actions">
              {href && <Link className="dgs24-button dgs24-primary" to={href}>View product</Link>}
              <button className="dgs24-button dgs24-inspect" type="button" ref={inspectButton} disabled={!ready} aria-pressed={mode !== 'overview'} onClick={() => mode === 'overview' ? setMode('orbit') : overview()}><Icon name="inspect" />{mode === 'overview' ? 'Inspect 3D' : 'Overview'}</button>
            </div>
            <button className="dgs24-vehicle" type="button" onClick={outlet?.chooseVehicle}>{vehicle ? vehicleLabel(vehicle) : 'Select vehicle'}</button>
            {vehicle && match && <p className="dgs24-fit" data-match={match.status}>{match.text}</p>}
            {/* <p className="dgs24-disclosure">{product.demoOnly ? 'Illustrative model · synthetic fitment' : 'Original uploaded model'}</p> */}
          </>}
        </div>
        <div className="dgs24-stage-top"><span><i />{!product ? 'No published model' : status === 'error' ? '3D unavailable' : blocked ? '3D paused' : ready ? 'Original 3D' : allowed ? 'Loading original 3D…' : 'Preparing the studio…'}</span><span className="dgs24-index">{String(current).padStart(2, '0')}<b> / {String(visible.length).padStart(2, '0')}</b></span></div>
        {expanded && <div className="dgs24-expanded-header"><span>{product?.name}</span><button className="dgs24-button" ref={closeButton} type="button" onClick={() => setExpanded(false)}><Icon name="close" />Close expanded view</button></div>}
        {product && <div className="dgs24-view-controls">
          {mode === 'overview' ? <>
            <span>{reduced ? 'Reduced motion' : authoredStop || policy.saveData ? 'Rotation off' : paused ? 'Rotation paused' : 'Slow rotation'}</span>
            <button type="button" className="dgs24-icon" aria-label={paused ? 'Resume rotation' : 'Pause rotation'} disabled={reduced || authoredStop || policy.saveData || !ready} onClick={() => setPaused(v => !v)}><Icon name={stopped ? 'play' : 'pause'} /></button>
          </> : <div className="dgs24-toolbar" role="group" aria-label="3D inspection controls">
            <button className="dgs24-icon" type="button" disabled={!ready} aria-label="Rotate left" onClick={() => api.current?.rotate(-Math.PI / 6)}><Icon name="left" /></button>
            <button className="dgs24-icon" type="button" disabled={!ready} aria-label="Rotate right" onClick={() => api.current?.rotate(Math.PI / 6)}><Icon name="right" /></button>
            <span className="dgs24-divider" />
            <button className="dgs24-icon" type="button" disabled={!ready} aria-label="Zoom out" onClick={() => api.current?.zoom(1.14)}><Icon name="minus" /></button>
            <button className="dgs24-icon" type="button" disabled={!ready} aria-label="Zoom in" onClick={() => api.current?.zoom(0.88)}><Icon name="plus" /></button>
            <button className="dgs24-tool" type="button" disabled={!ready} aria-pressed={mode === 'pick'} onClick={() => { setMode(mode === 'pick' ? 'orbit' : 'pick'); setPicked(false); }}>{mode === 'pick' ? 'Free orbit' : 'Focus surface'}</button>
            <button className="dgs24-icon" type="button" disabled={!ready} aria-label="Reset view" onClick={() => overview(true)}><Icon name="reset" /></button>
          </div>}
        </div>}
        {product && !expanded && <button className="dgs24-expand" ref={expandButton} type="button" disabled={!ready} aria-label="Expand 3D view" onClick={() => { setMode('orbit'); setExpanded(true); }}><Icon name="expand" /><span>Expand</span></button>}
        <p className="dgs24-hint" role="status">{!ready ? '' : mode === 'pick' ? picked ? 'Surface selected · use + to get closer' : 'Click a surface on the model' : mode === 'orbit' ? 'Drag to rotate · use + / − to zoom · Esc to reset' : ''}</p>
      </section>, portalHost)}
      <section className="dgs24-collection" aria-label="Choose a part" inert={expanded}>
        <div className="dgs24-collection-head">
          <div className="dgs24-categories" role="group" aria-label="Part category">
            {[{ id: 'all', label: 'All parts' }, ...CATEGORIES22H2].map(c => <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => chooseCategory(c.id)}>{c.label}<sup>{products.filter(p => c.id === 'all' || p.category === c.id).length}</sup></button>)}
          </div><span className="dgs24-select-label">Select a part</span>
        </div>
        <div className="dgs24-thumbnails" ref={thumbnails}>
          {visible.map(p => <button className="dgs24-thumbnail" type="button" key={p.id} data-gallery-id={p.id} aria-label={`Show ${p.name}`} aria-pressed={requested?.id === p.id} onClick={() => choose(p)}>
            <span className="dgs24-thumb-image"><img src={posters[galleryKey24(p)] || galleryPoster24(p)} width="512" height="512" alt="" loading="lazy" onError={event => { if (event.currentTarget.getAttribute('src') !== p.imageUrl) event.currentTarget.src = p.imageUrl; }} /></span>
            <span className="dgs24-thumb-copy"><small>{categoryLabel22H2(p.category)}</small><strong>{p.name}</strong></span><i aria-hidden="true" />
          </button>)}
          {!visible.length && <p className="dgs24-empty">No 3D products in this category.</p>}
        </div>
      </section>
      <div className="dgs24-footer"><Link to="/shop">View collection</Link>{posters[productKey] && <a className="dgs24-download" href={posters[productKey]} download={`${product.id}-gallery-preview.png`}>Save preview image</a>}<Link to="/shop?mode=build">Open interactive Build</Link></div>
      <section className="dgs24-invitation"><div className="dgs24-invite-photo"><StoryPhoto22S name="lineup" sizes="(max-width: 700px) 100vw, 55vw" /></div><div className="dgs24-invite-copy"><h2>Start with your NVX.</h2><Link to="/shop?mode=build" className="dgs24-button dgs24-primary">Open interactive Build</Link><p>Demo compatibility, not installation advice.</p></div></section>
    </div>
  </div>;
}
