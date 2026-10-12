import { vehicleLabel as nvxVehicleLabel } from '../../../../../shared/nvx.mjs';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatMoney } from '../../../../../shared/domain.mjs';
import { useStore } from '../../useStore';
import { PREVIEW, FLOW } from '../../api';
import BagLine from './BagLine';
import Icon from './CartPageIcon';
import { matchingPartsPath } from './cartPage.logic.mjs';
import { useCartReview } from './useCartReview';
import { useBagListMotion, useCartPageMotion } from './useCartPageMotion';
import styles from './FullCartPage.module.css';

export default function FullCartPage() {
  const store = useStore(), navigate = useNavigate(), cart = useCartReview(store);
  const { view, busy, quoting, quote, reviewing, acknowledged } = cart;
  const root = useRef(null), list = useRef(null), heading = useRef(null), summary = useRef(null), nextFocus = useRef(null);
  const { motion, paused, reduced, setPaused } = useCartPageMotion(root);
  const signature = view.lines.map(row => `${row.key}:${row.quantity}:${row.unitPrice}:${row.status}`).join('|');
  useBagListMotion(list, signature, motion);
  useEffect(() => {
    const previous = document.title; document.title = 'Your bag — DTH Parts Studio';
    heading.current?.focus({ preventScroll: true });
    return () => { document.title = previous; };
  }, []);
  useLayoutEffect(() => {
    if (nextFocus.current === null) return;
    const nodes = list.current?.querySelectorAll('[data-remove-line]');
    const target = nodes?.[Math.min(nextFocus.current, nodes.length - 1)] || heading.current;
    target?.focus({ preventScroll: true }); nextFocus.current = null;
  }, [signature]);
  useEffect(() => { if (reviewing) summary.current?.focus({ preventScroll: true }); }, [reviewing]);
  const selectedVehicle = store.data.vehicles.find(v => v.id === store.vehicleId);
  const loginNeeded = !PREVIEW && !store.user;
  const quoteLabel = quote?.source === 'api' ? 'Server checked' : quote?.source === 'flow' ? 'Flow catalog checked' : 'Preview catalog checked';
  const quoteTime = quote ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(quote.quotedAt)) : '';
  function remove(row) {
    const index = view.lines.findIndex(i => i.key === row.key);
    if (cart.remove(row)) nextFocus.current = index;
  }
  function alternatives(row) {
    if (busy || !row.vehicle) return;
    // Explicit action: the button says which line's vehicle will be used. Existing bag lines are untouched.
    store.setVehicle(row.vehicleId); navigate(matchingPartsPath(row.product));
  }
  return <section ref={root} className={styles.page} data-full-cart data-motion={motion ? 'on' : 'off'} aria-busy={busy || quoting}>
    <div className={styles.container}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link to="/shop"><Icon name="back"/>Back to parts</Link><span>/</span><span aria-current="page">Your bag</span></nav>
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>DTH / YOUR NEXT BUILD</p><h1 ref={heading} tabIndex={-1}>Your bag<span>.</span></h1><p>One clear view of your parts. Every vehicle stays with its own line.</p></div>
        <div className={styles.headingSide}>
          <button type="button" className={styles.motion} disabled={reduced} aria-pressed={!paused && !reduced} onClick={() => setPaused(v => !v)}>{reduced ? 'Reduced motion · system' : paused ? '▷ Motion off' : 'Ⅱ Motion on'}</button>
          <ol className={styles.steps} aria-label="Checkout progress"><li aria-current={!reviewing ? 'step' : undefined}><b>01</b> Bag</li><li aria-current={reviewing ? 'step' : undefined}><b>02</b> Review</li><li><b>03</b> Checkout</li><li><b>04</b> Confirmation</li></ol>
        </div>
      </header>
      <div className={styles.status} role="status" aria-atomic="true">{cart.notice}</div>
      {cart.error && <div className={styles.error} role="alert"><Icon name="warning"/><div><strong>We could not complete that action.</strong><p>{cart.error}</p><button type="button" disabled={busy || quoting || !view.canReview} onClick={cart.review}>Check bag again <Icon name="refresh"/></button></div></div>}
      {cart.priceChanges.length > 0 && <div className={styles.warning} role="status"><Icon name="warning"/><div><strong>Prices changed from your estimate or earlier check.</strong>{cart.priceChanges.map(change => <p key={change.key}>{change.name}: {formatMoney(change.before)} → <strong>{formatMoney(change.after)}</strong></p>)}<p>Review these updated amounts before confirming the demo acknowledgement.</p></div></div>}
      {!view.lines.length ? <div className={styles.empty}>
        <div className={styles.emptyMark} aria-hidden="true"><span/><Icon name="bag"/><i/></div>
        <p className={styles.eyebrow}>A NEW BUILD STARTS WITH ONE PART</p><h2>Your bag is empty.</h2>
        <p>Find a part, check its demo fit and inspect it in 3D before adding it here.</p>
        <Link to="/shop" className={styles.primary}>Explore parts <Icon name="arrow"/></Link>
        <small>Your saved vehicle and Build Studio selections have not been cleared.</small>
      </div> : <div className={styles.layout}>
        <div className={styles.itemsColumn}>
          <div className={styles.itemsHeading}><h2>Selected parts <span>{String(view.count).padStart(2, '0')}</span></h2><p>{view.lines.length} {view.lines.length === 1 ? 'line' : 'lines'} · {view.vehicleCount} {view.vehicleCount === 1 ? 'vehicle' : 'vehicles'}</p></div>
          <div className={styles.vehicleNotice}><Icon name="vehicle"/><div><strong>{selectedVehicle ? `Browsing for ${nvxVehicleLabel(selectedVehicle)}` : 'Each part keeps its own vehicle'}</strong><p>Changing the header vehicle never changes existing bag lines. Use a line’s selector to change that line explicitly.</p></div></div>
          {view.blocked && <div className={styles.warning}><Icon name="warning"/><div><strong>Review needed before continuing.</strong><p>{view.inputError || `${view.issueCount} ${view.issueCount === 1 ? 'line needs' : 'lines need'} attention. Resolve the messages below; no item is silently removed.`}</p></div></div>}
          <div ref={list} className={styles.lines}>
            {view.lines.map((row, index) => <BagLine key={row.key} row={row} number={index} reviewing={reviewing} busy={busy} onQuantity={cart.quantity} onAdjust={cart.adjust} onRemove={remove} onVehicle={cart.vehicle} onAlternatives={alternatives}/>)}
          </div>
          <div className={styles.listFooter}><Link to="/shop"><Icon name="back"/>Continue exploring</Link><small>Up to 10 items per product / vehicle · 20 bag lines</small></div>
        </div>
        <aside className={styles.summary} aria-label="Order summary">
          <div className={styles.summaryTop}><p className={styles.eyebrow}>{quoting ? 'CHECKING CURRENT CATALOG' : reviewing ? '02 / CHECK YOUR SELECTION' : quote ? '01 / REVIEW REQUIRED' : '01 / CATALOG ESTIMATE'}</p><Icon name={reviewing ? 'check' : 'bag'}/></div>
          <h2 ref={summary} tabIndex={-1}>{quoting ? 'Checking your bag.' : reviewing ? 'Review your order.' : 'Build summary.'}</h2>
          {quote && <p className={styles.quoteInfo} data-quote-source={quote.source}><Icon name={quote.valid ? 'check' : 'warning'}/><span><strong>{quoteLabel}</strong><time dateTime={quote.quotedAt}>{quoteTime}</time></span></p>}
          <div className={styles.totals}><div><span>Items <small>({view.count})</small></span><strong>{view.subtotal === null ? '—' : formatMoney(view.subtotal)}</strong></div><div><span>Delivery</span><span>Not applicable — demo</span></div><div><span>Payment</span><span>Simulated only</span></div></div>
          <div className={styles.total}><span>{quote ? 'Checked total' : 'Catalog estimate'}</span><strong key={view.subtotal ?? 'invalid'}>{view.subtotal === null ? 'Review needed' : formatMoney(view.subtotal)}</strong></div>
          <p className={styles.summaryNote}>{quote ? 'Product availability, current prices, quantity limits and each line’s demo vehicle mapping were checked. This quote does not reserve a price or check live stock.' : 'Estimate from the loaded catalog. Review order checks current prices and each line’s vehicle mapping before you continue.'}</p>
          {!reviewing ? <button type="button" className={styles.primary} disabled={!view.canReview || busy || quoting} onClick={cart.review}>{quoting ? 'Checking current prices…' : quote ? 'Check again' : 'Review order'}<Icon name={quoting || quote ? 'refresh' : 'arrow'}/></button> : <div className={styles.reviewActions}>
            <div className={styles.reviewReady}><Icon name="check"/>Check every line’s vehicle and the total shown above.</div>
            <label className={styles.ack}><input type="checkbox" checked={acknowledged} disabled={busy} onChange={e => cart.acknowledge(e.target.checked)}/><span>I understand this is a demonstration. No money is charged, no products are shipped, and fitment is based on synthetic data.</span></label>
            {!PREVIEW && store.authError && <p className={styles.authError} role="alert">Your session could not be verified. <button type="button" disabled={busy || store.authLoading} onClick={store.retrySession}>Retry session</button></p>}
            {loginNeeded ? <Link className={styles.primary} to="/account?return=/checkout">Sign in to continue <Icon name="arrow"/></Link> : <button type="button" className={styles.primary} disabled={!acknowledged || busy || (!PREVIEW && (store.authLoading || !!store.authError))} onClick={() => navigate('/checkout')}>Continue to checkout <Icon name="arrow"/></button>}
            <button type="button" className={styles.secondary} disabled={busy} onClick={cart.edit}>Edit bag</button>
          </div>}
          <p className={styles.modeNote}><Icon name="lock"/>{FLOW ? 'Flow rehearsal: orders are stored in this tab, not MongoDB.' : PREVIEW ? 'Local preview: no order is sent to a server.' : 'The API checks price, quantity and vehicle mapping again when an order is submitted.'}</p>
          <button type="button" className={styles.refresh} disabled={busy || store.loading} onClick={store.refresh}><Icon name="refresh"/>Refresh catalog</button>
        </aside>
      </div>}
      <footer className={styles.disclaimer}>VISUALIZE THE PART. VERIFY THE DATA.<span>3D models are illustrative. Compatibility comes from catalog mappings, not geometry.</span></footer>
    </div>
  </section>;
}
