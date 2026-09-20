import { Link } from 'react-router-dom';
import { fitment, formatMoney } from '../../../../shared/domain.mjs';
import { useStore } from '../useStore.jsx';
import Icon from './StoreIcon.jsx';
const categoryNames = { suspension: 'Suspension', wheels: 'Wheels', exhausts: 'Exhausts', mirrors: 'Mirrors', brakes: 'Brakes' };
export default function ProductCard({ product }) {
  const { vehicleId, data } = useStore();
  const match = fitment(product, vehicleId, data.vehicles);
  return <article className="dth-product-card"><Link to={`/products/${product.slug}`} className="dth-card-image"><img src={product.imageUrl} alt={`Illustrative ${product.name}`} loading="lazy" width="960" height="720" /><span className="dth-3d-tag"><Icon name="cube" />3D VIEW</span><span className="dth-card-arrow">↗</span></Link><div className="dth-card-meta"><span>{categoryNames[product.category]}</span><span>{product.finish}</span></div><div className="dth-card-title"><h3><Link to={`/products/${product.slug}`}>{product.name}</Link></h3><span>{formatMoney(product.price)}</span></div>{vehicleId && <p className={`dth-fit dth-fit-${match.status}`}>{match.text}</p>}</article>;
}
