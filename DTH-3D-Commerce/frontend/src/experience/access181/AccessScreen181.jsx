import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { authenticate, MODE } from '../../shop/api';
import { validateRegistration } from '../../../../shared/domain.mjs';
import { useStore } from '../../shop/useStore';
import AccessSurface243 from '../access243/AccessSurface243';
import useAccessPolicy243 from '../access243/useAccessPolicy243';
import { capsLock243 } from '../access243/access243.logic.mjs';
import './access181.css';
import '../../shop/account/premium-account.css';

function PasswordInput({ id, label, value, onChange, disabled, confirm = false, register = false, onFocus, onBlur, invalid, describedBy }) {
  const [visible,setVisible]=useState(false),[caps,setCaps]=useState(false);
  useEffect(()=>{setVisible(false);setCaps(false);},[register]);
  const modifier=event=>setCaps(capsLock243(event));
  return <div className="a243-field"><label htmlFor={id}>{label}</label><div className="a243-password">
    <input id={id} name={confirm?'confirmPassword':'password'} type={visible?'text':'password'} value={value} onChange={onChange} disabled={disabled}
      minLength={12} maxLength={128} required autoComplete={register?'new-password':'current-password'} onFocus={onFocus}
      onKeyDown={modifier} onKeyUp={modifier} onBlur={event=>{setCaps(false);onBlur?.(event);}}
      aria-invalid={invalid||undefined} aria-describedby={[describedBy,caps?`${id}-caps`:null].filter(Boolean).join(' ')||undefined}/>
    <button type="button" disabled={disabled} aria-label={visible?`Hide ${label.toLowerCase()}`:`Show ${label.toLowerCase()}`} aria-pressed={visible} onClick={()=>setVisible(v=>!v)}>{visible?'Hide':'Show'}</button>
  </div>{caps&&<p id={`${id}-caps`} className="a243-caps" role="status">Caps Lock is on.</p>}</div>;
}
export default function AccessScreen181({ state, onAuthenticated, routeKey }) {
  const store=useStore(),root=useRef(null),errorBox=useRef(null),title=useRef(null);
  const id=useId(),live=useRef(false),serial=useRef(0),lock=useRef(false);
  const [register,setRegister]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
  const [focus,setFocus]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const policy=useAccessPolicy243(root,{focusing:!!focus,busy});
  const disabled=busy||state!=='login';
  useEffect(()=>{live.current=true;return()=>{live.current=false;serial.current++;};},[]);
  useEffect(()=>{serial.current++;lock.current=false;setBusy(false);setError('');},[routeKey]);
  useEffect(()=>{const old=document.title;document.title=register?'Create account — DTH Parts Studio':'Sign in — DTH Parts Studio';return()=>{document.title=old;};},[register]);
  useEffect(()=>{if(policy.allowed)title.current?.focus({preventScroll:true});},[register,policy.allowed]);
  useEffect(()=>{if(error&&policy.allowed)errorBox.current?.focus({preventScroll:true});},[error,policy.allowed]);
  async function submit(event) {
    event.preventDefault();if(lock.current||state!=='login')return;
    setError('');
    let clean;
    try { clean=validateRegistration({email,password});if(register&&password!==confirm)throw new Error('Your passwords do not match.'); }
    catch(e){setError(e.message);return;}
    lock.current=true;setBusy(true);const requestId=++serial.current,epoch=store.getIdentityEpoch?.();
    try {
      const user=await authenticate(register?'register':'login',clean);
      if(!live.current||requestId!==serial.current)return;
      if(epoch!==undefined&&epoch!==store.getIdentityEpoch?.())throw new Error('Your session changed. Please sign in again.');
      setPassword('');setConfirm('');
      onAuthenticated(user); // No timer owns navigation; only a verified API/flow response can publish a user.
    } catch(e){if(live.current&&requestId===serial.current)setError(e.message||'Unable to sign in. Please retry.');}
    finally{if(live.current&&requestId===serial.current){lock.current=false;setBusy(false);}}
  }
  function switchMode(){if(disabled)return;setRegister(v=>!v);setPassword('');setConfirm('');setError('');setFocus('');}
  const fields=type=>({onFocus:()=>setFocus(type),onBlur:()=>setFocus('')});
  return <AccessSurface243 root={root} policy={policy} focusing={!!focus} busy={busy} registering={register}>
        <h1 id="a243-access-title" tabIndex={-1} ref={title}>{register?'Create account.':'Sign in.'}</h1>
        <p className="a243-lead">{register?'Your garage starts here.':'Your parts. Your ride. Your DTH.'}</p>
        {store.notice&&/session|sign in again|expired/i.test(store.notice)&&<p className="a243-session" role="status">{store.notice==='Your chat session ended. Please sign in again.'?'Your session ended. Please sign in to continue.':store.notice}</p>}
        {state==='configure'?<section className="a243-config" role="status"><h2>Connect the store first.</h2><p>Real sign-in requires API mode. Update <code>frontend/.env.local</code> and restart Vite:</p><pre>VITE_STORE_MODE=api{'\n'}VITE_SHOP_API_URL=/api/shop</pre><Link to="/shop">Browse read-only preview</Link></section>
          :state==='checking'?<div className="a243-checking" role="status"><span className="a243-spinner" aria-hidden="true"/>Checking your session…</div>
          :state==='connection-error'?<div className="a243-config" role="alert"><h2>Connection unavailable.</h2><p>{store.authError}</p><button type="button" className="a243-submit" onClick={store.retrySession}>Retry connection</button></div>
          :<>
          {MODE==='flow'&&<p className="a243-flow" role="note">UI rehearsal, not real authentication. Use a fictitious @dth.test address and the published fixture password DthFlow2026!. Do not enter real credentials.</p>}
          <form onSubmit={submit} aria-busy={busy}>
            <div className="a243-field"><label htmlFor={`${id}-email`}>Email</label><input id={`${id}-email`} name="email" type="email" autoComplete="email" inputMode="email" spellCheck={false} required maxLength={254} value={email} disabled={disabled} onChange={e=>setEmail(e.target.value)} {...fields('email')}/></div>
            <PasswordInput id={`${id}-password`} label="Password" value={password} onChange={e=>setPassword(e.target.value)} disabled={disabled} register={register} describedBy={register?`${id}-hint`:undefined} {...fields('password')}/>
            {register&&<><p id={`${id}-hint`} className="a243-hint">12–128 characters. Use a unique demo password.</p><PasswordInput id={`${id}-confirm`} label="Confirm password" value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={disabled} register confirm invalid={!!error&&password!==confirm} {...fields('confirm')}/></>}
            {error&&<p id={`${id}-error`} ref={errorBox} tabIndex={-1} className="a243-error" role="alert">{error}</p>}
            <button type="submit" className="a243-submit" disabled={disabled}>{busy&&<span className="a243-spinner" aria-hidden="true"/>}<span>{busy?(register?'Creating account…':'Signing in…'):register?'Create account':'Sign in'}</span></button>
          </form>
          <p className="a243-switch">{register?'Already part of DTH?':'New to DTH?'} <button type="button" onClick={switchMode} disabled={disabled}>{register?'Sign in':'Create account'}</button></p>
          </>}
        <p className="a243-fine">Demo experience. No real payments or shipment.</p>
  </AccessSurface243>;
}
