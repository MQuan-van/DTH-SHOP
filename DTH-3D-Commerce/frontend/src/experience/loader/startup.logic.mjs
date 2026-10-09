export const SCENE_RELEASE_MS = 180;
/** Give the exit fade a quiet paint boundary. This never gates API/session/page text readiness. */
export function scheduleSceneRelease(done, host = globalThis, delay = SCENE_RELEASE_MS) {
  let stopped = false, timer, fallback, frame1, frame2;
  const doc = host.document;
  const ms = Number.isFinite(delay) && delay >= 0 && delay <= 2000 ? delay : SCENE_RELEASE_MS;
  const finish = () => {
    if (stopped) return;
    if (doc?.hidden) return; // visibilitychange resumes; no background WebGL startup.
    stopped = true; cleanup(); done();
  };
  const cleanup = () => {
    host.clearTimeout(timer); host.clearTimeout(fallback);
    host.cancelAnimationFrame?.(frame1); host.cancelAnimationFrame?.(frame2);
    doc?.removeEventListener('visibilitychange', visible);
  };
  const paint = () => {
    if (stopped || doc?.hidden) return;
    // A timeout still releases if rAF is missing, throttled or suspended.
    fallback = host.setTimeout(finish, 250);
    if (typeof host.requestAnimationFrame === 'function') {
      frame1 = host.requestAnimationFrame(() => { if (!stopped) frame2 = host.requestAnimationFrame(finish); });
    } else finish();
  };
  const visible = () => { if (!doc?.hidden && !stopped) { cleanup(); timer = host.setTimeout(paint, ms); doc?.addEventListener('visibilitychange', visible); } };
  doc?.addEventListener('visibilitychange', visible);
  timer = host.setTimeout(paint, ms);
  return () => { stopped = true; cleanup(); };
}
