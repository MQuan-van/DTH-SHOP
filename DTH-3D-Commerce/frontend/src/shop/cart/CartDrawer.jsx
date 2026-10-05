import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { formatMoney } from '../../../../shared/domain.mjs';
import { useStore } from '../useStore';
import ProductImage from '../catalog/components/ProductImage';
import { describeBag } from './cart.logic.mjs';
import { createDrawerSession, waitForCartSlot } from './drawerSession.mjs';
import styles from './CartDrawer.module.css';

export default function CartDrawer() {
  const store = useStore(), location = useLocation(), navigate = useNavigate();
  const dialog = useRef(null), session = useRef(null), heading = useRef(null), focusFrame = useRef(0);
  const latest = useRef(store); latest.current = store;
  const previousRoute = useRef(location.key);
  const [feedback, setFeedback] = useState(''), [error, setError] = useState('');
  const titleId = useId(), descriptionId = useId();
  const request = store.cartRequest, wanted = !!request;
  const summary = describeBag(store.bag, store.data, { loading: store.loading, error: store.error });

  useLayoutEffect(() => {
    if (!wanted) return undefined;
    let live = true;
    setFeedback(''); setError('');
    const stopWaiting = waitForCartSlot(dialog.current, () => {
      if (!live || !latest.current.cartRequest) return;
      try {
        const pending = latest.current.cartRequest;
        session.current = createDrawerSession(dialog.current, {
          trigger: pending.trigger, motion: pending.motion,
          onClosed: () => { if (live) latest.current.closeCart(); },
        });
      } catch {
        latest.current.closeCart();
        // Existing full bag is the functional fallback; no payment is submitted.
        navigate('/bag');
      }
    }, () => { if (live) latest.current.closeCart(); });
    return () => {
      live = false; stopWaiting(); cancelAnimationFrame(focusFrame.current);
      session.current?.dispose(false); session.current = null;
    };
  }, [wanted, navigate]);

  useEffect(() => {
    if (previousRoute.current !== location.key) {
      previousRoute.current = location.key;
      session.current?.dispose(false); session.current = null;
      latest.current.closeCart();
    }
  }, [location.key]);

  function dismiss() { void session.current?.close(); }
  function follow(event) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    // Let React Router navigate immediately; cleanup closes the drawer without focusing the old page.
    session.current?.dispose(false); session.current = null; store.closeCart();
  }
  function adjust(row, delta) {
    if (session.current?.closing) return;
    const result = store.adjustBagQuantity(row.productId, row.vehicleId, delta, store.data);
    setError(result.ok ? '' : result.message);
    if (result.ok) {
      const next = result.bag.find(i => i.productId === row.productId && i.vehicleId === row.vehicleId);
      setFeedback(`${row.name}: quantity ${next.quantity}.`);
    }
  }
  function remove(row) {
    if (session.current?.closing) return;
    const result = store.removeBagLine(row.productId, row.vehicleId);
    setError(result.ok ? '' : result.message);
    if (result.ok) {
      setFeedback(`${row.name} removed for ${row.vehicleLabel}.`);
      cancelAnimationFrame(focusFrame.current);
      focusFrame.current = requestAnimationFrame(() => { if (dialog.current?.open) heading.current?.focus({ preventScroll: true }); });
    }
  }
  return <dialog ref={dialog} id="dth-cart-drawer" className={styles.dialog} data-cart-dialog
    data-motion={request?.motion === false ? 'off' : 'on'} aria-labelledby={titleId} aria-describedby={descriptionId}>
    <div className={styles.scrim} data-cart-scrim aria-hidden="true" onClick={dismiss}/>
    <section className={styles.panel} data-cart-panel>
      <header className={styles.header}>
        <div className={styles.topline}><span>DTH / YOUR NEXT BUILD</span>
          <button type="button" className={styles.close} data-cart-close onClick={dismiss} aria-label="Close bag">×</button></div>
        <div className={styles.titleRow}><h2 id={titleId} ref={heading} tabIndex={-1}>Your bag<span>.</span></h2>
          <span className={styles.count}>{summary.count.toString().padStart(2, '0')} <small>{summary.count === 1 ? 'ITEM' : 'ITEMS'}</small></span></div>
        <p id={descriptionId} className={styles.description}>{request?.added
          ? `${request.added.quantity} × ${request.added.name} added.` : 'A closer look before the next step.'}</p>
        <span className={styles.scan} data-cart-scan aria-hidden="true"/>
      </header>
      <div className={styles.body}>
        {summary.lines.length ? <>
          <p className={styles.vehicleNote}>Each part keeps its own selected vehicle.</p>
          <ul className={styles.items} aria-label="Bag items">{summary.lines.map(row => <li key={row.key} data-cart-row data-cart-key={row.key}
            className={styles.item} data-latest={request?.added?.key === row.key}>
            <Link className={styles.image} to={row.product?.slug ? `/products/${row.product.slug}` : '/bag'} onClick={follow}
              aria-label={`View ${row.name}`}>
              {row.product ? <ProductImage product={row.product} eager className={styles.picture}/>
                : <span className={styles.missing}>Image<br/>unavailable</span>}
            </Link>
            <div className={styles.itemInfo}>
              <div className={styles.itemMeta}><span>{typeof row.product?.category === 'string' ? row.product.category : 'PART'}</span>
                {request?.added?.key === row.key && <span className={styles.latest}>JUST ADDED</span>}</div>
              <h3>{row.product?.slug ? <Link to={`/products/${row.product.slug}`} onClick={follow}>{row.name}</Link> : row.name}</h3>
              <p className={styles.vehicle}>{row.vehicleLabel}</p>
              <p className={styles.fit} data-valid={!row.issue}>{row.issue ? `! ${row.issue}` : '✓ Matches this demo vehicle'}</p>
              <div className={styles.itemBottom}>
                <div className={styles.quantity} role="group" aria-label={`Quantity for ${row.name}, ${row.vehicleLabel}`}>
                  <button type="button" disabled={row.quantity <= 1} onClick={() => adjust(row, -1)} aria-label={`Decrease ${row.name}`}>−</button>
                  <span aria-label={`Quantity ${row.quantity}`}>{row.quantity}</span>
                  <button type="button" disabled={!row.canIncrease} onClick={() => adjust(row, 1)} aria-label={`Increase ${row.name}`}>+</button>
                </div>
                <strong className={styles.price}>{row.lineTotal === null ? '—' : formatMoney(row.lineTotal)}</strong>
              </div>
              <div className={styles.rowFine}><button type="button" onClick={() => remove(row)} className={styles.remove}
                aria-label={`Remove ${row.name} for ${row.vehicleLabel}`}>Remove</button>
                <span>{row.unitPrice === null ? 'Price unavailable' : `${formatMoney(row.unitPrice)} / item`}</span></div>
            </div>
          </li>)}</ul>
        </> : <div className={styles.empty}>
          <div className={styles.emptyMark} aria-hidden="true"><i/><b>0</b></div>
          <p className={styles.eyebrow}>ROOM FOR YOUR NEXT IDEA</p><h3>Your next build starts here.</h3>
          <p>Explore the collection and choose a matching demo vehicle before adding a part.</p>
          <Link className={styles.textLink} to="/shop" onClick={follow}>Explore parts <span aria-hidden="true">↗</span></Link>
        </div>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{feedback}</p>
      </div>
      <footer className={styles.footer}>
        {summary.lines.length > 0 && <>
          <div className={styles.total}><span>Catalog subtotal</span><strong data-cart-subtotal>{summary.subtotal === null ? 'Review needed' : formatMoney(summary.subtotal)}</strong></div>
          <p className={styles.fine}>{summary.needsReview ? 'Some items need attention. Open your bag to review them.'
            : 'Based on the loaded catalog. Prices and fitment are checked again when the order is submitted.'}</p>
          <Link className={styles.primary} to="/bag" onClick={follow}>{summary.needsReview ? 'Review your bag' : 'Review bag & checkout'}<span aria-hidden="true">↗</span></Link>
        </>}
        <button type="button" className={styles.continue} onClick={dismiss}>Continue exploring <span aria-hidden="true">→</span></button>
        <p className={styles.disclaimer}>DEMONSTRATION ONLY · NO PAYMENT OR SHIPMENT<br/>Limits: 10 per part/vehicle · 20 bag lines. Not stock availability.</p>
      </footer>
    </section>
  </dialog>;
}
