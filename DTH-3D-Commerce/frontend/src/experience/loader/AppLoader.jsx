import { useEffect, useLayoutEffect, useRef } from 'react';
import { LOADER_CONFIG } from './loader.config.mjs';
import { createLoaderMotion } from './loaderMotion.mjs';
import styles from './AppLoader.module.css';

// Original PNG regions only; the main image remains complete and unmodified.
const SEGMENTS = [
  'polygon(10% 55%,12% 55%,11% 60%,9% 60%)',
  'polygon(12% 55%,14% 55%,13% 60%,11% 60%)',
  'polygon(14% 55%,16.5% 55%,15.5% 60%,13% 60%)',
  'polygon(16.5% 55%,21% 55%,20% 60%,15.5% 60%)',
  'polygon(21% 55%,26% 55%,25% 60%,20% 60%)',
  'polygon(26% 55%,32.5% 55%,31.5% 60%,25% 60%)',
  'polygon(32.5% 55%,41% 55%,40% 60%,31.5% 60%)',
];

export default function AppLoader({
  rootRef, phase, reduced, duration, logoReady, onLogoReady, onLogoError, onSkip,
}) {
  const image = useRef(null);
  const exiting = phase === 'exit';
  useEffect(() => {
    const img = image.current;
    if (!img) return undefined;
    let alive = true;
    let handled = false;
    const fail = () => { if (alive && !handled) { handled = true; onLogoError(); } };
    const decode = () => {
      const done = () => { if (alive && !handled) { handled = true; onLogoReady(); } };
      if (typeof img.decode === 'function') img.decode().then(done, fail);
      else done();
    };
    img.addEventListener('load', decode);
    img.addEventListener('error', fail);
    if (img.complete) { if (img.naturalWidth) decode(); else fail(); }
    return () => { alive = false; img.removeEventListener('load', decode); img.removeEventListener('error', fail); };
  }, [onLogoReady, onLogoError]);

  // Layout effect avoids one frame of the finished logo before its entrance starts.
  useLayoutEffect(() => {
    if (!rootRef.current || (!logoReady && !exiting)) return undefined;
    const controller = createLoaderMotion(rootRef.current, { reduced, exit: exiting, duration });
    return () => controller.dispose();
  }, [rootRef, logoReady, exiting, reduced, duration]);

  return (
    <div ref={rootRef} className={styles.loader} data-dth-ignition="true"
      data-ignition-version="2" data-phase={phase} data-logo-ready={logoReady}
      data-reduced={reduced} role="dialog" aria-modal="true" aria-label="DTH welcome intro">
      <div className={styles.upper} data-ignition-upper aria-hidden="true" />
      <div className={styles.lower} data-ignition-lower aria-hidden="true" />
      <div className={styles.grid} data-ignition-grid aria-hidden="true"><i /><i /></div>
      <div className={styles.content} data-ignition-content>
        <p className={styles.topmark}>DTH <span>/</span> DIGITAL STUDIO</p>
        <div className={styles.logoFrame} style={{ '--dth-logo-image': `url("${LOADER_CONFIG.logoUrl}")` }}>
          <svg className={styles.orbits} viewBox="0 0 1000 360" fill="none" aria-hidden="true">
            <path data-ignition-arc pathLength="1" d="M 80 145 C 130 25, 740 0, 920 105" />
            <path data-ignition-arc pathLength="1" d="M 935 210 C 855 330, 280 360, 80 255" />
            <path className={styles.orbitAccent} data-ignition-arc pathLength="1" d="M 825 58 C 885 70, 935 92, 953 117" />
          </svg>
          <i className={styles.underglow} data-ignition-aura aria-hidden="true" />
          <div className={styles.streaks} aria-hidden="true">
            {[0, 1, 2, 3].map(i => <i key={i} data-ignition-streak />)}
          </div>
          <div className={styles.logoStage} data-ignition-stage>
            <div className={styles.echo} data-ignition-echo aria-hidden="true" />
            <div className={styles.echo} data-ignition-echo aria-hidden="true" />
            <img ref={image} data-ignition-face className={styles.logo} src={LOADER_CONFIG.logoUrl}
              width={LOADER_CONFIG.logoWidth} height={LOADER_CONFIG.logoHeight}
              alt="DTH Scooter Team" decoding="async" loading="eager" fetchPriority="high" draggable="false" />
            <div className={styles.redStart} aria-hidden="true">
              {SEGMENTS.map((clipPath, i) => <span key={i} data-ignition-segment style={{ clipPath }} />)}
            </div>
            <div className={styles.silverMask} aria-hidden="true"><i data-ignition-silver /></div>
            <i className={styles.glint} data-ignition-glint aria-hidden="true" />
          </div>
          <i className={styles.logoScan} data-ignition-cyan aria-hidden="true" />
          <p className={styles.tagline} aria-label="PARTS IN PERSPECTIVE">
            {['PARTS', 'IN', 'PERSPECTIVE'].map(word => (
              <span className={styles.wordMask} key={word} aria-hidden="true"><span data-ignition-word>{word}</span></span>
            ))}
          </p>
          {[0, 1, 2, 3].map(i => <i key={i} className={styles.bracket} data-ignition-bracket data-corner={i} aria-hidden="true" />)}
        </div>
      </div>
      <div className={styles.exitBridge} data-ignition-bridge aria-hidden="true" />
      <footer className={styles.footer} data-ignition-footer>
        <p className={styles.status} role="status" aria-live="polite">
          <span aria-hidden="true" />{phase === 'waiting' ? 'Preparing the studio…' : 'Entering the studio'}
        </p>
        <button type="button" className={styles.skip} onClick={onSkip}>Skip intro <span aria-hidden="true">↗</span></button>
      </footer>
    </div>
  );
}
