import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';

// This reporter reads existing store state. It never starts an additional API request.
export const AppReadinessContext = createContext(null);
export function useAppReadiness(loading, error) {
  const report = useContext(AppReadinessContext);
  useLayoutEffect(() => { report?.({ ready: !loading && !error, error: Boolean(error) }); }, [report, loading, error]);
}

/** Wait for real route text, then allow a bounded image decode. GLB is never a gate. */
export function useFirstPageReady(root, catalogReady, enabled, posterBudgetMs) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled || !catalogReady) return;
    let alive = true, started = false, firstFrame = 0, secondFrame = 0, timer;
    const finish = () => {
      if (!alive) return;
      clearTimeout(timer);
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => { if (alive) setReady(true); });
      });
    };
    const inspect = () => {
      const main = root.current?.querySelector('#dth-content');
      // A lazy-route placeholder must not count as the ready page.
      if (started || !main?.querySelector('h1, h2')) return;
      started = true;
      observer?.disconnect();
      const img = main.querySelector('img');
      let settled = false;
      const once = () => { if (!settled) { settled = true; finish(); } };
      timer = setTimeout(once, posterBudgetMs);
      if (!img || (img.complete && !img.naturalWidth)) { once(); return; }
      if (typeof img.decode === 'function') img.decode().then(once, once);
      else if (img.complete) once();
      // Unsupported decode / a pending image uses the bounded timer; no extra fetch.
    };
    const observer = typeof MutationObserver === 'function' ? new MutationObserver(inspect) : null;
    if (root.current) observer?.observe(root.current, { childList: true, subtree: true });
    inspect();
    return () => { alive = false; clearTimeout(timer); cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); observer?.disconnect(); };
  }, [root, catalogReady, enabled, posterBudgetMs]);
  return ready;
}
