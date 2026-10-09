import { NVX_VEHICLES } from '../../../../shared/nvx.mjs';
import { useStore } from '../useStore';
import styles from './NVXGarage.module.css';
export default function NVXQuickPick({ vehicles, vehicleId, onPatch, motion = true }) {
  const store = useStore();
  return <div className={styles.quickRoot} data-motion={motion ? 'on' : 'off'}>
    <div className={styles.quickRail} role="group" aria-label="Quick NVX selection">
      <span>YAMAHA / NVX</span>
      {NVX_VEHICLES.map(vehicle => <button type="button" key={vehicle.id} aria-pressed={vehicleId === vehicle.id}
        disabled={store.loading || !!store.error || !vehicles.some(v => v.id === vehicle.id)}
        onClick={() => { store.setVehicle(vehicle.id); onPatch({ fit: 'match', page: 1 }); }}>
        {vehicle.model}<span aria-hidden="true">{vehicleId === vehicle.id ? '✓' : '↗'}</span>
      </button>)}
    </div>
  </div>;
}
