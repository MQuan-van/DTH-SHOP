import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatMoney } from '../../../../shared/domain.mjs';
import { useStore } from '../useStore';
import { purchaseState, validatePurchase } from '../product/productDecision.logic.mjs';
import { useProductActivity, animateBagFeedback } from '../product/useProductMotion';
import { clampQuantity } from './discovery.logic.mjs';
import { CATEGORY_NAMES } from './discovery.config.mjs';
import { useDiscoveryReveal } from './useDiscoveryMotion';
import DiscoveryStage from './DiscoveryStage';

/** All purchase validation stays in the existing Product decision/store boundary. */
export default function ProductSpotlight({ product, motion, policy, fromShop, build = false, onChooseVehicle, onBuild, onPin, pinned = false }) {
  const store = useStore(), lock = useRef(false), timer = useRef(0), cancel = useRef(() => {}), button = useRef(null);
  const root = useDiscoveryReveal(`${product.id}:${store.vehicleId}`, motion);
  const { blocked } = useProductActivity(root);
  const [quantity, setQuantity] = useState(1), [busy, setBusy] = useState(false), [notice, setNotice] = useState(null);
  const state = purchaseState(product, store.vehicleId, store.data.vehicles, store.bag);
  const displayedQuantity = clampQuantity(quantity, state.remaining);
  useEffect(() => { setQuantity(1); setNotice(null); }, [product.id, store.vehicleId, store.user?.id]);
  useEffect(() => () => { clearTimeout(timer.current); cancel.current(); lock.current = false; }, []);
  useEffect(() => { if (!motion || blocked) cancel.current(); }, [motion, blocked]);
  function add(event) {
    event.preventDefault();
    if (lock.current || busy || blocked || store.loading || store.error) return;
    setNotice(null);
    try {
      const checked = validatePurchase({ product, products: store.data.products, vehicleId: store.vehicleId,
        vehicles: store.data.vehicles, bag: store.bag, quantity: displayedQuantity });
      lock.current = true;
      if (!store.add(checked.product, checked.vehicleId, checked.quantity)) {
        lock.current = false; throw new Error('Could not add this part. Check your bag and try again.');
      }
      setBusy(true); setQuantity(1);
      setNotice({ type: 'success', text: `${checked.quantity} × ${checked.product.name} added to your bag.` });
      cancel.current(); cancel.current = animateBagFeedback(button.current, motion);
      clearTimeout(timer.current); timer.current = setTimeout(() => { lock.current = false; setBusy(false); }, 450);
    } catch (error) { lock.current = false; setNotice({ type: 'error', text: error.message || 'Unable to add this part.' }); }
  }
  return <section className="d174-spotlight" ref={root} aria-label="Product spotlight">
    <div className="d174-product-visual" data-discovery-enter>
      <DiscoveryStage key={`${product.id}:${product.modelUrl}`} product={product} motion={motion} policy={policy} />
    </div>
    <div className="d174-product-copy" data-discovery-enter>
      <p className="d174-kicker">{CATEGORY_NAMES[product.category] || 'Part'}</p>
      <h2>{product.name}</h2>
      {product.finish && <p className="d174-finish">{product.finish}</p>}
      <p className="d174-price">{state.priceOK ? formatMoney(product.price) : 'Price unavailable'}</p>
      <p className="d174-fit" data-fit={state.match.canAdd ? 'match' : 'unknown'}>
        {state.match.canAdd ? `✓ ${state.match.vehicleLabel} · Demo match` : store.vehicleId ? 'No verified demo match' : 'Choose an NVX to check fit'}
      </p>
      {build ? <>
        <form className="d174-buy" onSubmit={add} aria-busy={busy}>
          <label>Quantity <span className="d174-quantity"><button type="button" aria-label="Decrease quantity" disabled={busy || !state.canAdd || displayedQuantity <= 1} onClick={() => setQuantity(displayedQuantity - 1)}>−</button>
            <output aria-label="Selected quantity">{displayedQuantity}</output>
            <button type="button" aria-label="Increase quantity" disabled={busy || !state.canAdd || displayedQuantity >= state.remaining} onClick={() => setQuantity(displayedQuantity + 1)}>+</button></span></label>
          <button ref={button} className="d174-primary" type="submit" disabled={busy || blocked || !state.canAdd || store.loading || !!store.error}>{busy ? 'Added to bag ✓' : 'Add to bag'}<span aria-hidden="true">↗</span></button>
          {!state.canAdd && <p className="d174-inline-note">{state.reason}</p>}
          {notice && <p className={`d174-notice ${notice.type === 'error' ? 'd174-error' : ''}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}{notice.type === 'success' && <Link to="/bag">View bag →</Link>}</p>}
        </form>
        {onPin && <button type="button" className="d174-text-button" onClick={() => onPin(product)} disabled={pinned || !state.match.canAdd}>{pinned ? 'In your build list ✓' : 'Keep in this build +'} </button>}
      </> : <div className="d174-spotlight-actions"><Link className="d174-primary" to={`/products/${product.slug}`} state={{ fromShop }}>View product <span aria-hidden="true">↗</span></Link>
        <button className="d174-text-button" type="button" onClick={() => onBuild(product.id)}>Build around this part →</button></div>}
      <Link className="d174-detail-link" to={`/products/${product.slug}`} state={{ fromShop }}>Specifications & compatibility</Link>
      {!state.match.canAdd && <button className="d174-text-button" type="button" onClick={onChooseVehicle}>Choose vehicle</button>}
      <p className="d174-fine">Illustrative 3D and demo fitment. No payment or shipment.</p>
    </div>
  </section>;
}
