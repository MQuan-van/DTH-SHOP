import { Link } from 'react-router-dom';
import { useStore } from '../../../useStore.jsx';
import { filterProducts } from '../../../../../../shared/domain.mjs';
import Icon from '../../../components/StoreIcon.jsx';
import SectionShell from '../../components/SectionShell.jsx';
import styles from './FitmentSection.module.css';
export default function FitmentSection({ config, motion, motionEnabled, chooseVehicle }) {
  const { data, vehicleId } = useStore();
  const vehicle = data.vehicles.find(v => v.id === vehicleId);
  const matching = vehicle ? filterProducts(data.products, { vehicleId }, data.vehicles).length : 0;
  return <SectionShell id="fitment" className={`dth-container ${styles.section}`} motion={motion} motionEnabled={motionEnabled} aria-labelledby="fitment-title">
    <div className={styles.mark}><Icon name="vehicle" /></div><div className={styles.copy}><p className="home-eyebrow">{config.eyebrow}</p><h2 id="fitment-title" className="home-title">{vehicle ? `${vehicle.make} ${vehicle.model}` : config.title}</h2><p>{vehicle ? `${vehicle.year} · ${matching} parts match this demo vehicle.` : 'Choose a make, model and year. The rest starts to fall into place.'}</p><small>Fictional vehicles. Synthetic compatibility. No installation guarantee.</small></div><div className={styles.actions}><button type="button" className="dth-button dth-primary" onClick={chooseVehicle}>{vehicle ? 'Change my vehicle' : config.button}<Icon name="arrow" /></button>{vehicle && <Link className="home-link" to="/shop">Explore {matching} matching parts <Icon name="arrow" /></Link>}</div>
  </SectionShell>;
}
