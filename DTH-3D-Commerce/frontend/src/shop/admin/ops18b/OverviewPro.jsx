import {useRef} from 'react';
import {Link} from 'react-router-dom';
import {useStore} from '../../useStore';
import {useSupport} from '../../support/SupportProvider';
import {studioRequest} from '../../api';
import {formatMoney} from '../../../../../shared/domain.mjs';
import useOpsUI,{useOpsEntrance,useResource} from './useOpsUI';
import {coverage,relativeTime,sortRows,metrics} from './opsPro.logic.mjs';
import {Topbar,Hero,Value,SectionTitle,ResourceState,Empty,usePageTitle} from './ProShared';
import ProIcon from './ProIcon';
import s from './adminPro.module.css';
const cards=[['openChats','Open conversations','inbox','/admin/inbox?status=open'],['active','Visible products','cube','/admin/products?active=true'],['orders','Demo orders','order','/admin/orders'],['vehicles','NVX versions','vehicle','/admin/vehicles']];
export default function OverviewPro(){
  const store=useStore(),support=useSupport(),ui=useOpsUI(),root=useRef(null);
  const overview=useResource('/admin/studio/overview',support.revision,studioRequest,store.user?.id);
  const queue=useResource('/chat/conversations?page=1',support.revision,studioRequest,store.user?.id);
  const orders=useResource('/admin/studio/orders?page=1',0,studioRequest,store.user?.id);
  const stats=overview.data?.data,catalog=coverage(stats),rows=queue.data?.data||[],recent=sortRows(rows,'unread').slice(0,5),q=metrics(rows);
  usePageTitle('Overview');useOpsEntrance(root,ui.motion);
  return <div ref={root} className={s.root} data-admin-pro="overview" data-motion={ui.motion?'on':'off'}>
    <Topbar label="Overview" ui={ui} status={support.status}><button type="button" className={s.iconButton} aria-label="Refresh dashboard" onClick={()=>{overview.reload();queue.reload();orders.reload();}}><ProIcon name="refresh"/></button></Topbar>
    <Hero ui={ui} status={support.status}/>
    <ResourceState resource={{...overview,data:overview.data||{}}} label="metrics"/>
    <div className={s.metricGrid} data-pro-enter>{cards.map(([key,label,icon,to],i)=><Link className={s.metric} data-primary={i===0} key={key} to={to}>
      <div><span>{label}</span><ProIcon name={icon}/></div><Value value={stats?.[key]} motion={ui.motion}/><span className={s.metricFoot}>{i===0?'Open, not necessarily unread':i===2?'Simulation only':'Current total'}<ProIcon name="arrow" size={15}/></span>
    </Link>)}</div>
    <div className={s.overviewGrid}>
      <section className={s.panel} data-pro-enter><SectionTitle title="Conversation queue" aside={<Link to="/admin/inbox">Open inbox <ProIcon name="arrow" size={14}/></Link>}/>
        <div className={s.panelMeta}><span>{queue.data?`${rows.length} recent threads loaded`:'Waiting for support data'}</span><span>{queue.data?`${q.unread} unread on this page`:'—'}</span></div>
        <ResourceState resource={queue} label="queue"/>
        {queue.data&&!rows.length&&<Empty title="Ready for the next conversation">Customer messages will appear here. No sample conversations are inserted.</Empty>}
        {recent.map(c=><Link key={c.id} to={`/admin/inbox?thread=${encodeURIComponent(c.id)}`} className={s.queuePreview}><span className={s.avatar}>{(c.customer?.email||'?')[0].toUpperCase()}</span><span className={s.previewCopy}><strong>{c.customer?.email||'Customer'}</strong><small>{c.lastPreview||'Conversation started'}</small></span><span className={s.previewEnd}><time>{relativeTime(c.lastMessageAt||c.updatedAt)}</time><b data-new={c.unread>0}>{c.unread>0?`${c.unread} new`:c.status==='resolved'?'Resolved':'Open'}</b></span></Link>)}
      </section>
      <section className={`${s.panel} ${s.catalogPanel}`} data-pro-enter><SectionTitle title="Catalog visibility" aside={<ProIcon name="cube"/>}/>
        <div className={s.catalogVisual}><svg viewBox="0 0 160 160" role="img" aria-label={catalog.percent===null?'Catalog data unavailable':`${catalog.percent} percent of products visible`}><circle className={s.ringTrack} cx="80" cy="80" r="65"/><circle className={s.ringFill} cx="80" cy="80" r="65" pathLength="100" strokeDasharray={`${catalog.percent||0} 100`} transform="rotate(-90 80 80)"/></svg><div><strong>{catalog.percent===null?'—':`${catalog.percent}%`}</strong><span>visible in Shop</span></div></div>
        <div className={s.legend}><span><i/>{catalog.active??'—'} visible</span><span><i/>{catalog.hidden??'—'} hidden</span></div><p className={s.note}>{catalog.total===0?'No products in the catalog yet.':'Visibility does not verify assets or real-world fitment.'}</p><Link className={s.panelAction} to="/admin/products">Review catalog <ProIcon name="arrow"/></Link>
      </section>
      <section className={`${s.panel} ${s.ordersPanel}`} data-pro-enter><SectionTitle title="Recent demo orders" aside={<Link to="/admin/orders">All orders <ProIcon name="arrow" size={14}/></Link>}/>
        <ResourceState resource={orders} label="orders"/>
        {orders.data&&!orders.data.data?.length&&<Empty title="No orders yet">Recorded checkout simulations will appear here.</Empty>}
        {(orders.data?.data||[]).slice(0,4).map(o=><Link className={s.orderRow} key={o.id} to={`/admin/orders/${encodeURIComponent(o.id)}`}><span className={s.orderIcon}><ProIcon name="order"/></span><span><strong>{o.id}</strong><small>{relativeTime(o.createdAt)} · Simulated</small></span><b>{formatMoney(o.total)}</b><ProIcon name="chevron" size={15}/></Link>)}
      </section>
      <section className={`${s.panel} ${s.nextPanel}`} data-pro-enter><span className={s.eyebrow}>NEXT ACTION</span><h2>Keep the studio<br/>moving.</h2><p>One place for your catalog and customer care.</p><Link to="/admin/products/new">Open product editor <ProIcon name="arrow"/></Link><Link to="/admin/inbox?status=open">Review open conversations <ProIcon name="arrow"/></Link></section>
    </div><p className={s.footerNote}>Operational data from your API. Orders are simulated; no revenue is implied.</p>
  </div>;
}
