import { Link } from 'react-router-dom';
import { formatMoney } from '../../../../../shared/domain.mjs';
import { describeFit } from '../catalog.logic.mjs';
import { SHOP_CONFIG } from '../catalog.config.mjs';
import ShopIcon from './ShopIcon';
import ProductImage from './ProductImage';
import styles from '../ShopPage.module.css';

export default function ShopProductCard({ product, vehicleId, vehicles, onQuickView, eager }) {
  const match = describeFit(product, vehicleId, vehicles);
  const category = SHOP_CONFIG.categories.find(item => item.id === product.category)?.label || product.category;
  const accent = /^#[0-9a-f]{6}$/i.test(product.accent || '') ? product.accent : '#526472';
  function openProduct(event) {
    // Vẫn cho phép mở trang chi tiết trong tab mới.
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    onQuickView(product.id, event.currentTarget);
  }
  return <article className={styles.card} aria-label={product.name}>
    <button type="button" className={styles.mediaButton} onClick={event => onQuickView(product.id, event.currentTarget)} aria-label={`Quick view ${product.name}`}>
      <span className={styles.mediaGrid} aria-hidden="true" />
      <span className={styles.mediaLabel}><ShopIcon name="cube" />3D on product page</span>
      <ProductImage product={product} eager={eager} className={styles.cardImage} />
      <span className={styles.mediaBase} aria-hidden="true" />
      <span className={styles.quickBadge}><ShopIcon name="search" /><span>Quick view</span></span>
    </button>
    <div className={styles.cardBody}>
      <span 
        className={styles.cardCategory}>{category}
      </span>
      <h3>
        <Link to={`/products/${product.slug}`}
            onClick={openProduct}>
            {product.name}
        </Link>
      </h3>
      
      <p className={styles.finish}><span style={{ backgroundColor: accent }} aria-hidden="true" />{product.finish}</p>
      <div className={styles.priceRow}><strong>{formatMoney(product.price)}</strong><small>Demo price</small></div>
      <p className={styles.fitBadge} data-status={match.status}><ShopIcon name={match.status === 'compatible' ? 'check' : match.status === 'incompatible' ? 'close' : 'vehicle'} />{match.label}</p>
      <Link
        className={styles.cardLink}
        to={`/products/${product.slug}`}
        onClick={openProduct}
        aria-label={`View ${product.name} product details`}
      >
        View product
        <ShopIcon name="arrowUp" />
      </Link>
    </div>
  </article>;
}
