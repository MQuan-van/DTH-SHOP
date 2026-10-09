import { useId } from 'react';
import { nvxOptions } from './nvx.logic.mjs';
import styles from './NVXGarage.module.css';

export default function NVXSelector({ products, vehicles, value, onChange, disabled = false }) {
  const name = useId();
  return <fieldset className={styles.selector} disabled={disabled} data-nvx-selector>
    <legend>Choose your NVX version</legend>
    <div className={styles.choices}>
      {nvxOptions(products, vehicles).map((vehicle, i) => <label key={vehicle.id}
        className={styles.card} data-selected={vehicle.id === value} data-unavailable={!vehicle.available} data-nvx-enter>
        <input type="radio" name={name} value={vehicle.id} checked={value === vehicle.id}
          disabled={!vehicle.available || disabled} onChange={() => onChange(vehicle.id)} aria-label={vehicle.model} />
        <span className={styles.cardIndex} aria-hidden="true">0{i + 1}</span>
        <span className={styles.cardBrand}>YAMAHA</span>
        <strong className={styles.version} aria-hidden="true">V{i + 1}</strong>
        <span className={styles.cardName}>{vehicle.model}</span>
        <span className={styles.cardFoot}>{vehicle.available ? `${vehicle.count} demo matches` : 'Not provisioned'}<span aria-hidden="true">↗</span></span>
        <span className={styles.cardCheck} aria-hidden="true">{value === vehicle.id ? '✓' : '+'}</span>
      </label>)}
    </div>
  </fieldset>;
}
export function NVXMotionToggle({ motion, reduced, paused, setPaused }) {
  return <button type="button" className={styles.motion} disabled={reduced} aria-pressed={motion}
    onClick={() => setPaused(!paused)}>{reduced ? 'Reduced motion' : motion ? 'Ⅱ UI motion on' : '▷ UI motion off'}</button>;
}
