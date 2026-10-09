import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatMoney, normalizeItems } from '../../../../shared/domain.mjs';
import { normalizeCheckoutDetails } from '../../../../shared/checkout.mjs';
import { PREVIEW, createOrder, requestCartQuote } from '../api';
import { useStore } from '../useStore';
import Icon from '../components/StoreIcon.jsx';
import { checkoutPayloadSignature, clearCheckoutIntent, finishCheckoutIntent, resolveCheckoutIntent } from './checkoutIntent.mjs';
import styles from './CheckoutPage.module.css';

const blank = email => ({
  recipientName: '', phone: '', email: email || '', addressLine: '', city: '', note: '',
  fulfillment: 'demo-delivery', paymentMethod: 'demo-cod',
});

const quoteSource = source => source === 'api' ? 'Server checked' : source === 'flow' ? 'Flow catalog checked' : 'Preview catalog checked';

export default function CheckoutPage() {
  const store = useStore(), navigate = useNavigate();
  const [form, setForm] = useState(() => blank(store.user?.email));
  const [quote, setQuote] = useState(null), [quoteError, setQuoteError] = useState(''), [quoting, setQuoting] = useState(false);
  const [error, setError] = useState(''), [placing, setPlacing] = useState(false), [acknowledged, setAcknowledged] = useState(false);
  const quoteEpoch = useRef(0), intentRef = useRef(null);
  const snapshot = store.getBagSnapshot?.() ?? { bag: store.bag, revision: 0 };
  const bagKey = JSON.stringify(snapshot.bag);
  const items = useMemo(() => {
    try { return snapshot.bag.length ? normalizeItems(snapshot.bag) : []; }
    catch { return []; }
  }, [bagKey]);

  useEffect(() => {
    if (!form.email && store.user?.email) setForm(value => ({ ...value, email: store.user.email }));
  }, [store.user?.email]);

  useEffect(() => {
    const epoch = ++quoteEpoch.current;
    if (!items.length) { setQuote(null); setQuoteError(''); setQuoting(false); return; }
    setQuoting(true); setQuoteError('');
    requestCartQuote(items).then(result => {
      if (epoch !== quoteEpoch.current) return;
      setQuote(result);
      if (!result.valid) setQuoteError(result.lines.find(line => line.status !== 'compatible')?.issue || 'The current bag needs attention.');
    }).catch(e => {
      if (epoch === quoteEpoch.current) { setQuote(null); setQuoteError(e.message || 'Could not check the current bag.'); }
    }).finally(() => { if (epoch === quoteEpoch.current) setQuoting(false); });
    return () => { if (epoch === quoteEpoch.current) quoteEpoch.current += 1; };
  }, [bagKey, store.user?.id]);

  function update(name, value) { setForm(current => ({ ...current, [name]: value })); setError(''); }

  async function place(event) {
    event.preventDefault();
    if (placing || quoting) return;
    if (!items.length) { setError('Your bag is empty.'); return; }
    if (!acknowledged) { setError('Confirm that this checkout is a demonstrator with no real payment or shipment.'); return; }
    if (!PREVIEW && (!store.user || store.authLoading || store.authError)) { setError('Sign in and verify your session before placing the demo order.'); return; }
    let checkout;
    try { checkout = normalizeCheckoutDetails(form); }
    catch (e) { setError(e.message); return; }
    const before = store.getBagSnapshot?.() ?? { bag: store.bag, revision: 0 };
    let clean;
    try { clean = normalizeItems(before.bag); }
    catch (e) { setError(e.message); return; }
    setPlacing(true); setError('');
    let storage;
    try { storage = window.sessionStorage; } catch { storage = null; }
    try {
      const fresh = await requestCartQuote(clean);
      if (!fresh.valid) {
        setQuote(fresh);
        setQuoteError(fresh.lines.find(line => line.status !== 'compatible')?.issue || 'The current bag needs attention.');
        setError('The bag changed before checkout. Fix the highlighted line and review it again.');
        return;
      }
      if (!quote || quote.fingerprint !== fresh.fingerprint || quote.total !== fresh.total) {
        setQuote(fresh); setQuoteError(''); clearCheckoutIntent(storage); intentRef.current = null;
        setError('The current price or vehicle mapping changed. Review the refreshed total, then place the order again.');
        return;
      }
      const signature = checkoutPayloadSignature(clean, checkout, fresh.fingerprint);
      const intent = resolveCheckoutIntent(signature, intentRef.current, storage);
      intentRef.current = intent;
      const order = await createOrder(clean, intent.id, acknowledged, store.data, fresh.total, fresh.fingerprint, checkout);
      const after = store.getBagSnapshot?.() ?? { bag: store.bag, revision: before.revision };
      store.setLastOrder(order);
      if (after.revision === before.revision && JSON.stringify(after.bag) === JSON.stringify(before.bag)) store.setBag([]);
      finishCheckoutIntent(intent, storage); intentRef.current = null;
      navigate(`/order-complete?order=${encodeURIComponent(order.id)}`, { replace: true });
    } catch (e) {
      if (e.status === 409) {
        clearCheckoutIntent(storage); intentRef.current = null;
        setError(`${e.message || 'The checked order changed.'} Your bag has been kept; check the latest total before retrying.`);
        const current = store.getBagSnapshot?.()?.bag ?? store.bag;
        requestCartQuote(current).then(setQuote).catch(() => {});
      } else if (e.status === 401) {
        store.setUser(null); setError('Your session ended. Sign in again; your bag has been kept.');
      } else setError(e.message || 'Could not create the demo order. Retry with the same details; your bag has been kept.');
    } finally { setPlacing(false); }
  }

  if (!items.length) return <section className={styles.empty}><p className={styles.eyebrow}>03 / CHECKOUT</p><h1>Your bag is empty.</h1><p>Add a compatible part before opening checkout.</p><Link className={styles.primary} to="/shop">Explore parts <Icon name="arrow"/></Link></section>;

  const checkedAt = quote?.quotedAt ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(quote.quotedAt)) : '';
  const blocked = quoting || placing || !quote?.valid || !acknowledged || (!PREVIEW && (!store.user || store.authLoading || !!store.authError));

  return <section className={styles.page} data-checkout aria-busy={quoting || placing}>
    <div className={styles.container}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link to="/bag"><Icon name="back"/>Back to bag</Link><span>/</span><span aria-current="page">Checkout</span></nav>
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>DTH / CHECKOUT 1.0</p><h1>Confirm the build<span>.</span></h1><p>A final server-side check happens immediately before the demonstrator creates the order snapshot.</p></div>
        <ol className={styles.steps} aria-label="Checkout progress"><li><b>01</b> Bag</li><li><b>02</b> Review</li><li aria-current="step"><b>03</b> Checkout</li><li><b>04</b> Confirmation</li></ol>
      </header>
      {error && <div className={styles.error} role="alert"><Icon name="warning"/><div><strong>Checkout needs attention.</strong><p>{error}</p></div></div>}
      <div className={styles.layout}>
        <form className={styles.form} onSubmit={place}>
          <section className={styles.card}>
            <div className={styles.cardTitle}><div><small>01</small><h2>Contact</h2></div><span>Use test details for this FYP demonstrator.</span></div>
            <div className={styles.grid}>
              <label className={styles.wide}>Recipient name<input autoComplete="name" maxLength="80" value={form.recipientName} onChange={e => update('recipientName', e.target.value)} required/></label>
              <label>Phone<input inputMode="tel" autoComplete="tel" maxLength="24" value={form.phone} onChange={e => update('phone', e.target.value)} required/></label>
              <label>Email<input type="email" autoComplete="email" maxLength="120" value={form.email} onChange={e => update('email', e.target.value)} required/></label>
            </div>
          </section>
          <section className={styles.card}>
            <div className={styles.cardTitle}><div><small>02</small><h2>Demo delivery</h2></div><span>No physical shipment will be created.</span></div>
            <div className={styles.grid}>
              <label className={styles.wide}>Address<input autoComplete="street-address" maxLength="180" value={form.addressLine} onChange={e => update('addressLine', e.target.value)} required/></label>
              <label className={styles.wide}>City<input autoComplete="address-level2" maxLength="80" value={form.city} onChange={e => update('city', e.target.value)} required/></label>
              <label className={styles.wide}>Order note <span>(optional)</span><textarea maxLength="300" value={form.note} onChange={e => update('note', e.target.value)} rows="3"/></label>
            </div>
          </section>
          <section className={styles.card}>
            <div className={styles.cardTitle}><div><small>03</small><h2>Payment simulation</h2></div><span>No card or payment credential is accepted.</span></div>
            <label className={styles.option}><input type="radio" checked readOnly/><span><strong>Pay on delivery — demo only</strong><small>Recorded as a simulated method. No money is charged.</small></span></label>
            <label className={styles.consent}><input type="checkbox" checked={acknowledged} onChange={e => { setAcknowledged(e.target.checked); setError(''); }} required/><span>I understand this is an FYP demonstrator: no real payment, shipment or manufacturer fitment guarantee.</span></label>
          </section>
          <p className={styles.privacy}>For evaluation, use fictitious contact and address details. Do not enter card numbers or other payment credentials.</p>
        </form>

        <aside className={styles.summary} aria-label="Checked order summary">
          <div className={styles.summaryHead}><div><p className={styles.eyebrow}>CURRENT QUOTE</p><h2>Order summary</h2></div><Icon name={quote?.valid ? 'check' : 'warning'}/></div>
          {quoting ? <p className={styles.checking} role="status">Checking current catalog…</p> : quote ? <div className={styles.quote}><strong>{quoteSource(quote.source)}</strong><time dateTime={quote.quotedAt}>{checkedAt}</time></div> : null}
          {quoteError && <p className={styles.quoteError} role="alert">{quoteError}</p>}
          <ul className={styles.lines}>{(quote?.lines || []).map(line => <li key={`${line.productId}:${line.vehicleId}`}><div><strong>{line.name}</strong><span>{line.vehicleLabel || line.vehicleId}</span><small>{line.quantity} × {formatMoney(line.unitPrice)}</small></div><b>{formatMoney(line.lineTotal)}</b></li>)}</ul>
          <dl className={styles.totals}><div><dt>Subtotal</dt><dd>{quote ? formatMoney(quote.subtotal) : '—'}</dd></div><div><dt>Delivery</dt><dd>Demo · 0 ₫</dd></div><div className={styles.total}><dt>Demo total</dt><dd>{quote ? formatMoney(quote.total) : '—'}</dd></div></dl>
          {!PREVIEW && store.authError && <p className={styles.quoteError}>Session check failed. Return to your account, then reopen checkout.</p>}
          {!PREVIEW && !store.user ? <Link className={styles.primary} to="/account?return=/checkout">Sign in to continue <Icon name="arrow"/></Link> : <button type="button" className={styles.primary} disabled={blocked} onClick={() => document.querySelector('[data-checkout] form')?.requestSubmit()}>{placing ? 'Creating order…' : quoting ? 'Checking current prices…' : 'Place demo order'}<Icon name={placing ? 'lock' : 'arrow'}/></button>}
          <p className={styles.note}>Place demo order performs the final backend revalidation. A price, product status or vehicle-fit change stops creation and keeps the bag intact.</p>
          <Link className={styles.edit} to="/bag">Edit bag</Link>
        </aside>
      </div>
    </div>
  </section>;
}
