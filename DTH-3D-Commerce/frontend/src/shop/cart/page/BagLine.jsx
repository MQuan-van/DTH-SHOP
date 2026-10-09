import { vehicleLabel as nvxVehicleLabel } from '../../../../../shared/nvx.mjs';
import { Link } from 'react-router-dom';
import { formatMoney } from '../../../../../shared/domain.mjs';
import ProductImage from '../../catalog/components/ProductImage';
import Icon from './CartPageIcon';
import styles from './FullCartPage.module.css';

const statusLabels = { compatible: 'Matches this demo vehicle', incompatible: 'No match in demo data', unknown: 'Compatibility not established', unselected: 'Vehicle selection required', unavailable: 'Product unavailable', 'price-unavailable': 'Price unavailable', loading: 'Waiting for catalog', 'catalog-error': 'Catalog unavailable' };
export default function BagLine({ row, number, reviewing, busy, onQuantity, onAdjust, onRemove, onVehicle, onAlternatives }) {
  const editable = !reviewing && !busy, matching = row.status === 'compatible';
  const image = row.product ? <ProductImage product={row.product} className={styles.photo} eager={number < 3}/> : <span className={styles.missingImage}><Icon name="bag"/>Image unavailable</span>;
  return <article className={styles.line} data-bag-line={row.key} data-state={row.status} aria-label={`${row.name} for ${row.vehicleLabel}`}>
    <div className={styles.media}>
      <span className={styles.mediaIndex} aria-hidden="true">{String(number + 1).padStart(2, '0')}</span>
      {row.href && !busy ? <Link to={row.href} state={{ fromBag: '/bag' }} aria-label={`View ${row.name} product details`}>{image}</Link> : image}
      <span className={styles.mediaBase} aria-hidden="true"/>
    </div>
    <div className={styles.lineContent}>
      <div className={styles.lineTop}>
        <div><p className={styles.eyebrow}>{row.product?.category || 'CATALOG RECORD'}</p>
          <h2>{row.href && !busy ? <Link to={row.href} state={{ fromBag: '/bag' }}>{row.name}</Link> : row.name}</h2>
          {row.product?.finish && <p className={styles.finish}>{row.product.finish}</p>}
        </div>
        <div className={styles.linePrice}><strong>{row.lineTotal !== null ? formatMoney(row.lineTotal) : '—'}</strong><small>{row.unitPrice !== null ? `${formatMoney(row.unitPrice)} / item` : 'Price not available'}</small></div>
      </div>
      <div className={styles.fit} data-status={row.status}>
        <Icon name={matching ? 'check' : 'warning'}/>
        <span>{statusLabels[row.status] || statusLabels.unknown}</span>
      </div>
      <div className={styles.vehicle}><Icon name="vehicle"/><span>{row.vehicleLabel}</span></div>
      {editable && row.vehicleOptions.length > 0 && <label className={styles.vehicleSelect}>Vehicle for this part
        <select aria-label={`Vehicle for ${row.name}`} value={row.vehicleId} onChange={event => onVehicle(row, event.target.value)}>
          {!row.vehicleOptions.some(v => v.id === row.vehicleId) && <option value={row.vehicleId}>{row.vehicleLabel} — review required</option>}
          {row.vehicleOptions.map(v => <option key={v.id} value={v.id}>{nvxVehicleLabel(v)}</option>)}
        </select>
      </label>}
      {row.issue && <p className={styles.lineIssue}>{row.issue}</p>}
      <div className={styles.lineBottom}>
        {reviewing ? <span className={styles.reviewQuantity}>Quantity <strong>{row.quantity}</strong></span> : <div className={styles.quantity} role="group" aria-label={`Quantity controls for ${row.name}`}>
          <button type="button" disabled={busy || row.quantity <= 1} aria-label={`Decrease quantity of ${row.name}`} onClick={() => onAdjust(row, -1)}>−</button>
          <select value={row.quantity} disabled={busy} aria-label={`Quantity for ${row.name}`} onChange={e => onQuantity(row, Number(e.target.value))}>
            {Array.from({length: 10}, (_, i) => i + 1).map(q => <option key={q} value={q} disabled={!!row.issue && q > row.quantity}>{q}</option>)}
          </select>
          <button type="button" disabled={busy || !row.canIncrease} aria-label={`Increase quantity of ${row.name}`} onClick={() => onAdjust(row, 1)}>+</button>
        </div>}
        <div className={styles.lineActions}>
          {!reviewing && <button type="button" data-remove-line disabled={busy} onClick={() => onRemove(row)} aria-label={`Remove ${row.name}`}>Remove</button>}
          {row.issue && row.vehicle && <button type="button" disabled={busy} onClick={() => onAlternatives(row)}>Find parts for this vehicle <Icon name="arrow"/></button>}
        </div>
      </div>
    </div>
  </article>;
}
