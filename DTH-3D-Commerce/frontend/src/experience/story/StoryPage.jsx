import { Component, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useStore } from '../../shop/useStore';
import ProductImage from '../../shop/catalog/components/ProductImage';
import { formatMoney } from '../../../../shared/domain.mjs';
import { hasWebGL, useExperiencePolicy } from '../interaction/useExperiencePolicy';
import { useStageActivity } from '../../shop/home/hooks/useStudioMotion';
import { useSceneInputGate } from '../interaction/useSceneInputGate';
import { clearOwnedModelCache } from '../world/useOwnedModel';
import { STORY_HERO, createStorySignal, selectStoryProduct } from './storyHero.config.mjs';
import styles from './StoryPage.module.css';
// DTH Story atmosphere - Step 10
import { StoryContour } from './StoryAtmosphere';
import StoryMaterialChapter from './StoryMaterialChapter';

// DTH Story surface study - Step 9
import StorySurfaceControls, { createSurfaceController } from './StorySurfaceControls';
const StoryHeroScene = lazy(() => import('./StorySurfaceScene'));
const categories = { suspension: 'Suspension', wheels: 'Wheels', exhausts: 'Exhaust', mirrors: 'Mirrors', brakes: 'Brakes' };

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function Corners() {
  return <span className={styles.corners} aria-hidden="true"><i /><i /><i /><i /></span>;
}

/** Static field in this increment. Animated contours/reveal are a later step. */
function Contours() {
  return <svg className={styles.contours} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M-90 170C140 80 290 154 367 271S324 523 173 606S-42 816 53 954" />
      <path d="M-130 225C102 117 248 204 299 290S288 483 135 553S-58 763-7 904" />
      <path d="M1219-90C1044 79 1205 173 1157 307S951 430 966 578S1125 701 1168 812S1232 966 1420 897" />
      <path d="M1302-99C1126 58 1281 215 1225 331S1055 443 1050 551S1193 671 1243 762S1289 885 1481 820" />
    </g>
  </svg>;
}

