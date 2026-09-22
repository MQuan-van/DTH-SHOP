import AccountPage from './account/AccountPage';
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { CATEGORIES, filterProducts, fitment, formatMoney,normalizeItems, quoteOrder } from '../../../shared/domain.mjs';
import { PREVIEW, createOrder, saveProduct, loadAdminProducts, loadOrder } from './api';
import { StoreProvider, useStore } from './useStore';
import './store.css';
import Icon from './components/StoreIcon.jsx';
import ProductCard from './components/ProductCard.jsx';
import HomePage from './home/HomePage.jsx';
import ShopPage from './catalog/ShopPage';
import ProductImage from './catalog/components/ProductImage';
const Viewer3D = lazy(() => import('./Viewer3D'));
const categoryNames = { suspension: 'Suspension', wheels: 'Wheels', exhausts: 'Exhausts', mirrors: 'Mirrors', brakes: 'Brakes' };
function Dialog({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => { const el = ref.current; el.showModal(); return () => { if (el.open) el.close(); }; }, []);
  return <dialog className="dth-dialog" ref={ref} onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose(); }} aria-label={title}>
    <div className="dth-dialog-title"><h2>{title}</h2><button onClick={onClose} aria-label="Close dialog">×</button></div>{children}
  </dialog>;
}
function VehiclePicker({ onClose }) {
  const { data, vehicleId, setVehicle } = useStore();
  const existing = data.vehicles.find(v => v.id === vehicleId);
  const [make, setMake] = useState(existing?.make || '');
  const [model, setModel] = useState(existing?.model || '');
  const [year, setYear] = useState(existing?.year ? String(existing.year) : '');
  const unique = list => [...new Set(list)];
  const models = unique(data.vehicles.filter(v => v.make === make).map(v => v.model));
  const years = unique(data.vehicles.filter(v => v.make === make && v.model === model).map(v => v.year));
  const match = data.vehicles.find(v => v.make === make && v.model === model && String(v.year) === year);
  return <Dialog title="Find your fit." onClose={onClose}>
    <p className="dth-muted">Choose a vehicle to filter the demo catalog. These fictional vehicles and mappings are for evaluation only.</p>
    <form className="dth-form" onSubmit={e => { e.preventDefault(); if (match) { setVehicle(match.id); onClose(); } }}>
      <label>Make<select value={make} required onChange={e => { setMake(e.target.value); setModel(''); setYear(''); }}><option value="">Choose make</option>{unique(data.vehicles.map(v => v.make)).map(m => <option key={m}>{m}</option>)}</select></label>
      <label>Model<select value={model} required disabled={!make} onChange={e => { setModel(e.target.value); setYear(''); }}><option value="">Choose model</option>{models.map(m => <option key={m}>{m}</option>)}</select></label>
      <label>Year<select value={year} required disabled={!model} onChange={e => setYear(e.target.value)}><option value="">Choose year</option>{years.map(y => <option key={y}>{y}</option>)}</select></label>
      <button className="dth-button dth-primary" type="submit" disabled={!match}>Show matching parts <Icon name="arrow" /></button>
      {vehicleId && <button className="dth-button dth-ghost" type="button" onClick={() => { setVehicle(''); onClose(); }}>Clear selected vehicle</button>}
    </form>
  </Dialog>;
}
function Shell() {
  const store = useStore(), location = useLocation();
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const vehicle = store.data.vehicles.find(v => v.id === store.vehicleId);
  const count = store.bag.reduce((n, i) => n + i.quantity, 0);
  useLayoutEffect(() => { document.documentElement.dataset.dthStore = 'true'; return () => { delete document.documentElement.dataset.dthStore; }; }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.title = 'DTH — The 3D Parts Studio'; }, [location.pathname]);
  return <div className="dth-store">
    <a className="dth-skip" href="#dth-content">Skip to content</a>
    <div className="dth-demo-banner">FYP DEMONSTRATOR <span>Illustrative 3D assets · Synthetic fitment · No real payments</span><b>{PREVIEW ? 'LOCAL PREVIEW' : 'MONGODB / API MODE'}</b></div>
    <header className="dth-header">
      <Link to="/" className="dth-brand" aria-label="DTH store home"><span className="dth-brand-symbol">///</span><span>DTH<span className="dth-brand-sub">PARTS STUDIO</span></span></Link>
      <nav className="dth-navigation" aria-label="Main navigation"><NavLink to="/" end>Studio</NavLink><NavLink to="/shop">Shop parts</NavLink><NavLink to="/account">My account</NavLink></nav>
      <div className="dth-header-tools"><button className="dth-vehicle-button" onClick={() => setVehicleOpen(true)} disabled={store.loading || !!store.error}><Icon name="vehicle" /><span>{vehicle ? `${vehicle.model} · ${vehicle.year}` : 'Select your vehicle'}</span><span className="dth-lime">＋</span></button><Link to="/account" className="dth-icon-button" aria-label="Your account"><Icon name="user" /></Link><Link to="/bag" className="dth-bag-button" aria-label={`Shopping bag, ${count} items`}><Icon name="bag" /><span>{count}</span></Link></div>
    </header>
    <main id="dth-content" tabIndex={-1}>
      {store.loading ? <div className="dth-empty">Loading the studio…</div> : store.error ? <div className="dth-empty"><h1>We could not load the store.</h1><p role="alert">{store.error}</p><button className="dth-button dth-primary" onClick={store.refresh}>Try again</button><p>Check the API, MongoDB and the seed step. API mode never silently switches to preview data.</p></div> : <Outlet context={{ chooseVehicle: () => setVehicleOpen(true) }} />}
    </main>
    <footer className="dth-footer"><Link to="/" className="dth-footer-brand">DTH<span> / PARTS STUDIO</span></Link><p>Inspect the design. Check the demo fit. Explore with confidence.</p><div><span>COMP1682 · Final Year Project</span><span>Demo models are not installation guidance.</span></div></footer>
    <div className={`dth-toast ${store.notice ? 'is-visible' : ''}`} role="status" aria-live="polite">{store.notice}</div>
    {vehicleOpen && <VehiclePicker onClose={() => setVehicleOpen(false)} />}
  </div>;
}
function ModelView({ product, hero = false }) {
  return <Suspense fallback={<div className={`dth-viewer ${hero ? 'dth-viewer-hero' : ''}`}><img className="dth-model-still" src={product.imageUrl} alt={product.name} /><span className="dth-scene-loading">Preparing 3D viewer…</span></div>}><Viewer3D key={product.id} product={product} hero={hero} /></Suspense>;
}
function Catalog() {
  const { data, vehicleId, setVehicle } = useStore(); const { chooseVehicle } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') || '', category = params.get('category') || '', sort = params.get('sort') || 'featured';
  const maximum = Number(params.get('max'));
  const maxPrice = Number.isFinite(maximum) && maximum > 0 ? maximum : 5000000;
  const visible = filterProducts(data.products, { search, category, maxPrice, vehicleId }, data.vehicles);
  visible.sort(sort === 'price-low' ? (a, b) => a.price - b.price : sort === 'price-high' ? (a, b) => b.price - a.price : (a, b) => Number(!!b.featured) - Number(!!a.featured));
  function update(key, value) { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next, { replace: true }); }
  const vehicle = data.vehicles.find(v => v.id === vehicleId);
  return <section className="dth-container dth-section"><div className="dth-page-heading"><p className="dth-eyebrow">THE PARTS COLLECTION</p><h1>A closer look.<br /><em>A clearer choice.</em></h1><p>All parts include a locally hosted, interactive GLB model. Prices and compatibility are for demonstration.</p></div>
    <div className="dth-catalog-layout"><aside className="dth-filter-panel" aria-label="Product filters"><h2>Refine your build</h2><label className="dth-search"><Icon name="search" /><input aria-label="Search parts" placeholder="Search the collection" value={search} onChange={e => update('q', e.target.value)} /></label><p className="dth-filter-label">CATEGORY</p><button className={!category ? 'is-active' : ''} onClick={() => update('category', '')}>All parts <span>{data.products.length}</span></button>{CATEGORIES.map(c => <button key={c} className={category === c ? 'is-active' : ''} onClick={() => update('category', c)}>{categoryNames[c]}<span>{data.products.filter(p => p.category === c).length}</span></button>)}<label className="dth-price-filter">Maximum price <strong>{formatMoney(maxPrice)}</strong><input type="range" min="500000" max="5000000" step="50000" value={maxPrice} onChange={e => update('max', e.target.value)} /></label><div className="dth-filter-vehicle"><Icon name="vehicle" /><h3>{vehicle ? vehicle.model : 'Start with your ride'}</h3><p>{vehicle ? `${vehicle.make} · ${vehicle.year}` : 'Only show parts matching your demo vehicle.'}</p><button className="dth-button dth-ghost" onClick={chooseVehicle}>{vehicle ? 'Change vehicle' : 'Select vehicle'}</button>{vehicleId && <button className="dth-text-button" onClick={() => setVehicle('')}>Remove vehicle filter</button>}</div></aside>
      <div><div className="dth-results-toolbar"><p><strong>{visible.length}</strong> parts {vehicle ? 'matching your demo vehicle' : 'in view'}</p><label>Sort by <select aria-label="Sort parts" value={sort} onChange={e => update('sort', e.target.value)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label></div>{visible.length ? <div className="dth-product-grid dth-catalog-grid">{visible.map(p => <ProductCard key={p.id} product={p} />)}</div> : <div className="dth-empty"><h2>No matching parts.</h2><p>Try a different category or vehicle. Unknown vehicles are not treated as compatible.</p><button className="dth-button dth-ghost" onClick={() => { setParams({}); setVehicle(''); }}>Clear all filters</button></div>}</div>
    </div></section>;
}
function Product() {
  const { slug } = useParams();
  const { data } = useStore();

  const product = data.products.find(
    item => item.slug === slug && item.active !== false
  );

  return product ? (
    <ProductDetails
      key={`${product.id}:${product.slug}`}
      product={product}
    />
  ) : (
    <NotFound />
  );
}

