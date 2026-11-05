import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import './access244.css';

const LightField244 = lazy(() => import('./LightField244'));
class BackdropBoundary244 extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
function StillLight244() {
  return <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" focusable="false" aria-hidden="true">
    <defs>
      <linearGradient id="a244-ribbon" x1="150" y1="900" x2="1100" y2="60" gradientUnits="userSpaceOnUse"><stop stopColor="#09265a"/><stop offset=".3" stopColor="#1856dd"/><stop offset=".52" stopColor="#77beff"/><stop offset=".63" stopColor="#174dbc"/><stop offset="1" stopColor="#041c46"/></linearGradient>
      <linearGradient id="a244-rim" x1="240" y1="880" x2="950" y2="70" gradientUnits="userSpaceOnUse"><stop stopColor="#2576fd" stopOpacity="0"/><stop offset=".4" stopColor="#66b8ff"/><stop offset=".7" stopColor="#88cbff"/><stop offset="1" stopColor="#183d83" stopOpacity="0"/></linearGradient>
      <linearGradient id="a244-right" x1="1000" y1="900" x2="1670" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="#103569" stopOpacity="0"/><stop offset=".6" stopColor="#2268de"/><stop offset="1" stopColor="#5cafff"/></linearGradient>
      <filter id="a244-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="19"/></filter>
    </defs>
    <path d="M-170 1120C270 1110 34 340 431 312S674 6 1115-110" stroke="url(#a244-ribbon)" strokeWidth="195" fill="none" filter="url(#a244-soft)"/>
    <path d="M-170 1120C270 1110 34 340 431 312S674 6 1115-110" stroke="url(#a244-ribbon)" strokeWidth="126" fill="none"/>
    <path d="M-170 1100C236 1065 27 302 425 282S657-28 1115-133" stroke="url(#a244-rim)" strokeWidth="3" fill="none"/>
    <path d="M990 1130C1177 704 1450 997 1750 335" stroke="url(#a244-right)" strokeWidth="160" fill="none" filter="url(#a244-soft)"/>
  </svg>;
}
function MotionIcon244({ paused }) {
  return <svg viewBox="0 0 20 20" aria-hidden="true">{paused ? <path d="m7 4 8 6-8 6V4Z"/> : <path d="M7 4v12M13 4v12"/>}</svg>;
}
export default function AccessSurface244({ root, policy, focusing, busy, registering, children }) {
  const [help, setHelp] = useState(false), light = useRef(null), helpButton = useRef(null);
  useEffect(() => {
    if (!policy.motion || policy.compact || focusing || busy || !light.current) return;
    let xTo, yTo;
    const context = gsap.context(() => {
      xTo = gsap.quickTo(light.current, 'x', { duration: 1, ease: 'power3.out' });
      yTo = gsap.quickTo(light.current, 'y', { duration: 1.1, ease: 'power3.out' });
    }, root);
    const unsubscribe = policy.subscribe(() => {
      const point = policy.pointer.current;
      xTo(point.x * 28); yTo(point.y * -18);
    });
    return () => { unsubscribe(); context.revert(); };
  }, [policy.motion, policy.compact, policy.subscribe, policy.pointer, focusing, busy, root]);
  useEffect(() => {
    if (!help) return;
    const escape = event => { if (event.key === 'Escape') { setHelp(false); helpButton.current?.focus(); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [help]);
  return <main id="dth-content" ref={root} tabIndex={-1} className="a244-access" data-access181 data-access243 data-access244
    data-register={registering} data-focusing={focusing} data-busy={busy} data-motion={policy.motion ? 'on' : 'off'}
    onPointerMove={policy.move} onPointerLeave={policy.leave}>
    <div className="a244-backdrop" aria-hidden="true">
      <div className="a244-still" ref={light}><StillLight244/></div>
      {policy.allowed && !policy.compact && !policy.reduced && !policy.saveData && <BackdropBoundary244><Suspense fallback={null}>
        <LightField244 policy={policy} focusing={focusing} busy={busy}/>
      </Suspense></BackdropBoundary244>}
      <div className="a244-shade"/>
    </div>
    <header className="a244-top">
      <div className="a244-brand"><img src="/branding/access181/dth-mark.svg" width="120" height="20" alt="DTH"/><span>Parts studio</span></div>
      <button ref={helpButton} type="button" className="a244-help-toggle" aria-expanded={help} aria-controls="a244-access-help" onClick={()=>setHelp(value=>!value)}>Access help<span aria-hidden="true">?</span></button>
    </header>
    <div className="a244-layout">
      <section className="a244-panel" data-a243-form aria-labelledby="a243-access-title">
        {help && <aside id="a244-access-help" className="a244-help" aria-label="Access help">
          <div><strong>Signing in to DTH</strong><button type="button" aria-label="Close access help" onClick={()=>{setHelp(false);helpButton.current?.focus();}}>×</button></div>
          <p>Use your registered email and password. Your account works on PC and laptop when both connect to the same store.</p>
          <p>Password recovery is not available in this demo.</p>
        </aside>}
        {children}
      </section>
    </div>
    <footer className="a244-footer">
      {!policy.compact && <button type="button" className="a244-motion" disabled={policy.reduced||policy.saveData} aria-pressed={policy.paused||policy.reduced||policy.saveData} onClick={()=>policy.setPaused(value=>!value)}>
        <MotionIcon244 paused={policy.paused||policy.reduced||policy.saveData}/><span>{policy.reduced?'Reduced motion':policy.saveData?'Motion limited':policy.paused?'Play motion':'Pause motion'}</span>
      </button>}
      <span>Independent FYP demonstrator</span>
    </footer>
  </main>;
}
