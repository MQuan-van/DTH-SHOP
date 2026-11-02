import { useEffect, useRef, useState } from 'react';
import ProductImage from '../../shop/catalog/components/ProductImage';
import { ownerKey232, receipt232, safeMoney232 } from './refinement232.logic.mjs';
import Modal232 from './Modal232';
import './refinement232.css';

/** Show confirmation only after the parent's authoritative shortlist contains the item. */
export function useBuildFeedback232({ draft, userId, vehicleId, onPin }) {
  const key = ownerKey232(userId, vehicleId);
  const [pending, setPending] = useState(null), [receipt, setReceipt] = useState(null), [error, setError] = useState('');
  const lock = useRef(false);
  useEffect(() => { setPending(null); setReceipt(null); setError(''); lock.current = false; }, [key]);
  useEffect(() => {
    if (!pending) return;
    const confirmed = receipt232(pending, draft, key);
    if (confirmed) { setReceipt(confirmed); setPending(null); lock.current = false; }
  }, [pending, draft, key]);
  useEffect(() => {
    if (!pending) return;
    // This timer reports a missing acknowledgement; it NEVER manufactures success or closes the modal.
    const timeout = setTimeout(() => { setError('The shortlist did not update. Try adding the part again.'); setPending(null); lock.current = false; }, 4000);
    return () => clearTimeout(timeout);
  }, [pending]);
  function add(product, trigger) {
    if (!vehicleId || lock.current || !product?.id || draft.some(p => p.id === product.id)) return;
    lock.current = true; setError('');
    const request = { product, key, previous: draft.find(p => p.category === product.category) || null, trigger };
    setPending(request);
    try { onPin(product); }
    catch (e) { setPending(null); lock.current = false; setError(e.message || 'Unable to update the shortlist.'); }
  }
  return { add, pending: Boolean(pending && pending.key === key), receipt: receipt?.key === key ? receipt : null, error, close: () => setReceipt(null) };
}
export default function BuildFeedback232({ receipt, onClose, onReview }) {
  if (!receipt) return null;
  return <Modal232 title={receipt.replaced ? 'Build selection updated' : 'Added to your build'} onDismiss={onClose} returnTo={receipt.trigger} className="r232-build-confirm">
    <div className="r232-confirm-product"><div className="r232-confirm-art"><ProductImage product={receipt.product}/></div><div><span className="r232-success"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>In your shortlist</span><h3>{receipt.product.name}</h3>{receipt.product.finish && <p>{receipt.product.finish}</p>}<strong>{safeMoney232(receipt.product.price)}</strong></div></div>
    {receipt.replaced && <p className="r232-replacement">Replaces <strong>{receipt.replaced.name}</strong> in this category.</p>}
    <p className="r232-fine">{receipt.count} selected {receipt.count === 1 ? 'part' : 'parts'}. This shortlist is not an order and is not saved to your account. Your bag has not changed.</p>
    <div className="r232-confirm-actions"><button type="button" className="r232-action r232-secondary" onClick={onClose}>Continue building</button><button type="button" className="r232-action" onClick={onReview}>Review build</button></div>
  </Modal232>;
}