export function StoryHero({ product }) {
  const page = useRef(null), frame = useRef(null), playedEntrance = useRef(false);
  const signal = useMemo(createStorySignal, []);
  const surface = useMemo(createSurfaceController, []);
  const policy = useExperiencePolicy();
  const active = useStageActivity(frame);
  useSceneInputGate(signal);
  const [capable] = useState(hasWebGL);
  const [motion, setMotion] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState(capable && product.modelUrl ? 'loading' : 'fallback');
  const animated = motion && !policy.reduced;
  const ready = useCallback(() => setStatus('ready'), []);
  const fail = useCallback(() => setStatus('fallback'), []);

  useLayoutEffect(() => {
    signal.set({ motion: animated, active });
  }, [signal, animated, active]);

  useEffect(() => {
    if (status !== 'loading') return;
    const timeout = setTimeout(fail, STORY_HERO.loadTimeoutMs);
    return () => clearTimeout(timeout);
  }, [status, attempt, fail]);

  useLayoutEffect(() => {
    if (!animated) { playedEntrance.current = true; return; }
    if (playedEntrance.current) return;
    let sequence;
    const context = gsap.context(() => {
      sequence = gsap.fromTo('[data-story-enter]',
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.10, ease: 'power3.out',
          onComplete: () => { playedEntrance.current = true; } },
      );
    }, page);
    const gate = () => sequence?.paused(!signal.state.active || signal.state.blocked);
    gate();
    const stop = signal.subscribe(gate);
    return () => { stop(); context.revert(); };
  }, [signal, animated]);

  function toggleMotion() {
    const next = !motion;
    signal.set({ motion: next && !policy.reduced });
    setMotion(next);
  }

  function resetView() {
    surface.choose('surface');
    // A composition check should stay still so the user can inspect centring.
    setMotion(false);
    signal.set({ motion: false, resetSerial: signal.state.resetSerial + 1 });
  }

  function retry() {
    clearOwnedModelCache(product.modelUrl);
    setAttempt(n => n + 1);
    setStatus('loading');
  }

  const price = Number.isSafeInteger(product.price) && product.price >= 0
    ? formatMoney(product.price) : 'Price unavailable';
  const statusText = status === 'loading' ? 'Preparing 3D'
    : status === 'fallback' ? 'Image view · 3D unavailable'
    : policy.reduced ? 'Still view · reduced motion'
    : animated ? 'Live 3D · surface study' : 'Live 3D · motion paused';

  return <>
  <section ref={page} className={styles.page} aria-labelledby="dth-story-title" data-story-shell data-story-motion={animated}>
    <StoryContour signal={signal} regionRef={page} compact={policy.compact} fallback={<Contours />} />
    <div className={styles.backdrop} aria-hidden="true">DTH</div>
    <div className={styles.inner}>
      <div className={styles.masthead} data-story-enter>
        <span className={styles.kicker}>DTH / PERSPECTIVES</span>
        <Link to="/" className={styles.backLink}>Back to studio <span aria-hidden="true">↗</span></Link>
      </div>

      <div className={styles.composition}>
        <div className={styles.identity} data-story-identity>
          <p className={styles.kicker} data-story-enter><span className={styles.cyanMark} aria-hidden="true" />PRODUCT STUDY / 01</p>
          <h1 className={styles.title} id="dth-story-title" data-story-enter><span>MORE THAN</span><span>A PART<span className={styles.fullStop}>.</span></span></h1>
          <p className={styles.intro} data-story-enter>Step closer. <br />See it from every angle.</p>
          <Link to="/shop" className={styles.textLink} data-story-enter>Explore the collection <span aria-hidden="true">↗</span></Link>
        </div>

        <div className={styles.visual} data-story-visual>
          <div ref={frame} className={styles.sceneFrame} data-story-scene={status} aria-busy={status === 'loading'}>
            <div className={styles.canvas} aria-hidden="true">
              {status !== 'fallback' && <SceneBoundary key={attempt} onFailure={fail}>
                <Suspense fallback={null}>
                  <StoryHeroScene product={product} signal={signal} surface={surface} frameRef={frame} compact={policy.compact} onReady={ready} onFailure={fail} />
                </Suspense>
              </SceneBoundary>}
            </div>
            {status !== 'ready' && <div className={styles.poster}><ProductImage product={product} eager className={styles.posterImage} /></div>}
            <span className={styles.axisTop} aria-hidden="true">+</span>
            <span className={styles.axisBottom} aria-hidden="true">+</span>
          </div>
          <StorySurfaceControls surface={surface} signal={signal} ready={status === 'ready'} reduced={policy.reduced} compact={policy.compact} />
          <div className={styles.sceneStatus} role="status">
            <span className={styles.statusDot} data-failed={status === 'fallback'} />{statusText}
            {status === 'fallback' && capable && product.modelUrl && <button type="button" onClick={retry}>Retry 3D</button>}
          </div>
        </div>

        <aside className={styles.detail} aria-label="Featured product" data-story-detail>
          <div className={styles.panel} data-story-enter>
            <Corners />
            <p className={styles.kicker}>{categories[product.category] || 'The collection'}</p>
            <h2 className={styles.productName}>{product.name}</h2>
            {product.finish && <p className={styles.finish}>{product.finish}</p>}
            <div className={styles.priceRow}><strong>{price}</strong><span>DEMO PRICE</span></div>
          </div>
          <div className={styles.actions} data-story-enter>
            <Link className={styles.primary} to={`/products/${product.slug}`}>View product <span aria-hidden="true">↗</span></Link>
            <p className={styles.assetNote}>Illustrative model. <br />Not a physical measurement.</p>
          </div>
        </aside>
      </div>

      <div className={styles.foot} data-story-enter>
        <div className={styles.chapter}><span>01</span><span>THE FORM</span></div>
        <div className={styles.controls} role="group" aria-label="Story view controls">
          <button type="button" onClick={toggleMotion} aria-pressed={animated} disabled={policy.reduced}>
            {policy.reduced ? 'Reduced motion' : animated ? 'Pause motion' : 'Play motion'}
          </button>
          <span aria-hidden="true">/</span>
          <button type="button" onClick={resetView} disabled={status !== 'ready'}>Reset view</button>
        </div>
        <a className={styles.footNote} href="#dth-story-detail">02 / LOOK CLOSER ↓</a>
      </div>
    </div>
  </section>
  <StoryMaterialChapter
    product={product}
    signal={signal}
    surface={surface}
    heroRef={page}
    motion={animated}
    reduced={policy.reduced}
    compact={policy.compact}
    ready={status === 'ready'}
    onToggleMotion={toggleMotion}
  />
  </>;
}

export default function StoryPage() {
  const { data } = useStore();
  const product = selectStoryProduct(data.products);
  if (!product) return <section className={styles.page}><div className={styles.empty}>
    <h1>The story is taking shape.</h1><p>No active product is available.</p><Link to="/shop">Back to the collection ↗</Link>
  </div></section>;
  return <StoryHero key={`${product.id}:${product.modelUrl || ''}`} product={product} />;
}
