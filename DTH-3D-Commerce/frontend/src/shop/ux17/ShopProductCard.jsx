import { Link, useLocation } from 'react-router-dom';
import { fitment, formatMoney } from '../../../../shared/domain.mjs';
import { vehicleCaption } from '../catalog/fitment/fitment.logic.mjs';
import { SHOP_CONFIG } from '../catalog/catalog.config.mjs';
import ProductImage from '../catalog/components/ProductImage';
import { compactFitLabel, displayPrice, shopReturnFromLocation } from './commerce17.logic.mjs';

export default function ShopProductCard({ product, vehicleId, vehicles, onQuickView, eager, motion = false }) {
  const location = useLocation();
  const fromShop = shopReturnFromLocation(location);
  const href = `/products/${encodeURIComponent(product.slug)}`;
  const match = fitment(product, vehicleId, vehicles);
  const vehicle = vehicles.find(v => v.id === vehicleId);
  const category = SHOP_CONFIG.categories.find(c => c.id === product.category)?.label || 'Part';
  const price = displayPrice(product);
  return <article className="ux17-card" data-motion={motion ? 'on' : 'off'} aria-label={product.name}>
    <div className="ux17-card-media">
      <Link to={href} state={{ fromShop }} className="ux17-image-link" aria-label={`View ${product.name} in 3D`}>
        <ProductImage product={product} eager={eager} className="ux17-card-image" />
      </Link>
      <button type="button" className="ux17-quick" aria-label={`Quick view ${product.name}`}
        onClick={event => onQuickView(product.id, event.currentTarget)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5M7.5 10.5h6m-3-3v6" /></svg>
        <span>Quick view</span>
      </button>
    </div>
    <div className="ux17-card-body">
      <span className="ux17-category">{category}</span>
      <h3><Link to={href} state={{ fromShop }}>{product.name}</Link></h3>
      {product.finish && <p className="ux17-finish">{product.finish}</p>}
      <p className="ux17-card-price"><strong>{price === null ? 'Price unavailable' : formatMoney(price)}</strong></p>
      <p className="ux17-fit" data-status={match.status}><span aria-hidden="true">{match.status === 'compatible' ? '✓' : '·'}</span>{compactFitLabel(match.status, vehicleCaption(vehicle))}</p>
    </div>
  </article>;
}
