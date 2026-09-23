import { Component, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import gsap from 'gsap';
import { useStore } from '../../shop/useStore';
import ProductImage from '../../shop/catalog/components/ProductImage';
import { formatMoney } from '../../../../shared/domain.mjs';
import { CINEMATIC_CONFIG } from '../motion/motion.config.mjs';
import { createDirector, sampleStory } from '../motion/story.mjs';
import { useScrollDirector } from '../motion/useScrollDirector';
import { hasWebGL, useExperiencePolicy } from '../interaction/useExperiencePolicy';
import { useStageActivity } from '../../shop/home/hooks/useStudioMotion';
import styles from './CinematicHome.module.css';
const CinematicScene = lazy(() => import('../world/CinematicScene'));
const categories = { suspension: 'Suspension', wheels: 'Wheels', exhausts: 'Exhausts', mirrors: 'Mirrors', brakes: 'Brakes' };

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function Arrow() { return <span aria-hidden="true">↗</span>; }

function Story({ product, chooseVehicle }) {
  const root = useRef(null), stage = useRef(null), copy = useRef(null), api = useRef(null);
  const director = useMemo(createDirector, []);
  const policy = useExperiencePolicy();
  const [capable] = useState(hasWebGL);
  const [sceneStatus, setSceneStatus] = useState(capable && product.modelUrl ? 'loading' : 'fallback');
  const [attempt, setAttempt] = useState(0), [rigged, setRigged] = useState(false);
  const [motion, setMotion] = useState(true), [quality, setQuality] = useState('auto'), [slow, setSlow] = useState(false);
  const [chapter, setChapter] = useState(0), [inspect, setInspect] = useState(false);
  const [explode, setExplode] = useState(0), [wireframe, setWireframe] = useState(false);
  const animated = motion && !policy.reduced;
  const fallback = sceneStatus === 'fallback';
  const cinematic = animated && !policy.compact && !fallback;
  const active = useStageActivity(stage);
  const selectChapter = useScrollDirector(root, director, { cinematic, animated, onChapter: setChapter });
  const ready = useCallback(supported => { setRigged(supported); setSceneStatus('ready'); }, []);
  const fail = useCallback(() => { setSceneStatus('fallback'); setInspect(false); }, []);
  const lowerQuality = useCallback(() => setSlow(true), []);
  const eco = quality === 'eco' || policy.saveData || policy.compact || slow;
  const text = CINEMATIC_CONFIG.chapters[chapter];

  useEffect(() => { director.set({ motion: animated, active, inspecting: inspect, manualExplode: explode }); }, [director, animated, active, inspect, explode]);
  useEffect(() => {
    if (sceneStatus !== 'loading') return;
    const timeout = setTimeout(fail, CINEMATIC_CONFIG.loadTimeoutMs);
    return () => clearTimeout(timeout);
  }, [sceneStatus, attempt, fail]);
  useLayoutEffect(() => {
    if (sceneStatus !== 'ready' || !animated) { director.set({ reveal: 1 }); return; }
    const intro = { reveal: 0 };
    director.set({ reveal: 0 });
    const tween = gsap.to(intro, { reveal: 1, duration: CINEMATIC_CONFIG.entranceSeconds, ease: 'power3.out', onUpdate: () => director.set({ reveal: intro.reveal }) });
    return () => tween.kill();
  }, [director, sceneStatus, animated]);
  useLayoutEffect(() => {
    if (!animated || inspect) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-copy-line]', { yPercent: 110, rotate: 3 }, { yPercent: 0, rotate: 0, duration: .7, stagger: .065, ease: 'power3.out' });
      gsap.fromTo('[data-copy-note]', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .55, delay: .16 });
    }, copy);
    return () => ctx.revert();
  }, [chapter, inspect, animated]);

  function toggleInspect() {
    const value = !inspect;
    if (value) setExplode(rigged ? sampleStory(director.state.progress).explode : 0);
    setInspect(value); director.set({ inspecting: value });
  }
  function toggleMotion() {
    if (cinematic) window.scrollTo({ top: Math.max(0, root.current.getBoundingClientRect().top + window.scrollY - 79), behavior: 'instant' });
    setMotion(v => !v);
  }
  function jump(index) { setInspect(false); director.set({ inspecting: false }); selectChapter.current?.(CINEMATIC_CONFIG.chapters[index].at); }
  function pointer(event) {
    if (!animated || inspect || policy.compact || event.pointerType === 'touch') return;
    const rect = stage.current.getBoundingClientRect();
    director.set({ pointerX: ((event.clientX - rect.left) / rect.width - .5) * 2, pointerY: ((event.clientY - rect.top) / rect.height - .5) * 2 });
  }
  async function retry() {
    try { const module = await import('../world/CinematicScene'); module.clearCinematicModel(product.modelUrl); setAttempt(n => n + 1); setSceneStatus('loading'); } catch { fail(); }
  }

  return <section ref={root} className={styles.story} aria-label="Interactive product story"
    style={{ '--story-screens': CINEMATIC_CONFIG.storyScreens }}
    data-cinematic={cinematic} data-inspect={inspect} data-motion={animated ? 'on' : 'off'} data-chapter={text.id}>
    <div ref={stage} className={styles.stage} data-stage data-scene={sceneStatus}
      onPointerMove={pointer} onPointerLeave={() => director.set({ pointerX: 0, pointerY: 0 })}>
      <div className={styles.topline}>
        <span>DTH / PARTS IN PERSPECTIVE</span>
        <div className={styles.preferences}>
          <button type="button" onClick={toggleMotion} disabled={policy.reduced} aria-pressed={animated} aria-label={animated ? 'Pause cinematic motion' : 'Enable cinematic motion'}>{animated ? 'Ⅱ Motion' : policy.reduced ? 'Reduced motion' : '▶ Motion'}</button>
          <label><span className={styles.srOnly}>Rendering quality</span><select value={quality} onChange={e => { setQuality(e.target.value); setSlow(false); }}><option value="auto">Auto quality</option><option value="eco">Eco quality</option></select></label>
          <a href="#dth-collection">Skip to parts ↓</a>
        </div>
      </div>
      <div className={styles.artwork} aria-hidden="true"><span>DTH</span><i/><i/></div>
      <div className={styles.canvas} data-interactive={inspect} aria-hidden="true">
        {!fallback && <SceneBoundary key={attempt} onFailure={fail}><Suspense fallback={null}>
          <CinematicScene product={product} director={director} api={api} onReady={ready} onFailure={fail} compact={policy.compact} wireframe={wireframe} eco={eco} onSlow={lowerQuality}/>
        </Suspense></SceneBoundary>}
      </div>
      {sceneStatus !== 'ready' && <div className={styles.poster}><ProductImage product={product} eager className={styles.posterImage}/></div>}
      <div ref={copy} className={`${styles.copy} ${chapter === 3 ? styles.copyRight : ''}`}>
        <p className={styles.eyebrow}>{inspect ? 'IN YOUR HANDS' : `${String(chapter + 1).padStart(2,'0')} / ${text.label}`}</p>
        <h1 key={inspect ? 'inspect' : text.id}>
          {(inspect ? ['A closer', 'point of view.'] : text.title).map((line, index) => <span className={styles.lineMask} key={line}><span data-copy-line className={index ? styles.outlineWord : ''}>{line}</span></span>)}
        </h1>
        <p className={styles.copyNote} data-copy-note>{inspect ? 'Drag to rotate. Scroll to zoom. Make it your view.' : !rigged && chapter === 2 ? 'Explore the silhouette from a new perspective.' : text.note}</p>
        <div className={styles.copyAction} data-copy-note>
          {chapter === 3 && !inspect ? <button className={styles.textLink} type="button" onClick={chooseVehicle}>Find my fit <Arrow/></button> : <Link className={styles.textLink} to="/shop">Explore the parts <Arrow/></Link>}
        </div>
      </div>
      <div className={styles.sideNote} aria-hidden="true"><span>FORM / FINISH / PERSPECTIVE</span><b>360°</b><i/></div>
      <div className={styles.status} role="status">
        <i/>{sceneStatus === 'loading' ? 'Preparing the 3D study…' : fallback ? 'Image view — 3D unavailable' : inspect ? 'Interactive 3D' : 'Live 3D study'}
        {fallback && capable && product.modelUrl && <button type="button" onClick={retry}>Retry 3D</button>}
      </div>
      <div className={styles.productStrip}>
        <div><p className={styles.eyebrow}>{categories[product.category] || 'Collection'}</p><h2>{product.name}</h2><p className={styles.price}>{formatMoney(product.price)} <small>DEMO PRICE</small></p></div>
        <div className={styles.stripActions}>
          <button type="button" className={styles.inspectButton} onClick={toggleInspect} disabled={sceneStatus !== 'ready'} aria-pressed={inspect}>{inspect ? 'Return to story' : 'Inspect in 3D'} <span aria-hidden="true">{inspect ? '↶' : '⊕'}</span></button>
          <Link className={styles.productLink} to={`/products/${product.slug}`}>View product <Arrow/></Link>
        </div>
      </div>
      <div className={styles.bottomline}>
        <nav className={styles.chapters} aria-label="Product story chapters">{CINEMATIC_CONFIG.chapters.map((item, index) => <button type="button" key={item.id} aria-current={!inspect && chapter === index ? 'step' : undefined} onClick={() => jump(index)}><small>0{index + 1}</small> {item.label}</button>)}</nav>
        <span className={styles.scrollHint}>{cinematic ? 'SCROLL TO EXPLORE ↓' : 'SELECT A CHAPTER'}</span>
      </div>
      {inspect && <div className={styles.inspectionTools} aria-label="3D inspection controls">
        {['left','right','in','out','reset'].map(command => <button key={command} type="button" aria-label={{left:'Rotate left',right:'Rotate right',in:'Zoom in',out:'Zoom out',reset:'Reset view'}[command]} onClick={() => { api.current?.(command); if (command === 'reset') setExplode(0); }}>{({left:'↶',right:'↷',in:'+',out:'−',reset:'Reset'})[command]}</button>)}
        <button type="button" aria-pressed={wireframe} onClick={() => setWireframe(v => !v)}>Wireframe</button>
        {rigged && <label>Explode <input aria-label="Assembly separation" type="range" min="0" max="1" step="0.01" value={explode} onChange={e => setExplode(Number(e.target.value))}/></label>}
      </div>}
      <p className={styles.disclaimer}>Original illustrative geometry · Not installation guidance</p>
    </div>
  </section>;
}

