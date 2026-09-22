import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import s from './AccountPage.module.css';
const Scene = lazy(() => import('./AccountScene'));
class VisualBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}
/** Decorative brand object, not a model of the customer's vehicle. */
export default function AccountVisual() {
  const root = useRef(null);
  const [visible, setVisible] = useState(false), [reduced, setReduced] = useState(true);
  const [paused, setPaused] = useState(false), [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false), [inTab, setInTab] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches), tab = () => setInTab(!document.hidden);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(root.current); update(); tab();
    media.addEventListener('change', update); document.addEventListener('visibilitychange', tab);
    return () => { observer.disconnect(); media.removeEventListener('change', update); document.removeEventListener('visibilitychange', tab); };
  }, []);
  const running = visible && inTab && !paused && !reduced;
  return <div className={s.visual} ref={root} data-account-scene={failed ? 'fallback' : ready ? 'ready' : 'loading'} data-motion={running ? 'on' : 'off'}>
    <div className={s.visualShadow} aria-hidden="true" />
    <div className={s.visualFallback} data-hidden={ready && !failed} aria-hidden="true">
      <svg viewBox="0 0 400 400"><defs><linearGradient id="dth-metal"><stop stopColor="#edf7fc"/><stop offset=".5" stopColor="#7197ae"/><stop offset="1" stopColor="#dcebf3"/></linearGradient></defs><g transform="translate(200 190) rotate(-24) scale(1 .85)" fill="none" stroke="url(#dth-metal)"><circle r="120" strokeWidth="24"/><circle r="67" strokeWidth="20"/>{Array.from({length:12},(_,i)=><circle key={i} cx={94*Math.cos(i*Math.PI/6)} cy={94*Math.sin(i*Math.PI/6)} r="13" fill="#deecf3" strokeWidth="3"/>)}<circle r="137" stroke="#00a4db" strokeWidth="4"/></g></svg>
    </div>
    {visible && !failed && <div className={s.visualCanvas} data-ready={ready} aria-hidden="true"><VisualBoundary onFailure={() => setFailed(true)}><Suspense fallback={null}><Scene running={running} onReady={() => setReady(true)} onFailure={() => setFailed(true)} /></Suspense></VisualBoundary></div>}
    {ready && !failed && !reduced && <button type="button" className={s.motionButton} aria-label={paused ? 'Play studio animation' : 'Pause studio animation'} aria-pressed={paused} onClick={() => setPaused(v => !v)}>{paused ? 'Play motion' : 'Pause motion'}</button>}
  </div>;
}
