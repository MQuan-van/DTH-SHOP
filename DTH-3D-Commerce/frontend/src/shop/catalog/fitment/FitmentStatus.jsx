import { useRef } from 'react';
import { explainFitment } from './fitment.logic.mjs';
import { useFitmentMotion } from './useFitmentMotion';
import styles from './Fitment.module.css';

export function FitmentGlyph({ status }) {
  const d = status === 'compatible' ? 'm5 12 4 4 10-10'
    : status === 'incompatible' ? 'm7 7 10 10 M17 7 7 17'
    : status === 'unknown' ? 'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3 M12 17h.01'
    : 'M12 6v12 M6 12h12';
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}

export default function FitmentStatus({ product, vehicleId, vehicles, compact = false,
  motion = false, onChooseVehicle, onExploreMatches }) {
  const ref = useRef(null);
  const state = explainFitment(product, vehicleId, vehicles);
  useFitmentMotion(ref, `${product?.id}:${vehicleId}:${state.reason}:${state.vehicleLabel}`, motion);
  return <section ref={ref} className={`${styles.status} ${compact ? styles.compact : styles.detail}`}
    data-fitment-status={state.status} aria-label={`Compatibility for ${product?.name || 'this part'}`}>
    <div className={styles.statusHeading} data-fitment-enter>
      <span className={styles.statusIcon}><FitmentGlyph status={state.status}/></span>
      <div><strong>{state.title}</strong>
        {!compact && state.vehicleLabel && <p className={styles.vehicleName}>{state.vehicleLabel}</p>}
      </div>
    </div>
    {!compact && <>
      <p className={styles.reason}>{state.detail}</p>
      <div className={styles.actions}>
        {typeof onChooseVehicle === 'function' && <button type="button" onClick={onChooseVehicle}>
          {vehicleId ? 'Change vehicle' : 'Choose vehicle'} <span aria-hidden="true">↗</span>
        </button>}
        {state.canExplore && typeof onExploreMatches === 'function' && <button type="button" onClick={onExploreMatches}>
          Show matching parts <span aria-hidden="true">→</span>
        </button>}
      </div>
      {state.canExplore && onExploreMatches && <small className={styles.fineprint}>Keeps your current search, category and price filters.</small>}
      <small className={styles.fineprint}>Synthetic demo data · Verify real fitment with the supplier.</small>
    </>}
    <span className={styles.scanTrack} aria-hidden="true"><i data-fitment-scan /></span>
  </section>;
}
