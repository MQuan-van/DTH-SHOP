import { Link } from 'react-router-dom';
import { useStore } from '../../useStore';
import { garageSnapshot } from '../../../../../shared/garage.mjs';
import { NVX_VEHICLES } from '../../../../../shared/nvx.mjs';
import styles from './GarageWorkspace.module.css';
export default function GarageSummary() {
  const store = useStore(), garage = garageSnapshot(store.user || {});
  const saved = NVX_VEHICLES.find(v => v.id === garage.defaultVehicleId);
  return <section className={styles.summary}>
    <span className={styles.summaryLabel}>My Garage <span>{garage.vehicleIds.length} / 3</span></span>
    <h2>{saved?.model || 'Your NVX awaits.'}</h2>
    <p>{saved ? 'Default vehicle' : 'Choose a version for your next build.'}</p>
    <Link className={styles.textButton} to="/account?view=vehicle">{garage.vehicleIds.length ? 'Open garage' : 'Add vehicle'} <span aria-hidden="true">↗</span></Link>
  </section>;
}
