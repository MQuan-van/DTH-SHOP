const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const unit = value => Math.max(0, Math.min(1, finite(value)));
const signed = value => Math.max(-1, Math.min(1, finite(value)));

export function atmospherePermission246(policy, { focusing = false, busy = false } = {}) {
  const motion = Boolean(policy.allowed && policy.motion && !policy.compact && !policy.reduced && !policy.saveData);
  return { motion, blocked: !motion || Boolean(policy.hidden || policy.paused || focusing || busy) };
}
/** Bounded light composition only. Never reads form contents or a product transform. */
export function atmospherePose246(state = {}, pointer = {}) {
  const intro = unit(state.intro), mode = unit(state.mode), detail = unit(state.detail);
  return {
    x: pointer.active ? signed(pointer.x) * 66 : 0,
    y: pointer.active ? -signed(pointer.y) * 34 : 0,
    apertureRotation: -4 + intro * 4 + mode * 5 - detail * 3,
    apertureScale: .94 + intro * .06 + detail * .06,
    opacity: .67 + intro * .2 + detail * .1,
  };
}
/** Reset quickTo's cached start too, so compact/reduced → desktop cannot replay an old offset. */
export function resetLightPointer246(xTo, yTo) {
  xTo(0, 0, false); yTo(0, 0, false);
  xTo.tween.pause(); yTo.tween.pause();
}
