import { useCallback, useEffect, useRef, useState } from 'react';
import { studioRequest, studioUrl } from '../api';
import { useStore } from '../useStore';
import { useSupport } from './SupportProvider';
import './support.css';
const time=value=>new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(new Date(value));
const encodeFile=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Could not read this image.'));reader.onload=()=>resolve({mime:file.type,base64:String(reader.result).split(',')[1]});reader.readAsDataURL(file);});
function ImageViewer({src,onClose}) {
  const ref=useRef(null);
  useEffect(()=>{const el=ref.current,previous=document.activeElement;el.showModal();return()=>{if(el.open)el.close();previous?.isConnected&&previous.focus();};},[]);
  return <dialog className="dth-chat-lightbox" ref={ref} aria-label="Support image" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><button type="button" onClick={onClose} autoFocus>Close image ×</button><img src={src} alt="Image shared in this support conversation"/></dialog>;
}
export default function ChatThread({conversationId,onMeta}) {
  const store=useStore(),support=useSupport();
  const [messages,setMessages]=useState([]),[meta,setMeta]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [text,setText]=useState(''),[file,setFile]=useState(null),[preview,setPreview]=useState(''),[pending,setPending]=useState(null),[sending,setSending]=useState(false);
  const [typing,setTyping]=useState(false),[older,setOlder]=useState(false),[loadingOlder,setLoadingOlder]=useState(false),[unseen,setUnseen]=useState(false),[large,setLarge]=useState('');
  const box=useRef(null),input=useRef(null),last=useRef(0),alive=useRef(true),requesting=useRef(false),again=useRef(false),follow=useRef(true),initialized=useRef(false),read=useRef(0),sendLock=useRef(false),typingClock=useRef(0),typingTimer=useRef(null),metaRef=useRef(onMeta);
  metaRef.current=onMeta;
  const base=`/chat/conversations/${conversationId}`,role=store.user?.role;
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;clearTimeout(typingTimer.current);};},[]);
  useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
  const markRead=useCallback(()=>{
    if(!alive.current||document.hidden||!document.hasFocus()||!follow.current||!last.current||last.current<=read.current)return;
    const value=last.current;read.current=value;
    studioRequest(`${base}/read`,{method:'POST',body:JSON.stringify({seq:value})}).catch(()=>{if(read.current===value)read.current=0;});
  },[base]);
  const reload=useCallback(async()=>{
    if(requesting.current){again.current=true;return;}
    requesting.current=true;
    try{
      do{
        again.current=false;
        let more=true;
        while(more && alive.current){
          const first=!initialized.current;
          const result=await studioRequest(`${base}/messages${first?'':`?after=${last.current}`}`);
          if(!alive.current)return;
          initialized.current=true;setMeta(result.conversation);metaRef.current?.(result.conversation);
          if(first)setOlder(result.hasMore);
          if(result.data.length){
            last.current=Math.max(last.current,...result.data.map(m=>m.seq));
            setMessages(previous=>[...new Map([...previous,...result.data].map(m=>[m.id,m])).values()].sort((a,b)=>a.seq-b.seq));
            if(!follow.current)setUnseen(true);
          }
          more=!first && result.hasMore;
        }
      }while(again.current&&alive.current);
      if(alive.current){setError('');setLoading(false);}
    }catch(e){if(alive.current){setError(e.message);setLoading(false);if(e.status===401)store.setUser(null);}}
    finally{requesting.current=false;}
  },[base,store.setUser]);
  useEffect(()=>{void reload();return support.subscribe((kind,data)=>{
    if(data.conversationId!==conversationId)return;
    if(kind==='change')void reload();
    if(kind==='typing'&&data.role!==role){setTyping(!!data.active);clearTimeout(typingTimer.current);typingTimer.current=setTimeout(()=>setTyping(false),4500);}
  });},[conversationId,role,reload,support.subscribe]);
  useEffect(()=>{if(support.status==='live')void reload();},[support.status,reload]);
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>{if(follow.current&&box.current){box.current.scrollTop=box.current.scrollHeight;setUnseen(false);}markRead();});
    return()=>cancelAnimationFrame(frame);
  },[messages,pending,markRead]);
  useEffect(()=>{const focus=()=>{if(!document.hidden){void reload();markRead();}};window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);return()=>{window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};},[reload,markRead]);
  function type(value){setText(value);if(Date.now()-typingClock.current>1800){typingClock.current=Date.now();studioRequest(`${base}/typing`,{method:'POST',body:JSON.stringify({active:!!value})}).catch(()=>{});}}
  function pick(next){if(!next)return;if(!['image/png','image/jpeg','image/webp'].includes(next.type)||next.size>5*1024*1024){setError('Choose a JPEG, PNG or WebP up to 5 MiB.');return;}setFile(next);setError('');}
  async function send(retry=false){
    if(sendLock.current||(!retry&&!text.trim()&&!file))return;
    sendLock.current=true;setSending(true);setError('');follow.current=true;
    let draft=retry?pending:{clientId:crypto.randomUUID(),text:text.trim(),file};
    setPending({...draft,state:'sending'});
    try{
      const image=draft.image|| (draft.file?await encodeFile(draft.file):null);draft={...draft,image};
      const result=await studioRequest(`${base}/messages`,{method:'POST',body:JSON.stringify({clientId:draft.clientId,text:draft.text,image})});
      if(!alive.current)return;
      // The database response, not animation completion, determines success.
      setPending(null);setText('');setFile(null);input.current.value='';void reload();support.refresh();
    }catch(e){if(alive.current){setPending({...draft,state:'failed'});setError(e.message);}}
    finally{sendLock.current=false;if(alive.current)setSending(false);}
  }
  async function history(){
    if(!messages.length||loadingOlder)return;setLoadingOlder(true);
    const height=box.current?.scrollHeight||0,top=box.current?.scrollTop||0;follow.current=false;
    try{const result=await studioRequest(`${base}/messages?before=${messages[0].seq}`);if(!alive.current)return;setOlder(result.hasMore);setMessages(prev=>[...new Map([...result.data,...prev].map(m=>[m.id,m])).values()].sort((a,b)=>a.seq-b.seq));requestAnimationFrame(()=>{if(box.current)box.current.scrollTop=top+box.current.scrollHeight-height;});}
    catch(e){setError(e.message);}finally{if(alive.current)setLoadingOlder(false);}
  }
  const otherRead=role==='admin'?meta?.customerReadSeq:meta?.staffReadSeq;
  return <section className="dth-chat" aria-label="Support conversation" onFocusCapture={markRead}>
    <div className="dth-chat-connection" role="status"><i data-live={support.status==='live'}/>{support.status==='live'?'Live connection':support.status==='connecting'?'Connecting…':'Reconnecting — messages may be delayed'}</div>
    <div className="dth-chat-messages" ref={box} onScroll={()=>{const el=box.current;follow.current=el.scrollHeight-el.scrollTop-el.clientHeight<70;if(follow.current){setUnseen(false);markRead();}}} role="log" aria-label="Messages" aria-live="polite" aria-relevant="additions">
      {older&&<button className="dth-chat-history" onClick={history} disabled={loadingOlder}>{loadingOlder?'Loading…':'Earlier messages'}</button>}
      {loading?<p className="dth-chat-empty">Loading conversation…</p>:!messages.length&&!pending?<div className="dth-chat-empty"><span className="dth-chat-empty-icon">↗</span><h3>Let’s find the right part.</h3><p>Ask a question or share a photo. Our support team can reply here.</p></div>:null}
      {messages.map(m=><article key={m.id} className="dth-chat-message" data-own={m.senderRole===role}><div className="dth-chat-bubble">{m.image&&<button className="dth-chat-image" onClick={()=>setLarge(studioUrl(m.image.path))} aria-label="Enlarge shared image"><img src={studioUrl(m.image.path)} alt="Shared support image" width={m.image.width} height={m.image.height} loading="lazy"/></button>}{m.text&&<p>{m.text}</p>}</div><small>{m.senderRole===role?'You':m.senderRole==='admin'?'DTH support':'Customer'} · {time(m.createdAt)}{m.senderRole===role?m.seq<=otherRead?' · Seen':' · Sent':''}</small></article>)}
      {pending&&<article className="dth-chat-message" data-own="true"><div className="dth-chat-bubble" data-pending="true">{pending.file&&<span>Image attachment</span>}{pending.text&&<p>{pending.text}</p>}</div><small>{pending.state==='failed'?'Not sent':'Sending…'}</small>{pending.state==='failed'&&<div className="dth-chat-retry"><button onClick={()=>send(true)} disabled={sending}>Retry message</button><button onClick={()=>{setPending(null);setError('');}}>Edit draft</button></div>}</article>}
    </div>
    {unseen&&<button className="dth-chat-new" onClick={()=>{follow.current=true;box.current.scrollTop=box.current.scrollHeight;setUnseen(false);markRead();}}>New messages ↓</button>}
    <div className="dth-chat-typing" role="status">{typing?<><span>•••</span> {role==='admin'?'Customer':'Support'} is typing…</>:null}</div>
    {error&&<p className="dth-chat-error" role="alert">{error} {loading===false&&!messages.length&&<button onClick={reload}>Try again</button>}</p>}
    <form className="dth-chat-composer" onSubmit={e=>{e.preventDefault();void send();}}>
      {preview&&<div className="dth-chat-attachment"><img src={preview} alt="Selected image preview"/><span>Image ready to send</span><button type="button" aria-label="Remove selected image" disabled={sending||!!pending} onClick={()=>{setFile(null);input.current.value='';}}>×</button></div>}
      <label className="dth-chat-sr" htmlFor={`message-${conversationId}`}>Message</label><textarea id={`message-${conversationId}`} placeholder="Write a message…" value={text} maxLength={3000} disabled={sending||!!pending} onChange={e=>type(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/>
      <div className="dth-chat-actions"><input ref={input} className="dth-chat-file" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Attach image" onChange={e=>pick(e.target.files?.[0])} disabled={sending||!!pending}/><button type="button" className="dth-chat-attach" onClick={()=>input.current.click()} disabled={sending||!!pending}>＋ Image</button><small>JPEG · PNG · WebP · 5 MiB</small><button className="dth-chat-send" type="submit" disabled={sending||!!pending||(!text.trim()&&!file)}>{sending?'Sending…':'Send'} ↗</button></div>
    </form>
    {large&&<ImageViewer src={large} onClose={()=>setLarge('')}/>}
  </section>;
}
