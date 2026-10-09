import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { studioRequest } from '../../api';
import { useStore } from '../../useStore';
import { useSupport } from '../../support/SupportProvider';
import ChatThread from '../../support/ChatThread';
import useAdminData from '../useAdminData';
import { formatMoney } from '../../../../../shared/domain.mjs';
import { prioritizeRows, queueMetrics, relativeTime } from './ops.logic.mjs';
import styles from './ops18.module.css';

function CustomerContext({ id, onClose }) {
  const { data, error, reload } = useAdminData(`/chat/conversations/${id}/context`);
  const info = data?.data;
  const email = info?.customer?.email || 'Customer';
  return <aside id="ops18-customer-context" className={`dth-inbox-context ${styles.customerContext}`} aria-label="Customer context">
    <div className={styles.contextTop}><span className={styles.microLabel}>CUSTOMER PROFILE</span><button className={styles.contextClose} type="button" onClick={onClose} aria-label="Close customer context">×</button></div>
    {error ? <div className={styles.panelError} role="alert">{error}<button type="button" onClick={reload}>Retry</button></div>
      : !info ? <p className={styles.dataPlaceholder} role="status">Loading customer details…</p>
      : <><div className={styles.contextAvatar} aria-hidden="true">{email[0].toUpperCase()}</div><h3>{email}</h3>
        <span className={styles.contextLabel}>SELECTED RIDE</span><p className={styles.contextVehicle}>{info.vehicle ? `${info.vehicle.make} ${info.vehicle.model}` : 'No saved vehicle'}</p>
        <span className={styles.contextLabel}>RECENT DEMO ORDERS</span><div className={styles.contextOrders}>
          {info.orders.length ? info.orders.map(order => <Link key={order.id} to={`/admin/orders/${encodeURIComponent(order.id)}`}><span>{order.id}</span><strong>{formatMoney(order.total)} ↗</strong></Link>) : <p>No recorded orders.</p>}
        </div></>}
  </aside>;
}

