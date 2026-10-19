// DTH Shop Product UX17 — scoped presentation integration.
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { formatMoney } from '../../../../shared/domain.mjs';
import { useStore } from '../useStore';
import FitmentStatus from '../catalog/fitment/FitmentStatus';
import { vehicleCaption } from '../catalog/fitment/fitment.logic.mjs';
import { useExperiencePolicy } from '../../experience/interaction/useExperiencePolicy';
import ProductMedia from './ProductMedia';
import ProductRecommendations from './recommendations/ProductRecommendations';
import { animateBagFeedback, useProductActivity, useProductEntrance } from './useProductMotion';
import { CATEGORY_LABELS, matchingPartsHref, productSpecs, purchaseState, safeShopReturn, validatePurchase, validAccent } from './productDecision.logic.mjs';
import styles from './ProductDecision.module.css';
import Disclosure from '../ux17/Disclosure';
import '../ux17/commerce17.css';

export default function ProductDecisionPage({ product }) {
  const store = useStore(), { chooseVehicle } = useOutletContext();
  const location = useLocation(), navigate = useNavigate();
  const root = useRef(null), heading = useRef(null), buyButton = useRef(null);
  const latch = useRef(false), releaseTimer = useRef(null), cancelFeedback = useRef(() => {}), focusDone = useRef(false);
  const policy = useExperiencePolicy();
  const [paused, setPaused] = useState(false), [quantity, setQuantity] = useState(1);
  const [error, setError] = useState(''), [receipt, setReceipt] = useState(null), [cooldown, setCooldown] = useState(false);
  const { active, blocked } = useProductActivity(root);
  const motion = !paused && !policy.reduced;
  const state = purchaseState(product, store.vehicleId, store.data.vehicles, store.bag);
  const returnTo = safeShopReturn(location.state?.fromShop);
  const alternatives = matchingPartsHref(returnTo);
  const specs = productSpecs(product.specs);
  const compatibleVehicles = store.data.vehicles.filter(v => Array.isArray(product.vehicleIds) && product.vehicleIds.includes(v.id));
  const description = typeof product.description === 'string' ? product.description : '';
  useProductEntrance(root, motion && active, product.id);
  useEffect(() => {
    setQuantity(1); setReceipt(null); setError('');
    // Explicitly preserves every vehicle stored on existing bag lines.
  }, [product.id, store.vehicleId]);
  useEffect(() => { setQuantity(q => Math.max(1, Math.min(q, state.remaining))); }, [state.remaining]);
  useEffect(() => {
    if (!active || !motion) cancelFeedback.current();
  }, [active, motion]);
  useEffect(() => {
    if (!blocked && !focusDone.current) { heading.current?.focus({ preventScroll: true }); focusDone.current = true; }
  }, [blocked]);
  useEffect(() => {
    // Runs after the outer shell's title reset, without repeatedly writing on model frames.
    const previous = document.title;
    const frame = requestAnimationFrame(() => { document.title = `${product.name} — DTH Parts Studio`; });
    return () => { cancelAnimationFrame(frame); document.title = previous; };
  }, [product.name]);
  useEffect(() => () => { clearTimeout(releaseTimer.current); cancelFeedback.current(); latch.current = false; }, []);
  function changeQuantity(value) {
    const next = Number(value);
    if (Number.isSafeInteger(next) && next >= 1 && next <= state.remaining) { setQuantity(next); setReceipt(null); setError(''); }
  }
  function buy(event) {
    event.preventDefault();
    if (blocked || latch.current) return;
    setError('');
    if (!state.match.canAdd) { chooseVehicle(); return; }
    try {
      const checked = validatePurchase({ product, products: store.data.products, vehicleId: store.vehicleId,
        vehicles: store.data.vehicles, bag: store.bag, quantity });
      latch.current = true;
      if (!store.add(checked.product, checked.vehicleId, checked.quantity)) {
        latch.current = false; setError('Could not add this part. Check your vehicle and bag limits.'); return;
      }
      // Success is shown only after the existing store accepts the operation.
      setReceipt({ name: checked.product.name, quantity: checked.quantity, vehicle: state.match.vehicleLabel });
      setQuantity(1); setCooldown(true);
      cancelFeedback.current(); cancelFeedback.current = animateBagFeedback(buyButton.current, motion && active);
      clearTimeout(releaseTimer.current);
      releaseTimer.current = setTimeout(() => { latch.current = false; setCooldown(false); }, 550);
    } catch (e) { latch.current = false; setError(e.message || 'Unable to add this product.'); }
  }
  const buttonLabel = !state.available || !state.priceOK ? 'Unavailable' : !state.match.canAdd ? 'Choose matching vehicle'
    : !state.remaining || state.full ? 'Demo limit reached' : receipt ? 'Added to bag' : 'Add to bag';
  return <section ref={root} className={styles.page} data-product-detail data-product-ux="17" data-motion={motion ? 'on' : 'off'}>
    <div className={styles.container} data-ux17-container>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link to={returnTo}>← Back to parts</Link><span aria-hidden="true">/</span><span aria-current="page">{product.name}</span>
      </nav>
      <div className={styles.topline} data-ux17-topline>
        <button type="button" disabled={policy.reduced} aria-pressed={motion} onClick={() => setPaused(v => !v)}>
          {policy.reduced ? 'Reduced motion' : motion ? 'Ⅱ Motion on' : '▷ Motion off'}</button>
      </div>
      <div className={styles.hero} data-ux17-hero>
        <div className={styles.mediaColumn} data-product-enter>
          <ProductMedia key={`${product.id}:${product.modelUrl}`} product={product} motion={motion} policy={policy}/>
        </div>
        <div className={styles.information} data-ux17-info>
          <div data-product-enter>
            <p className={styles.eyebrow}>{CATEGORY_LABELS[product.category] || 'Collection'}</p>
            <h1 ref={heading} tabIndex={-1}>{product.name}</h1>
            <p className={styles.price} data-ux17-price>{state.priceOK ? formatMoney(product.price) : 'Price unavailable'}<small>Demo price</small></p>
            <div className={styles.finish}><i style={{ backgroundColor: validAccent(product.accent) }} aria-hidden="true"/>
              <div><strong>{product.finish || 'Not specified'}</strong></div></div>
          </div>
          <div className={styles.fitmentPanel} data-product-enter>
            <FitmentStatus product={product} vehicleId={store.vehicleId} vehicles={store.data.vehicles} motion={motion && active}
              onChooseVehicle={chooseVehicle} onExploreMatches={() => navigate(alternatives)}/>
          </div>
          <div data-product-enter>
            <form className={styles.purchase} onSubmit={buy}>
              <div className={styles.quantityRow}><label htmlFor="dth-product-quantity">Quantity</label>
                <div className={styles.quantityControl}>
                  <button type="button" disabled={!state.canAdd || quantity <= 1 || cooldown} aria-label="Decrease quantity" onClick={() => changeQuantity(quantity - 1)}>−</button>
                  <select id="dth-product-quantity" value={quantity} disabled={!state.canAdd || cooldown} onChange={e => changeQuantity(e.target.value)}>
                    {Array.from({ length: Math.max(1, state.remaining) }, (_,i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                  </select>
                  <button type="button" disabled={!state.canAdd || quantity >= state.remaining || cooldown} aria-label="Increase quantity" onClick={() => changeQuantity(quantity + 1)}>+</button>
                </div>
                <small>Demo limit: 10 / part &amp; vehicle</small>
              </div>
              <button ref={buyButton} className={styles.addButton} data-ux17-add type="submit" aria-label={state.match.canAdd && state.canAdd ? 'Add to bag' : buttonLabel}
                data-added={!!receipt} disabled={blocked || cooldown || !state.available || !state.priceOK || (state.match.canAdd && !state.canAdd)}>
                <span>{buttonLabel}</span><span aria-hidden="true">{receipt ? '✓' : '↗'}</span>
              </button>
              {state.match.canAdd && !state.canAdd && <p className={styles.formHelp}>{state.reason}</p>}
              <div className={styles.confirmation} data-ux17-confirmation role="status" aria-live="polite" aria-atomic="true">
                {receipt && <><p><strong>{receipt.quantity} × {receipt.name}</strong> added for {receipt.vehicle}.</p><Link to="/bag">View bag <span aria-hidden="true">↗</span></Link></>}
              </div>
              {error && <p className={styles.error} role="alert">{error}</p>}
            </form>
            <p className={styles.purchaseFine}>Simulated purchase · No payment or shipment.</p>
          </div>
          <div data-ux17-details>
            <Disclosure id="dth-product-about" title="Details" motion={motion}>
              <p>{description || 'No description has been supplied.'}</p><small>{product.assetLicense || 'Asset provenance should be recorded by the catalog owner.'}</small>
            </Disclosure>
            <Disclosure id="dth-product-specs" title="Specifications" motion={motion}>
          {specs.length ? <dl className={styles.specs}>{specs.map(([k,v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl> : <p>No specifications have been supplied.</p>}
          <small>Values are supplied by the catalog, not inferred from the 3D geometry.</small>
            </Disclosure>
            <Disclosure id="dth-product-fitment" title="Compatibility" motion={motion}>
          {compatibleVehicles.length ? <ul className={styles.vehicleList}>{compatibleVehicles.map(v => <li key={v.id}><span>{vehicleCaption(v)}</span>{store.vehicleId === v.id && <strong>Selected</strong>}</li>)}</ul>
            : <p>No known matching vehicles are listed in this catalog.</p>}
          <small>Synthetic demo mappings only. Verify real compatibility with the supplier before purchase.</small>
          <button type="button" className={styles.textButton} onClick={chooseVehicle}>Change selected vehicle <span aria-hidden="true">↗</span></button>
            </Disclosure>
          </div>
        </div>
      </div>
      <ProductRecommendations product={product} products={store.data.products} vehicles={store.data.vehicles}
        vehicleId={store.vehicleId} fromShop={returnTo} onChooseVehicle={chooseVehicle} motion={motion}/>
      {/* Product information is available in the disclosures beside the viewer. */}
    </div>
  </section>;
}
