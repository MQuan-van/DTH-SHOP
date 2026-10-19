/** Finite entry motion only: no scroll-jacking, loops, video or application timers. */
export function animateGarage(root, enabled = true, selector = '[data-garage-enter]') {
  const animations = [];
  if (enabled) for (const [i, node] of [...(root?.querySelectorAll?.(selector) || [])].slice(0, 6).entries()) {
    try {
      if (!node.animate) continue;
      const a = node.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 260, delay: i * 28, easing: 'cubic-bezier(.2,.7,.2,1)', iterations: 1, fill: 'backwards' });
      a.finished?.catch?.(() => {}); animations.push(a);
    } catch { /* Static content is still visible. */ }
  }
  let disposed = false;
  return () => { if (disposed) return; disposed = true; for (const a of animations) { try { a.cancel(); } catch {} } };
}
