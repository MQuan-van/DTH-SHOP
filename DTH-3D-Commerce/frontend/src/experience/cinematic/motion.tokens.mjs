export const DTH_MOTION = Object.freeze({
  ease: 'cubic-bezier(.16,1,.3,1)',
  easeSoft: 'cubic-bezier(.22,.75,.22,1)',
  fastMs: 180,
  baseMs: 420,
  slowMs: 760,
  routeOutMs: 130,
  routeInMs: 320,
  perspective: 1200,
});

export function clampUnit(value) {
  return Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
}

export function pointerVector(clientX, clientY, rect) {
  if (!rect || !Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: clampUnit(((clientX - rect.left) / rect.width - .5) * 2),
    y: clampUnit(((clientY - rect.top) / rect.height - .5) * 2),
  };
}
