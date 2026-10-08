import { useEffect, useLayoutEffect, useRef } from 'react';
import { LOADER_CONFIG } from './loader.config.mjs';
import { createLoaderMotion } from './loaderMotion.mjs';
import styles from './AppLoader.module.css';

// The regions stay fixed: no animated clip-path, no resampled video, no generated logo.
const REGIONS = ['inset(36% 6% 53% 7%)', 'inset(47% 6% 45% 7%)', 'inset(55% 6% 35% 7%)'];
export default function AppLoader({ rootRef, phase, reduced, duration, logoReady, onLogoReady, onLogoError, onSkip }) {
  const image = useRef(null), entrance = useRef(null), origin = useRef(null);
  const exiting = phase === 'exit';
  const settings = useRef({ reduced, exiting });
  settings.current = { reduced, exiting };
  useEffect(() => {
    const img = image.current;
    if (!img) return undefined;
    let alive = true, handled = false;
    const fail = () => { if (alive && !handled) { handled = true; onLogoError(); } };
    const decode = () => {
      const done = () => { if (alive && !handled) { handled = true; onLogoReady(); } };
      if (typeof img.decode === 'function') img.decode().then(done, fail); else done();
    };
    img.addEventListener('load', decode); img.addEventListener('error', fail);
    if (img.complete) { if (img.naturalWidth) decode(); else fail(); }
    return () => { alive = false; img.removeEventListener('load', decode); img.removeEventListener('error', fail); };
  }, [onLogoReady, onLogoError]);
  useLayoutEffect(() => {
    if (!rootRef.current || !logoReady || settings.current.exiting) return undefined;
    if (origin.current === null) origin.current = performance.now();
    const controller = createLoaderMotion(rootRef.current, {
      reduced: settings.current.reduced, elapsedMs: performance.now() - origin.current,
    });
    entrance.current = controller;
    return () => { controller.dispose(); if (entrance.current === controller) entrance.current = null; };
  }, [rootRef, logoReady]);
  useLayoutEffect(() => {
    if (reduced && !exiting) entrance.current?.finish();
  }, [reduced, exiting, logoReady]);
  useLayoutEffect(() => {
    if (!exiting || !rootRef.current) return undefined;
    // Keep the current logo pose during Skip/error exit; do not flash the finished face.
    entrance.current?.freeze();
    const controller = createLoaderMotion(rootRef.current, { exit: true, reduced, duration });
    return () => controller.dispose();
  }, [rootRef, exiting, reduced, duration]);
  return <div ref={rootRef} className={styles.loader} data-dth-ignition="true"
    data-ignition-version="17.2-performance" data-phase={phase} data-logo-ready={logoReady}
    data-reduced={reduced && !exiting} role="dialog" aria-modal="true" aria-label="DTH welcome intro">
    <div className={styles.frame} style={{ '--dth-logo-image': `url("${LOADER_CONFIG.logoUrl}")` }}>
      <i className={styles.aura} data-ignition-aura aria-hidden="true" />
      <div className={styles.fragments} aria-hidden="true">{REGIONS.map((clipPath, i) =>
        <i key={i} className={styles.fragment} style={{ clipPath }} data-ignition-fragment />)}</div>
      <img ref={image} className={styles.logo} data-ignition-face src={LOADER_CONFIG.logoUrl}
        width={LOADER_CONFIG.logoWidth} height={LOADER_CONFIG.logoHeight} alt="DTH Scooter Team"
        decoding="async" loading="eager" fetchPriority="high" draggable="false" />
      <div className={styles.silverMask} aria-hidden="true"><i data-ignition-silver /></div>
      <i className={styles.underline} data-ignition-underline aria-hidden="true" />
    </div>
    <footer className={styles.footer}>
      <p className={phase === 'waiting' ? styles.waiting : styles.srOnly} role="status" aria-live="polite">
        {phase === 'waiting' ? 'Preparing the studio…' : 'Opening DTH'}
      </p>
      <button className={styles.skip} type="button" onClick={onSkip}>Skip intro <span aria-hidden="true">↗</span></button>
    </footer>
  </div>;
}
