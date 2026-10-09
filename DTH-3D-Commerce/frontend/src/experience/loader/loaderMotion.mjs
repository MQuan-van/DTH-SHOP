import { LOADER_CONFIG } from './loader.config.mjs';
import { buildLoaderCues } from './loaderCues.mjs';

/** Nine compositor-friendly entry tracks on desktop; no rAF loop, video or WebGL. */
export function createLoaderMotion(root, { reduced = false, exit = false, duration = LOADER_CONFIG.exitMs, elapsedMs = 0 } = {}) {
  const animations = []; let disposed = false;
  const one = name => root?.querySelector?.(`[data-ignition-${name}]`);
  const many = name => [...(root?.querySelectorAll?.(`[data-ignition-${name}]`) || [])];
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const origin = root?.ownerDocument?.timeline?.currentTime;
  const play = (node, frames, options, id) => {
    if (!node || typeof node.animate !== 'function') return;
    try {
      const animation = node.animate(frames, { easing:'cubic-bezier(.16,1,.3,1)', fill:'both', iterations:1, ...options, id:`dth-ignition-${id}` });
      animation.finished?.catch?.(() => {});
      if (Number.isFinite(origin)) animation.startTime = origin - elapsed; else if (elapsed > 0) animation.currentTime = elapsed;
      animations.push(animation);
    } catch {}
  };
  const freeze = () => { if (!disposed) for (const a of animations) try { a.pause?.(); } catch {} };
  const finish = () => { if (!disposed) for (const a of animations) try { a.finish?.(); } catch {} };
  const dispose = () => { if (disposed) return; disposed = true; for (const a of animations) try { a.cancel(); } catch {} animations.length = 0; };
  const controls = { dispose, freeze, finish };
  if (!root) return controls;
  if (exit) {
    const ms = Number.isFinite(duration) && duration >= 0 && duration <= 2000 ? duration : LOADER_CONFIG.quietExitMs;
    if (!reduced) play(one('frame'), [
      { transform:'translate3d(0,-1svh,0) scale(1)', opacity:1 },
      { transform:'translate3d(0,-1svh,180px) scale(1.035)', opacity:.15 },
    ], { duration:ms, easing:'cubic-bezier(.55,0,.35,1)' }, 'camera-exit');
    play(root, [{ opacity:1 }, { opacity:0 }], { duration:ms }, reduced ? 'quiet-exit' : 'studio-exit');
    return controls;
  }
  if (reduced) return controls;
  const cue = buildLoaderCues();
  const compact = (root.ownerDocument?.defaultView?.innerWidth ?? 1440) < 600;
  if (!compact) {
    play(one('depth'), [
      { opacity:0, transform:'translate3d(0,10px,-120px) rotateX(12deg) scale(.94)' },
      { opacity:.5, offset:.42 },
      { opacity:.12, transform:'translate3d(0,0,-75px) rotateX(0deg) scale(1)' },
    ], cue.depth, 'depth-plate');
    play(one('portal'), [
      { opacity:0, transform:'translate3d(0,0,-80px) rotateX(73deg) rotateZ(-30deg) scale(.72)' },
      { opacity:.55, offset:.36 },
      { opacity:.12, transform:'translate3d(0,0,-38px) rotateX(66deg) rotateZ(-10deg) scale(1)' },
    ], cue.portal, 'portal-depth');
  }
  many('fragment').slice(0,3).forEach((node,i) => {
    if (compact && i === 1) return;
    const x=[-22,18,-12][i], z=[-86,-54,-28][i], ry=[-9,7,-5][i];
    play(node,[
      { opacity:0, transform:`translate3d(${x}px,${i-1}0px,${z}px) rotateY(${ry}deg) rotateX(${i===1?-4:5}deg)` },
      { opacity:i===2?.95:.62, offset:.38 },
      { opacity:i===2?1:.72, transform:'translate3d(0,0,0) rotateY(0deg) rotateX(0deg)', offset:.68 },
      { opacity:0, transform:'translate3d(0,0,0)' },
    ], cue.fragments[i], `fragment-${i}`);
  });
  play(one('face'), [
    { opacity:0, transform:'translate3d(0,4px,-18px) scale(.992)' },
    { opacity:1, transform:'translate3d(0,0,0) scale(1)' },
  ], cue.face, 'original-face-reveal');
  play(one('silver'), [
    { opacity:0, transform:'translate3d(0,0,0) skewX(-10deg)' },
    { opacity:.36, offset:.27 }, { opacity:.22, offset:.72 },
    { opacity:0, transform:'translate3d(940%,0,0) skewX(-10deg)' },
  ], { ...cue.silver, easing:'cubic-bezier(.35,0,.5,1)' }, 'silver-sweep');
  if (!compact) play(one('aura'), [{opacity:0},{opacity:.38,offset:.36},{opacity:0}], cue.aura, 'red-aura');
  play(one('underline'), [
    { opacity:0, transform:'scaleX(.08) translateZ(4px)' },
    { opacity:.68, transform:'scaleX(.88) translateZ(4px)', offset:.55 },
    { opacity:0, transform:'scaleX(1) translateZ(4px)' },
  ], cue.underline, 'signature-line');
  return controls;
}
