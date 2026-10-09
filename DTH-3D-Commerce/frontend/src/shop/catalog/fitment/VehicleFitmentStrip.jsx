import NVXQuickPick from '../../garage/NVXQuickPick';
import { useMemo, useRef } from 'react';
import { summarizeFitment, vehicleCaption } from './fitment.logic.mjs';
import { useFitmentMotion } from './useFitmentMotion';
import styles from './Fitment.module.css';

function DepthMark() {
  return <span className={styles.depthMark} aria-hidden="true">
    <span className={styles.plate}/><span className={styles.plate}/>
    <span className={styles.plate}><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="m8 8 16 0 4 9v6H4v-6z M5 17h22 M10 11h12 M8 23v3 M24 23v3"/>
      <circle cx="9" cy="20" r="1"/><circle cx="23" cy="20" r="1"/>
    </svg></span>
  </span>;
}

export default function VehicleFitmentStrip({ products, vehicles, vehicleId, query,
  onPatch, onChooseVehicle, onClearVehicle, motion }) {
  const ref = useRef(null);
  const vehicle = vehicles.find(v => v?.id === vehicleId);
  const counts = useMemo(() => summarizeFitment(products, vehicles, vehicleId, query), [products, vehicles, vehicleId, query]);
  const state = vehicle ? 'selected' : vehicleId ? 'unknown' : 'unselected';
  const caption = vehicleCaption(vehicle);
  useFitmentMotion(ref, `${vehicleId}:${caption}:${query.fit}:${counts.compatible}:${counts.total}`, motion);
  return <section ref={ref} className={styles.strip} data-fitment-vehicle={state} aria-label="Selected vehicle">
    <div className={styles.vehicleRow}>
      <DepthMark/>
      <div className={styles.vehicleCopy} data-fitment-enter>
        <span className={styles.kicker}>DTH / DEMO FITMENT</span>
        <h2>{caption || (vehicleId ? 'Saved vehicle unavailable' : 'Start with your vehicle.')}</h2>
        <p>{vehicle ? 'A recorded match, not a real-world fitment guarantee.'
          : vehicleId ? 'The saved ID is absent from this catalog. Select another vehicle to check fit.'
            : 'Choose a vehicle. See the right compatibility context for every part.'}</p>
      </div>
      <div className={styles.vehicleActions}>
        <button type="button" className={styles.choose} onClick={onChooseVehicle}>
          {vehicleId ? 'Change vehicle' : 'Select vehicle'} <span aria-hidden="true">↗</span>
        </button>
        {vehicleId && <button type="button" className={styles.clear} onClick={onClearVehicle}>Clear vehicle</button>}
      </div>
    </div>
    <NVXQuickPick vehicles={vehicles} vehicleId={vehicleId} onPatch={onPatch} motion={motion} />
    {vehicle && <div className={styles.filterRow}>
      <div className={styles.fitModes} role="group" aria-label="Compatibility filter">
        <button type="button" aria-pressed={query.fit === 'match'} onClick={() => onPatch({ fit: 'match' })}>
          Matches my vehicle <b>{counts.compatible}</b>
        </button>
        <button type="button" aria-pressed={query.fit === 'all'} onClick={() => onPatch({ fit: 'all' })}>
          All parts <b>{counts.total}</b>
        </button>
      </div>
      <p className={styles.countNote}>
        <strong>{counts.incompatible}</strong> no recorded match
        {counts.unknown > 0 && <> · <strong>{counts.unknown}</strong> not established</>}
        <small>Counts include your other filters.</small>
      </p>
    </div>}
    <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
      {vehicle ? `${caption}. ${counts.compatible} matching demo parts out of ${counts.total} within the current filters. ${query.fit === 'all' ? 'All parts shown.' : 'Only matches shown.'}`
        : vehicleId ? 'Saved vehicle not in this dataset. Choose a listed vehicle.' : 'No vehicle selected.'}
    </p>
    <span className={styles.scanTrack} aria-hidden="true"><i data-fitment-scan/></span>
  </section>;
}
