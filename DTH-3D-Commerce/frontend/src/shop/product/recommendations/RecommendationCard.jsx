import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatMoney } from '../../../../../shared/domain.mjs';
import ProductImage from '../../catalog/components/ProductImage';
import { CATEGORY_LABELS } from '../productDecision.logic.mjs';
import { recommendationLinkState, recommendationProductHref } from './recommendation.logic.mjs';
import { useRecommendationTilt } from './useRecommendationMotion';
import styles from './ProductRecommendations.module.css';

export default function RecommendationCard({ product, vehicleLabel, fromShop, index, motion }) {
  const visual = useRef(null);
  const handlers = useRecommendationTilt(visual, motion);
  return <article className={styles.card} data-rec-id={product.id} aria-label={product.name}>
    <Link className={styles.cardLink} to={recommendationProductHref(product)}
      state={recommendationLinkState(fromShop)} aria-label={`View ${product.name} product details`} {...handlers}>
      <div className={styles.media}>
        <span className={styles.index} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <span className={styles.orbit} aria-hidden="true" />
        <span className={styles.shadow} aria-hidden="true" />
        <div ref={visual} className={styles.visual}>
          <ProductImage product={product} className={styles.image}/>
        </div>
        <span className={styles.corner} aria-hidden="true">↗</span>
      </div>
      <div className={styles.cardBody}>
        <p className={styles.category}>{CATEGORY_LABELS[product.category]}</p>
        <h3>{product.name}</h3>
        <p className={styles.finish}>{typeof product.finish === 'string' ? product.finish : 'Finish not specified'}</p>
        <p className={styles.price}>{formatMoney(product.price)}<small>DEMO PRICE</small></p>
        <p className={styles.match}><span aria-hidden="true">✓</span> Matches {vehicleLabel}</p>
        <span className={styles.cardAction}>View product <span aria-hidden="true">↗</span></span>
      </div>
    </Link>
  </article>;
}
