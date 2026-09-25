const TAU = Math.PI * 2;

/** Home's product turntable; never writes the camera or the original GLB.
 * Pauses retain their angle. Only visible, unblocked Story frames consume time,
 * so background tabs and manual inspection never accumulate catch-up rotation.
 */
export function createHomeTurntable(options = null) {
  const enabled = options?.enabled === true;
  const seconds = Number.isFinite(options?.secondsPerTurn)
    ? Math.max(4, Math.min(120, options.secondsPerTurn)) : 16;
  const direction = options?.direction === 1 ? 1 : -1;
  const resumeDelay = Number.isFinite(options?.scrollResumeDelay)
    ? Math.max(0, Math.min(2, options.scrollResumeDelay)) : 0.35;
  const result = { angle: 0, running: false, needsFrame: false };
  let previousProgress = null, remainingDelay = 0;
  return {
    state: result,
    step(delta, state) {
      const dt = Number.isFinite(delta) ? Math.max(0, Math.min(0.05, delta)) : 0;
      const progress = Number.isFinite(state.progress) ? state.progress : 0;
      if (previousProgress !== null && Math.abs(progress - previousProgress) > 0.00001) remainingDelay = resumeDelay;
      previousProgress = progress;
      const allowed = enabled && state.motion && state.active && !state.blocked && !state.inspecting && state.mode === 'story';
      result.running = false;
      result.needsFrame = Boolean(allowed);
      if (!allowed) return result;
      if (remainingDelay > 0) { remainingDelay = Math.max(0, remainingDelay - dt); return result; }
      result.running = true;
      // Keep the phase bounded. Quaternion composition makes wraparound seamless.
      result.angle = (result.angle + direction * TAU * dt / seconds) % TAU;
      return result;
    },
  };
}
