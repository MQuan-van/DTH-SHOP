import { useId } from 'react';
import { formatMoney } from '../../../../../shared/domain.mjs';
import { SHOP_CONFIG } from '../catalog.config.mjs';
import ShopIcon from './ShopIcon';
import styles from '../ShopPage.module.css';

export default function FilterPanel({ query, counts, ceiling, vehicle, vehicleId, onPatch, onChooseVehicle, onReset }) {
  const id = useId();
  function toggle(category) {
    onPatch({ category: query.categories.includes(category) ? query.categories.filter(c => c !== category) : [...query.categories, category] });
  }
  return <div className={styles.filterInner}>
    <div className={styles.filterTitle}><h2>Filters</h2><button type="button" className={styles.textButton} onClick={onReset}>Reset</button></div>
    <fieldset className={styles.fieldset}><legend>Category</legend>
      <label className={styles.checkRow}><input type="checkbox" checked={!query.categories.length} onChange={() => onPatch({ category: [] })} /><span>All parts</span><small>{Object.values(counts).reduce((sum, count) => sum + count, 0)}</small></label>
      {SHOP_CONFIG.categories.map(c => <label key={c.id} className={styles.checkRow}><input type="checkbox" checked={query.categories.includes(c.id)} onChange={() => toggle(c.id)} /><span>{c.label}</span><small>{counts[c.id] || 0}</small></label>)}
    </fieldset>
    <fieldset className={styles.fieldset}><legend>Maximum price</legend>
      <label className={styles.srOnly} htmlFor={`${id}-range`}>Maximum price in VND</label>
      <output className={styles.priceOutput} htmlFor={`${id}-range`}>{formatMoney(query.maxPrice)}</output>
      <input id={`${id}-range`} className={styles.priceRange} type="range" min="0" max={ceiling} step={SHOP_CONFIG.priceStep} value={query.maxPrice} aria-valuetext={formatMoney(query.maxPrice)} onChange={e => onPatch({ max: e.target.value }, { replace: true })} />
      <div className={styles.rangeEnds}><span>0 ₫</span><span>{formatMoney(ceiling)}</span></div>
      <label className={styles.numberLabel}>Enter limit (VND)<input type="number" min="0" max={ceiling} step="1" value={query.maxPrice} inputMode="numeric" onChange={e => { if (e.target.value !== '') onPatch({ max: e.target.value }, { replace: true }); }} /></label>
    </fieldset>
    <fieldset className={styles.fieldset}><legend>Vehicle compatibility</legend>
      <label className={styles.radioRow}><input type="radio" name={`${id}-fit`} checked={query.fit === 'match'} onChange={() => onPatch({ fit: 'match' })} /><span>Matching parts only</span></label>
      <label className={styles.radioRow}><input type="radio" name={`${id}-fit`} checked={query.fit === 'all'} onChange={() => onPatch({ fit: 'all' })} /><span>Show all parts</span></label>
      <p className={styles.filterHelp}>{vehicle ? `Using ${vehicle.model} · ${vehicle.year}.` : vehicleId ? 'The saved vehicle is not in this demo dataset. Choose another vehicle.' : 'Select a vehicle to activate matching. Until then, all parts are shown.'}</p>
      {!vehicle && <button className={styles.outlineButton} type="button" onClick={onChooseVehicle}><ShopIcon name="vehicle" />Select vehicle</button>}
    </fieldset>
    <p className={styles.datasetNote}><ShopIcon name="info" />Compatibility uses synthetic demo data, not manufacturer verification.</p>
  </div>;
}
