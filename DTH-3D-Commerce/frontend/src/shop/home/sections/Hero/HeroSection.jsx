import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/StoreIcon.jsx';
import { useStore } from '../../../useStore.jsx';
import { fitment, formatMoney } from '../../../../../../shared/domain.mjs';
import { resolveExhibits } from '../../home.config.mjs';
import { useEntrance, useStageActivity } from '../../hooks/useStudioMotion.js';
import styles from './HeroSection.module.css';
const HeroScene = lazy(() => import('./HeroScene.jsx'));

class StageBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function MiniIcon({ name }) {
  const icons = {
    pause: <><path d="M9 5v14M15 5v14" /></>,
    play: <path d="m8 5 11 7-11 7z" />,
    rotate: <><path d="M4 11a8 8 0 1 1 2 7M4 5v6h6" /></>,
    wire: <><path d="m12 3 9 6-3 11H6L3 9zM12 3v17M3 9l15 11M21 9 6 20M3 9h18" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="9" r="1" /><path d="m3 17 6-5 4 3 3-4 5 6" /></>,
    expand: <><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6M8 8l-5-5m13 5 5-5M8 16l-5 5m13-5 5 5" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name] || icons.expand}</svg>;
}
export default function HeroSection({ config, motion, motionEnabled, reduced, onToggleMotion, chooseVehicle }) {
  const { data, vehicleId } = useStore();
  const exhibits = useMemo(() => resolveExhibits(data.products, config.exhibits), [data.products, config.exhibits]);
  const [selectedId, setSelectedId] = useState(() => exhibits[0]?.product.id);
  const activeExhibit = exhibits.find(item => item.product.id === selectedId) || exhibits[0];
  const ref = useRef(null), sceneApi = useRef(null), inspectButton = useRef(null);
  // const [inspect, setInspect] = useState(false), [still, setStill] = useState(false), [wireframe, setWireframe] = useState(false);
  // Cho phép kéo xoay sản phẩm ngay từ đầu.
  const [inspect, setInspect] = useState(true);

  const [still, setStill] = useState(false);
  const [wireframe, setWireframe] = useState(false)
  const [loadState, setLoadState] = useState({ key: '', status: 'loading' });
  const active = useStageActivity(ref);
  const modelKey = activeExhibit?.product.modelUrl || '';
  const status = loadState.key === modelKey ? loadState.status : 'loading';
  const onReady = useCallback(() => setLoadState({ key: modelKey, status: 'ready' }), [modelKey]);
  const onFailure = useCallback(() => { setLoadState({ key: modelKey, status: 'unavailable' }); setInspect(false); }, [modelKey]);
  useEntrance(ref, motionEnabled, { duration: motion.entranceMs, stagger: motion.staggerMs });
  const product = activeExhibit?.product;
  // useEffect(() => {
  //   setInspect(false); setStill(false); setWireframe(false);
  // }, [product?.id, product?.modelUrl]);
    useEffect(() => {
    // Đổi sang phuộc, bánh xe hoặc pô thì vẫn kéo xoay được ngay.
    setInspect(true);
    setStill(false);
    setWireframe(false);
  }, [product?.id, product?.modelUrl]);
  useEffect(() => {
    if (!inspect) return;
    const escape = event => {
      if (event.key === 'Escape') { setInspect(false); inspectButton.current?.focus(); }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [inspect]);
  if (!product) return null;
  const current = exhibits.findIndex(item => item.product.id === product.id);
  const match = fitment(product, vehicleId, data.vehicles);
  const vehicle = data.vehicles.find(v => v.id === vehicleId);
  const fallback = still || status === 'unavailable';
  const liveMotion = motionEnabled && active && !inspect && !fallback;
  // const annotationVisible = config.annotations && !inspect;\
  const annotationVisible = config.annotations;
  // function showStill() {
  //   setInspect(false);
  //   setStill(value => !value);
  //   if (still) setLoadState({ key: modelKey, status: 'loading' });
  // }
    function showStill() {
    const nextStill = !still;

    setStill(nextStill);

    // Ảnh tĩnh: tắt tương tác.
    // Quay về mô hình 3D: bật tương tác lại.
    setInspect(!nextStill);

    if (!nextStill) {
      setLoadState({
        key: modelKey,
        status: 'loading',
      });
    }
  }
  function reset() { sceneApi.current?.reset(); }
  const serial = String(current + 1).padStart(2, '0');
  return <section id="studio" ref={ref} className={styles.hero} aria-label="Interactive product showroom"
    data-stage-active={active ? 'true' : 'false'} data-inspecting={inspect ? 'true' : 'false'}
    data-ambient={liveMotion ? 'on' : 'off'} style={{ '--ring-period': `${motion.ambientRingSeconds}s` }}>
    <div className={styles.background} aria-hidden="true"><div className={styles.grid} /><div className={styles.spotlight} /></div>
    <div className={styles.inner}>
      <div className={styles.topline} data-enter>
        <p><span className={styles.statusDot} />{config.eyebrow}</p>
        <span className={styles.edition}>PRODUCT STUDY / {serial}</span>
        <button type="button" className={styles.motionToggle} onClick={onToggleMotion} disabled={reduced}
          aria-pressed={motionEnabled} aria-label={reduced ? 'Reduced motion enabled by your device' : motionEnabled ? 'Pause showroom motion' : 'Play showroom motion'}>
          <MiniIcon name={motionEnabled ? 'pause' : 'play'} />{reduced ? 'REDUCED MOTION' : motionEnabled ? 'MOTION ON' : 'MOTION OFF'}
        </button>
      </div>
      <div className={styles.display}>
        <div className={styles.backdrop} aria-hidden="true"><span key={product.id}>{activeExhibit.backdrop}</span></div>
        <div className={styles.orbit} aria-hidden="true"><div className={styles.orbitTrack} /><div className={styles.orbitInner} /><span className={styles.orbitDot} /></div>
        <div className={styles.floor} aria-hidden="true"><span /><i /></div>
        <div className={styles.pitch} data-enter>
          {/* <span className={styles.micro}>A CLOSER LOOK CHANGES EVERYTHING</span> */}
          <h1>{config.headline[0]}<br /><em>{config.headline[1]}</em></h1>
          <p>{config.description}</p>
          <Link className={styles.exploreLink} to="/shop">Explore the collection <Icon name="arrow" /></Link>
        </div>
        <div className={styles.sceneSlot} aria-hidden="true" data-interactive={inspect ? 'true' : 'false'}>
          {(fallback || status !== 'ready') && <img className={styles.still} src={activeExhibit.stillUrl || product.imageUrl} alt="" draggable="false" />}
          {!fallback && <StageBoundary key={`${product.id}:${product.modelUrl}`} onFailure={onFailure}>
            <Suspense fallback={null}>
              <HeroScene ref={sceneApi} product={product} exhibit={activeExhibit} settings={config.scene}
                active={active} motionEnabled={motionEnabled} inspect={inspect} wireframe={wireframe}
                onReady={onReady} onFailure={onFailure} />
            </Suspense>
          </StageBoundary>}
        </div>
        <div className={`${styles.annotation} ${styles.geometry}`} data-enter data-visible={annotationVisible ? 'true' : 'false'}>
          <span className={styles.micro}>01 / FORM STUDY</span>
          <h2>{activeExhibit.geometry}</h2>
          <p>{activeExhibit.note}</p>
          <span className={styles.leader} aria-hidden="true" />
        </div>
        <div className={`${styles.annotation} ${styles.finish}`} data-enter data-visible={annotationVisible ? 'true' : 'false'}>
          <span className={styles.micro}>02 / SURFACE & FINISH</span>
          <h2>{product.finish}</h2>
          <div className={styles.swatches} aria-label={`Illustrative finish: ${product.finish}`}><span style={{ background: product.accent || '#cbd4dc' }} /><span /><small>ILLUSTRATIVE MATERIAL</small></div>
          <span className={styles.leader} aria-hidden="true" />
        </div>
        <div className={`${styles.annotation} ${styles.fitment}`} data-enter>
          <span className={styles.micro}>03 / YOUR RIDE</span>
          <h2>{vehicle ? `${vehicle.model} · ${vehicle.year}` : 'The right starting point.'}</h2>
          <p className={vehicle && match.status === 'compatible' ? styles.compatible : ''}>{vehicle ? match.text : 'Select your vehicle. Explore matching parts.'}</p>
          <button type="button" onClick={chooseVehicle}><Icon name="vehicle" />{vehicle ? 'Change vehicle' : 'Find my fit'}<span>↗</span></button>
          <small>SYNTHETIC FITMENT DATA</small>
        </div>
        <div className={styles.scale} aria-hidden="true"><span>360°</span><i /><small>FORM / FINISH / PERSPECTIVE</small></div>

      </div>
      <div className={styles.controlDeck} data-enter>
        <div className={styles.productIdentity}><span className={styles.productNumber}>{serial}<small> / {String(exhibits.length).padStart(2, '0')}</small></span><div><span className={styles.micro}>IN THE STUDIO / {activeExhibit.label.toUpperCase()}</span><h2>{product.name}</h2><p>{formatMoney(product.price)} <span>DEMO PRICE</span></p></div></div>
        <div className={styles.primaryActions}>
          <button ref={inspectButton} type="button" className={`${styles.inspectButton} ${inspect ? styles.inspectActive : ''}`} disabled={status !== 'ready' || fallback}
            aria-pressed={inspect} onClick={() => setInspect(value => !value)}><MiniIcon name="expand" />{inspect ? 'Exit inspection' : config.inspectLabel}</button>
          <Link to={`/products/${product.slug}`} className={styles.productLink}>{config.productLinkLabel}<span>↗</span></Link>
        </div>
      </div>
      <div className={styles.bottomline}>
        <div className={styles.exhibitTabs} role="group" aria-label="Choose showroom product">
          {exhibits.map((item, index) => <button type="button" key={item.product.id} aria-pressed={item.product.id === product.id}
            aria-label={`Show ${item.product.name}`} onClick={() => setSelectedId(item.product.id)}><span>{String(index + 1).padStart(2, '0')}</span>{item.label}</button>)}
        </div>
        <div className={styles.utilityControls} role="group" aria-label="Showroom view controls">
          <button type="button" onClick={reset} disabled={status !== 'ready' || fallback} aria-label="Reset showroom view"><MiniIcon name="rotate" /><span>Reset</span></button>
          <button type="button" onClick={() => setWireframe(value => !value)} disabled={status !== 'ready' || fallback} aria-pressed={wireframe}><MiniIcon name="wire" /><span>Wireframe</span></button>
          <button type="button" onClick={showStill} disabled={status === 'unavailable'} aria-pressed={still}><MiniIcon name="image" /><span>{still ? 'View 3D' : 'Image'}</span></button>
        </div>
      </div>
      {inspect && <div className={styles.accessibleControls} role="group" aria-label="Keyboard-accessible 3D controls">
        <span>INSPECT</span><button type="button" onClick={() => sceneApi.current?.turn(-0.3)} aria-label="Rotate showroom model left">↶ Rotate left</button><button type="button" onClick={() => sceneApi.current?.turn(0.3)} aria-label="Rotate showroom model right">Rotate right ↷</button><button type="button" onClick={() => sceneApi.current?.zoom(0.9)} aria-label="Zoom showroom in">＋ Zoom</button><button type="button" onClick={() => sceneApi.current?.zoom(1.1)} aria-label="Zoom showroom out">− Zoom</button>
      </div>}
      <div className={styles.scrollNote}><span className={styles.smallCross}>＋</span><span>SELECT A PART. CHANGE YOUR PERSPECTIVE.</span><span aria-hidden="true">SCROLL TO EXPLORE ↓</span></div>
    </div>
  </section>;
}
