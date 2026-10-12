/** Finite, scoped Web Animations; never delays the actual selection/save operation. */
export function animateNVXEntry(root, enabled = true) {
  const animations = [];
  if (root && enabled) {
    const items = root.querySelectorAll?.('[data-nvx-enter]') || [];
    [...items].slice(0, 6).forEach((el, i) => {
      try {
        if (typeof el.animate !== 'function') return;
        const a = el.animate([{ opacity: 0, transform: 'translate3d(0,12px,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }],
          { duration: 360, delay: i * 45, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards', iterations: 1 });
        a.finished?.catch?.(() => {}); animations.push(a);
      } catch { /* The static, usable UI is the fallback. */ }
    });
  }
  let disposed = false;
  return () => { if (disposed) return; disposed = true; animations.forEach(a => { try { a.cancel(); } catch {} }); };
}
