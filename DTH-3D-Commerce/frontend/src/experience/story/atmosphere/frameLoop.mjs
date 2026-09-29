import { safeDelta } from './atmosphereMath.mjs';

/** One on-demand rAF for Step 10's 2D decorations (not another WebGL renderer).
 * Injected scheduling lets tests prove cancellation/StrictMode cleanup without a GPU.
 */
export function createAtmosphereTicker({ requestFrame, cancelFrame, onError = error => console.error(error) }) {
  const clients = new Set();
  let pending = null, disposed = false, ticking = false;
  const wantsWork = record => record.enabled() && (record.dirty || record.animate());
  function schedule() {
    if (disposed || ticking) return;
    const work = [...clients].some(wantsWork);
    if (work && pending === null) pending = requestFrame(tick);
    else if (!work && pending !== null) { cancelFrame(pending); pending = null; }
  }
  function tick(now) {
    pending = null;
    if (disposed) return;
    ticking = true;
    for (const record of [...clients]) {
      if (!clients.has(record)) continue;
      try {
        if (!record.enabled()) { record.lastPaint = null; record.wasMoving = false; continue; }
        const moving = record.animate();
        if (!record.dirty && (!moving || (record.lastPaint !== null && now - record.lastPaint < record.interval - 0.5))) continue;
        const delta = moving && record.wasMoving && record.lastPaint !== null ? safeDelta((now - record.lastPaint) / 1000) : 0;
        record.dirty = false;
        record.lastPaint = now;
        record.wasMoving = moving;
        record.render({ now, delta });
      } catch (error) { clients.delete(record); onError(error); }
    }
    ticking = false;
    schedule();
  }
  return {
    subscribe({ render, enabled = () => true, animate = () => false, interval = 0 }) {
      if (disposed) throw Error('Ticker is disposed');
      const record = { render, enabled, animate, interval, dirty: true, lastPaint: null, wasMoving: false };
      clients.add(record); schedule();
      return {
        invalidate() {
          if (!clients.has(record)) return;
          record.dirty = true;
          if (!record.enabled() || !record.animate()) { record.lastPaint = null; record.wasMoving = false; }
          schedule();
        },
        stop() { clients.delete(record); schedule(); },
      };
    },
    dispose() { disposed = true; if (pending !== null) cancelFrame(pending); pending = null; clients.clear(); },
    get clientCount() { return clients.size; },
    get scheduled() { return pending !== null; },
  };
}

let browserTicker;
export function getAtmosphereTicker() {
  if (!browserTicker) browserTicker = createAtmosphereTicker({
    requestFrame: callback => window.requestAnimationFrame(callback),
    cancelFrame: id => window.cancelAnimationFrame(id),
    onError: error => console.warn('DTH Story decoration stopped; page content stays available.', error),
  });
  return browserTicker;
}
if (import.meta.hot) import.meta.hot.dispose(() => { browserTicker?.dispose(); browserTicker = undefined; });
