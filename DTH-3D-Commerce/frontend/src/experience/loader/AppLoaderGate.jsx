import { Component, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import AppLoader from './AppLoader';
import { LOADER_CONFIG } from './loader.config.mjs';
import { loaderDecision, readSeen, shouldShowIntro, writeSeen } from './loader.logic.mjs';
import { AppReadinessContext, useFirstPageReady } from './useAppReadiness';

let seenInDocument = false;
function storage() { try { return window.sessionStorage; } catch { return null; } }
function reducedNow() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; } }
function useReduced() {
  const [reduced, setReduced] = useState(reducedNow);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update(); media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  return reduced;
}
class OverlayBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** App remains mounted throughout. Only this non-essential overlay is removed. */
export default function AppLoaderGate({ children }) {
  const location = useLocation();
  const initialRoute = useRef(location.pathname + location.search);
  const shell = useRef(null), overlay = useRef(null), started = useRef(null), logoAt = useRef(null);
  const closed = useRef(false), exitTimer = useRef(null), reason = useRef('not-shown');
  const [phase, setPhase] = useState(() => shouldShowIntro({
    enabled: LOADER_CONFIG.enabled, seen: seenInDocument || readSeen(storage()),
    hidden: document.hidden, pathname: location.pathname,
  }) ? 'brand' : 'complete');
  const [catalog, setCatalog] = useState({ ready: false, error: false });
  const [logoReady, setLogoReady] = useState(false);
  const [exitDuration, setExitDuration] = useState(LOADER_CONFIG.exitMs);
  const [quietExit, setQuietExit] = useState(false);
  const reduced = useReduced();
  const covered = phase !== 'complete';
  const report = useCallback(next => {
    setCatalog(previous => previous.ready === next.ready && previous.error === next.error ? previous : next);
  }, []);
  const pageReady = useFirstPageReady(shell, catalog.ready, covered, LOADER_CONFIG.posterBudgetMs);
  const complete = useCallback(() => {
    clearTimeout(exitTimer.current);
    closed.current = true;
    seenInDocument = true;
    writeSeen(storage());
    setPhase('complete');
  }, []);
  const exit = useCallback((why, instant = false) => {
    if (closed.current) return;
    closed.current = true;
    reason.current = why;
    if (instant) { complete(); return; }
    const quiet = reducedNow() || why !== 'ready';
    const duration = quiet ? LOADER_CONFIG.quietExitMs : LOADER_CONFIG.exitMs;
    setQuietExit(quiet);
    setExitDuration(duration);
    setPhase('exit');
    // Never depend solely on CSS animationend / Animation.finished to release the app.
  }, [complete]);
  const readyLogo = useCallback(() => {
    if (closed.current) return;
    if (logoAt.current === null) logoAt.current = performance.now();
    setLogoReady(true);
  }, []);
  const failLogo = useCallback(() => exit('logo-error'), [exit]);
  const skip = useCallback(() => exit('skip'), [exit]);

  useEffect(() => {
    if (!covered) return;
    if (started.current === null) started.current = performance.now();
    // Independent fail-open watchdog also covers an interrupted exit or effect exception.
    const watchdog = setTimeout(() => { reason.current = 'watchdog'; complete(); }, LOADER_CONFIG.maxCoverMs + LOADER_CONFIG.exitMs + 150);
    return () => clearTimeout(watchdog);
  }, [covered, complete]);
  useEffect(() => {
    if (phase !== 'exit') return;
    exitTimer.current = setTimeout(complete, exitDuration);
    return () => clearTimeout(exitTimer.current);
  }, [phase, exitDuration, complete]);
  useEffect(() => {
    if (!covered || phase === 'exit') return;
    let timer;
    const inspect = () => {
      // A late poll must never overwrite an exit requested by image/API failure.
      if (closed.current) return;
      const now = performance.now();
      const decision = loaderDecision({
        elapsed: now - (started.current ?? now), brandElapsed: logoAt.current === null ? 0 : now - logoAt.current,
        logoReady, ready: catalog.ready && pageReady, reduced,
        failed: catalog.error, hidden: document.hidden,
        routeChanged: initialRoute.current !== location.pathname + location.search,
      });
      if (decision.exit) { exit(decision.reason, decision.reason === 'background' || decision.reason === 'navigation'); return; }
      setPhase(previous => previous === 'exit' || previous === 'complete'
        ? previous : decision.reason === 'waiting' ? 'waiting' : 'brand');
      timer = setTimeout(inspect, 50);
    };
    inspect();
    return () => clearTimeout(timer);
  }, [covered, phase, logoReady, catalog, pageReady, reduced, location.pathname, location.search, exit]);

  useLayoutEffect(() => {
    if (!covered) return;
    const body = document.body;
    const previousFocus = document.activeElement;
    const oldOverflow = body.style.overflow, oldPadding = body.style.paddingRight;
    const gap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    const padding = (parseFloat(getComputedStyle(body).paddingRight) || 0) + gap;
    body.style.overflow = 'hidden';
    if (gap) body.style.paddingRight = `${padding}px`;
    const button = () => overlay.current?.querySelector('button');
    button()?.focus({ preventScroll: true });
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); exit('skip'); }
      if (event.key === 'Tab') { event.preventDefault(); button()?.focus({ preventScroll: true }); }
    };
    const focus = event => { if (overlay.current && !overlay.current.contains(event.target)) button()?.focus({ preventScroll: true }); };
    const visibility = () => { if (document.hidden) exit('background', true); };
    const pageHide = () => { reason.current = 'pagehide'; complete(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', focus);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pageHide);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pageHide);
      if (body.style.overflow === 'hidden') body.style.overflow = oldOverflow;
      if (gap && body.style.paddingRight === `${padding}px`) body.style.paddingRight = oldPadding;
      // Restore only when focus belonged to the overlay; never hijack a newly selected route.
      if (overlay.current?.contains(document.activeElement) || document.activeElement === body) {
        const target = previousFocus?.isConnected && previousFocus !== body && !overlay.current?.contains(previousFocus)
          ? previousFocus : shell.current?.querySelector('#dth-content');
        target?.focus?.({ preventScroll: true });
      }
    };
  }, [covered, complete, exit]);

  return <AppReadinessContext.Provider value={report}>
    <div ref={shell} data-dth-app-shell data-dth-intro-state={phase}
      data-dth-intro-reason={reason.current} inert={covered}>
      {children}
    </div>
    {covered && createPortal(<OverlayBoundary onFailure={() => exit('overlay-error', true)}>
      <AppLoader rootRef={overlay} phase={phase} reduced={reduced || quietExit}
        duration={exitDuration} logoReady={logoReady} onLogoReady={readyLogo}
        onLogoError={failLogo} onSkip={skip} />
    </OverlayBoundary>, document.body)}
  </AppReadinessContext.Provider>;
}
