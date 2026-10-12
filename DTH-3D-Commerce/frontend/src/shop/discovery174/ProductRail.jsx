import { formatMoney } from '../../../../shared/domain.mjs';
import ProductImage from '../catalog/components/ProductImage';
export default function ProductRail({ products, selectedId, onSelect, label = 'Choose a part' }) {
  return <div className="d174-product-rail" role="group" aria-label={label}>
    {products.map(product => <button className="d174-rail-card" key={product.id} type="button" aria-pressed={product.id === selectedId}
      aria-label={`Spotlight ${product.name}`} onClick={() => onSelect(product.id)}>
      <span className="d174-rail-media"><ProductImage product={product} /></span>
      <span className="d174-rail-name">{product.name}</span>
      <span className="d174-rail-price">{Number.isSafeInteger(product.price) && product.price > 0 ? formatMoney(product.price) : 'Price unavailable'}</span>
    </button>)}
  </div>;
}
