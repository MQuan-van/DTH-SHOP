import { Component, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { useStore } from '../../shop/useStore';
import ProductImage from '../../shop/catalog/components/ProductImage';
import { studioProduct245 } from './director245.logic.mjs';
import { studioPoster246 } from '../access246/poster246.logic.mjs';
import useAccessDirector245 from './useAccessDirector245';
import AccessAtmosphere246 from '../access246/AccessAtmosphere246';
import './access245.css';
import '../access246/access246.css';

const AccessStage245 = lazy(() => import('./AccessStage245'));
gsap.registerPlugin(Flip);
class StageBoundary245 extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function Playback245({ paused }) {
  return <svg viewBox="0 0 20 20" aria-hidden="true">{paused ? <path d="m7 4 8 6-8 6V4Z"/> : <path d="M7 4v12M13 4v12"/>}</svg>;
}
function Poster245({ product }) {
  const poster = studioPoster246(product), [failed, setFailed] = useState(false);
  return poster && !failed ? <img src={poster.src} width={poster.width} height={poster.height} alt="" draggable="false" decoding="async" onError={()=>setFailed(true)}/>
    : <ProductImage product={product} eager sizes="(max-width:860px) 80vw,60vw"/>;
}
export default function AccessSurface245({ root, policy, focusing: inputFocusing, busy, registering, children }) {
  const store = useStore(), product = studioProduct245(store.data.products);
  const [status, setStatus] = useState('loading'), [help, setHelp] = useState(false), [detail, setDetail] = useState(false), [attempt, setAttempt] = useState(0);
  const focusing = inputFocusing || help;
  const deck = useRef(null), helpButton = useRef(null), lastRegister = useRef(registering), layoutBefore = useRef(null), entered = useRef(false), skipSwitchMotion = useRef(false);
  const { director, view, replay } = useAccessDirector245(root, { policy, focusing, busy, registering, ready: status === 'ready' });
  const onStatus = useCallback(next => setStatus(next), []);
  const onError = useCallback(() => setStatus('error'), []);
  const allowStage = product && policy.allowed && !policy.compact && !policy.reduced && !policy.saveData && status !== 'error';
  useEffect(() => {
    if (!help) return;
    const escape = event => { if (event.key === 'Escape') { setHelp(false); helpButton.current?.focus(); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [help]);
  useLayoutEffect(() => {
    if (!policy.allowed || entered.current || !policy.motion || focusing || busy) return;
    entered.current = true;
    const context = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from(root.current.querySelector('.a245-brand'), { opacity: .6, x: -10, duration: .45 })
        .from(deck.current, { opacity: .65, y: 20, duration: .65, clearProps: 'transform,opacity' }, 0);
    }, root);
    return () => context.revert();
  }, [policy.allowed, policy.motion, focusing, busy, root]);
  useLayoutEffect(() => {
    if (lastRegister.current === registering) return;
    lastRegister.current = registering;
    if (skipSwitchMotion.current || !policy.motion || focusing || busy || !deck.current) { layoutBefore.current = null; skipSwitchMotion.current = false; return; }
    const context = gsap.context(() => {
      if (layoutBefore.current) Flip.from(layoutBefore.current, { duration: .44, ease: 'power3.inOut', scale: true, prune: true });
      else gsap.fromTo(deck.current.querySelector('form'), { opacity: .6, y: 9 }, { opacity: 1, y: 0, duration: .24, ease: 'power2.out', clearProps: 'transform,opacity' });
    }, deck);
    layoutBefore.current = null;
    return () => context.revert();
  }, [registering, policy.motion, focusing, busy]);
  const captureLayout = event => {
    if (!event.target.closest?.('.a243-switch button')) return;
    skipSwitchMotion.current = event.detail === 0;
    director.intent.modeInstant = event.detail === 0;
    if (!policy.motion || focusing || busy || event.detail === 0) return;
    layoutBefore.current = Flip.getState([...deck.current.querySelectorAll('form>.a243-field'), deck.current.querySelector('.a243-submit')]);
  };
  const chooseView = (next, event) => { setDetail(next); view(next, event.detail === 0); };
  return <main id="dth-content" tabIndex={-1} ref={root} className="a245-access a246-vault" data-access181 data-access243 data-access245 data-access246
    data-register={registering} data-focusing={focusing} data-busy={busy} data-motion={policy.motion ? 'on' : 'off'}
    onPointerMove={policy.move} onPointerLeave={policy.leave}>
    <header className="a245-top">
      <div className="a245-brand"><img src="/branding/access181/dth-mark.svg" width="120" height="20" alt="DTH"/><span>Parts studio</span></div>
      <button ref={helpButton} type="button" className="a245-help-toggle" aria-controls="a245-help" aria-expanded={help} onClick={()=>setHelp(value=>!value)}>Access help<span aria-hidden="true">?</span></button>
    </header>
    {help && <aside className="a245-help" id="a245-help" aria-label="Access help"><strong>Signing in to DTH</strong><button type="button" aria-label="Close access help" onClick={()=>{setHelp(false);helpButton.current?.focus();}}>×</button><p>Use your registered email and password. Your account works across devices connected to the same store.</p><p>Password recovery is not available in this demo.</p></aside>}
    <section className="a245-showcase" aria-label="DTH product studio">
      <AccessAtmosphere246 policy={policy} director={director} focusing={focusing} busy={busy}/>
      <div className="a245-editorial"><p className="a245-kicker">In the studio</p><p className="a245-product-name">{product?.name || 'Your DTH\nstarts here.'}</p><span className="a245-finish">{product?.finish || 'Motorcycle parts'}</span></div>
      <div className="a245-stage-area" data-stage-status={allowStage ? status : 'preview'}>
        {product && <div className="a245-poster" aria-hidden="true"><Poster245 key={`${product.id}:${product.modelUrl}:${product.presentation3d?.revision || ''}:${studioPoster246(product)?.src || product.imageUrl}`} product={product}/></div>}
        {allowStage && <StageBoundary245 key={attempt} onError={onError}><Suspense fallback={null}><AccessStage245 product={product} policy={policy} director={director} onStatus={onStatus}/></Suspense></StageBoundary245>}
      </div>
      <div className="a245-stage-footer"><span className="a245-stage-caption" role="status"><i/>{status === 'ready' && allowStage ? 'Original 3D' : status === 'error' ? 'Product preview · 3D unavailable' : allowStage ? 'Preparing product studio…' : product ? 'Product preview' : store.loading ? 'Preparing the studio…' : 'Product preview unavailable'}</span>
        {status === 'error' && product && !policy.compact && !policy.reduced && !policy.saveData && <button type="button" className="a245-retry" onClick={()=>{setStatus('loading');setAttempt(value=>value+1);}}>Retry 3D</button>}
        {allowStage && <div className="a245-camera-tools" aria-label="Studio camera"><button type="button" aria-pressed={!detail} disabled={status!=='ready'||busy||policy.paused} onClick={event=>chooseView(false,event)}>Overview</button><button type="button" aria-pressed={detail} disabled={status!=='ready'||busy||policy.paused} onClick={event=>chooseView(true,event)}>Detail</button><button type="button" disabled={status!=='ready'||busy||policy.paused} onClick={()=>{setDetail(false);replay();}}>Replay camera</button></div>}
      </div>
    </section>
    <div className="a245-console"><section ref={deck} className="a245-deck" data-a243-form aria-labelledby="a243-access-title" onClickCapture={captureLayout}>{children}</section></div>
    <footer className="a245-footer">{!policy.compact && <button type="button" disabled={policy.reduced||policy.saveData} aria-pressed={policy.paused||policy.reduced||policy.saveData} onClick={()=>policy.setPaused(value=>!value)}><Playback245 paused={policy.paused||policy.reduced||policy.saveData}/>{policy.reduced?'Reduced motion':policy.saveData?'Motion limited':policy.paused?'Play motion':'Pause motion'}</button>}<span>Illustrative product study. Independent FYP demonstrator.</span></footer>
  </main>;
}
