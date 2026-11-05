const MAX_WHEEL_PIXELS = 240;
const PIXELS_PER_PHASE = 480;
const PHASE_COUNT = 4;
const PIXELS_PER_LINE = 16;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function wheelWashDelta247(event, viewportHeight = 800) {
  const {
    deltaMode = 0, deltaX = 0, deltaY, ctrlKey, metaKey, shiftKey,
  } = event ?? {};
  if (ctrlKey || metaKey || shiftKey || !Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
    return 0;
  }
  if (deltaY === 0 || Math.abs(deltaX) > Math.abs(deltaY)) return 0;

  let unit;
  switch (deltaMode) {
    case 0:
      unit = 1;
      break;
    case 1:
      unit = PIXELS_PER_LINE;
      break;
    case 2:
      unit = clamp(Number.isFinite(viewportHeight) ? viewportHeight : 800, 240, 1600);
      break;
    default:
      return 0;
  }

  return clamp(deltaY * unit, -MAX_WHEEL_PIXELS, MAX_WHEEL_PIXELS);
}

/** Keep tween destinations continuous even when the visible palette wraps. */
export function wheelWashTravel247(current, deltaPixels) {
  const phase = Number.isFinite(current) ? current : 0;
  const pixels = Number.isFinite(deltaPixels) ? deltaPixels : 0;
  return phase + clamp(pixels, -MAX_WHEEL_PIXELS, MAX_WHEEL_PIXELS) / PIXELS_PER_PHASE;
}

/** A fast burst can lead the visible wash by at most one palette stop. */
export function wheelWashDestination247(rendered, target, deltaPixels) {
  const phase = Number.isFinite(rendered) ? rendered : 0;
  return clamp(wheelWashTravel247(Number.isFinite(target) ? target : phase, deltaPixels), phase - 1, phase + 1);
}

export function advanceWheelWash247(current, deltaPixels) {
  const phase = Number.isFinite(current) ? current % PHASE_COUNT : 0;
  const remainder = wheelWashTravel247(phase, deltaPixels) % PHASE_COUNT;
  if (remainder === 0) return 0;
  if (remainder > 0) return remainder;

  const wrapped = PHASE_COUNT + remainder;
  return wrapped < PHASE_COUNT ? wrapped : 0;
}
