import { useState } from 'react';
import { previewSource } from '../catalog.logic.mjs';
import { SHOP_CONFIG } from '../catalog.config.mjs';
import ShopIcon from './ShopIcon';
import styles from '../ShopPage.module.css';

/** Each product URL change remounts the image state; a failed cutout falls back once. */
function ImageSource({ product, eager, ...props }) {
  const preferred = previewSource(product, SHOP_CONFIG.useDemoCutouts);
  const [fallback, setFallback] = useState(false), [failed, setFailed] = useState(false), [loaded, setLoaded] = useState(false);
  const src = fallback ? product.imageUrl : preferred;
  if (failed || !src) return <span className={styles.imageMissing} role="img" aria-label={`${product.name}: image unavailable`}><ShopIcon name="image" />Image unavailable</span>;
  return <img {...props} src={src} alt={`${product.name} — ${product.finish}. Illustrative product.`}
    width="960" height="720" draggable="false" loading={eager ? 'eager' : 'lazy'} decoding="async" data-loaded={loaded}
    onLoad={() => setLoaded(true)} onError={() => { if (!fallback && preferred !== product.imageUrl) { setFallback(true); setLoaded(false); } else setFailed(true); }} />;
}
export default function ProductImage(props) {
  return <ImageSource key={`${props.product.id}:${props.product.imageUrl}`} {...props} />;
}
