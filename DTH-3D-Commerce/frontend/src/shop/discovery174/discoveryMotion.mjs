import { DISCOVERY_MOTION as motion } from './discovery.config.mjs';
/** Finite animations only, all cleanup owned by the caller. Never drives React state every frame. */
export function revealNodes(root, { enabled = true } = {}) {
  const animations = [];
  if (enabled && root) {
    const nodes = [...(root.querySelectorAll?.('[data-discovery-enter]') || [])].slice(0, 8);
    for (const [index, node] of nodes.entries()) {
      if (typeof node.animate !== 'function') continue;
      try {
        const animation = node.animate([
          { opacity: 0, transform: 'translate3d(0,18px,0)' },
          { opacity: 1, transform: 'translate3d(0,0,0)' },
        ], { duration: motion.enterMs, delay: Math.min(index, 4) * motion.staggerMs, easing: motion.ease, fill: 'backwards', iterations: 1 });
        animations.push(animation);
        animation.finished?.then?.(() => animation.cancel()).catch?.(() => {});
      } catch { /* Content is visible in base CSS if animation is unavailable. */ }
    }
  }
  let disposed = false;
  return () => { if (disposed) return; disposed = true; for (const animation of animations) { try { animation.cancel(); } catch {} } };
}
export function pointerOffset(x, y, rect) {
  if (!rect || !Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  const clamp = value => Number.isFinite(value) ? Math.min(1, Math.max(-1, value)) : 0;
  return { x: clamp(((x - rect.left) / rect.width - .5) * 2) * motion.parallaxPx,
    y: clamp(((y - rect.top) / rect.height - .5) * 2) * motion.parallaxPx };
}
