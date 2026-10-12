import { useState } from 'react';
import { vehicleLabel, isNVXId } from '../../../../shared/nvx.mjs';
import { useStore } from '../useStore';
import ShopDialog from '../catalog/components/ShopDialog';
import NVXSelector, { NVXMotionToggle } from './NVXSelector';
import NVXShowcase from './NVXShowcase';
import { initialNVXSelection } from './nvx.logic.mjs';
import useNVXMotion from './useNVXMotion';
import styles from './NVXGarage.module.css';

export default function NVXPicker({ onClose }) {
  const store = useStore();
  const [selected, setSelected] = useState(() => initialNVXSelection(store.data.vehicles, store.vehicleId));
  const movement = useNVXMotion('picker');
  const vehicle = store.data.vehicles.find(v => v.id === selected && isNVXId(v.id));
  const disabled = store.loading || !!store.error;
  function apply(event) {
    event.preventDefault();
    if (disabled || !vehicle) return;
    store.setVehicle(vehicle.id);
    store.setNotice(`${vehicleLabel(vehicle)} selected. Bag items keep their individual vehicle.`);
    onClose();
  }
  return <ShopDialog title="Choose your Yamaha NVX" onClose={onClose} motion={movement.motion} className={styles.dialog}>
    <div ref={movement.ref} className={styles.root} data-motion={movement.motion ? 'on' : 'off'}>
      <div className={styles.pickerHeading}><p>Three versions. One garage. Select V1, V2 or V3.</p><NVXMotionToggle {...movement} /></div>
      <div className={styles.pickerGrid}>
        <form onSubmit={apply} className={styles.pickForm}>
          <NVXSelector products={store.data.products} vehicles={store.data.vehicles} value={selected} onChange={setSelected} disabled={disabled} />
          <p className={styles.selectionLine} role="status">{vehicle ? vehicleLabel(vehicle) : 'NVX catalogue not ready yet.'}</p>
          <p className={styles.note}>No year selection. V1, V2 and V3 are separate catalogue choices.</p>
          <div className={styles.actions}><button type="submit" className={styles.primary} disabled={disabled || !vehicle}>Use {vehicle?.model || 'this NVX'} <span aria-hidden="true">→</span></button>
            {store.vehicleId && <button type="button" className={styles.secondary} onClick={() => { store.setVehicle(''); onClose(); }}>Clear selection</button>}
          </div>
          <p className={styles.note}>Your account default changes only when you explicitly save it in My Garage. Existing cart lines are not reassigned.</p>
        </form>
        <NVXShowcase vehicleId={selected} products={store.data.products} vehicles={store.data.vehicles} compact />
      </div>
    </div>
  </ShopDialog>;
}