const tabs = [['', 'All'], ['open', 'Open'], ['resolved', 'Resolved']];
export default function InboxStudio() {
  const [params, setParams] = useSearchParams();
  const store = useStore(), support = useSupport();
  const id = params.get('thread') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const status = params.get('status') || '';
  const q = params.get('q') || '';
  const [draft, setDraft] = useState(q);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [meta, setMeta] = useState(null);
  const [priority, setPriority] = useState('recent'), [contextOpen, setContextOpen] = useState(false);
  useEffect(() => setDraft(q), [q]);
  useEffect(() => setContextOpen(false), [id]);
  const query = new URLSearchParams({ page: String(page), ...(status ? { status } : {}), ...(q ? { q } : {}) });
  const result = useAdminData(`/chat/conversations?${query}`, support.revision);
  const rows = result.data?.data || [];
  const metrics = queueMetrics(rows);
  const ordered = prioritizeRows(rows, priority);
  const chosen = meta?.id === id ? meta : rows.find(conversation => conversation.id === id);
  function change(values, clearThread = false) {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key,value]) => value ? next.set(key, String(value)) : next.delete(key));
    if (clearThread) next.delete('thread');
    setParams(next);
  }
  async function toggleResolved() {
    if (busy || !chosen) return;
    const next = chosen.status === 'resolved' ? 'open' : 'resolved';
    setBusy(true);setError('');
    try {
      await studioRequest(`/chat/conversations/${encodeURIComponent(id)}/status`, { method: 'PUT', body: JSON.stringify({ status: next }) });
      setMeta(previous => previous?.id === id ? { ...previous, status: next } : previous);
      support.refresh(); result.reload();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <div className={`dth-admin-enter ${styles.inboxPage}`} data-ops18-inbox>
    <div className={styles.topline}><span>CUSTOMER CARE <i/> CONVERSATION HUB</span><span className={styles.connection} data-live={support.status === 'live'}><i/>{support.status === 'live' ? 'Live connection' : support.status === 'offline' ? 'Offline' : 'Reconnecting'}</span></div>
    <header className={styles.inboxHero}><div><span className={styles.overline}>DTH / SUPPORT STUDIO</span><h1>Every message<br/><em>matters.</em></h1><p>Find the right conversation. Keep the context. Make every reply count.</p></div>
      <div className={styles.inboxHeroArt} aria-hidden="true"><span>↗</span><i/><i/><i/></div></header>
    <div className={styles.inboxStats} aria-label="Conversations on the current results page">
      <div><span>RESULTS</span><strong>{result.data ? result.data.total : '—'}</strong><small>matching threads, all pages</small></div>
      <div><span>OPEN ON THIS PAGE</span><strong>{result.data ? metrics.open : '—'}</strong><small>visible in the current page</small></div>
      <div><span>UNREAD ON THIS PAGE</span><strong>{result.data ? metrics.unreadThreads : '—'}</strong><small>threads with new messages</small></div>
    </div>
    <div className={`dth-inbox ${styles.inboxShell}`} data-selected={!!id} data-context-open={contextOpen}>
      <aside className={`dth-inbox-list ${styles.listPanel}`} aria-label="Conversation queue">
        <div className={styles.queueHeader}><div><strong>Conversation queue</strong><small>{result.data ? `${rows.length} loaded on this page` : 'Loading queue'}</small></div><button type="button" onClick={() => { result.reload();support.refresh(); }} aria-label="Refresh conversations" title="Refresh">↻</button></div>
        <form className={styles.queueSearch} onSubmit={event => {event.preventDefault();change({ q: draft.trim(), page: '' }, true);}}><label className="dth-chat-sr" htmlFor="ops18-search">Find customer by email</label><input id="ops18-search" type="search" placeholder="Search customer email" maxLength={100} value={draft} onChange={event => setDraft(event.target.value)}/><button type="submit" aria-label="Search conversations">⌕</button></form>
        <div className={styles.queueFilters} role="group" aria-label="Conversation status filters">{tabs.map(([value, label]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => change({ status: value, page: '' }, true)}>{label}</button>)}</div>
        <div className={styles.queueSort}><label htmlFor="ops18-sort">ORDER THIS PAGE</label><select id="ops18-sort" value={priority} onChange={event => setPriority(event.target.value)}><option value="recent">Most recent</option><option value="unread">Unread first</option></select></div>
        <div className={styles.queueRows}>
          {result.error && <div className={styles.panelError} role="alert">{result.error}<button type="button" onClick={result.reload}>Retry</button></div>}
          {!result.data && !result.error && <div className={styles.dataPlaceholder} role="status">Fetching conversations…</div>}
          {result.data && !rows.length && <div className={styles.noThreads}><span aria-hidden="true">◎</span><h3>Queue is clear.</h3><p>No conversations match these filters.</p>{(q || status) && <button type="button" onClick={() => {setDraft('');change({q:'',status:'',page:''},true);}}>Clear filters</button>}</div>}
          {ordered.map(conversation => <button type="button" className={styles.threadItem} key={conversation.id} data-active={id === conversation.id} data-unread={conversation.unread > 0} aria-current={id === conversation.id ? 'true' : undefined} onClick={() => change({thread:conversation.id})}>
            <span className={styles.threadAvatar} aria-hidden="true">{(conversation.customer?.email || '?')[0].toUpperCase()}</span>
            <span className={styles.threadCopy}><strong>{conversation.customer?.email || 'Customer'}</strong><small>{conversation.lastPreview || 'Conversation started'}</small><em>{conversation.status === 'resolved' ? '✓ Resolved' : '● Open'}</em></span>
            <span className={styles.threadAside}><small>{relativeTime(conversation.lastMessageAt || conversation.updatedAt)}</small>{conversation.unread > 0 && <b>{conversation.unread > 99 ? '99+' : conversation.unread}</b>}</span>
          </button>)}
        </div>
        {result.data?.total > 30 && <div className={styles.queuePagination}><button type="button" disabled={page === 1} onClick={() => change({page:page-1,thread:''})}>← Prev</button><span>Page {page}</span><button type="button" disabled={page * 30 >= result.data.total} onClick={() => change({page:page+1,thread:''})}>Next →</button></div>}
        <div className={styles.queueFoot}><span aria-hidden="true">●</span> Replies are stored in the existing support system.</div>
      </aside>
      <section className={`dth-inbox-thread ${styles.threadPanel}`} aria-label="Selected conversation">
        {!id ? <div className={styles.threadEmpty}><div className={styles.threadEmptyOrb} aria-hidden="true"><span>◎</span></div><span className={styles.microLabel}>THE CONVERSATION SPACE</span><h2>Listen closer.<br/>Respond better.</h2><p>Select a customer from the queue to view messages, images and the conversation timeline.</p></div>
          : <><header className={styles.threadHeading}><button className={styles.backButton} aria-label="Back to conversations" type="button" onClick={() => change({thread:''})}>←</button><div className={styles.threadHeadingLabel}><span className={styles.microLabel}>ACTIVE THREAD</span><strong>{chosen?.customer?.email || 'Conversation'}</strong><small>{chosen?.status === 'resolved' ? 'Resolved — customer replies can reopen' : 'Customer support'}</small></div><div className={styles.threadActions}><button type="button" className={styles.contextButton} aria-controls="ops18-customer-context" aria-expanded={contextOpen} onClick={() => setContextOpen(value => !value)}>Customer</button><button type="button" className={styles.resolveButton} disabled={busy || !chosen} onClick={toggleResolved}>{busy ? 'Saving…' : chosen?.status === 'resolved' ? '↶ Reopen' : '✓ Resolve'}</button></div></header>
          {error && <div className={styles.panelError} role="alert">{error}</div>}
          <ChatThread key={`${store.user.id}:${id}`} conversationId={id} onMeta={setMeta}/></>}
      </section>
      {id && <CustomerContext key={id} id={id} onClose={() => setContextOpen(false)}/>}
    </div>
    <div className={styles.bottomNote}><span>Customer messages and order history come from the live API.</span><Link to="/admin">Back to overview ↗</Link></div>
  </div>;
}
