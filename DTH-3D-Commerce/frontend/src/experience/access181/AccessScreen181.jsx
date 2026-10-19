import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { authenticate, MODE } from '../../shop/api';
import { validateRegistration } from '../../../../shared/domain.mjs';
import { useStore } from '../../shop/useStore';
import BrandScene from './BrandScene';
import useAccessMotion from './useAccessMotion';
import { visualPhase } from './access.logic.mjs';
import './access181.css';

function PasswordInput({ id, label, value, onChange, disabled, confirm = false, register = false, onFocus, onBlur, invalid, describedBy }) {
  const [visible,setVisible]=useState(false);
  return <div className="dth-access181-field"><label htmlFor={id}>{label}</label><div className="dth-access181-password">
    <input id={id} name={confirm?'confirmPassword':'password'} type={visible?'text':'password'} value={value} onChange={onChange} disabled={disabled}
      minLength={12} maxLength={128} required autoComplete={register?'new-password':'current-password'} onFocus={onFocus} onBlur={onBlur} aria-invalid={invalid||undefined} aria-describedby={describedBy}/>
    <button type="button" disabled={disabled} aria-label={visible?`Hide ${label.toLowerCase()}`:`Show ${label.toLowerCase()}`} aria-pressed={visible} onClick={()=>setVisible(v=>!v)}>{visible?'Hide':'Show'}</button>
  </div></div>;
}
export default function AccessScreen181({ state, onAuthenticated, routeKey }) {
  const store=useStore(),root=useRef(null),errorBox=useRef(null),title=useRef(null);
  const id=useId(),live=useRef(false),serial=useRef(0),lock=useRef(false);
  const policy=useAccessMotion(root);
  const [register,setRegister]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
  const [focus,setFocus]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[help,setHelp]=useState(false);
  const phase=visualPhase({busy,error,register,focus});
  const disabled=busy||state!=='login';
  useEffect(()=>{live.current=true;return()=>{live.current=false;serial.current++;};},[]);
  useEffect(()=>{serial.current++;lock.current=false;setBusy(false);setError('');},[routeKey]);
  useEffect(()=>{const old=document.title;document.title='Sign in — DTH Parts Studio';return()=>{document.title=old;};},[]);
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
  return <main id="dth-content" tabIndex={-1} ref={root} className="dth-access181" data-access181 data-mode={MODE} data-phase={phase}
    data-motion={policy.motion?'on':'off'} onPointerMove={policy.move} onPointerLeave={policy.leave}>
    <div className="dth-access181-atmosphere" aria-hidden="true"><i className="dth-access181-glow glow-a"/><i className="dth-access181-glow glow-b"/><div className="dth-access181-grid"/><span className="dth-access181-orbit orbit-a"/><span className="dth-access181-orbit orbit-b"/></div>
    <header className="dth-access181-top"><div className="dth-access181-brand"><img src="/branding/access181/dth-mark.svg" alt="DTH" width="136" height="26"/><span>PARTS STUDIO</span></div>
      <div className="dth-access181-toplinks"><span>Member access</span><button type="button" aria-expanded={help} aria-controls={`${id}-help`} onClick={()=>setHelp(v=>!v)}>Need help? <span aria-hidden="true">↗</span></button></div>
    </header>
    <div className="dth-access181-layout">
      <section className="dth-access181-stage" aria-label="DTH identity experience">
        <div className="dth-access181-stagehead" data-access-enter><span>ENGINEERED FOR INDIVIDUALITY</span><span aria-hidden="true">DTH — 01</span></div>
        <BrandScene policy={policy} phase={phase} focusing={!!focus}/>
        <div className="dth-access181-statement" data-access-enter><h2>Make it<br/><em>your own.</em></h2><p>One studio. Your next build.</p></div>
        <div className="dth-access181-stagetail" data-access-enter><span>Brand sculpture · not a product model</span><button type="button" disabled={policy.reduced} aria-pressed={!policy.paused&&!policy.reduced} onClick={()=>policy.setPaused(v=>!v)}>{policy.reduced?'Reduced motion':policy.paused?'Play motion ▷':'Pause motion Ⅱ'}</button></div>
      </section>
      <section className="dth-access181-card" aria-labelledby={`${id}-title`} data-access-enter>
        <div className="dth-access181-cardtop"><span>YOUR DTH STUDIO</span><span className="dth-access181-mode" data-api={MODE==='api'}>{MODE==='api'?'API mode':MODE==='flow'?'UI rehearsal':'Preview only'}</span></div>
        <h1 id={`${id}-title`} tabIndex={-1} ref={title}>{register?'Start your\nbuild.':'Welcome\nback.'}</h1>
        <p className="dth-access181-lead">{register?'Create your account. Keep your ride connected.':'Sign in to explore parts for your ride.'}</p>
        {help&&<div id={`${id}-help`} className="dth-access181-help" role="note"><strong>Access help</strong><p>Use an account registered on this server. An account on another local database will not work here. Password recovery is not available in this demonstrator.</p></div>}
        {store.notice&&/session|sign in again|expired/i.test(store.notice)&&<p className="dth-access181-session" role="status">{store.notice}</p>}
        {state==='configure'?<section className="dth-access181-config" role="status"><h2>Connect the store first.</h2><p>Real sign-in requires API mode. Update <code>frontend/.env.local</code> and restart Vite:</p><pre>VITE_STORE_MODE=api{'\n'}VITE_SHOP_API_URL=/api/shop</pre><Link to="/shop">Browse read-only preview ↗</Link></section>
          :state==='checking'?<div className="dth-access181-checking" role="status">Checking your session…</div>
          :state==='connection-error'?<div className="dth-access181-config" role="alert"><h2>Connection unavailable.</h2><p>{store.authError}</p><button type="button" className="dth-access181-submit" onClick={store.retrySession}>Retry connection ↻</button></div>
          :<>
          {MODE==='flow'&&<p className="dth-access181-flow" role="note">UI rehearsal, not real authentication. Use a fictitious @dth.test address and the published fixture password DthFlow2026!. Do not enter real credentials.</p>}
          <form onSubmit={submit} aria-busy={busy}>
            <div className="dth-access181-field"><label htmlFor={`${id}-email`}>Email</label><input id={`${id}-email`} name="email" type="email" autoComplete="email" required maxLength={254} value={email} disabled={disabled} onChange={e=>setEmail(e.target.value)} {...fields('email')}/></div>
            <PasswordInput id={`${id}-password`} label="Password" value={password} onChange={e=>setPassword(e.target.value)} disabled={disabled} register={register} describedBy={register?`${id}-hint`:undefined} {...fields('password')}/>
            {register&&<><p id={`${id}-hint`} className="dth-access181-hint">12–128 characters. Use a unique demo password.</p><div className="dth-access181-confirm"><PasswordInput id={`${id}-confirm`} label="Confirm password" value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={disabled} register confirm invalid={!!error&&password!==confirm} {...fields('confirm')}/></div></>}
            {error&&<p id={`${id}-error`} ref={errorBox} tabIndex={-1} className="dth-access181-error" role="alert">{error}</p>}
            <button type="submit" className="dth-access181-submit" disabled={disabled}><span>{busy?'Signing you in…':register?'Create account':'Sign in'}</span><span aria-hidden="true">{busy?'···':'↗'}</span></button>
          </form>
          <p className="dth-access181-switch">{register?'Already part of DTH?':'New to DTH?'} <button type="button" onClick={switchMode} disabled={disabled}>{register?'Sign in':'Create account'}</button></p>
          </>}
        <div className="dth-access181-fine"><span aria-hidden="true">◇</span><p>Demo account. No real payments or shipment.<br/>Your password is never used by the 3D scene.</p></div>
      </section>
    </div>
    <footer className="dth-access181-footer"><span>DTH / THE PARTS STUDIO</span><span>NVX V1 · V2 · V3</span><span>Independent FYP demonstrator</span></footer>
  </main>;
}
