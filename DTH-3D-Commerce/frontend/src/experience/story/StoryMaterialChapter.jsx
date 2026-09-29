import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import ProductImage from '../../shop/catalog/components/ProductImage';
import { StoryContour, StoryCheckerSeam } from './StoryAtmosphere';
import styles from './StoryMaterialChapter.module.css';

/** Native one-shot entrance. Cancelling returns elements to their readable DOM state. */
function useChapterEntrance(ref, signal, reduced) {
  const played = useRef(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || reduced || typeof IntersectionObserver !== 'function') return;
    let visible = false, animations = [];
    function update() {
      if (!signal.state.motion) { animations.forEach(a => a.cancel()); animations = []; played.current = true; return; }
      if (visible && !played.current && !document.hidden && !signal.state.blocked) {
        played.current = true;
        animations = [...element.querySelectorAll('[data-study-enter]')].flatMap((node, index) => typeof node.animate !== 'function' ? [] : [node.animate([
          { opacity: 0, transform: 'translate3d(0, 24px, 0)' },
          { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        ], { duration: 820, delay: Math.min(index, 6) * 75, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' })]);
      }
      for (const animation of animations) {
        if (animation.playState === 'finished' || animation.playState === 'idle') continue;
        if (document.hidden || signal.state.blocked || !visible) animation.pause();
        else if (animation.playState === 'paused') animation.play();
      }
    }
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); }, { threshold: 0.15 });
    observer.observe(element);
    const stop = signal.subscribe(update);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); stop(); document.removeEventListener('visibilitychange', update); animations.forEach(a => a.cancel()); };
  }, [ref, signal, reduced]);
}

const MODES = [
  { id: 'surface', number: '01', title: 'THE SURFACE', note: 'Colour, finish, a full view.', label: 'Open full surface in the 3D study' },
  { id: 'reveal', number: '02', title: 'THE REVEAL', note: 'Move across the part. Follow the edge.', label: 'Open liquid reveal in the 3D study' },
  { id: 'technical', number: '03', title: 'THE GEOMETRY', note: 'A moving wireframe, one detail at a time.', label: 'Open technical scan in the 3D study' },
];

export default function StoryMaterialChapter({ product, signal, surface, heroRef, motion, reduced, compact, ready, onToggleMotion }) {
  const section = useRef(null), content = useRef(null);
  const settings = useSyncExternalStore(surface.subscribe, surface.getSnapshot, surface.getSnapshot);
  useChapterEntrance(content, signal, reduced);
  function openStudy(mode, index) {
    surface.choose(mode);
    const hero = heroRef.current;
    if (!hero) return;
    // Explicit user navigation, never a wheel handler or scroll lock.
    hero.scrollIntoView({ behavior: motion && !reduced ? 'smooth' : 'auto', block: 'start' });
    const control = hero.querySelectorAll('[data-story-surface-controls] button')[index];
    control?.focus({ preventScroll: true });
  }
  return <section ref={section} className={styles.chapter} id="dth-story-detail" aria-labelledby="dth-story-detail-title" data-story-material-chapter data-motion={motion ? 'on' : 'off'}>
    <StoryContour signal={signal} regionRef={section} compact={compact} tone="dark" />
    <StoryCheckerSeam signal={signal} compact={compact} />
    <div ref={content} className={styles.inner}>
      <div className={styles.topline} data-study-enter>
        <span>02 / UNDER THE SURFACE</span>
        <button type="button" onClick={onToggleMotion} disabled={reduced} aria-pressed={motion} aria-label={motion ? 'Pause all Story motion' : 'Play Story motion'}>
          {reduced ? 'Reduced motion' : motion ? 'Ⅱ Pause motion' : '▶ Play motion'}
        </button>
      </div>
      <div className={styles.composition}>
        <div className={styles.copy}>
          <p className={styles.kicker} data-study-enter>A DIFFERENT PERSPECTIVE</p>
          <h2 id="dth-story-detail-title" className={styles.heading} data-study-enter><span>LOOK</span><span>CLOSER<span className={styles.period}>.</span></span></h2>
          <p className={styles.description} data-study-enter>The finish. The form.<br />The details in between.</p>
          <Link to={`/products/${product.slug}`} className={styles.productLink} data-study-enter>View product <span aria-hidden="true">↗</span></Link>
        </div>
        <figure className={styles.media} data-study-enter>
          <div className={styles.imageFrame}>
            <ProductImage product={product} className={styles.image} />
          </div>
          <span className={styles.cornerTL} aria-hidden="true" /><span className={styles.cornerBR} aria-hidden="true" />
          <figcaption>ILLUSTRATIVE PRODUCT PREVIEW</figcaption>
        </figure>
        <nav className={styles.studyNav} aria-label="Return to a 3D study mode" data-study-enter>
          {MODES.map((mode, index) => {
            const disabled = !ready || !settings.supported || (mode.id !== 'surface' && (!motion || reduced)) || (mode.id === 'reveal' && compact);
            return <button key={mode.id} type="button" onClick={() => openStudy(mode.id, index)} disabled={disabled} aria-label={mode.label}>
              <span className={styles.modeNumber}>{mode.number}</span>
              <span className={styles.modeContent}><strong>{mode.title}</strong><span>{mode.note}</span></span>
              <span className={styles.arrow} aria-hidden="true">↗</span>
            </button>;
          })}
          {!ready && <p className={styles.availability}>The 3D study is unavailable. The product page is still accessible.</p>}
          {ready && !settings.supported && <p className={styles.availability}>This model supports viewing; surface effects are unavailable.</p>}
          {ready && (!motion || reduced) && <p className={styles.availability}>Still view is on. Motion effects stay paused.</p>}
          {ready && motion && !reduced && compact && <p className={styles.availability}>Liquid reveal needs a larger viewport and a fine pointer.</p>}
        </nav>
      </div>
      <div className={styles.footer} data-study-enter>
        <div><span className={styles.kicker}>IN THIS STUDY</span><h3>{product.name}</h3>{product.finish && <p>{product.finish}</p>}</div>
        <p className={styles.disclaimer}>Illustrative asset. Not a physical scan<br />or verified installation guidance.</p>
        <Link to="/shop" className={styles.collectionLink}>FIND YOUR NEXT PART <span aria-hidden="true">↗</span></Link>
      </div>
    </div>
  </section>;
}
