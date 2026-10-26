import { Link } from 'react-router-dom';
import { formatMoney } from '../../../../../shared/domain.mjs';
import { relativeTime } from '../ops18b/opsPro.logic.mjs';
import { ResourceState, Value } from '../ops18b/ProShared';
import PremiumAction213 from './PremiumAction213.jsx';
import PremiumIcon213 from './PremiumIcon213.jsx';

const metricIcon = { inbox: 'inbox', cube: 'products', order: 'orders', vehicle: 'vehicles' };
const metricLabel = { openChats: 'Open conversations', active: 'Visible products', orders: 'Demo orders', vehicles: 'NVX versions' };
const caption = key => key === 'openChats' ? 'Open, not necessarily unread' : key === 'orders' ? 'Simulated checkouts' : key === 'vehicles' ? 'In the catalog' : 'Visible in shop';

/** View only. All resources, derived values, reload callbacks and sorting stay in OverviewPro. */
export default function PremiumOverview213({ root, ui, overview, queue, orders, stats, catalog, rows, recent, q, cards }) {
  return <div ref={root} className="p213-overview" data-admin-pro="overview" data-motion={ui.motion ? 'on' : 'off'}>
    <header className="p213-heading"><h1>Overview<span>.</span></h1><div>
      <PremiumAction213 to="/admin/ai-assets">AI Assets <PremiumIcon213 name="ai" size={16}/></PremiumAction213>
      <PremiumAction213 to="/admin/products/new" tone="primary">Add product <PremiumIcon213 name="plus" size={17}/></PremiumAction213>
    </div></header>
    <div className="p213-resource"><ResourceState resource={{ ...overview, data: overview.data || {} }} label="metrics"/></div>
    <div className="p213-metrics" aria-label="Current totals" aria-busy={overview.busy}>
      {cards.map(([key, label, icon, to], index) => <Link key={key} to={to} className="p213-metric-hit" data-premium-tilt aria-label={metricLabel[key] || label}>
        <div className="p213-metric" data-premium-tilt-inner data-primary={index === 0}>
          <span className="p213-metric-label">{metricLabel[key] || label}</span>
          <span className="p213-metric-object" aria-hidden="true"><i/><PremiumIcon213 name={metricIcon[icon]} size={30}/></span>
          <div className="p213-metric-value"><Value value={stats?.[key]} motion={ui.motion}/></div>
          <div className="p213-metric-bottom"><span>{caption(key)}</span><PremiumIcon213 name="diagonal" size={16}/></div>
        </div>
      </Link>)}
    </div>
    <div className="p213-dashboard-grid">
      <section className="p213-panel p213-conversations">
        <div className="p213-section-title"><h2>Conversation queue</h2><Link to="/admin/inbox">Open inbox <PremiumIcon213 name="diagonal" size={15}/></Link></div>
        <div className="p213-panel-meta"><span>{queue.data ? `${rows.length} recent threads loaded` : 'Loading conversations'}</span><span>{queue.data ? `${q.unread} unread threads on this page` : '—'}</span></div>
        <div className="p213-resource"><ResourceState resource={queue} label="queue"/></div>
        {queue.data && !rows.length && <div className="p213-empty"><PremiumIcon213 name="inbox" size={27}/><h3>No conversations yet</h3><p>Customer messages will appear here.</p></div>}
        <div className="p213-queue-list">{recent.map(c => <Link key={c.id} to={`/admin/inbox?thread=${encodeURIComponent(c.id)}`} className="p213-queue-row">
          <span className="p213-customer-avatar" aria-hidden="true">{(c.customer?.email || '?')[0].toUpperCase()}</span>
          <span className="p213-queue-copy"><strong>{c.customer?.email || 'Customer'}</strong><small>{c.lastPreview || 'Conversation started'}</small></span>
          <span className="p213-queue-end"><time>{relativeTime(c.lastMessageAt || c.updatedAt)}</time><b data-new={c.unread > 0}>{c.unread > 0 ? `${c.unread} new` : c.status === 'resolved' ? 'Resolved' : 'Open'}</b></span>
          <PremiumIcon213 name="chevron" size={14}/>
        </Link>)}</div>
      </section>
      <section className="p213-panel p213-visibility">
        <div className="p213-section-title"><h2>Catalog visibility</h2><PremiumIcon213 name="products" size={19}/></div>
        <div className="p213-dial">
          <svg viewBox="0 0 180 180" role="img" aria-label={catalog.percent === null ? 'Catalog data unavailable' : `${catalog.percent} percent of products visible`}>
            <circle className="p213-dial-track" cx="90" cy="90" r="73"/>
            <circle className="p213-dial-fill" cx="90" cy="90" r="73" pathLength="100" strokeDasharray={`${catalog.percent || 0} 100`} transform="rotate(-90 90 90)"/>
          </svg><div><strong>{catalog.percent === null ? '—' : `${catalog.percent}%`}</strong><span>visible in shop</span></div>
        </div>
        <div className="p213-legend"><span><i/>{catalog.active ?? '—'} visible</span><span><i/>{catalog.hidden ?? '—'} hidden</span></div>
        <p className="p213-note">{catalog.total === 0 ? 'No products in the catalog yet.' : 'Visibility is not a fitment or asset check.'}</p>
        <Link className="p213-panel-link" to="/admin/products">Review catalog <PremiumIcon213 name="arrow" size={17}/></Link>
      </section>
      <section className="p213-panel p213-orders">
        <div className="p213-section-title"><h2>Recent demo orders</h2><Link to="/admin/orders">All orders <PremiumIcon213 name="diagonal" size={15}/></Link></div>
        <div className="p213-resource"><ResourceState resource={orders} label="orders"/></div>
        {orders.data && !orders.data.data?.length && <div className="p213-empty"><PremiumIcon213 name="orders" size={27}/><h3>No orders yet</h3><p>Recorded checkout simulations will appear here.</p></div>}
        {orders.data?.data?.length > 0 && <div className="p213-table-scroll" tabIndex={0} role="region" aria-label="Recent demo orders table"><table className="p213-order-table">
          <thead><tr><th scope="col">Order</th><th scope="col">Created</th><th scope="col">Mode</th><th scope="col">Total</th><th scope="col"><span className="p213-sr">Open order</span></th></tr></thead>
          <tbody>{orders.data.data.slice(0, 4).map(o => <tr key={o.id}><td><Link to={`/admin/orders/${encodeURIComponent(o.id)}`}>{o.id}</Link></td><td>{relativeTime(o.createdAt)}</td><td><span className="p213-tag">Simulated</span></td><td>{formatMoney(o.total)}</td><td><Link to={`/admin/orders/${encodeURIComponent(o.id)}`} aria-label={`Open order ${o.id}`}><PremiumIcon213 name="diagonal" size={16}/></Link></td></tr>)}</tbody>
        </table></div>}
      </section>
    </div>
    <nav className="p213-shortcuts" aria-label="Workspace shortcuts">
      <Link to="/admin/ai-assets"><span className="p213-shortcut-icon"><PremiumIcon213 name="ai" size={23}/></span><span><strong>AI Assets</strong><small>References to 3D</small></span><PremiumIcon213 name="diagonal" size={17}/></Link>
      <Link to="/admin/products"><span className="p213-shortcut-icon"><PremiumIcon213 name="products" size={23}/></span><span><strong>Products</strong><small>Catalog & 3D setup</small></span><PremiumIcon213 name="diagonal" size={17}/></Link>
      <Link to="/admin/experience"><span className="p213-shortcut-icon"><PremiumIcon213 name="experience" size={23}/></span><span><strong>Experience</strong><small>Home presentation</small></span><PremiumIcon213 name="diagonal" size={17}/></Link>
    </nav>
    <p className="p213-footer-note">Operational data from your API. Orders are simulated; no revenue is implied.</p>
  </div>;
}
