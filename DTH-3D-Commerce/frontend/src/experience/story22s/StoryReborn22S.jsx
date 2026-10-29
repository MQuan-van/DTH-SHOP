import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../shop/useStore';
import { MODE } from '../../shop/api';
import { visitStory } from '../journey/journey.logic.mjs';
import { useStartupWebGL } from '../loader/StartupRenderContext.jsx';
import { hasWebGL, useExperiencePolicy } from '../interaction/useExperiencePolicy';
import { useSceneInputGate } from '../interaction/useSceneInputGate';
import useIntroCover from '../journey/useIntroCover';
import { createStoryDirector22S, productLink22S, selectStoryProduct22S } from './story22s.logic.mjs';
import { useStoryMotion22S } from './useStoryMotion22S.js';
import StoryPhoto22S from './StoryPhoto22S.jsx';
import './story22s.css';

const StudyScene22S = lazy(() => import('./StoryStudyScene22S.jsx'));
const CHAPTERS = Object.freeze([['opening', 'The ride'], ['riders', 'The crew'], ['craft', 'The form'], ['detail', 'The detail'], ['closing', 'Your next']]);

export default function StoryReborn22S() {
  const store = useStore(), policy = useExperiencePolicy(), covered = useIntroCover();
  const root = useRef(null), study = useRef(null), stage = useRef(null), nav = useRef(null);
  const director = useMemo(createStoryDirector22S, []);
  const [paused, setPaused] = useState(false), [chapter, setChapter] = useState('opening'), [nearStudy, setNearStudy] = useState(false);
  const [photoMode, setPhotoMode] = useState('together');
  const product = useMemo(() => selectStoryProduct22S(store.data?.products), [store.data?.products]);
  const { allow3D, capable } = useStartupWebGL(hasWebGL);
  const motion = !paused && !policy.reduced && !covered;
  useSceneInputGate(director);
  const onChapter = useCallback(value => setChapter(previous => previous === value ? previous : value), []);
  const seek = useStoryMotion22S({ root, study, stage, nav, director, enabled: motion, compact: policy.compact, onChapter });
  const enter = useCallback(() => { if (store.user?.id) visitStory(MODE, store.user.id); }, [store.user?.id]);
  useEffect(() => { enter(); }, [enter]);
  useEffect(() => {
    const previous = document.title; document.title = 'Story — DTH';
    return () => { document.title = previous; };
  }, []);
  useEffect(() => {
    const region = study.current;
    if (!region) return undefined;
    if (typeof IntersectionObserver !== 'function') { setNearStudy(true); return undefined; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setNearStudy(true); observer.disconnect(); }
    }, { rootMargin: '600px 0px' });
    observer.observe(region); return () => observer.disconnect();
  }, []);
  const go = key => event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); seek.current(key);
    // Navigation never captures wheel/touch or traps the user in the Story.
  };
  return <article ref={root} className="dth-story22s" data-story-version="22S.1" data-compact={policy.compact}
    data-motion={motion ? 'on' : 'off'} aria-label="DTH Story">
    <nav ref={nav} className="s22-chapter-nav" aria-label="Story chapters">
      <span className="s22-nav-label">Story</span>
      <div className="s22-chapter-links">
        {CHAPTERS.map(([key, label]) => <a key={key} href={`#s22-${key === 'craft' || key === 'detail' ? 'study' : key === 'riders' ? 'riders' : key === 'closing' ? 'closing' : 'opening'}`}
          onClick={go(key)} aria-current={chapter === key ? 'step' : undefined}>{label}</a>)}
      </div>
      <div className="s22-nav-actions">
        <button type="button" onClick={() => setPaused(value => !value)} disabled={policy.reduced} aria-pressed={motion}>
          {policy.reduced ? 'Reduced motion' : paused ? 'Play motion' : 'Pause motion'}
        </button>
        <Link to="/shop" onClick={enter}>Skip story</Link>
      </div>
    </nav>

    <section id="s22-opening" className="s22-opening" aria-labelledby="s22-title">
      <div className="s22-opening-photo" data-s22-hero-image>
        <StoryPhoto22S name="lineup" eager sizes="(max-width: 999px) 100vw, 70vw" className="s22-photo-opening" />
      </div>
      <div className="s22-opening-scrim" aria-hidden="true" />
      <div className="s22-signature" aria-hidden="true"><i /><i /><i /></div>
      <div className="s22-opening-copy" data-s22-hero-copy>
        <h1 id="s22-title"><span>Beyond</span><span>the ride.</span></h1>
        <a className="s22-button s22-button-light" href="#s22-riders" onClick={go('riders')}><span>Explore the story</span></a>
      </div>
    </section>

    <section id="s22-riders" className="s22-riders" aria-labelledby="s22-riders-title">
      <header className="s22-section-head">
        <h2 id="s22-riders-title">Different lines.<br />One ride.</h2>
        <div className="s22-photo-switch" role="group" aria-label="Photo composition">
          <button type="button" onClick={() => setPhotoMode('together')} aria-pressed={photoMode === 'together'}>Together</button>
          <button type="button" onClick={() => setPhotoMode('closer')} aria-pressed={photoMode === 'closer'}>Closer</button>
        </div>
      </header>
      <div className="s22-photo-pair" data-crop={photoMode}>
        <figure className="s22-photo-figure s22-photo-lineup" data-s22-reveal>
          <div className="s22-photo-window" data-s22-parallax><StoryPhoto22S name="lineup" sizes="(max-width: 999px) 80vw, 36vw" className="s22-photo-portrait" /></div>
        </figure>
        <figure className="s22-photo-figure s22-photo-crew" data-s22-reveal>
          <div className="s22-photo-window" data-s22-parallax><StoryPhoto22S name="crew" sizes="(max-width: 999px) 90vw, 54vw" className="s22-photo-landscape" /></div>
          <figcaption>The crew.</figcaption>
        </figure>
      </div>
    </section>

    <section id="s22-study" ref={study} className="s22-study" aria-label="Product form and detail">
      <div ref={stage} className="s22-study-stage">
        <div className="s22-study-watermark" aria-hidden="true">DTH</div>
        <div className="s22-study-visual">
          <div className="s22-study-shadow" aria-hidden="true" />
          {product ? nearStudy ? <Suspense fallback={<div className="s22-model-status" role="status">Preparing 3D</div>}>
            <StudyScene22S key={`${product.id}:${product.modelUrl}`} product={product} director={director} compact={policy.compact} allowed={allow3D} capable={capable} />
          </Suspense> : <div className="s22-model-status" role="status">Preparing 3D</div>
            : <div className="s22-model-status"><p>No published 3D product is available.</p><Link to="/shop" className="s22-text-link">Explore parts</Link></div>}
        </div>
        <div className="s22-study-copy">
          <div className="s22-study-headings">
            <h2 data-s22-form>The form.</h2>
            <h2 data-s22-detail aria-hidden="true">Every detail.</h2>
          </div>
          {product && <>
            <h3 className="s22-product-name">{product.name}</h3>
            {product.finish && <p className="s22-product-finish">{product.finish}</p>}
            <Link className="s22-button s22-button-dark" to={productLink22S(product)} onClick={enter}><span>View product</span></Link>
          </>}
          <div className="s22-study-tabs" role="group" aria-label="Product camera positions">
            <button type="button" onClick={() => seek.current('craft')} aria-pressed={chapter !== 'detail'}>Overview</button>
            <button type="button" onClick={() => seek.current('detail')} aria-pressed={chapter === 'detail'}>Detail</button>
          </div>
        </div>
        <div className="s22-study-foot"><span>Original finish</span><span>Illustrative 3D. Verify real fitment.</span></div>
        <div className="s22-study-line" aria-hidden="true"><i data-s22-study-progress /></div>
      </div>
    </section>

    <section id="s22-closing" className="s22-closing" aria-labelledby="s22-closing-title">
      <div className="s22-closing-photo" data-s22-reveal><StoryPhoto22S name="crew" sizes="100vw" className="s22-photo-close" decorative /></div>
      <div className="s22-closing-copy">
        <h2 id="s22-closing-title">Make it<br />your own.</h2>
        <div className="s22-closing-actions">
          <Link className="s22-button s22-button-light" to="/shop?mode=shop&view=story" onClick={enter}><span>Explore parts</span></Link>
          <Link className="s22-text-link s22-text-link-light" to="/" onClick={enter}>Enter studio</Link>
        </div>
      </div>
      <span className="s22-closing-wordmark" aria-hidden="true">DTH</span>
    </section>
  </article>;
}
