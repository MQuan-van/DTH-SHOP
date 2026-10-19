import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MODE } from '../../shop/api';
import { useStore } from '../../shop/useStore';
import { useStartupCovered } from '../loader/StartupRenderContext.jsx';
import AccessScreen181 from './AccessScreen181';
import { accessDecision, accessDestination } from './access.logic.mjs';
/** Outside the storefront Shell, inside StoreProvider: catalog errors no longer conceal sign-in. */
export default function AccessBoundary181({ children }) {
  const store=useStore(),location=useLocation(),navigate=useNavigate(),covered=useStartupCovered();
  const [handoff,setHandoff]=useState(''),identity=store.user?.id||'',previousIdentity=useRef(identity);
  const state=accessDecision({pathname:location.pathname,user:store.user,authLoading:store.authLoading,authError:store.authError,mode:MODE});
  const routeKey=location.pathname+location.search;
  useEffect(()=>{
    if(previousIdentity.current!==identity){previousIdentity.current=identity;if(!identity)setHandoff('');}
  },[identity]);
  useEffect(()=>{if(!handoff)return;const timer=setTimeout(()=>setHandoff(''),320);return()=>clearTimeout(timer);},[handoff]);
  useEffect(()=>{
    if(state==='redirect'&&!covered)navigate(accessDestination({pathname:location.pathname,search:location.search,user:store.user}),{replace:true});
  },[state,covered,routeKey,navigate,store.user?.id]);
  function authenticated(user){
    const target=accessDestination({pathname:location.pathname,search:location.search,user});
    setHandoff(user.id);store.setUser(user);store.setNotice('Signed in.');
    navigate(target,{replace:true});
  }
  if(state==='redirect')return <main id="dth-content" className="dth-access181-opening"><h1>Opening your studio…</h1></main>;
  if(state!=='pass')return <AccessScreen181 state={state} routeKey={routeKey} onAuthenticated={authenticated}/>;
  return <>{children}{handoff===identity&&handoff&&<div className="dth-access181-handoff" aria-hidden="true"/>}</>;
}
