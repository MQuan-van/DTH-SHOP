import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import ProductImage from '../catalog/components/ProductImage';
import { hasWebGL } from '../../experience/interaction/useExperiencePolicy';
import { PRODUCT_VIEW, validModelUrl } from './productDecision.logic.mjs';
import { useProductActivity } from './useProductMotion';
import styles from './ProductDecision.module.css';
const Scene = lazy(() => import('./ProductDecisionScene'));
class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}
export default function ProductMedia({ product, motion, policy }) {
  const ref = useRef(null), api = useRef(null), alive = useRef(true);
  const { active, blocked } = useProductActivity(ref);
  const [capable] = useState(hasWebGL);
  const [request, setRequest] = useState(!policy.saveData);
  const [image, setImage] = useState(false), [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  const [inspect, setInspect] = useState(false), [spin, setSpin] = useState(!policy.compact && !policy.reduced && !policy.saveData);
  const [attempt, setAttempt] = useState(0), [retrying, setRetrying] = useState(false), [view, setView] = useState('custom');
  const manual = useCallback(() => { setSpin(false); setView('custom'); }, []);
  const loaded = useCallback(() => { setReady(true); }, []);
  const failure = useCallback(() => { setFailed(true); setReady(false); setSpin(false); setInspect(false); }, []);
  const supported = capable && validModelUrl(product.modelUrl);
  const show = request && supported && !image && !failed;
  const live = show && ready;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!show || ready) return;
    const timer = setTimeout(failure, PRODUCT_VIEW.timeoutMs);
    return () => clearTimeout(timer);
  }, [show, ready, attempt, failure]);
  useEffect(() => { if (!motion || policy.compact) setSpin(false); }, [motion, policy.compact]);
  async function retry() {
    if (retrying) return;
    setRetrying(true);
    try {
      const module = await import('./ProductDecisionScene');
      module.clearProductModel(product.modelUrl);
      if (!alive.current) return;
      setFailed(false); setReady(false); setImage(false); setRequest(true); setInspect(false); setAttempt(n => n + 1);
    } catch { if (alive.current) failure(); }
    finally { if (alive.current) setRetrying(false); }
  }
  function imageMode() { setSpin(false); setInspect(false); setReady(false); setImage(true); }
  function threeMode() { if (failed) { void retry(); return; } setImage(false); setRequest(true); setReady(false); setInspect(false); }
  function command(name) {
    if (!live || !active || blocked) return;
    setSpin(false); setInspect(true);
    if (api.current?.(name)) setView(['front','side','rear','detail','reset'].includes(name) ? (name === 'reset' ? 'front' : name) : 'custom');
  }
  function keyboard(event) {
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey || !live) return;
    const keys = { ArrowLeft:'left', ArrowRight:'right', '+':'in', '=':'in', '-':'out', Home:'reset' };
    if (!Object.hasOwn(keys, event.key)) return;
    event.preventDefault(); command(keys[event.key]);
  }
  const message = failed ? '3D could not load. Image preview is available.'
    : !supported ? '3D unavailable. Image preview.' : image ? 'Image preview'
    : !request ? 'Data saver: load 3D when you need it.'
    : ready ? 'Interactive 3D ready' : 'Loading 3D model…';
  return <section ref={ref} className={styles.media} aria-label={`${product.name}: product viewer`} data-product-media
    data-media-state={live ? 'ready' : failed || !supported ? 'fallback' : image || !request ? 'image' : 'loading'}
    data-motion={motion ? 'on' : 'off'}>
    <header className={styles.mediaHeader}><span>01 / PRODUCT STUDY</span>
      <div role="group" aria-label="Product media"><button type="button" disabled={!supported || (show && !failed)} aria-pressed={show} onClick={threeMode}>3D view</button>
        <button type="button" aria-pressed={image || !supported} onClick={imageMode}>Image</button></div>
    </header>
    <div className={styles.stage} tabIndex={0} onKeyDown={keyboard} role="group" aria-label="Product view. Arrow keys rotate; plus and minus zoom; Home resets.">
      <div className={styles.stageGrid} aria-hidden="true"/><div className={styles.stageRing} aria-hidden="true"/><div className={styles.stageShadow} aria-hidden="true"/>
      <div className={styles.poster} aria-hidden={live} data-hidden={live}><ProductImage product={product} eager className={styles.posterImage}/></div>
      {show && <div className={styles.canvas} data-ready={ready} data-inspect={inspect} aria-hidden="true">
        <Boundary key={attempt} onFailure={failure}><Suspense fallback={null}>
          <Scene product={product} api={api} active={active} ready={ready} motion={motion} inspect={inspect}
            spin={spin} eco={policy.compact || policy.saveData} onManual={manual} onReady={loaded} onFailure={failure}/>
        </Suspense></Boundary>
      </div>}
      <span className={styles.stageStamp} aria-hidden="true">DTH / PERSPECTIVE</span>
      {live && <div className={styles.stageAction}><button type="button" aria-pressed={inspect} onClick={() => { setSpin(false); setInspect(value => !value); }}>
        {inspect ? 'Done inspecting' : 'Drag to inspect'} <span aria-hidden="true">↗</span></button></div>}
    </div>
    <div className={styles.viewStatus}><span role="status">{message}</span>
      {supported && (failed || !request) && <button type="button" disabled={retrying} onClick={failed ? retry : threeMode}>{retrying ? 'Preparing…' : failed ? 'Retry 3D' : 'Load 3D'}</button>}
    </div>
    <div className={styles.presetRow} role="group" aria-label="Camera views">
      {['front','side','rear','detail'].map(name => <button key={name} type="button" disabled={!live || blocked} aria-pressed={view === name}
        onClick={() => command(name)}>{name[0].toUpperCase() + name.slice(1)}</button>)}
    </div>
    <div className={styles.controlRow} role="group" aria-label="3D view controls">
      {[['left','↶','Rotate left'],['right','↷','Rotate right'],['in','+','Zoom in'],['out','−','Zoom out'],['reset','Reset','Reset view']].map(([id,label,title]) =>
        <button type="button" key={id} aria-label={title} title={title} disabled={!live || blocked} onClick={() => command(id)}>{label}</button>)}
      <button type="button" className={styles.rotationButton} disabled={!live || !motion || blocked} aria-pressed={live && spin && !inspect && motion}
        onClick={() => { setInspect(false); setSpin(value => !value); setView('custom'); }}>{live && spin && !inspect && motion ? 'Pause rotation' : 'Auto rotate'}</button>
    </div>
    <p className={styles.mediaHelp}>{inspect ? 'Drag to orbit. Use + / − to zoom. Done inspecting restores touch scrolling.' : 'Scroll to browse. Choose Inspect to rotate with your pointer.'}</p>
    <p className={styles.mediaFine}>Illustrative model · Not a measurement or fitment test.</p>
  </section>;
}
