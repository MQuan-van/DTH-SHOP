import {useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {useStore} from '../../useStore';
import {useSupport} from '../../support/SupportProvider';
import {studioRequest} from '../../api';
import ChatThread from '../../support/ChatThread';
import {formatMoney} from '../../../../../shared/domain.mjs';
import useOpsUI,{useOpsEntrance,useResource} from './useOpsUI';
import {metrics,readQuery,sortRows,relativeTime,stamp,vehicleName} from './opsPro.logic.mjs';
import {Topbar,Hero,Value,SectionTitle,ResourceState,ErrorPanel,Empty,usePageTitle} from './ProShared';
import ProIcon from './ProIcon';
import ReplyTools from './ReplyTools';
import s from './adminPro.module.css';
import calm from './adminCalm19B.module.css';
import kinetic from './adminKinetic19C.module.css';
import useInboxKinetics from './useInboxKinetics';
function CustomerPanel({id,identity,revision}){
  const resource=useResource(`/chat/conversations/${encodeURIComponent(id)}/context`,revision,studioRequest,identity),data=resource.data?.data;
  return <div className={s.customerInner}><span className={s.eyebrow}>CUSTOMER CONTEXT</span><ResourceState resource={resource} label="customer"/>{data&&<>
    <div className={s.customerAvatar}>{(data.customer?.email||'?')[0].toUpperCase()}</div><h3>{data.customer?.email||'Customer'}</h3>
    <div className={s.customerRide}><ProIcon name="vehicle"/><span><small>ACCOUNT DEFAULT</small><strong>{vehicleName(data.vehicle)}</strong></span></div>
    <h4>Recent demo orders</h4>{!data.orders?.length?<p className={s.note}>No recorded orders.</p>:(data.orders||[]).map(o=><Link key={o.id} className={s.customerOrder} to={`/admin/orders/${encodeURIComponent(o.id)}`}><span>{o.id}</span><strong>{formatMoney(o.total)} <ProIcon name="arrow" size={12}/></strong><time>{relativeTime(o.createdAt)}</time></Link>)}
    <p className={s.contextDisclaimer}>The saved vehicle is account context, not a fitment guarantee.</p>
  </>}</div>;
}
function ContextDialog({id,identity,revision,onClose}){
  const ref=useRef(null),previous=useRef(null);
  useEffect(()=>{previous.current=document.activeElement;const d=ref.current;d.showModal();return()=>{if(d.open)d.close();if(previous.current?.isConnected)previous.current.focus();};},[]);
  return <dialog className={s.contextDialog} ref={ref} aria-label="Customer context" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><button className={s.dialogClose} autoFocus type="button" onClick={onClose} aria-label="Close customer context"><ProIcon name="close"/></button><CustomerPanel id={id} identity={identity} revision={revision}/></dialog>;
}
export default function InboxPro(){
  const store=useStore(),support=useSupport(),ui=useOpsUI(),[params,setParams]=useSearchParams(),root=useRef(null);
  const {id,q,page,status,invalidThread}=readQuery(params),identity=store.user?.id;
  const [draft,setDraft]=useState(q),[order,setOrder]=useState('recent'),[meta,setMeta]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const [contextOpen,setContextOpen]=useState(false);const alive=useRef(false),operation=useRef(0),lock=useRef(false),currentId=useRef(id);currentId.current=id;
  const query=new URLSearchParams({page:String(page),...(q?{q}:{}),...(status?{status}:{})});
  const result=useResource(`/chat/conversations?${query}`,support.revision,studioRequest,identity),rows=result.data?.data||[],numbers=metrics(rows),ordered=sortRows(rows,order);
  const listed=rows.find(c=>c.id===id),snapshot=meta?.id===id?meta:null;
  const chosen=snapshot&&(!listed||stamp(snapshot.updatedAt)>stamp(listed.updatedAt))?snapshot:listed;
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;operation.current++;};},[]);
  useEffect(()=>{setDraft(q);},[q]);
  useEffect(()=>{operation.current++;lock.current=false;setBusy(false);setError('');setNotice('');setMeta(null);setContextOpen(false);},[id,identity]);
  usePageTitle('Inbox');useOpsEntrance(root,ui.motion);useInboxKinetics(root,id,ui.motion);
  function change(values,clearThread=false){const next=new URLSearchParams(params);Object.entries(values).forEach(([k,v])=>v?next.set(k,String(v)):next.delete(k));if(clearThread)next.delete('thread');setParams(next);}
  async function resolve(){
    if(lock.current||!chosen||!id)return;lock.current=true;setBusy(true);setError('');setNotice('');
    const token=++operation.current,epoch=store.getIdentityEpoch?.(),target=id,next=chosen.status==='resolved'?'open':'resolved';
    const valid=()=>alive.current&&token===operation.current&&currentId.current===target&&epoch===store.getIdentityEpoch?.();
    try{await studioRequest(`/chat/conversations/${encodeURIComponent(target)}/status`,{method:'PUT',body:JSON.stringify({status:next})});
      if(!valid())return;setMeta(null);setNotice(next==='resolved'?'Conversation resolved.':'Conversation reopened.');support.refresh();result.reload();
    }catch(e){if(valid())setError(e.message||'Could not update conversation.');}
    finally{if(valid()){lock.current=false;setBusy(false);}}
  }
  return <div ref={root} className={`${s.root} ${calm.inboxRoot} ${kinetic.root}`} data-admin-pro="inbox" data-motion={ui.motion?'on':'off'}>
    <Topbar label="Inbox" status={support.status}>
      <Link className={calm.backToOverview} to="/admin" aria-label="Back to Admin overview"><ProIcon name="back" size={16}/><span>Overview</span></Link>
      <Link className={calm.siteHome} data-website-home to="/" aria-label="Go to website home">Website home <ProIcon name="arrow" size={13}/></Link>
      <button type="button" className={s.focusButton} aria-pressed={ui.focus} onClick={()=>ui.setFocus(!ui.focus)}><ProIcon name="focus" size={16}/>{ui.focus?'Exit focus':'Focus inbox'}</button>
    </Topbar>
    <Hero inbox ui={ui} status={support.status}/>
    {/* <section className={`${calm.inboxLead} ${kinetic.lead}`} data-pro-enter data-inbox-lead aria-label="Support workspace introduction">
      <div><span className={calm.leadEyebrow}>SUPPORT / WORKSPACE</span><h2>Every rider. Every detail.</h2><p>Find a conversation, review the context, and reply with confidence.</p></div>
      <div className={kinetic.signal} aria-hidden="true"><i/><i/><i/><i/><i/></div>
    </section> */}
    <div className={`${s.inboxSummary} ${calm.inboxSummary}`} data-inbox-summary aria-label="Queue metrics" data-pro-enter><div>
      {/* <span>Matching conversations
        <small>
          All results pages
        </small>
      </span> */}
      {/* <Value value={result.data?.total} motion={ui.motion}/> */}
    </div>
    <div>
      {/* <span>Open
        <small>
          Current results page
        </small>
       </span> */}
      {/* <Value value={result.data?numbers.open:null} motion={ui.motion}/> */}
    </div>
    <div>
      {/* <span>Unread conversations
        <small>
          Current results page
        </small>
      </span> */}
      {/* <Value value={result.data?numbers.unread:null} motion={ui.motion}/> */}
    </div>
    </div>
    <div className={`${s.workspace} ${calm.workspace}`} data-inbox-workspace data-selected={!!id} data-pro-enter>
      <aside className={`${s.queue} ${calm.queue}`} aria-label="Conversation queue"><div className={`${s.queueTop} ${calm.queueTop}`}><div className={calm.queueHeading}><span>SUPPORT QUEUE</span><h2>Conversations</h2></div><span className={calm.queueCount} title="Matching conversations across all pages">{result.data?.total??'—'}</span></div>
        <form className={`${s.queueSearch} ${calm.queueSearch}`} onSubmit={e=>{e.preventDefault();change({q:draft.trim(),page:''},true);}}><label className={s.srOnly} htmlFor="pro-inbox-search">Find customer by email</label><input id="pro-inbox-search" type="search" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={100} placeholder="Search customer email"/><button type="submit" aria-label="Search conversations"><ProIcon name="search" size={17}/></button></form>
        <div className={`${s.queueTabs} ${calm.queueTabs}`} role="group" aria-label="Conversation status">{[['','All'],['open','Open'],['resolved','Resolved']].map(([key,label])=><button type="button" key={key} aria-pressed={status===key} onClick={()=>change({status:key,page:''},true)}>{label}</button>)}</div>
        <div className={`${s.queueOrder} ${calm.queueOrder}`}><span>{rows.length} on this page</span><select aria-label="Order conversations on this page" value={order} onChange={e=>setOrder(e.target.value)}><option value="recent">Recent first</option><option value="unread">Unread first</option></select></div>
        <div className={`${s.queueItems} ${calm.queueItems}`} data-inbox-scroll-list aria-busy={result.busy}><ResourceState resource={result} label="conversations"/>{result.data&&!rows.length&&<div className={calm.noResults}><Empty title="Queue is clear">No conversations match these filters.</Empty>{(q||status)&&<button type="button" className={calm.clearFilters} onClick={()=>{setDraft('');change({q:'',status:'',page:''},true);}}>Clear search and filters <ProIcon name="refresh" size={14}/></button>}</div>}
          {ordered.map(c=><button key={c.id} data-inbox-queue-item type="button" className={`${s.queueItem} ${calm.queueItem}`} aria-current={id===c.id?'true':undefined} data-unread={c.unread>0} onClick={()=>change({thread:c.id})}><span className={s.avatar}>{(c.customer?.email||'?')[0].toUpperCase()}</span><span className={`${s.queueItemCopy} ${calm.queueItemCopy}`}><strong>{c.customer?.email||'Customer'}</strong><small>{c.lastPreview||'Conversation started'}</small><em data-resolved={c.status==='resolved'}>{c.status==='resolved'?'Resolved':'Open'}</em></span><span className={s.queueTime}><time>{relativeTime(c.lastMessageAt||c.updatedAt)}</time>{c.unread>0&&<b>{c.unread>99?'99+':c.unread}</b>}</span></button>)}
        </div><div className={`${s.queueBottom} ${calm.queueBottom}`}><span>Page {page}</span>{(result.data?.total||0)>(result.data?.pageSize||30)&&<><button type="button" disabled={page<=1} onClick={()=>change({page:page-1},true)} aria-label="Previous conversations page">←</button><button type="button" disabled={page*(result.data?.pageSize||30)>=result.data.total} onClick={()=>change({page:page+1},true)} aria-label="Next conversations page">→</button></>}</div>
      </aside>
      <section className={`${s.conversation} ${calm.conversation}`} aria-label="Active conversation">{!id?<div className={`${s.emptyConversation} ${calm.emptyConversation}`}><div className={s.emptyGeometry} aria-hidden="true"><i/><i/><ProIcon name="inbox" size={36}/></div><h2>The next conversation<br/>starts here.</h2><p>{invalidThread?'This conversation link is invalid. Choose a thread from the queue.':'Choose a rider to see messages, photos and context.'}</p>{ordered[0]&&<button type="button" className={s.primary} onClick={()=>change({thread:ordered[0].id})}>Open first conversation <ProIcon name="arrow"/></button>}</div>:<>
        <header key={id} data-inbox-thread-head className={`${s.conversationHead} ${calm.conversationHead}`}><button className={s.backMobile} type="button" aria-label="Back to conversations" onClick={()=>change({thread:''})}><ProIcon name="back"/></button><span className={s.avatar}>{(chosen?.customer?.email||'?')[0].toUpperCase()}</span><div className={s.conversationIdentity}><strong>{chosen?.customer?.email||'Conversation'}</strong><span><i data-resolved={chosen?.status==='resolved'}/>{chosen?.status==='resolved'?'Resolved':'Customer support'}<small> · {chosen?.lastMessageAt?relativeTime(chosen.lastMessageAt):'Current thread'}</small></span></div><button type="button" className={s.customerButton} onClick={()=>setContextOpen(true)} aria-haspopup="dialog" aria-label="Open customer context"><ProIcon name="user"/></button><button type="button" className={s.primary} disabled={busy||!chosen} onClick={resolve}><ProIcon name={chosen?.status==='resolved'?'refresh':'check'} size={16}/>{busy?'Saving…':chosen?.status==='resolved'?'Reopen':'Resolve'}</button></header>
        <ErrorPanel>{error}</ErrorPanel>{notice&&<p className={s.statusNote} role="status">{notice}</p>}
        <ChatThread key={`${identity}:${id}`} conversationId={id} onMeta={setMeta} composerTools={args=><ReplyTools {...args}/>}/>
      </>}</section>
      {id&&<aside className={`${s.contextRail} ${calm.contextRail}`} aria-label="Customer context"><CustomerPanel id={id} identity={identity} revision={support.revision}/></aside>}
    </div><p className={`${s.footerNote} ${calm.footerNote}`}>Support status indicates your server connection, not the customer's online presence. <Link to="/" className={calm.footerLink}>Website home <ProIcon name="arrow" size={12}/></Link></p>
    {contextOpen&&id&&<ContextDialog id={id} identity={identity} revision={support.revision} onClose={()=>setContextOpen(false)}/>}
  </div>;
}
