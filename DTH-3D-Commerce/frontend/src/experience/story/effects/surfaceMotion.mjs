/** DTH Story only. Time-based capsule trail; no global ticker or database state. */
export const SURFACE_FX = Object.freeze({
  samples: 32,
  historySize: 256,
  trailSeconds: 0.48,
  pointerTau: 0.025,
  pacePeak: 3.0,
  paceAttack: 0.055,
  paceRelease: 0.16,
  radius: 0.29,
  warp: 0.045,
  introSeconds: 1.85,
  transitionSeconds: 1.15,
  scanSeconds: 3.1,
  scanWidth: 0.10,
  scanOpacity: 0.46,
  maxWireTriangles: 60000,
});
const MODES = new Set(['surface', 'reveal', 'technical']);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const approach = (a, b, dt, tau) => a + (b - a) * (1 - Math.exp(-dt / tau));
const smooth = t => t * t * (3 - 2 * t);

/** Stable snapshots for React.useSyncExternalStore. No motion on every React render. */
export function createSurfaceController() {
  let snapshot = Object.freeze({ mode: 'surface', replaySerial: 0, supported: true });
  const listeners = new Set();
  const publish = patch => {
    if (!Object.entries(patch).some(([k, v]) => snapshot[k] !== v)) return;
    snapshot = Object.freeze({ ...snapshot, ...patch });
    [...listeners].forEach(fn => fn());
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    choose(mode) { if (!MODES.has(mode)) return false; publish({ mode }); return true; },
    replay() { publish({ mode: 'surface', replaySerial: snapshot.replaySerial + 1 }); },
    supported(value) { publish({ supported: Boolean(value), ...(!value ? { mode: 'surface' } : {}) }); },
    get listenerCount() { return listeners.size; },
  };
}

/** Local event coordinates must match the canvas, NOT the window or page scroll. */
export function pointInCanvas(clientX, clientY, rect) {
  if (![clientX, clientY, rect?.left, rect?.top, rect?.width, rect?.height].every(Number.isFinite)
    || rect.width <= 0 || rect.height <= 0) return null;
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  return x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x: 2 * x - 1, y: 1 - 2 * y } : null;
}

export function createSurfaceEngine() {
  const trail = new Float32Array(SURFACE_FX.samples * 3);
  const times = new Float64Array(SURFACE_FX.historySize);
  const xs = new Float64Array(SURFACE_FX.historySize);
  const ys = new Float64Array(SURFACE_FX.historySize);
  let head = -1, count = 0, seeded = false, inside = false;
  let tx = 0, ty = 0, px = 0, py = 0, pace = 0, time = 0;
  let mode = 'surface', replaySerial = 0, level = 1, from = 1, target = 1, travel = 1;
  let duration = SURFACE_FX.introSeconds, started = false;
  const state = { time: 0, level: 1, pace: 0, trail, bounds: [-10, -10, -10, -10],
    mode: 'surface', scanning: false, needsFrame: false, pointerAllowed: false };
  function clear() {
    seeded = false; inside = false; pace = 0; count = 0; head = -1;
    trail.fill(0); state.pace = 0; state.bounds.fill(-10);
  }
  function push(x, y) {
    head = (head + 1) % times.length;
    times[head] = time; xs[head] = x; ys[head] = y;
    count = Math.min(count + 1, times.length);
  }
  function move(x, y) {
    if (![x, y].every(Number.isFinite)) return;
    tx = clamp(x, -1, 1); ty = clamp(y, -1, 1); inside = true;
    if (!seeded) { px = tx; py = ty; seeded = true; push(px, py); }
  }
  function transition(next, seconds) { from = level; target = next; travel = 0; duration = seconds; }
  function start() { started = true; level = 0; transition(1, SURFACE_FX.introSeconds); }
  function step(delta, gate, control, aspect = 1) {
    const requested = MODES.has(control?.mode) ? control.mode : 'surface';
    const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
    const serial = Number.isSafeInteger(control?.replaySerial) ? control.replaySerial : 0;
    const dt = Number.isFinite(delta) ? clamp(delta, 0, 0.05) : 0;
    const pointerAllowed = gate.pointerAllowed !== false;
    const effective = !control?.supported || !gate.motion || (requested === 'reveal' && !pointerAllowed)
      ? 'surface' : requested;
    state.needsFrame = false;
    state.pointerAllowed = pointerAllowed;
    if (!started) return state;
    // A pause finishes in a complete readable surface; tab/overlay gates instead freeze.
    if (!gate.motion || !control?.supported) {
      mode = 'surface'; level = 1; from = 1; target = 1; travel = 1; replaySerial = serial; clear();
    } else if (gate.active && !gate.blocked) {
      if (serial !== replaySerial) {
        replaySerial = serial; mode = 'surface'; level = 0; clear();
        transition(1, SURFACE_FX.introSeconds);
      }
      if (effective !== mode) {
        mode = effective; clear(); transition(mode === 'surface' ? 1 : 0, SURFACE_FX.transitionSeconds);
      }
      time += dt;
      if (travel < 1) { travel = Math.min(1, travel + dt / duration); level = from + (target - from) * smooth(travel); }
      if (mode === 'reveal' && pointerAllowed && seeded) {
        const ox = px, oy = py;
        px = approach(px, tx, dt, SURFACE_FX.pointerTau);
        py = approach(py, ty, dt, SURFACE_FX.pointerTau);
        const speed = dt > 0 ? Math.hypot((px - ox) * safeAspect, py - oy) / dt : 0;
        const wanted = inside ? clamp(speed / SURFACE_FX.pacePeak, 0, 1) : 0;
        pace = approach(pace, wanted, dt, wanted > pace ? SURFACE_FX.paceAttack : SURFACE_FX.paceRelease);
        if (dt > 0) push(px, py);
        let back = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let i = 0; i < SURFACE_FX.samples; i++) {
          const sampleTime = time - i * SURFACE_FX.trailSeconds / (SURFACE_FX.samples - 1);
          while (back < count - 1 && times[(head - back + times.length) % times.length] > sampleTime) back++;
          const a = (head - back + times.length) % times.length;
          const b = (a + 1) % times.length;
          const blend = back === 0 || times[b] <= times[a] ? 0 : clamp((sampleTime - times[a]) / (times[b] - times[a]), 0, 1);
          const x = (xs[a] + (xs[b] - xs[a]) * blend) * safeAspect;
          const y = ys[a] + (ys[b] - ys[a]) * blend;
          trail[i * 3] = x; trail[i * 3 + 1] = y;
          trail[i * 3 + 2] = Math.pow(1 - i / SURFACE_FX.samples, 1.35);
          minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
        const margin = SURFACE_FX.radius + SURFACE_FX.warp * 2;
        state.bounds[0] = minX - margin; state.bounds[1] = minY - margin;
        state.bounds[2] = maxX + margin; state.bounds[3] = maxY + margin;
        if (!inside && pace < 0.001) clear();
      }
      state.needsFrame = travel < 1 || mode !== 'surface';
    } else { clear(); }
    state.time = time; state.level = level; state.pace = pace; state.mode = mode;
    state.scanning = mode !== 'surface' && gate.motion && control?.supported !== false;
    return state;
  }
  return { state, start, step, move, leave() { inside = false; }, clear };
}