export default function CinematicHome() {
  const { data, vehicleId } = useStore();
  const { chooseVehicle } = useOutletContext();
  const live = data.products.filter(p => p && p.active !== false);
  const product = live.find(p => p.id === CINEMATIC_CONFIG.productId) || live[0];
  const selected = live.filter(p => p.featured).slice(0, 3);
  const collection = selected.length ? selected : live.slice(0, 3);
  const vehicle = data.vehicles.find(v => v.id === vehicleId);
  useLayoutEffect(() => {
    document.documentElement.dataset.dthCinematic = 'true';
    return () => { delete document.documentElement.dataset.dthCinematic; };
  }, []);
  if (!product) return <section className="dth-empty"><h1>The collection is taking shape.</h1><p>No active products are available.</p><Link to="/shop">Back to parts</Link></section>;
  return <div className={styles.cinema}>
    <Story key={`${product.id}:${product.modelUrl}`} product={product} chooseVehicle={chooseVehicle}/>
    <section className={styles.collection} id="dth-collection" aria-labelledby="collection-title">
      <div className={styles.collectionHeading}><div><p className={styles.eyebrow}>THE SELECTED COLLECTION</p><h2 id="collection-title" tabIndex={-1}>Different parts.<br/><em>Same curiosity.</em></h2></div><Link className={styles.textLink} to="/shop">All parts <Arrow/></Link></div>
      <div className={styles.collectionGrid}>{collection.map((item, index) => <article key={item.id} className={styles.collectionItem}>
        <Link className={styles.collectionImage} to={`/products/${item.slug}`} aria-label={`View ${item.name}`}><span className={styles.itemNumber}>0{index + 1}</span><ProductImage product={item}/><span className={styles.itemExplore}>Explore <Arrow/></span></Link>
        <div className={styles.itemInfo}><div><p className={styles.eyebrow}>{categories[item.category]}</p><h3><Link to={`/products/${item.slug}`}>{item.name}</Link></h3></div><span>{formatMoney(item.price)}</span></div>
      </article>)}</div>
      <nav className={styles.categoryNav} aria-label="Browse categories">{Object.entries(categories).map(([id, name]) => <Link to={`/shop?category=${id}`} key={id}>{name} <Arrow/></Link>)}</nav>
    </section>
    <section className={styles.fitment} aria-labelledby="fitment-title">
      <p className={styles.eyebrow}>THE NEXT CHAPTER</p><div className={styles.fitmentMain}><h2 id="fitment-title">Your ride.<br/><em>Your direction.</em></h2><div><p>{vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.year}` : 'Start with your vehicle.'}</p><button type="button" onClick={chooseVehicle}>{vehicle ? 'Change vehicle' : 'Select my vehicle'} <Arrow/></button><small>Compatibility is based on synthetic demo data.</small></div></div>
      <span className={styles.fitmentMark} aria-hidden="true">///</span>
    </section>
  </div>;
}
