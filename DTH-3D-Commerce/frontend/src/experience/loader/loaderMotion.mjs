import { LOADER_CONFIG } from './loader.config.mjs';
import { buildLoaderCues } from './loaderCues.mjs';

/** Seven entry tracks on desktop / five on compact screens; no rAF/React loop. */
export function createLoaderMotion(root, {
  reduced = false, exit = false, duration = LOADER_CONFIG.exitMs, elapsedMs = 0,
} = {}) {
  const animations = [];
  let disposed = false;
  const one = name => root?.querySelector?.(`[data-ignition-${name}]`);
  const many = name => [...(root?.querySelectorAll?.(`[data-ignition-${name}]`) || [])];
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const origin = root?.ownerDocument?.timeline?.currentTime;
  const play = (node, frames, options, id) => {
    if (!node || typeof node.animate !== 'function') return;
    try {
      const animation = node.animate(frames, {
        easing: 'cubic-bezier(.22,.75,.22,1)', fill: 'both', iterations: 1,
        ...options, id: `dth-ignition-${id}`,
      });
      animation.finished?.catch?.(() => {});
      // One time origin for every strip; a StrictMode setup replay resumes rather than restarts.
      if (Number.isFinite(origin)) animation.startTime = origin - elapsed;
      else if (elapsed > 0) animation.currentTime = elapsed;
      animations.push(animation);
    } catch { /* Visible original logo and independent Gate timers remain usable. */ }
  };
  const freeze = () => { if (!disposed) for (const a of animations) { try { a.pause?.(); } catch {} } };
  const finish = () => { if (!disposed) for (const a of animations) { try { a.finish?.(); } catch {} } };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const a of animations) { try { a.cancel(); } catch {} }
    animations.length = 0;
  };
  const controls = { dispose, freeze, finish };
  if (!root) return controls;
  if (exit) {
    const ms = Number.isFinite(duration) && duration >= 0 && duration <= 2000
      ? duration : LOADER_CONFIG.quietExitMs;
    play(root, [{ opacity: 1 }, { opacity: 0 }], { duration: ms }, reduced ? 'quiet-exit' : 'studio-exit');
    return controls;
  }
  if (reduced) return controls;
  const cue = buildLoaderCues();
  const compact = (root.ownerDocument?.defaultView?.innerWidth ?? 1440) < 600;
  many('fragment').slice(0, 3).forEach((node, i) => {
    if (compact && i === 1) return;
    const x = [ -18, 14, -10 ][i];
    play(node, [
      { opacity: 0, transform: `translate3d(${x}px,0,0)` },
      { opacity: i === 2 ? .95 : .6, offset: .35 },
      { opacity: i === 2 ? 1 : .7, transform: 'translate3d(0,0,0)', offset: .65 },
      { opacity: 0, transform: 'translate3d(0,0,0)' },
    ], cue.fragments[i], `fragment-${i}`);
  });
  play(one('face'), [
    { opacity: 0, transform: 'translate3d(0,3px,0) scale(.994)' },
    { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' },
  ], cue.face, 'original-face-reveal');
  play(one('silver'), [
    { opacity: 0, transform: 'translate3d(0,0,0)' },
    { opacity: .32, offset: .28 },
    { opacity: .2, offset: .7 },
    { opacity: 0, transform: 'translate3d(940%,0,0)' },
  ], { ...cue.silver, easing: 'cubic-bezier(.35,0,.5,1)' }, 'silver-sweep');
  if (!compact) play(one('aura'), [
    { opacity: 0 }, { opacity: .38, offset: .36 }, { opacity: 0 },
  ], cue.aura, 'red-aura');
  play(one('underline'), [
    { opacity: 0, transform: 'scaleX(.1)' },
    { opacity: .65, transform: 'scaleX(.85)', offset: .55 },
    { opacity: 0, transform: 'scaleX(1)' },
  ], cue.underline, 'signature-line');
  return controls;
}
