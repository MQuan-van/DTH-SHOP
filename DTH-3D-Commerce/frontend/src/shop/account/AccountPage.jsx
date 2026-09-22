import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { accountReturnPath, orderUnits } from '../../../../shared/account.mjs';
import { formatMoney, validateRegistration } from '../../../../shared/domain.mjs';
import { authenticate, deleteAccount, loadAccountOrder, loadAccountOrders, PREVIEW, FLOW, saveAccountVehicle } from '../api';
import { useStore } from '../useStore';
import Icon from '../components/StoreIcon.jsx';
import s from './AccountPage.module.css';
import AccountVisual from './AccountVisual';
import AccountExperience from './AccountMotion';
import './account-flow.css';
import ProductImage from '../catalog/components/ProductImage';

const date = value => Number.isFinite(new Date(value).getTime())
  ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';
const vehicleName = vehicle => vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.year}` : 'No vehicle saved';
const views = { overview: 'Your account.', vehicle: 'Your vehicle.', orders: 'Your orders.', security: 'Account settings.' };

function useLive() {
  const live = useRef(false);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  return live;
}
function Notice({ children, error = false }) {
  return children ? <p className={error ? s.error : s.success} role={error ? 'alert' : 'status'}>{children}</p> : null;
}
function Busy({ label = 'Loading…' }) {
  return <div className={s.loading} role="status"><span className={s.spinner} aria-hidden="true" />{label}</div>;
}
function PasswordField({ label = 'Password', value, onChange, autoComplete, hint, disabled }) {
  const [visible, setVisible] = useState(false), id = useId();
  return <div className={s.field}><label htmlFor={id}>{label}</label>
    <span className={s.password}>
      <input id={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange} disabled={disabled}
        required minLength={12} maxLength={128} autoComplete={autoComplete} aria-describedby={hint ? `${id}-hint` : undefined} />
      <button type="button" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        aria-pressed={visible} disabled={disabled} onClick={() => setVisible(v => !v)}>{visible ? 'Hide' : 'Show'}</button>
    </span>
    {hint && <small id={`${id}-hint`}>{hint}</small>}
  </div>;
}

function AuthForm() {
  const store = useStore(), navigate = useNavigate(), [params] = useSearchParams();
  const [mode, setMode] = useState('login'), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false), live = useLive(), errorBox = useRef(null), title = useRef(null);
  const registering = mode === 'register';
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [mode]);
  useEffect(() => { if (error) errorBox.current?.focus(); }, [error]);
  async function submit(event) {
    event.preventDefault();
    if (lock.current) return;
    setError('');
    try {
      const credentials = validateRegistration({ email, password });
      if (registering && password !== confirm) throw new Error('Your passwords do not match.');
      lock.current = true; setBusy(true);
      const user = await authenticate(mode, credentials);
      if (!live.current) return;
      store.setUser(user);
      setPassword(''); setConfirm('');
      store.setNotice(registering ? 'Account created.' : 'Signed in.');
      navigate(accountReturnPath(params.get('return')), { replace: true });
    } catch (e) { if (live.current) setError(e.message); }
    finally { lock.current = false; if (live.current) setBusy(false); }
  }
  function switchMode() { setMode(registering ? 'login' : 'register'); setPassword(''); setConfirm(''); setError(''); }
  return <div className={s.authLayout}>
    <aside className={s.brandPanel} aria-label="DTH Parts Studio">
      <span className={s.brand}>DTH<span>PARTS STUDIO</span></span>
      <AccountVisual phase={busy ? 'working' : registering ? 'register' : undefined} />
      <div className={s.brandFoot}><span>Built around you.</span><Icon name="arrow" /></div>
    </aside>
    <div className={s.authPanel}>
      <Link to="/shop" className={s.back}>← Back to parts</Link>
      <div className={s.authBody} key={mode}>
        <h1 ref={title} tabIndex={-1}>{registering ? 'Create account.' : 'Welcome back.'}</h1>
        <form onSubmit={submit} aria-busy={busy}>
          <label className={s.field}>Email<input type="email" required maxLength={254} autoComplete="email" value={email} disabled={busy} onChange={e => setEmail(e.target.value)} /></label>
          <PasswordField value={password} onChange={e => setPassword(e.target.value)} autoComplete={registering ? 'new-password' : 'current-password'} disabled={busy} hint={registering ? '12–128 characters. Use a password unique to this demo.' : undefined} />
          {registering && <PasswordField label="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" disabled={busy} />}
          {error && <p ref={errorBox} className={s.error} tabIndex={-1} role="alert">{error}</p>}
          <button className={s.primary} disabled={busy} type="submit">{busy ? <><span className={s.spinner} aria-hidden="true" />Please wait…</> : <>{registering ? 'Create account' : 'Sign in'}<Icon name="arrow" /></>}</button>
        </form>
        <p className={s.switchMode}>{registering ? 'Already a member?' : 'New to DTH?'} <button type="button" disabled={busy} onClick={switchMode}>{registering ? 'Sign in' : 'Create account'}</button></p>
        <p className={s.fine}>Demo account. No payment details required.</p>
      </div>
    </div>
  </div>;
}

function VehicleForm() {
  const store = useStore(), live = useLive(), lock = useRef(false), fieldId = useId();
  const saved = store.data.vehicles.find(v => v.id === store.user.savedVehicleId);
  const [make, setMake] = useState(saved?.make || ''), [model, setModel] = useState(saved?.model || ''), [year, setYear] = useState(saved ? String(saved.year) : '');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const { vehicles } = store.data;
  const unique = values => [...new Set(values)];
  const selected = vehicles.find(v => v.make === make && v.model === model && String(v.year) === year);
  const active = vehicles.find(v => v.id === store.vehicleId);
  function useActive() { if (active) { setMake(active.make); setModel(active.model); setYear(String(active.year)); setMessage(''); } }
  async function save(id) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const user = await saveAccountVehicle(id);
      if (!live.current) return;
      const previousSaved = store.user.savedVehicleId;
      store.setUser(user);
      if (id || store.vehicleId === previousSaved) store.setVehicle(id);
      if (!id) { setMake(''); setModel(''); setYear(''); }
      setMessage(id ? (FLOW ? 'Demo vehicle saved in this tab.' : 'Vehicle saved to your account.') : 'Saved vehicle removed.');
    } catch (e) {
      if (!live.current) return;
      if (e.status === 401) { store.setUser(null); store.setNotice('Your session expired. Please sign in again.'); }
      else setError(e.message);
    } finally { lock.current = false; if (live.current) setBusy(false); }
  }
  return <div className={s.vehicleGrid}>
    <section className={s.panel}>
      <div className={s.panelHeading}><Icon name="vehicle" /><h2>Save your ride</h2></div>
      <form onSubmit={e => { e.preventDefault(); if (selected) void save(selected.id); }} aria-busy={busy}>
        <div className={s.field}><label htmlFor={`${fieldId}-make`}>Make</label><select id={`${fieldId}-make`} required disabled={busy} value={make} onChange={e => { setMake(e.target.value); setModel(''); setYear(''); setMessage(''); }}><option value="">Choose make</option>{unique(vehicles.map(v => v.make)).map(v => <option key={v}>{v}</option>)}</select></div>
        <div className={s.field}><label htmlFor={`${fieldId}-model`}>Model</label><select id={`${fieldId}-model`} required disabled={!make || busy} value={model} onChange={e => { setModel(e.target.value); setYear(''); setMessage(''); }}><option value="">Choose model</option>{unique(vehicles.filter(v => v.make === make).map(v => v.model)).map(v => <option key={v}>{v}</option>)}</select></div>
        <div className={s.field}><label htmlFor={`${fieldId}-year`}>Year</label><select id={`${fieldId}-year`} required disabled={!model || busy} value={year} onChange={e => { setYear(e.target.value); setMessage(''); }}><option value="">Choose year</option>{unique(vehicles.filter(v => v.make === make && v.model === model).map(v => v.year)).sort((a, b) => b - a).map(v => <option key={v}>{v}</option>)}</select></div>
        <Notice error>{error}</Notice><Notice>{message}</Notice>
        <button type="submit" className={s.primary} disabled={!selected || busy}>{busy ? 'Saving…' : 'Save vehicle'}<Icon name="check" /></button>
        {active && <button type="button" className={s.textButton} disabled={busy} onClick={useActive}>Use current shop selection</button>}
      </form>
    </section>
    <aside className={`${s.panel} ${s.vehicleSummary}`}>
      <span className={s.pill}>{saved ? (FLOW ? 'SAVED IN THIS TAB' : 'SAVED IN ACCOUNT') : 'NOT SAVED YET'}</span>
      <div className={s.vehicleSymbol} aria-hidden="true"><Icon name="vehicle" /></div>
      <h2>{vehicleName(saved)}</h2>
      <p>Restored when you sign in. Each bag item keeps its own vehicle.</p>
      
      {store.user.savedVehicleId && <button type="button" className={s.textButton} disabled={busy} onClick={() => save('')}>Remove saved vehicle</button>}
    </aside>
  </div>;
}

function OrderContent({ order }) {
  const store = useStore();
  return <section className={s.panel}>
    <header className={s.orderHeading}><div><h2>{order.id}</h2><p>{date(order.createdAt)}</p></div><span className={s.pill}>DEMO CONFIRMED</span></header>
    <ul className={s.receipt}>{order.lines.map(line => {
      const vehicle = store.data.vehicles.find(v => v.id === line.vehicleId);
      const product = store.data.products.find(p => p.id === line.productId);
      return <li key={`${line.productId}:${line.vehicleId}`}>{product && <Link className={s.receiptThumb} to={`/products/${product.slug}`} aria-label={`View ${line.name}`}><ProductImage product={product} /></Link>}<div className={s.receiptInfo}><strong>{line.name}</strong><p>{vehicle ? vehicleName(vehicle) : line.vehicleId}</p><small>{line.quantity} × {formatMoney(line.unitPrice)}</small></div><b>{formatMoney(line.lineTotal)}</b></li>;
    })}</ul>
    <div className={s.receiptTotal}><span>Demo total</span><strong>{formatMoney(order.total)}</strong></div>
    <p className={s.fine}>No payment was charged. No products will be shipped.</p>
    <Link className={s.secondary} to="/shop">Explore parts<Icon name="arrow" /></Link>
  </section>;
}

function OrderDetail({ id, onBack }) {
  const store = useStore(), [result, setResult] = useState(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true; setResult(null); setError('');
    loadAccountOrder(id).then(order => { if (live) setResult({ id, order }); }).catch(e => {
      if (!live) return;
      if (e.status === 401) { store.setUser(null); store.setNotice('Please sign in again.'); }
      else setError(e.message);
    });
    return () => { live = false; };
  }, [id, retry, store.user.id]);
  return <><button type="button" className={s.back} onClick={onBack}>← All orders</button>{error ? <div className={s.panel}><Notice error>{error}</Notice><button className={s.secondary} onClick={() => setRetry(v => v + 1)}>Try again</button></div> : result?.id === id ? <OrderContent order={result.order} /> : <Busy label="Loading order…" />}</>;
}

function DeleteDialog({ onClose }) {
  const store = useStore(), ref = useRef(null), cancel = useRef(null), live = useLive(), lock = useRef(false);
  const [password, setPassword] = useState(''), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const title = useId();
  useEffect(() => { const dialog = ref.current; const previous = document.activeElement; dialog.showModal(); cancel.current?.focus(); return () => { if (dialog.open) dialog.close(); if (previous?.isConnected) previous.focus(); }; }, []);
  async function remove(event) {
    event.preventDefault(); if (!confirmed || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await deleteAccount(password);
      if (!live.current) return;
      store.setUser(null); store.setBag([]); store.setVehicle(''); store.setLastOrder(null); store.setNotice('Demo account deleted.'); onClose();
    } catch (e) { if (live.current) setError(e.message); }
    finally { lock.current = false; if (live.current) setBusy(false); }
  }
  return <dialog className={s.dialog} ref={ref} aria-labelledby={title} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <h2 id={title}>Delete account?</h2><p>Your saved vehicle and simulated orders will be permanently removed.</p>
    <form onSubmit={remove} aria-busy={busy}>
      <PasswordField label="Current password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" disabled={busy} />
      <label className={s.checkbox}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy} />I understand this cannot be undone.</label>
      <Notice error>{error}</Notice>
      <div className={s.actions}><button ref={cancel} className={s.secondary} type="button" disabled={busy} onClick={onClose}>Cancel</button><button className={s.danger} type="submit" disabled={!confirmed || busy}>{busy ? 'Deleting…' : 'Delete permanently'}</button></div>
    </form>
  </dialog>;
}

function MemberArea() {
  const store = useStore(), [params, setParams] = useSearchParams(), live = useLive();
  const view = Object.hasOwn(views, params.get('view')) ? params.get('view') : 'overview';
  const orderId = view === 'orders' ? params.get('order') || '' : '';
  const page = /^[1-9][0-9]{0,4}$/.test(params.get('page') || '') ? Number(params.get('page')) : 1;
  const search = (params.get('q') || '').slice(0, 64);
  const [draft, setDraft] = useState(search), [history, setHistory] = useState(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false), [remove, setRemove] = useState(false), [exitError, setExitError] = useState('');
  const heading = useRef(null), logoutLock = useRef(false);
  const saved = store.data.vehicles.find(v => v.id === store.user.savedVehicleId);
  const queryKey = `${store.user.id}:${view === 'orders' ? page : 1}:${view === 'orders' ? search : ''}`;
  function go(next, extra = {}) { setParams({ ...(next === 'overview' ? {} : { view: next }), ...extra }); }
  useEffect(() => { setDraft(search); }, [search]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [view, orderId]);
  useEffect(() => {
    if (!['overview', 'orders'].includes(view) || orderId) return;
    let active = true; setHistory(null); setError('');
    loadAccountOrders({ page: view === 'orders' ? page : 1, search: view === 'orders' ? search : '' }).then(result => {
      if (active) setHistory({ key: queryKey, ...result });
    }).catch(e => {
      if (!active) return;
      if (e.status === 401) { store.setUser(null); store.setNotice('Your session expired. Please sign in again.'); }
      else setError(e.message);
    });
    return () => { active = false; };
  }, [view, queryKey, retry, orderId]);
  const records = history?.key === queryKey ? history : null;
  async function signOut() {
    if (logoutLock.current) return;
    logoutLock.current = true; setLoggingOut(true); setExitError('');
    try { await store.logout(); }
    catch (e) { if (live.current) setExitError(e.message); }
    finally { logoutLock.current = false; if (live.current) setLoggingOut(false); }
  }
  const openOrder = id => go('orders', { ...(view === 'orders' ? Object.fromEntries(params) : {}), view: 'orders', order: id });
  return <div className={s.memberLayout}>
    <aside className={s.sidebar}>
      <AccountVisual compact />
      <div className={s.identity}><span className={s.avatar} aria-hidden="true">{store.user.email.slice(0, 1).toUpperCase()}</span><strong>{store.user.email}</strong><span>Member since {date(store.user.createdAt)}</span></div>
      <nav aria-label="Account navigation">
        {Object.entries({ overview: ['user', 'Overview'], vehicle: ['vehicle', 'Saved vehicle'], orders: ['bag', 'Orders'], security: ['check', 'Settings'] }).map(([key, [icon, label]]) => <Link key={key} to={key === 'overview' ? '/account' : `/account?view=${key}`} aria-current={view === key ? 'page' : undefined}><Icon name={icon} />{label}<span aria-hidden="true">↗</span></Link>)}
      </nav>
      {store.user.role === 'admin' && <Link className={s.textButton} to="/admin">Manage catalog →</Link>}
      <button className={s.logout} disabled={loggingOut} onClick={signOut}>{loggingOut ? 'Signing out…' : 'Sign out'}<span aria-hidden="true">↗</span></button>
      <Notice error>{exitError}</Notice>
    </aside>
    <div className={s.memberContent} key={`${view}:${orderId}`}>
      <header className={s.pageHeading}><h1 ref={heading} tabIndex={-1}>{orderId ? 'Order detail.' : views[view]}</h1><Link to="/shop" className={s.back}>Shop parts ↗</Link></header>
      {view === 'vehicle' ? <VehicleForm /> : view === 'security' ? <section className={s.panel}><h2>Account details</h2><dl className={s.details}><div><dt>Email</dt><dd>{store.user.email}</dd></div><div><dt>Member since</dt><dd>{date(store.user.createdAt)}</dd></div><div><dt>Saved vehicle</dt><dd>{vehicleName(saved)}</dd></div></dl><div className={s.dangerArea}><h3>Delete demo account</h3><p>Removes this account, its saved vehicle and simulated orders.</p><button className={s.dangerOutline} onClick={() => setRemove(true)}>Delete account</button></div></section> : orderId ? <OrderDetail key={orderId} id={orderId} onBack={() => { const next = new URLSearchParams(params); next.delete('order'); setParams(next); }} /> : <>
        {view === 'overview' && <div className={s.overviewCards}>
          <section className={`${s.panel} ${s.savedCard}`}><div className={s.cardTop}><Icon name="vehicle" /><span className={s.pill}>YOUR RIDE</span></div><h2>{saved ? saved.model : 'Add your vehicle.'}</h2><p>{saved ? `${saved.make} · ${saved.year}` : 'Save once. Find matching parts faster.'}</p><div className={s.actions}><button className={s.secondary} onClick={() => go('vehicle')}>{saved ? 'Manage vehicle' : 'Choose vehicle'}<Icon name="arrow" /></button>{saved && saved.id !== store.vehicleId && <button className={s.textButton} onClick={() => { store.setVehicle(saved.id); store.setNotice('Saved vehicle selected.'); }}>Use for shopping</button>}</div></section>
          <button className={`${s.panel} ${s.orderStat}`} onClick={() => go('orders')}><span className={s.cardTop}><Icon name="bag" /><span>ORDER HISTORY</span></span><strong>{records ? records.total : '—'}</strong><span>Simulated orders <Icon name="arrow" /></span></button>
        </div>}
        <section className={s.panel}>
          <div className={s.panelHeading}><h2>{view === 'overview' ? 'Recent orders' : 'Order history'}</h2>{view === 'overview' && <button className={s.textButton} onClick={() => go('orders')}>View all →</button>}</div>
          {view === 'orders' && <form className={s.search} onSubmit={e => { e.preventDefault(); go('orders', { ...(draft.trim() ? { q: draft.trim() } : {}) }); }}><label className={s.srOnly} htmlFor="account-order-search">Search orders</label><input id="account-order-search" type="search" maxLength={64} placeholder="Order number or product" value={draft} onChange={e => setDraft(e.target.value)} /><button className={s.secondary} type="submit">Search</button></form>}
          {error ? <><Notice error>{error}</Notice><button className={s.secondary} onClick={() => setRetry(n => n + 1)}>Try again</button></> : !records ? <Busy label="Loading orders…" /> : !records.data.length ? <div className={s.empty}><Icon name="bag" /><h3>{search || page > 1 ? 'No matching orders.' : 'Your next build starts here.'}</h3>{search || page > 1 ? <button className={s.secondary} onClick={() => go('orders')}>Reset search</button> : <Link className={s.secondary} to="/shop">Explore parts<Icon name="arrow" /></Link>}</div> : <>
            <ul className={s.orderList}>{(view === 'overview' ? records.data.slice(0, 3) : records.data).map((order, i) => <li key={order.id} style={{ '--account-row': Math.min(i, 5) }}><button onClick={() => openOrder(order.id)} className={s.orderRow}><span className={s.orderGlyph} aria-hidden="true"><Icon name="bag" /></span><span className={s.orderName}><strong>{order.id}</strong><small>{date(order.createdAt)} · {orderUnits(order)} items</small></span><span className={s.orderAmount}><b>{formatMoney(order.total)}</b><small>Demo confirmed</small></span><Icon name="arrow" /></button></li>)}</ul>
            {view === 'orders' && records.total > records.pageSize && <nav className={s.pagination} aria-label="Order pages"><button className={s.secondary} disabled={page <= 1} onClick={() => go('orders', { ...(search ? { q: search } : {}), page: String(page - 1) })}>Previous</button><span>Page {page} of {Math.ceil(records.total / records.pageSize)}</span><button className={s.secondary} disabled={page * records.pageSize >= records.total} onClick={() => go('orders', { ...(search ? { q: search } : {}), page: String(page + 1) })}>Next</button></nav>}
          </>}
        </section>
      </>}
    </div>
    {remove && <DeleteDialog onClose={() => setRemove(false)} />}
  </div>;
}

function AccountContent() {
  const store = useStore();
  useEffect(() => { const previous = document.title; document.title = 'Account — DTH Parts Studio'; return () => { document.title = previous; }; }, []);
  return <section className={`dth-container ${s.root}`}>
    {FLOW && !store.user && <div className="dth-flow-note" role="note"><strong>UI rehearsal — not real authentication.</strong><br />Sign in: <code>demo@dth.test</code> · <code>DthFlow2026!</code><br />To try registration, use another fictitious <code>@dth.test</code> email and the same published password. Do not enter real credentials.</div>}
    {store.authLoading ? <Busy label="Checking your session…" /> : store.authError ? <div className={s.preview}><h1>Session unavailable.</h1><Notice error>{store.authError}</Notice><button className={s.primary} onClick={store.retrySession}>Try again</button></div> : PREVIEW ? <div className={s.preview}><h1>Your account.</h1><p>Accounts and saved orders are available in API mode.</p><Link className={s.primary} to="/shop">Explore parts<Icon name="arrow" /></Link></div> : store.user ? <MemberArea key={store.user.id} /> : <AuthForm />}
  </section>;
}


export default function AccountPage() { return <AccountExperience><AccountContent /></AccountExperience>; }
