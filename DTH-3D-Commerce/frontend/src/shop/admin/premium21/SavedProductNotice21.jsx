import { Link } from 'react-router-dom';
import { receiptMatches21 } from './saveReceipt21.mjs';
import './saveNotice21.css';
export default function SavedProductNotice21({ receipt, product, dirty }) {
  if (!receiptMatches21(receipt, product, dirty)) return null;
  return <section className="dth-save21" aria-label="Product save confirmation">
    <div role="status"><strong>{receipt.visible ? 'Product saved and visible in the shop.' : 'Draft saved. This product is hidden from the shop.'}</strong>
      <p>{product.name} · {product.id}</p></div>
    <div className="dth-save21-actions">
      {receipt.visible && <Link to={`/products/${receipt.slug}`} target="_blank" rel="noreferrer">View product ↗</Link>}
      <Link to="/admin/products">Back to products</Link>
    </div>
  </section>;
}
