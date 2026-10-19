import { Link } from 'react-router-dom';
import useAdminData from '../useAdminData';
import { useSupport } from '../../support/SupportProvider';
import { catalogCoverage, queueMetrics, relativeTime, safeCount, threadHref } from './ops.logic.mjs';
import styles from './ops18.module.css';

const tiles = [
  { key: 'openChats', label: 'Open conversations', path: '/admin/inbox?status=open', mark: '↗', subtitle: 'Needs a response' },
  { key: 'active', label: 'Visible products', path: '/admin/products?active=true', mark: '◈', subtitle: 'Available in Shop' },
  { key: 'orders', label: 'Demo orders', path: '/admin/orders', mark: '◇', subtitle: 'Recorded orders' },
  { key: 'vehicles', label: 'NVX versions', path: '/admin/vehicles', mark: '⌁', subtitle: 'Published models' },
];

function PulseArt() {
  return <div className={styles.pulseArt} aria-hidden="true">
    <div className={styles.pulseHalo}/><div className={styles.pulseRingOuter}/>
    <div className={styles.pulseRingInner}/><div className={styles.pulseOrb}>
      <i/><i/><b>DTH</b><span>OPERATIONS / 01</span>
    </div>
    <span className={`${styles.pulseTag} ${styles.pulseTagOne}`}>CUSTOMER CARE</span>
    <span className={`${styles.pulseTag} ${styles.pulseTagTwo}`}>COMMERCE SYSTEM</span>
    <span className={styles.pulseBaseline}/>
  </div>;
}
function MetricCard({tile,value,index}) {
  return <Link className={styles.metricCard} to={tile.path} style={{'--ops-order': index}}>
    <div className={styles.metricTop}><span>{tile.label}</span><b aria-hidden="true">{tile.mark}</b></div>
    <strong className={styles.metricValue}>{safeCount(value) ?? '—'}</strong>
    <div className={styles.metricFoot}><span>{tile.subtitle}</span><span aria-hidden="true">↗</span></div>
  </Link>;
}
function RecentQueue({list,loading,error,onRetry}) {
  const entries = list?.data || [];
  const summary = queueMetrics(entries);
  return <section className={styles.queuePanel} aria-labelledby="ops18-queue-title">
    <div className={styles.sectionHead}>
      <div><span className={styles.microLabel}>CUSTOMER SUPPORT</span><h2 id="ops18-queue-title">The live queue<span className={styles.titleAccent}>.</span></h2></div>
      <Link to="/admin/inbox" className={styles.sectionLink}>Open inbox <span aria-hidden="true">↗</span></Link>
    </div>
    <div className={styles.queueOverview}><span>{list ? `${summary.loaded} recent threads shown` : 'Recent threads'}</span><span>{list ? `${summary.unreadThreads} with unread messages` : 'Waiting for data'}</span></div>
    {error && <div className={styles.panelError} role="alert">{error} <button type="button" onClick={onRetry}>Retry</button></div>}
    {!list && !error && <p className={styles.dataPlaceholder} role="status">Loading the conversation queue…</p>}
    {list && !entries.length && <div className={styles.queueEmpty}><span aria-hidden="true">◎</span><strong>No conversations yet</strong><p>Customer messages will appear here when they reach the support inbox.</p></div>}
    {entries.slice(0,5).map(item => <Link className={styles.queueEntry} key={item.id} to={threadHref(item.id)}>
      <span className={styles.queueAvatar} aria-hidden="true">{(item.customer?.email || '?')[0].toUpperCase()}</span>
      <span className={styles.queueText}><strong>{item.customer?.email || 'Customer'}</strong><small>{item.lastPreview || 'Conversation started'}</small></span>
      <span className={styles.queueEnd}><small>{relativeTime(item.lastMessageAt || item.updatedAt)}</small><span data-unread={item.unread > 0}>{item.unread > 0 ? `${item.unread} new` : item.status === 'resolved' ? 'Resolved' : 'Open'}</span></span>
    </Link>)}
  </section>;
}
export default function OverviewStudio() {
  const support = useSupport();
  const overview = useAdminData('/admin/studio/overview', support.revision);
  const conversations = useAdminData('/chat/conversations?page=1', support.revision);
  const stats = overview.data?.data;
  const coverage = catalogCoverage(stats);
  return <div className={`dth-admin-enter ${styles.overview}`} data-ops18-dashboard>
    <div className={styles.topline}><span>ADMIN STUDIO <i/> OPERATIONS</span><span className={styles.connection} data-live={support.status === 'live'}><i/>{support.status === 'live' ? 'Support connected' : support.status === 'offline' ? 'Support offline' : 'Support reconnecting'}</span></div>
    <section className={styles.hero} aria-labelledby="ops18-heading">
      <div className={styles.heroCopy}><span className={styles.overline}>DTH / CONTROL ROOM</span>
        <h1 id="ops18-heading">Everything<br/>in motion<span>.</span></h1>
        <p>A single view of customer conversations, your catalog and demo orders.</p>
        <div className={styles.heroActions}><Link className={styles.heroPrimary} to="/admin/inbox">Open support inbox <span aria-hidden="true">↗</span></Link><Link className={styles.heroSecondary} to="/admin/products">Manage products <span aria-hidden="true">↗</span></Link></div>
      </div>
      <PulseArt/>
    </section>
    {overview.error && <div className={styles.panelError} role="alert">Overview couldn't load: {overview.error} <button type="button" onClick={overview.reload}>Retry</button></div>}
    <div className={styles.metrics} aria-label="Current operational metrics">
      {tiles.map((tile,i) => <MetricCard key={tile.key} tile={tile} index={i} value={stats?.[tile.key]}/>)}
    </div>
    <div className={styles.overviewColumns}>
      <RecentQueue list={conversations.data} loading={!conversations.data} error={conversations.error} onRetry={conversations.reload}/>
      <section className={styles.catalogPanel} aria-labelledby="ops18-catalog-title">
        <div className={styles.sectionHead}><div><span className={styles.microLabel}>CATALOG STATUS</span><h2 id="ops18-catalog-title">Ready for the floor<span className={styles.titleAccent}>.</span></h2></div></div>
        <div className={styles.coverageArt} style={{'--ops-fill': `${coverage.percent ?? 0}%`}}>
          <div className={styles.coverageInner}><strong>{coverage.percent === null ? '—' : `${coverage.percent}%`}</strong><span>visible products</span></div>
        </div>
        <p className={styles.coverageCaption}>{coverage.total === null ? 'Catalog metrics are loading.' : `${coverage.active ?? '—'} of ${coverage.total} products currently visible in Shop.`}</p>
        <div className={styles.catalogActions}><Link to="/admin/products/new">Open product editor <span aria-hidden="true">↗</span></Link><Link to="/admin/orders">Review orders <span aria-hidden="true">↗</span></Link></div>
      </section>
    </div>
    <div className={styles.bottomNote}><span>Built for decisions, not decoration.</span><Link to="/shop">View storefront ↗</Link></div>
  </div>;
}
