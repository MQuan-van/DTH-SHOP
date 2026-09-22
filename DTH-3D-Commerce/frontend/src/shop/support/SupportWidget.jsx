import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../useStore';
import { MODE, studioRequest } from '../api';
import { useSupport } from './SupportProvider';
import ChatThread from './ChatThread';
export default function SupportWidget(){
  const store=useStore(),support=useSupport(),location=useLocation();
  const [open,setOpen]=useState(false),[thread,setThread]=useState(''),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const close=useRef(null),trigger=useRef(null);
  useEffect(()=>{setOpen(false);setThread('');setError('');},[store.user?.id]);
  useEffect(()=>{if(open)close.current?.focus();},[open]);
  useEffect(()=>{
    if(!open||!store.user||store.user.role==='admin'||MODE!=='api')return;
    let live=true;setError('');
    studioRequest('/chat/conversations',{method:'POST',body:'{}'}).then(r=>{if(live){setThread(r.data.id);support.refresh();}}).catch(e=>{if(live)setError(e.message);});
    return()=>{live=false;};
  },[open,store.user?.id,retry,support.refresh]);
  const hide=()=>{setOpen(false);requestAnimationFrame(()=>trigger.current?.focus());};
  if(location.pathname.startsWith('/admin'))return null;
  const unread=support.conversations.reduce((n,c)=>n+c.unread,0);
  return <div className="dth-support-widget">
    {open&&<aside className="dth-support-panel" role="dialog" aria-labelledby="dth-support-title" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();hide();}}}><header><div><span>DTH / CUSTOMER CARE</span><h2 id="dth-support-title">How can we help?</h2></div><button ref={close} aria-label="Close support" onClick={hide}>×</button></header>
      {MODE!=='api'?<div className="dth-chat-empty"><h3>Live support uses API mode.</h3><p>This preview does not send messages to staff. Connect the backend to use real chat.</p></div>:!store.user?<div className="dth-chat-empty"><h3>Keep the conversation with you.</h3><p>Sign in to message support and keep your history.</p><Link to="/account" onClick={hide}>Sign in →</Link></div>:store.user.role==='admin'?<div className="dth-chat-empty"><Link to="/admin/inbox" onClick={hide}>Open support inbox →</Link></div>:error?<div className="dth-chat-empty"><p role="alert">{error}</p><button onClick={()=>setRetry(n=>n+1)}>Try again</button></div>:thread?<ChatThread key={`${store.user.id}:${thread}`} conversationId={thread}/>:<p className="dth-chat-empty" role="status">Opening your conversation…</p>}
    </aside>}
    <button ref={trigger} className="dth-support-launcher" aria-expanded={open} aria-label={open?'Hide support':'Open support'} onClick={()=>open?hide():setOpen(true)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2v-10a9 9 0 0 1 18 0Z"/><path d="M7 10h9M7 14h6"/></svg><span>Support</span>{unread>0&&<b>{unread>99?'99+':unread}</b>}</button>
  </div>;
}
