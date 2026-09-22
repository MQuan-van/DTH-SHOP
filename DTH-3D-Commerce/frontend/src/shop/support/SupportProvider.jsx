import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../useStore';
import { MODE, studioRequest, studioUrl } from '../api';
const Context=createContext(null);
export function SupportProvider({children}) {
  const store=useStore(), listeners=useRef(new Set());
  const [status,setStatus]=useState('offline'),[revision,setRevision]=useState(0),[conversations,setConversations]=useState([]);
  const active=MODE==='api' && !!store.user && !store.authLoading;
  const subscribe=useCallback(fn=>{listeners.current.add(fn);return()=>listeners.current.delete(fn);},[]);
  const refresh=useCallback(()=>setRevision(n=>n+1),[]);
  useEffect(()=>{
    setConversations([]);setStatus(active?'connecting':'offline');
    if(!active)return;
    let live=true;
    const stream=new EventSource(studioUrl('/chat/events'),{withCredentials:true});
    const notify=(type,event)=>{if(!live)return;try{const data=JSON.parse(event.data);listeners.current.forEach(fn=>fn(type,data));}catch{ /* malformed transport event is not a successful message */ }};
    const ready=()=>{if(live){setStatus('live');refresh();}};
    stream.addEventListener('ready',ready);
    stream.addEventListener('change',e=>{refresh();notify('change',e);});
    stream.addEventListener('typing',e=>notify('typing',e));
    stream.addEventListener('session-ended',()=>{if(live){stream.close();setStatus('offline');store.setUser(null);store.setNotice('Your chat session ended. Please sign in again.');}});
    stream.onerror=()=>{if(live)setStatus('reconnecting');};
    const focus=()=>{if(!document.hidden)refresh();};
    window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
    return()=>{live=false;stream.close();window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
  },[active,store.user?.id,store.user?.role,refresh,store.setUser]);
  useEffect(()=>{
    if(!active)return;let live=true;
    const timer=setTimeout(()=>{studioRequest('/chat/conversations').then(r=>{if(live)setConversations(r.data);}).catch(()=>{});},120);
    return()=>{live=false;clearTimeout(timer);};
  },[active,revision,store.user?.id]);
  const value=useMemo(()=>({status,revision,conversations,subscribe,refresh,active}),[status,revision,conversations,subscribe,refresh,active]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSupport(){const value=useContext(Context);if(!value)throw new Error('SupportProvider is required.');return value;}
