/** Presentation-only input math. Never accepts credentials or owns authentication. */
export function accessPointer243(clientX, clientY, bounds) {
  if (![clientX, clientY, bounds?.left, bounds?.top, bounds?.width, bounds?.height].every(Number.isFinite)
    || bounds.width <= 0 || bounds.height <= 0) return { x: 0, y: 0, active: false };
  const clamp = value => Math.max(-1, Math.min(1, value));
  return { x: clamp((clientX - bounds.left) / bounds.width * 2 - 1),
    y: clamp(1 - (clientY - bounds.top) / bounds.height * 2), active: true };
}

export function accessMotion243({ allowed, reduced, hidden, paused, saveData, focusing, busy, finePointer }) {
  const motion = Boolean(allowed && !reduced && !hidden && !paused && !saveData);
  return { motion, interactive: Boolean(motion && finePointer && !focusing && !busy) };
}

export function capsLock243(event) {
  return typeof event?.getModifierState === 'function' && event.getModifierState('CapsLock') === true;
}
