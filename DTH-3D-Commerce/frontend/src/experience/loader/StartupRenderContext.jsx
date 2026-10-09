import { createContext, useContext, useEffect, useState } from 'react';
import { scheduleSceneRelease } from './startup.logic.mjs';

// Synchronous context: unlike a DOM query, this is already true on the FIRST child render.
export const StartupCoverContext = createContext(false);
export function useStartupCovered() { return useContext(StartupCoverContext); }
export function useStartupAllowed() {
  const covered = useStartupCovered();
  const [released, setReleased] = useState(() => !covered);
  useEffect(() => {
    if (covered) { setReleased(false); return undefined; }
    if (released) return undefined;
    return scheduleSceneRelease(() => setReleased(true), window);
  }, [covered, released]);
  return !covered && released;
}
/** null = not probed yet, false = unavailable. Do not confuse deferred work with a failed model. */
export function useStartupWebGL(probe) {
  const allowed = useStartupAllowed();
  const [capable, setCapable] = useState(null);
  useEffect(() => {
    if (!allowed || capable !== null) return undefined;
    let alive = true;
    const inspect = () => {
      if (!alive || document.hidden) return;
      let value = false;
      try { value = Boolean(probe()); } catch {}
      if (alive) setCapable(value);
    };
    inspect();
    document.addEventListener('visibilitychange', inspect);
    return () => { alive = false; document.removeEventListener('visibilitychange', inspect); };
  }, [allowed, capable, probe]);
  return { allowed, capable, allow3D: allowed && capable === true };
}