function ProductDetails({ product }) {
  const { data, vehicleId, bag, add } = useStore();
  const { chooseVehicle } = useOutletContext();
  const location = useLocation();

  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  const heading = useRef(null);

  const match = fitment(product, vehicleId, data.vehicles);
  const vehicle = data.vehicles.find(item => item.id === vehicleId);

  const existing = bag.find(
    item =>
      item.productId === product.id &&
      item.vehicleId === vehicleId
  );

  const remaining = Math.max(0, 10 - (existing?.quantity || 0));
  const full = !existing && bag.length >= 20;

  const validPrice =
    Number.isSafeInteger(product.price) &&
    product.price > 0 &&
    product.price <= 1000000000;

  const compatible = match.status === 'compatible';

  const canAdd =
    compatible &&
    validPrice &&
    !full &&
    remaining > 0;

  const category =
    categoryNames[product.category] || product.category;

  const matches = data.vehicles.filter(
    item =>
      Array.isArray(product.vehicleIds) &&
      product.vehicleIds.includes(item.id)
  );

  const specifications = Object.entries(product.specs || {});

  const source = location.state?.fromShop;

  const backToShop =
    typeof source === 'string' &&
    /^\/shop(?:\?|$)/.test(source)
      ? source
      : '/shop';

  const fitLabels = {
    unselected: 'Choose your vehicle to check fit',
    compatible: 'Matches your selected demo vehicle',
    incompatible: 'No match in the demo dataset',
    unknown: 'Compatibility not verified',
  };

  useEffect(() => {
    setQuantity(1);
    setAdded(false);
    setError('');
  }, [vehicleId]);

  useEffect(() => {
    setQuantity(value =>
      Math.max(1, Math.min(value, remaining))
    );
  }, [remaining]);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  function buy(event) {
    event.preventDefault();

    setError('');
    setAdded(false);

    if (!compatible) {
      chooseVehicle();
      return;
    }

    if (
      !canAdd ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > remaining
    ) {
      setError(
        'Check the quantity and demo bag limits before continuing.'
      );
      return;
    }

    try {
      // Dùng dữ liệu catalog để kiểm tra lại giá và tương thích.
      quoteOrder(
        [{
          productId: product.id,
          vehicleId,
          quantity,
        }],
        data.products,
        data.vehicles
      );

      if (!add(product, vehicleId, quantity)) {
        setError(
          'Could not add this item. Check your vehicle and bag limits.'
        );
        return;
      }

      setAdded(true);
      setQuantity(1);
    } catch (error) {
      setError(error.message);
    }
  }

  return (
    <section className="dth-container dth-section dth-pdp">
      <nav
        className="dth-pdp-breadcrumb"
        aria-label="Breadcrumb"
      >
        <Link to={backToShop}>← Back to parts</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="dth-pdp-layout">
        <div className="dth-pdp-media">
          <Suspense
            fallback={
              <div className="dth-pdv" aria-busy="true">
                <div className="dth-pdv-heading">
                  <span>PRODUCT STUDIO / 01</span>
                  <span role="status">Preparing 3D…</span>
                </div>

                <div className="dth-pdv-stage">
                  <ProductImage
                    product={product}
                    className="dth-pdv-image"
                    eager
                  />
                </div>

                <div className="dth-pdv-controls">
                  {[
                    '↶', '↷', '+', '−',
                    'Reset', 'Auto rotate', 'Image',
                  ].map(label => (
                    <button key={label} disabled>
                      {label}
                    </button>
                  ))}
                </div>

                <p className="dth-pdv-help">
                  You can read product details and check vehicle
                  fit without 3D.
                </p>

                <p className="dth-pdv-help">
                  Illustrative model · Not manufacturer measurements.
                </p>
              </div>
            }
          >
            <Viewer3D
              key={`${product.id}:${product.modelUrl}`}
              product={product}
            />
          </Suspense>
        </div>

        <div className="dth-pdp-info">
          <p className="dth-eyebrow">DTH / {category}</p>

          <h1 ref={heading} tabIndex={-1}>
            {product.name}
          </h1>

          <p className="dth-pdp-price">
            {validPrice
              ? formatMoney(product.price)
              : 'Price unavailable'}

            <small>DEMO PRICE · VND</small>
          </p>

          <p className="dth-pdp-description">
            {product.description}
          </p>

          <div className="dth-pdp-finish">
            <span
              style={{
                background: product.accent || '#CBD4DC',
              }}
              aria-hidden="true"
            />

            <div>
              <small>FINISH</small>
              <strong>{product.finish}</strong>
            </div>
          </div>

          <section
            className="dth-pdp-fit"
            data-status={match.status}
            aria-label="Vehicle compatibility"
          >
            <strong>
              <Icon name={compatible ? 'check' : 'vehicle'} />
              {fitLabels[match.status] || fitLabels.unknown}
            </strong>

            {vehicle && (
              <p>
                {vehicle.make} {vehicle.model} · {vehicle.year}
              </p>
            )}

            <small>
              Based on synthetic demo mappings,
              not manufacturer verification.
            </small>

            <div>
              <button
                type="button"
                className="dth-text-button"
                onClick={chooseVehicle}
              >
                {vehicleId ? 'Change vehicle' : 'Select vehicle'} →
              </button>

              {(
                match.status === 'incompatible' ||
                match.status === 'unknown'
              ) && (
                <Link to="/shop?fit=match">
                  Browse matching parts
                </Link>
              )}
            </div>
          </section>

          <form className="dth-pdp-buy" onSubmit={buy}>
            <label>
              Quantity

              <select
                value={quantity}
                disabled={!canAdd}
                onChange={event => {
                  setQuantity(Number(event.target.value));
                  setAdded(false);
                }}
              >
                {Array.from(
                  { length: Math.max(1, remaining) },
                  (_, index) => (
                    <option
                      key={index + 1}
                      value={index + 1}
                    >
                      {index + 1}
                    </option>
                  )
                )}
              </select>
            </label>

            <button
              type="submit"
              className="dth-button dth-primary"
              disabled={compatible && !canAdd}
            >
              <Icon name="bag" />

              {!compatible
                ? 'Choose a matching vehicle'
                : !validPrice
                  ? 'Price unavailable'
                  : full
                    ? 'Bag limit reached'
                    : !remaining
                      ? 'Quantity limit reached'
                      : 'Add to bag'}
            </button>
          </form>

          <p className="dth-pdp-note">
            Demo limit: 10 per product / vehicle, 20 bag lines.
            No real payment or shipment.
          </p>

          {error && (
            <p className="dth-error" role="alert">
              {error}
            </p>
          )}

          {added && (
            <div className="dth-pdp-added">
              <span>✓ Added to your bag.</span>
              <Link to="/bag">Review bag →</Link>
            </div>
          )}

          <details className="dth-detail-accordion" open>
            <summary>Product information</summary>

            {specifications.length ? (
              <dl>
                {specifications.map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="dth-pdp-note">
                No additional specifications have been provided.
              </p>
            )}
          </details>

          <details className="dth-detail-accordion">
            <summary>
              Vehicles in the demo mapping ({matches.length})
            </summary>

            {matches.length ? (
              <ul>
                {matches.map(item => (
                  <li key={item.id}>
                    {item.make} {item.model} · {item.year}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                No matching vehicles are listed.
                Compatibility is not verified.
              </p>
            )}
          </details>
        </div>
      </div>
    </section>
  );
}
// function Bag() {
//   const store = useStore(), navigate = useNavigate();
//   const [ack, setAck] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
//   const key = useRef({ payload: '', id: '' });
//   const payload = JSON.stringify(store.bag);
//   if (payload !== key.current.payload) key.current = { payload, id: crypto.randomUUID() };
//   let quote = null, quoteError = '';
//   try { if (store.bag.length) quote = quoteOrder(store.bag, store.data.products, store.data.vehicles); } catch (e) { quoteError = e.message; }
//   function change(index, quantity) { if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return; store.setBag(items => items.map((i, n) => n === index ? { ...i, quantity } : i)); }
//   async function checkout() {
//     if (busy) return;
//     setBusy(true); setError('');
//     try {
//       const order = await createOrder(store.bag, key.current.id, ack, store.data);
//       store.setLastOrder(order); store.setBag([]); navigate('/order-complete');
//     } catch (e) { setError(e.message); } finally { setBusy(false); }
//   }
//   return <section className="dth-container dth-section"><div className="dth-page-heading"><p className="dth-eyebrow">YOUR NEXT BUILD</p><h1>The bag.</h1></div>{!store.bag.length ? <div className="dth-empty"><Icon name="bag" /><h2>Ready for a new perspective?</h2><p>Your bag is empty.</p><Link className="dth-button dth-primary" to="/shop">Explore the collection</Link></div> : <div className="dth-checkout-grid"><div className="dth-bag-items">{store.bag.map((item, index) => {
//     const product = store.data.products.find(p => p.id === item.productId);
//     const vehicle = store.data.vehicles.find(v => v.id === item.vehicleId);
//     return <article className="dth-bag-item" key={`${item.productId}:${item.vehicleId}`}>
//       {product && <Link to={`/products/${product.slug}`}><img src={product.imageUrl} alt={product.name} /></Link>}<div><h2>{product?.name || 'Unavailable product'}</h2><p>{product?.finish}</p><p className="dth-fit">{vehicle ? `${vehicle.model} · ${vehicle.year} · demo mapping` : 'Unknown demo vehicle'}</p><button disabled={busy} className="dth-text-button" onClick={() => store.setBag(items => items.filter((_, n) => n !== index))} aria-label={`Remove ${product?.name || item.productId}`}>Remove</button></div><div className="dth-bag-item-end"><strong>{formatMoney((product?.price || 0) * item.quantity)}</strong><label>Qty<select disabled={busy} aria-label={`Quantity for ${product?.name || item.productId}`} value={item.quantity} onChange={e => change(index, Number(e.target.value))}>{Array.from({ length: 10 }, (_, i) => <option key={i + 1}>{i + 1}</option>)}</select></label></div></article>;
//   })}<Link className="dth-text-button" to="/shop">← Continue exploring</Link></div><aside className="dth-order-summary"><p className="dth-eyebrow">MOCK CHECKOUT</p><h2>Build summary</h2><div><span>Subtotal</span><strong>{quote ? formatMoney(quote.total) : '—'}</strong></div><div><span>Delivery</span><span>Not applicable — demo</span></div><div className="dth-total"><span>Total</span><strong>{quote ? formatMoney(quote.total) : '—'}</strong></div><p className="dth-muted">{PREVIEW ? 'Preview: the simulated result exists only in this page session. It is not sent to a server.' : 'The API rechecks product prices and demo compatibility before saving the simulated order to MongoDB.'}</p><label className="dth-checkbox"><input type="checkbox" checked={ack} disabled={busy} onChange={e => setAck(e.target.checked)} />I understand this is a demonstration, with no payment, shipment or real fitment guarantee.</label>{!PREVIEW && !store.user ? <Link className="dth-button dth-primary" to="/account?return=/bag">Sign in to continue</Link> : <button className="dth-button dth-primary" disabled={!ack || !quote || busy || store.authLoading} onClick={checkout}>{busy ? 'Creating simulated order…' : 'Place simulated order'}<Icon name="arrow" /></button>}{(quoteError || error) && <p className="dth-error" role="alert">{quoteError || error}</p>}</aside></div>}</section>;
// }
// function Completed() {
//   const { lastOrder } = useStore();
//   return <section className="dth-container dth-section dth-completed"><div className="dth-complete-mark"><Icon name="check" /></div><p className="dth-eyebrow">{lastOrder ? 'SIMULATION COMPLETE' : 'ORDER SUMMARY'}</p><h1>{lastOrder ? 'Your next build, imagined.' : 'No order in this page session.'}</h1>{lastOrder && <><p>No money was charged. No physical products will be shipped.</p><div className="dth-confirmation"><span>{lastOrder.id}</span><strong>{formatMoney(lastOrder.total)}</strong><span>{PREVIEW ? 'Local preview only — not saved to MongoDB.' : 'Simulated order saved to your account.'}</span></div></>}<Link className="dth-button dth-primary" to="/shop">Back to the collection <Icon name="arrow" /></Link></section>;
// }
  const CHECKOUT_INTENT_KEY = 'dth.commerce.checkout-intent.v2';
  let memoryCheckoutIntent = null;

  function bagSignature(items) {
    try {
      return JSON.stringify(normalizeItems(items));
    } catch {
      return '';
    }
  }

  function getCheckoutIntent(fingerprint) {
    let saved = memoryCheckoutIntent;

    try {
      saved =
        JSON.parse(sessionStorage.getItem(CHECKOUT_INTENT_KEY)) ||
        saved;
    } catch {
      // Vẫn hoạt động trong bộ nhớ nếu storage bị khóa.
    }

    if (
      saved?.fingerprint === fingerprint &&
      typeof saved.id === 'string' &&
      /^[a-zA-Z0-9-]{8,80}$/.test(saved.id)
    ) {
      return saved;
    }

    if (!globalThis.crypto?.randomUUID) {
      throw new Error(
        'Open this demo on localhost or HTTPS to create an order.'
      );
    }

    saved = {
      fingerprint,
      id: crypto.randomUUID(),
    };

    memoryCheckoutIntent = saved;

    try {
      sessionStorage.setItem(
        CHECKOUT_INTENT_KEY,
        JSON.stringify(saved)
      );
    } catch {
      // Sau reload, khả năng retry phụ thuộc storage được cho phép.
    }

    return saved;
  }

  function finishCheckoutIntent(id) {
    if (memoryCheckoutIntent?.id === id) {
      memoryCheckoutIntent = null;
    }

    try {
      const saved = JSON.parse(
        sessionStorage.getItem(CHECKOUT_INTENT_KEY)
      );

      if (saved?.id === id) {
        sessionStorage.removeItem(CHECKOUT_INTENT_KEY);
      }
    } catch {
      // Không biến đơn thành công thành lỗi vì storage.
    }
  }

  function Bag() {
    const store = useStore();
    const navigate = useNavigate();

    const [reviewFor, setReviewFor] = useState('');
    const [ackFor, setAckFor] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const lock = useRef(false);
    const mounted = useRef(false);
    const summaryHeading = useRef(null);

    const actor = PREVIEW ? 'preview' : store.user?.id || '';
    const latestActor = useRef(actor);

    useEffect(() => {
      latestActor.current = actor;
    }, [actor]);

    useEffect(() => {
      mounted.current = true;

      return () => {
        mounted.current = false;
      };
    }, []);

    let quote = null;
    let quoteError = '';

    try {
      if (store.bag.length) {
        quote = quoteOrder(
          store.bag,
          store.data.products,
          store.data.vehicles
        );
      }
    } catch (e) {
      quoteError = e.message;
    }

    const signature = quote
      ? JSON.stringify([actor, quote])
      : '';

    const reviewing =
      !!signature && reviewFor === signature;

    const acknowledged =
      !!signature && ackFor === signature;

    const units = store.bag.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    function editBag(index, changes) {
      if (lock.current) return;

      try {
        const next = changes === null
          ? store.bag.filter((_, i) => i !== index)
          : store.bag.map((item, i) =>
              i === index ? { ...item, ...changes } : item
            );

        // Gộp dòng trùng sản phẩm + xe và kiểm tra giới hạn số lượng.
        store.setBag(next.length ? normalizeItems(next) : []);

        setReviewFor('');
        setAckFor('');
        setError('');
      } catch (e) {
        setError(e.message);
      }
    }

    function review() {
      if (!quote || lock.current) return;

      setReviewFor(signature);
      setAckFor('');
      setError('');

      summaryHeading.current?.focus();
    }

    async function checkout() {
      if (
        lock.current ||
        !reviewing ||
        !acknowledged ||
        !quote ||
        (!PREVIEW && (store.authLoading || !store.user))
      ) {
        return;
      }

      lock.current = true;
      setBusy(true);
      setError('');

      try {
        const snapshot = normalizeItems(store.bag);
        const payload = bagSignature(snapshot);

        const intent = getCheckoutIntent(
          JSON.stringify([actor, payload])
        );

        const order = await createOrder(
          snapshot,
          intent.id,
          true,
          store.data,
          quote.total
        );

        // Khách đã rời trang hoặc đổi tài khoản:
        // không xóa giỏ và không tự điều hướng.
        if (
          !mounted.current ||
          latestActor.current !== actor
        ) {
          return;
        }

        store.setLastOrder(order);

        // Không xóa một giỏ đã thay đổi trong lúc chờ phản hồi.
        store.setBag(current =>
          bagSignature(current) === payload ? [] : current
        );

        finishCheckoutIntent(intent.id);

        navigate(
          `/order-complete?order=${encodeURIComponent(order.id)}`,
          { replace: true }
        );
      } catch (e) {
        if (
          !mounted.current ||
          latestActor.current !== actor
        ) {
          return;
        }

        setError(e.message || 'Could not confirm the order.');

        if (e.status === 401) {
          store.setUser(null);
        }

        if (e.status === 409) {
          setReviewFor('');
          setAckFor('');
        }
      } finally {
        lock.current = false;

        if (mounted.current) {
          setBusy(false);
        }
      }
    }

    return (
      <section className="dth-container dth-section dth-cart">
        <p className="dth-eyebrow">YOUR DTH BUILD</p>
        <h1>Your bag.</h1>

        <p className="dth-cart-caption">
          Review your parts and vehicle matches before placing
          a simulated order.
        </p>

        <ol
          className="dth-cart-steps"
          aria-label="Checkout progress"
        >
          <li aria-current={!reviewing ? 'step' : undefined}>
            01 / Bag
          </li>
          <li aria-current={reviewing ? 'step' : undefined}>
            02 / Review
          </li>
          <li>03 / Confirmation</li>
        </ol>

        {!store.bag.length ? (
          <div className="dth-cart-empty">
            <Icon name="bag" />
            <h2>Your bag is empty.</h2>
            <p>Find a part, check its demo fit, then add it here.</p>

            <Link
              className="dth-button dth-primary"
              to="/shop"
            >
              Explore parts
            </Link>
          </div>
        ) : (
          <div className="dth-cart-layout">
            <div>
              <p className="dth-cart-caption">
                {units} units · {store.bag.length} product / vehicle lines
              </p>

              <p className="dth-cart-hint">
                Each line keeps its own vehicle. Changing the header
                vehicle does not change your bag.
              </p>

              {store.bag.map((item, index) => {
                const product = store.data.products.find(
                  p => p.id === item.productId
                );

                const vehicle = store.data.vehicles.find(
                  v => v.id === item.vehicleId
                );

                const available =
                  product && product.active !== false;

                const priceValid =
                  available &&
                  Number.isSafeInteger(product.price) &&
                  product.price >= 0 &&
                  product.price <= 1000000000;

                const compatible =
                  available &&
                  fitment(
                    product,
                    item.vehicleId,
                    store.data.vehicles
                  ).status === 'compatible';

                return (
                  <article
                    className="dth-cart-item"
                    key={`${item.productId}:${item.vehicleId}`}
                  >
                    <div className="dth-cart-image">
                      {available ? (
                        <Link to={`/products/${product.slug}`}>
                          <ProductImage
                            product={product}
                            className="dth-cart-photo"
                          />
                        </Link>
                      ) : (
                        <span>Unavailable</span>
                      )}
                    </div>

                    <div className="dth-cart-item-info">
                      <h2>
                        {available ? (
                          <Link to={`/products/${product.slug}`}>
                            {product.name}
                          </Link>
                        ) : (
                          'Unavailable product'
                        )}
                      </h2>

                      <p>{product?.finish}</p>

                      <p
                        className="dth-cart-fit"
                        data-valid={!!compatible}
                      >
                        {compatible
                          ? '✓ Matches demo mapping'
                          : 'Attention: fit or product unavailable'}
                      </p>

                      {reviewing ? (
                        <p>
                          {vehicle
                            ? `${vehicle.make} ${vehicle.model} · ${vehicle.year}`
                            : item.vehicleId}
                        </p>
                      ) : (
                        <label className="dth-cart-field">
                          Vehicle for this part

                          <select
                            value={item.vehicleId}
                            disabled={busy || !available}
                            onChange={e =>
                              editBag(index, {
                                vehicleId: e.target.value,
                              })
                            }
                          >
                            {!vehicle && (
                              <option value={item.vehicleId}>
                                Unknown vehicle — choose another
                              </option>
                            )}

                            {store.data.vehicles.map(v => (
                              <option
                                key={v.id}
                                value={v.id}
                                disabled={
                                  !available ||
                                  fitment(
                                    product,
                                    v.id,
                                    store.data.vehicles
                                  ).status !== 'compatible'
                                }
                              >
                                {v.make} {v.model} · {v.year}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}

                      {!reviewing && (
                        <button
                          type="button"
                          disabled={busy}
                          className="dth-text-button"
                          onClick={() => editBag(index, null)}
                          aria-label={`Remove ${product?.name || item.productId}`}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="dth-cart-item-end">
                      <small>UNIT PRICE</small>

                      <span>
                        {priceValid
                          ? formatMoney(product.price)
                          : '—'}
                      </span>

                      {reviewing ? (
                        <p>Quantity: {item.quantity}</p>
                      ) : (
                        <label className="dth-cart-field">
                          Quantity

                          <select
                            value={item.quantity}
                            disabled={busy}
                            aria-label={`Quantity for ${product?.name || item.productId}`}
                            onChange={e =>
                              editBag(index, {
                                quantity: Number(e.target.value),
                              })
                            }
                          >
                            {Array.from(
                              { length: 10 },
                              (_, i) => (
                                <option
                                  key={i + 1}
                                  value={i + 1}
                                >
                                  {i + 1}
                                </option>
                              )
                            )}
                          </select>
                        </label>
                      )}

                      <strong>
                        {priceValid
                          ? formatMoney(product.price * item.quantity)
                          : '—'}
                      </strong>
                    </div>
                  </article>
                );
              })}

              <Link
                className="dth-cart-continue"
                to="/shop"
              >
                ← Continue shopping
              </Link>
            </div>

            <aside
              className="dth-cart-summary"
              aria-busy={busy}
            >
              <p className="dth-eyebrow">
                {PREVIEW
                  ? 'LOCAL PREVIEW'
                  : 'API / SIMULATED ORDER'}
              </p>

              <h2 ref={summaryHeading} tabIndex={-1}>
                {reviewing
                  ? 'Review your order.'
                  : 'Order summary.'}
              </h2>

              <dl>
                <div>
                  <dt>Subtotal</dt>
                  <dd>
                    {quote ? formatMoney(quote.subtotal) : '—'}
                  </dd>
                </div>

                <div>
                  <dt>Delivery</dt>
                  <dd>Not applicable</dd>
                </div>

                <div className="dth-cart-total">
                  <dt>Demo total</dt>
                  <dd>
                    {quote ? formatMoney(quote.total) : '—'}
                  </dd>
                </div>
              </dl>

              <p className="dth-cart-hint">
                {PREVIEW
                  ? 'This simulation stays in the current page session. No order is saved to a server.'
                  : 'The server checks current prices and vehicle matches before saving a simulated order.'}
              </p>

              {reviewing && (
                <div className="dth-cart-review-note">
                  <strong>
                    {PREVIEW
                      ? 'Preview checkout'
                      : store.user?.email}
                  </strong>

                  <p>
                    No card details, delivery address or real payment
                    are needed.
                  </p>

                  <label className="dth-cart-consent">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      disabled={busy}
                      onChange={e =>
                        setAckFor(
                          e.target.checked ? signature : ''
                        )
                      }
                    />

                    <span>
                      I understand this is a demo: no payment,
                      shipment or real fitment guarantee.
                    </span>
                  </label>
                </div>
              )}

              {(quoteError || error) && (
                <div className="dth-cart-error" role="alert">
                  <p>{quoteError || error}</p>
                  <p>
                    If a request timed out, keep the same bag and retry,
                    or check your account before placing another order.
                  </p>
                </div>
              )}

              {!PREVIEW && store.authLoading ? (
                <p role="status">Checking account…</p>
              ) : !PREVIEW && !store.user ? (
                <Link
                  className="dth-button dth-primary"
                  to="/account?return=/bag"
                >
                  Sign in to continue
                </Link>
              ) : (
                <button
                  type="button"
                  className="dth-button dth-primary"
                  disabled={
                    busy ||
                    !quote ||
                    (reviewing && !acknowledged)
                  }
                  onClick={reviewing ? checkout : review}
                >
                  {busy
                    ? 'Confirming…'
                    : reviewing
                      ? 'Place simulated order'
                      : 'Review order'}

                  <Icon name="arrow" />
                </button>
              )}

              {reviewing && (
                <button
                  type="button"
                  className="dth-button dth-ghost"
                  disabled={busy}
                  onClick={() => {
                    setReviewFor('');
                    setAckFor('');
                  }}
                >
                  Edit bag
                </button>
              )}

              {!PREVIEW && (quoteError || error) && (
                <button
                  type="button"
                  className="dth-text-button"
                  disabled={busy}
                  onClick={store.refresh}
                >
                  Refresh catalog, then review again
                </button>
              )}

              {busy && (
                <p role="status" className="dth-cart-hint">
                  Please wait. Do not close this page.
                </p>
              )}

              <p className="dth-cart-hint">
                Demo limits: 10 per part / vehicle, 20 bag lines.
                These are not stock levels.
              </p>
            </aside>
          </div>
        )}
      </section>
    );
  }

  function Completed() {
    const store = useStore();
    const [params] = useSearchParams();

    const id =
      params.get('order') ||
      store.lastOrder?.id ||
      '';

    const [result, setResult] = useState(null);
    const [attempt, setAttempt] = useState(0);

    const requestKey = `${store.user?.id || ''}:${id}`;

    useEffect(() => {
      if (
        PREVIEW ||
        store.authLoading ||
        !store.user ||
        !id
      ) {
        return;
      }

      let live = true;
      setResult(null);

      loadOrder(id)
        .then(order => {
          if (live) {
            setResult({ key: requestKey, order });
          }
        })
        .catch(e => {
          if (live) {
            setResult({
              key: requestKey,
              error: e.message,
            });
          }
        });

      return () => {
        live = false;
      };
    }, [
      id,
      requestKey,
      store.authLoading,
      attempt,
    ]);

    const current =
      result?.key === requestKey ? result : null;

    const order = PREVIEW
      ? (
          store.lastOrder?.id === id
            ? store.lastOrder
            : null
        )
      : current?.order;

    if (!PREVIEW && store.authLoading) {
      return <div className="dth-empty">Checking account…</div>;
    }

    if (!PREVIEW && !store.user) {
      return (
        <div className="dth-empty">
          <h1>Sign in to view your order.</h1>
          <Link to="/account">Go to account</Link>
        </div>
      );
    }

    if (!id || (PREVIEW && !order)) {
      return (
        <div className="dth-empty">
          <h1>No order in this page session.</h1>
          <p>
            {PREVIEW
              ? 'Local preview results do not survive a full page reload.'
              : 'Choose a saved order from your account.'}
          </p>
          <Link to="/shop">Back to parts</Link>
        </div>
      );
    }

    if (current?.error) {
      return (
        <div className="dth-empty">
          <h1>Could not load this order.</h1>
          <p role="alert">{current.error}</p>

          <button
            className="dth-button dth-primary"
            onClick={() => setAttempt(n => n + 1)}
          >
            Try again
          </button>

          <Link to="/account">View account</Link>
        </div>
      );
    }

    if (!order) {
      return (
        <div className="dth-empty" role="status">
          Loading saved order…
        </div>
      );
    }

    return (
      <section className="dth-container dth-section dth-cart dth-receipt">
        <p className="dth-eyebrow">
          {PREVIEW
            ? 'LOCAL SIMULATION'
            : 'SAVED SIMULATED ORDER'}
        </p>

        <h1>Your demo order is confirmed.</h1>
        <p>
          No money was charged.
          No physical products will be shipped.
        </p>

        <div className="dth-receipt-meta">
          <strong>{order.id}</strong>

          <span>
            {new Date(order.createdAt).toLocaleString('vi-VN')}
          </span>

          <span>
            {PREVIEW
              ? 'Not saved to a server'
              : 'Loaded from your account'}
          </span>
        </div>

        <ul className="dth-receipt-lines">
          {order.lines.map(line => {
            const vehicle = store.data.vehicles.find(
              v => v.id === line.vehicleId
            );

            return (
              <li key={`${line.productId}:${line.vehicleId}`}>
                <div>
                  <h2>{line.name}</h2>
                  <p>
                    {vehicle
                      ? `${vehicle.make} ${vehicle.model} · ${vehicle.year}`
                      : line.vehicleId}
                  </p>
                  <small>
                    {line.quantity} × {formatMoney(line.unitPrice)}
                  </small>
                </div>

                <strong>{formatMoney(line.lineTotal)}</strong>
              </li>
            );
          })}
        </ul>

        <p className="dth-receipt-total">
          <span>Demo total</span>
          <strong>{formatMoney(order.total)}</strong>
        </p>

        <div className="dth-receipt-actions">
          <Link className="dth-button dth-primary" to="/shop">
            Continue exploring
          </Link>

          {!PREVIEW && (
            <Link className="dth-button dth-ghost" to="/account">
              View my orders
            </Link>
          )}
        </div>
      </section>
    );
  }
function Admin() {
  const { user, data, refresh, setNotice } = useStore();
  const [text, setText] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [adminProducts, setAdminProducts] = useState([]);
  useEffect(() => { if (PREVIEW || user?.role !== 'admin') return; let live = true; loadAdminProducts().then(p => live && setAdminProducts(p)).catch(e => live && setError(e.message)); return () => { live = false; }; }, [user]);
  if (PREVIEW || user?.role !== 'admin') return <section className="dth-container dth-section"><h1>Administrator access required.</h1><p>Use API mode and an explicitly seeded admin account. The API also checks the role on every write.</p><Link to="/account">Go to account</Link></section>;
  async function save(e) { e.preventDefault(); setBusy(true); setError(''); try { await saveProduct(JSON.parse(text)); setAdminProducts(await loadAdminProducts()); await refresh(); setNotice('Catalog record saved.'); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <section className="dth-container dth-section"><p className="dth-eyebrow">CATALOG ADMINISTRATION</p><h1>Manage the collection.</h1><p className="dth-muted">Minimal admin editor: create or update a product by ID. Uploading binary assets is not implemented; put GLB and preview files in the frontend public folders first. Use active:false to hide a product. Keep the ID to edit it again.</p><form className="dth-form" onSubmit={save}><label>Load a product (including inactive)<select defaultValue="" onChange={e => { const product = adminProducts.find(p => p.id === e.target.value); if (product) setText(JSON.stringify(product, null, 2)); }}><option value="" disabled>Choose a product to edit or use as a template</option>{adminProducts.map(p => <option key={p.id} value={p.id}>{p.name}{p.active ? '' : ' (inactive)'}</option>)}</select></label><label>Product record (JSON)<textarea className="dth-code-editor" value={text} onChange={e => setText(e.target.value)} spellCheck={false} required /></label><button className="dth-button dth-primary" disabled={busy}>{busy ? 'Saving…' : 'Save product record'}</button>{error && <p role="alert" className="dth-error">{error}</p>}</form></section>;
}
function NotFound() { return <div className="dth-empty"><p className="dth-eyebrow">404 / OFF THE GRID</p><h1>This part of the studio is empty.</h1><Link className="dth-button dth-primary" to="/shop">Back to the collection</Link></div>; }
export default function StoreApp() {
  return <StoreProvider><Routes><Route element={<Shell />}><Route index element={<HomePage />} /><Route path="shop" element={<ShopPage  />} /><Route path="products/:slug" element={<Product />} /><Route path="bag" element={<Bag />} /><Route path="order-complete" element={<Completed />} /><Route path="account" element={<AccountPage />} /><Route path="admin" element={<Admin />} /><Route path="*" element={<NotFound />} /></Route></Routes></StoreProvider>;
}
 