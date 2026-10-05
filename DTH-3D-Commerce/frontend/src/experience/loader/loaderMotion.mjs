import { LOADER_CONFIG } from './loader.config.mjs';
import { buildLoaderCues } from './loaderCues.mjs';

/** A finite WAAPI choreography. No new canvas, timers, global event handlers or asset requests. */
export function createLoaderMotion(root, {
  reduced = false, exit = false, duration = LOADER_CONFIG.exitMs,
} = {}) {
  const animations = [];
  let disposed = false;
  const one = name => root?.querySelector?.(`[data-ignition-${name}]`);
  const many = name => [...(root?.querySelectorAll?.(`[data-ignition-${name}]`) || [])];
  const play = (node, frames, options, id) => {
    if (!node || typeof node.animate !== 'function') return;
    try {
      const animation = node.animate(frames, {
        easing: 'cubic-bezier(.2,.75,.2,1)', fill: 'both', iterations: 1,
        ...options, id: `dth-ignition-${id}`,
      });
      // An optional finished promise may reject on Skip/unmount. Never leak a rejection.
      animation.finished?.catch?.(() => {});
      animations.push(animation);
    } catch { /* Static logo and the independent Gate watchdog remain available. */ }
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const animation of animations) {
      try { animation.cancel(); } catch { /* detached element */ }
    }
    animations.length = 0;
  };
  if (!root) return { dispose };

  if (exit) {
    const ms = Number.isFinite(duration) && duration >= 0 && duration <= 2000
      ? duration : LOADER_CONFIG.quietExitMs;
    if (reduced) {
      play(root, [{ opacity: 1 }, { opacity: 0 }], { duration: ms }, 'quiet-exit');
    } else {
      play(one('upper'), [
        { transform: 'translate3d(0,0,0)' },
        { transform: 'translate3d(0,-104%,0)' },
      ], { duration: ms, easing: 'cubic-bezier(.65,0,.2,1)' }, 'upper-exit');
      play(one('lower'), [
        { transform: 'translate3d(0,0,0)' },
        { transform: 'translate3d(0,104%,0)' },
      ], { duration: ms, easing: 'cubic-bezier(.65,0,.2,1)' }, 'lower-exit');
      play(one('content'), [
        { opacity: 1, transform: 'perspective(1300px) translateZ(0) scale(1)' },
        { opacity: 0, transform: 'perspective(1300px) translateZ(-35px) scale(.97)' },
      ], { duration: ms * .62 }, 'logo-exit');
      play(one('bridge'), [
        { transform: 'scaleX(.06)', opacity: 0 },
        { transform: 'scaleX(1)', opacity: .76, offset: .36 },
        { transform: 'scaleX(1)', opacity: 0 },
      ], { duration: ms }, 'bridge-exit');
      play(one('grid'), [{ opacity: 1 }, { opacity: 0 }], { duration: ms * .55 }, 'grid-exit');
      play(one('footer'), [{ opacity: 1 }, { opacity: 0 }], { duration: ms * .4 }, 'footer-exit');
    }
    return { dispose };
  }
  if (reduced) return { dispose };

  const cues = buildLoaderCues();
  const compact = (root.ownerDocument?.defaultView?.innerWidth ?? 1440) < 600;
  play(one('grid'), [
    { opacity: 0, transform: 'scale(1.08)' },
    { opacity: 1, transform: 'scale(1)' },
  ], cues.grid, 'grid-entry');
  many('bracket').forEach((node, index) => play(node, [
    { opacity: 0, transform: `translate(${index % 2 ? 14 : -14}px,${index < 2 ? -10 : 10}px)` },
    { opacity: 1, transform: 'translate(0,0)' },
  ], { ...cues.brackets, delay: cues.brackets.delay + index * cues.total * .025 }, `bracket-${index}`));

  play(one('stage'), [
    { transform: 'perspective(1200px) translateY(14px) rotateX(7deg) rotateY(-5deg) scale(1.055)' },
    { transform: 'perspective(1200px) translateY(0) rotateX(0deg) rotateY(0deg) scale(1)' },
  ], cues.stage, 'stage-settle');
  play(one('face'), [
    { opacity: 0, clipPath: 'polygon(-24% 0,0% 0,-18% 100%,-24% 100%)' },
    { opacity: 1, clipPath: 'polygon(-24% 0,18% 0,0% 100%,-24% 100%)', offset: .13 },
    { opacity: 1, clipPath: 'polygon(-24% 0,125% 0,105% 100%,-24% 100%)' },
  ], { ...cues.face, easing: 'cubic-bezier(.4,0,.2,1)' }, 'original-face-reveal');

  many('echo').forEach((node, i) => {
    if (compact && i > 0) return;
    const sign = i ? -1 : 1;
    play(node, [
      { opacity: 0, transform: `translate3d(${sign * 15}px,${i ? -5 : 5}px,-24px) scale(1.02)` },
      { opacity: .12, offset: .28 },
      { opacity: .08, offset: .58 },
      { opacity: 0, transform: 'translate3d(0,0,0) scale(1)' },
    ], cues.echo, `depth-echo-${i}`);
  });
  many('segment').forEach((node, i) => play(node, [
    { opacity: 0, transform: 'translateX(-3px)' },
    { opacity: 1, transform: 'translateX(0)', offset: .25 },
    { opacity: 1, offset: .66 },
    { opacity: 0, transform: 'translateX(0)' },
  ], cues.segments[Math.min(i, cues.segments.length - 1)], `red-segment-${i}`));

  many('arc').forEach((node, i) => play(node, [
    { strokeDashoffset: 1, opacity: 0 },
    { opacity: .8, offset: .2 },
    { strokeDashoffset: 0, opacity: .38 },
  ], { ...cues.rings, delay: cues.rings.delay + i * cues.total * .045 }, `arc-${i}`));
  play(one('aura'), [
    { opacity: 0, transform: 'scaleX(.35)' },
    { opacity: .65, transform: 'scaleX(.92)', offset: .32 },
    { opacity: .12, transform: 'scaleX(1)' },
  ], cues.underglow, 'ignition-aura');
  many('streak').forEach((node, i) => {
    if (compact && i > 1) return;
    const sign = i % 2 ? -1 : 1;
    play(node, [
      { opacity: 0, transform: `translateX(${sign * -38}px) scaleX(.2)` },
      { opacity: .45, offset: .25 },
      { opacity: 0, transform: `translateX(${sign * 42}px) scaleX(1.1)` },
    ], cues.streaks[Math.min(i, cues.streaks.length - 1)], `streak-${i}`);
  });
  play(one('silver'), [
    { transform: 'translateX(-130%) skewX(-18deg)', opacity: 0 },
    { opacity: .48, offset: .2 },
    { opacity: .42, offset: .8 },
    { transform: 'translateX(650%) skewX(-18deg)', opacity: 0 },
  ], { ...cues.silver, easing: 'cubic-bezier(.3,0,.45,1)' }, 'silver-sweep');
  play(one('glint'), [
    { opacity: 0, transform: 'scale(.3) rotate(0deg)' },
    { opacity: .72, transform: 'scale(1) rotate(10deg)', offset: .5 },
    { opacity: 0, transform: 'scale(.55) rotate(18deg)' },
  ], cues.glint, 'silver-glint');
  play(one('cyan'), [
    { transform: 'scaleX(.01)', opacity: 0 },
    { transform: 'scaleX(.8)', opacity: .8, offset: .5 },
    { transform: 'scaleX(1)', opacity: .3 },
  ], cues.cyan, 'cyan-bridge');
  many('word').forEach((node, i) => play(node, [
    { opacity: 0, transform: 'translateY(110%) rotateX(16deg)' },
    { opacity: 1, transform: 'translateY(0) rotateX(0deg)' },
  ], { duration: cues.tagline.duration * .74, delay: cues.tagline.delay + i * cues.total * .026 }, `tagline-${i}`));
  return { dispose };
}
