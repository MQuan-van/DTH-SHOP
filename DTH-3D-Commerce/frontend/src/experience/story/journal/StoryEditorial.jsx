import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../../shop/useStore';
import { MODE } from '../../../shop/api';
import { visitStory } from '../../journey/journey.logic.mjs';
import { JournalMotionContext, useReducedMotion } from './journalMotion';
import { JOURNAL_SHOTS, shotFor } from './journal.logic.mjs';
import useJournalMotion from './useJournalMotion';
import styles from './StoryEditorial.module.css';

function Photograph({ name, alt, eager = false, className = '', style }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`${className} ${styles.photoFallback}`} role="img" aria-label={alt}>Photo unavailable</div>;
  return <img className={className} style={style} width="1536" height="2048"
    src={`/story/ride-journal/${name}-1536.webp`}
    srcSet={`/story/ride-journal/${name}-768.webp 768w, /story/ride-journal/${name}-1536.webp 1536w`}
    sizes="(max-width: 759px) 94vw, (max-width: 1200px) 65vw, 1100px"
    loading={eager ? 'eager' : 'lazy'} decoding="async" fetchPriority={eager ? 'high' : 'auto'}
    alt={alt} onError={() => setFailed(true)} />;
}
export default function StoryEditorial({ children }) {
  const root = useRef(null), store = useStore(), reduced = useReducedMotion();
  const [paused, setPaused] = useState(false), [selection, setSelection] = useState('crew');
  const motion = !paused && !reduced, shot = shotFor(selection);
  useJournalMotion(root, motion);
  // Visited means opened, not a mandatory viewing duration. No authentication data is stored here.
  useLayoutEffect(() => { if (store.user?.id) visitStory(MODE, store.user.id); }, [store.user?.id]);
  function enter() { if (store.user?.id) visitStory(MODE, store.user.id); }
  return <JournalMotionContext.Provider value={motion}>
    <article ref={root} className={styles.journal} data-story-editorial data-journal-motion={motion ? 'on' : 'off'}>
      <section className={styles.hero} aria-labelledby="dth-journal-title">
        <div className={styles.topline}><span>DTH / RIDER JOURNAL</span>
          <div><button type="button" onClick={() => setPaused(!paused)} disabled={reduced} aria-pressed={motion}>
            {reduced ? 'Reduced motion' : paused ? 'Play motion' : 'Pause motion'}</button>
            <Link to="/" onClick={enter}>Skip story <span aria-hidden="true">↗</span></Link></div>
        </div>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy} data-journal-reveal="text">
            <h1 id="dth-journal-title">Not just<br />another<br /><em>ride.</em></h1>
            <p>A personal build.<br />A shared perspective.</p>
            <a href="#dth-journal-crew" className={styles.discover}>Discover the story <span aria-hidden="true">↓</span></a>
          </div>
          <figure className={styles.heroFigure}>
            <div className={styles.heroWindow} data-journal-reveal="mask">
              <div className={styles.parallax} data-journal-parallax>
                <Photograph name="lineup" eager className={styles.heroPhoto}
                  alt="Four personalised scooters in a diagonal lineup; a white scooter leads, with a blue scooter behind." />
              </div>
              <span className={styles.imageLabel} aria-hidden="true">ON THE STREET — 01</span>
            </div>
            <figcaption><span>Different builds. One shared ride.</span><span aria-hidden="true">01 / 03</span></figcaption>
          </figure>
        </div>
      </section>
      <section id="dth-journal-crew" className={styles.crew} aria-labelledby="dth-crew-title">
        <header className={styles.chapterHeading} data-journal-reveal="text">
          <h2 id="dth-crew-title">Same city.<br /><em>Different lines.</em></h2>
          <p>Look closer. Find your perspective.</p>
        </header>
        <div className={styles.focusFrame} data-journal-reveal="mask">
          <Photograph key={shot.id} name={shot.image} className={styles.focusImage} alt={shot.alt}
            style={{ objectPosition: shot.position, '--photo-zoom': shot.zoom }} />
          <span className={styles.focusNumber} aria-hidden="true">0{JOURNAL_SHOTS.findIndex(s => s.id === shot.id) + 1}</span>
        </div>
        <div className={styles.focusFooter}>
          <div className={styles.focusChoices} role="group" aria-label="Photograph views">
            {JOURNAL_SHOTS.map(item => <button key={item.id} type="button" aria-pressed={shot.id === item.id}
              onClick={() => setSelection(item.id)}>{item.label}<span aria-hidden="true">↗</span></button>)}
          </div>
          <p className={styles.caption} role="status">{shot.label} <span aria-hidden="true">/</span> DTH</p>
        </div>
      </section>
      <div className={styles.study} id="dth-journal-study">{children}</div>
      <section className={styles.closing} aria-labelledby="dth-journal-close">
        <div className={styles.closeImage} data-journal-reveal="mask">
          <Photograph name="crew" className={styles.closePhoto} alt="The four scooters together, photographed on the street." />
        </div>
        <div className={styles.closeCopy} data-journal-reveal="text">
          <span className={styles.smallMark}>DTH / PARTS STUDIO</span>
          <h2 id="dth-journal-close">Make it<br /><em>your own.</em></h2>
          <Link to="/" className={styles.enter} onClick={enter}>Enter studio <span aria-hidden="true">↗</span></Link>
          <Link to="/shop" className={styles.shopLink} onClick={enter}>Or explore parts →</Link>
        </div>
      </section>
      <p className={styles.sourceNote}>Rider photography · Illustrative 3D parts · Demo fitment, not installation guidance.</p>
    </article>
  </JournalMotionContext.Provider>;
}
