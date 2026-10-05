export const DRAWER_TIMING = Object.freeze({ open: 440, close: 260, row: 320, queue: 8000 });
const EASE = 'cubic-bezier(.22,.78,.2,1)';

export function otherOverlay(document, drawer) {
  return !![...document.querySelectorAll('dialog[open], .dth-support-panel, [data-dth-ignition="true"]')]
    .find(el => el !== drawer);
}

/** Wait for the existing Quick View to finish its own cleanup. Never close someone else's dialog. */
export function waitForCartSlot(dialog, ready, cancel, getCancelled = () => false) {
  const doc = dialog.ownerDocument, win = doc.defaultView;
  let disposed = false, frame = 0;
  const inspect = () => {
    frame = 0;
    if (disposed) return;
    if (getCancelled()) { cancel(); return; }
    if (!doc.hidden && !otherOverlay(doc, dialog)) { dispose(); ready(); }
  };
  const schedule = () => { if (!disposed && !frame) frame = win.requestAnimationFrame(inspect); };
  const observer = new win.MutationObserver(schedule);
  observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'inert'] });
  doc.addEventListener('visibilitychange', schedule);
  const timer = win.setTimeout(() => { dispose(); cancel(); }, DRAWER_TIMING.queue);
  function dispose() {
    if (disposed) return;
    disposed = true; win.cancelAnimationFrame(frame); win.clearTimeout(timer); observer.disconnect();
    doc.removeEventListener('visibilitychange', schedule);
  }
  schedule();
  return dispose;
}

/** Browser-only controller; React owns data, this owns native dialog lifetime and finite animations. */
export function createDrawerSession(dialog, { trigger, motion = true, onClosed = () => {} } = {}) {
  const doc = dialog.ownerDocument, win = doc.defaultView;
  const panel = dialog.querySelector('[data-cart-panel]'), scrim = dialog.querySelector('[data-cart-scrim]');
  if (!panel || !scrim || typeof dialog.showModal !== 'function') throw new Error('Native dialog unavailable.');
  if (otherOverlay(doc, dialog)) throw new Error('Another overlay is open.');
  const media = win.matchMedia('(prefers-reduced-motion: reduce)'), compact = win.matchMedia('(max-width: 639px)');
  const animations = new Set();
  const body = doc.body, overflow = body.style.overflow, padding = body.style.paddingRight;
  const gap = Math.max(0, win.innerWidth - doc.documentElement.clientWidth);
  const restoreTarget = trigger?.isConnected && !trigger.closest?.('dialog') ? trigger : doc.activeElement;
  let disposed = false, closing = false, notified = false, closePromise = null, closeTimer = 0, resolveClose = null;
  const allowed = () => motion && !media.matches && !doc.hidden && typeof panel.animate === 'function';
  const offset = () => compact.matches ? 'translate3d(0,100%,0)' : 'translate3d(104%,0,0) rotateY(-3deg)';
  function play(el, frames, duration, delay = 0) {
    if (!allowed()) return null;
    const a = el.animate(frames, { duration, delay, easing: EASE, fill: 'backwards' });
    animations.add(a); a.finished.then(() => { animations.delete(a); a.cancel(); }, () => animations.delete(a));
    return a;
  }
  function cancelAnimations() { for (const a of animations) a.cancel(); animations.clear(); }
  function settle() { for (const a of [...animations]) { try { a.finish(); } catch { a.cancel(); } } }
  function focusBack() {
    win.requestAnimationFrame(() => {
      if (doc.querySelector('dialog[open]')) return;
      const candidate = restoreTarget?.isConnected && !restoreTarget.disabled && !restoreTarget.closest?.('[inert]') ? restoreTarget
        : doc.querySelector('.dth-bag-button') || doc.querySelector('#dth-content');
      candidate?.focus?.({ preventScroll: true });
    });
  }
  function notify() { if (!notified) { notified = true; onClosed(); } }
  function dispose(restore = false) {
    if (disposed) return;
    disposed = true; win.clearTimeout(closeTimer); cancelAnimations(); observer.disconnect();
    doc.removeEventListener('visibilitychange', visibility); win.removeEventListener('resize', settle);
    media.removeEventListener('change', settle); dialog.removeEventListener('keydown', keyboard);
    dialog.removeEventListener('cancel', escape); dialog.removeEventListener('close', nativeClose);
    if (dialog.open) dialog.close();
    body.style.overflow = overflow; body.style.paddingRight = padding;
    delete dialog.dataset.cartPhase;
    if (restore) focusBack();
    if (resolveClose) { resolveClose(false); resolveClose = null; }
  }
  function finishClose(restore = true) {
    if (disposed) return;
    const resolve = resolveClose; resolveClose = null;
    dispose(restore); notify(); resolve?.(true);
  }
  function close({ immediate = false, restore = true } = {}) {
    if (disposed) return Promise.resolve(false);
    if (closing) { if (immediate) finishClose(restore); return closePromise || Promise.resolve(true); }
    closing = true; dialog.dataset.cartPhase = 'closing';
    const startTransform = win.getComputedStyle(panel).transform, startOpacity = win.getComputedStyle(scrim).opacity;
    cancelAnimations();
    closePromise = new Promise(resolve => { resolveClose = resolve; });
    if (immediate || !allowed()) { finishClose(restore); return closePromise; }
    const duration = DRAWER_TIMING.close;
    const a = panel.animate([{ transform: startTransform }, { transform: offset() }], { duration, easing: EASE, fill: 'forwards' });
    const b = scrim.animate([{ opacity: startOpacity }, { opacity: 0 }], { duration, easing: 'ease', fill: 'forwards' });
    animations.add(a); animations.add(b);
    Promise.allSettled([a.finished, b.finished]).then(() => { if (!disposed) finishClose(restore); });
    closeTimer = win.setTimeout(() => finishClose(restore), duration + 120);
    return closePromise;
  }
  const escape = e => { e.preventDefault(); void close(); };
  // close events are queued: an old event must not close a freshly reopened session.
  const nativeClose = () => { if (!disposed && !dialog.open) finishClose(true); };
  function keyboard(e) {
    if (e.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]')]
      .filter(el => el.getClientRects().length && !el.closest('[hidden],[inert]'));
    if (!items.length) { e.preventDefault(); dialog.focus(); return; }
    const first = items[0], last = items.at(-1);
    if (e.shiftKey && (doc.activeElement === first || !dialog.contains(doc.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (doc.activeElement === last || !dialog.contains(doc.activeElement))) { e.preventDefault(); first.focus(); }
  }
  function visibility() { if (closing && doc.hidden) finishClose(true); else if (doc.hidden) settle(); }
  const observer = new win.MutationObserver(() => {
    if (!disposed && otherOverlay(doc, dialog)) { dispose(false); notify(); }
  });
  try { dialog.showModal(); }
  catch (error) { throw error; }
  body.style.overflow = 'hidden';
  if (gap) body.style.paddingRight = `${(parseFloat(win.getComputedStyle(body).paddingRight) || 0) + gap}px`;
  dialog.dataset.cartPhase = 'open';
  observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'inert'] });
  doc.addEventListener('visibilitychange', visibility); win.addEventListener('resize', settle);
  media.addEventListener('change', settle); dialog.addEventListener('keydown', keyboard);
  dialog.addEventListener('cancel', escape); dialog.addEventListener('close', nativeClose);
  dialog.querySelector('[data-cart-close]')?.focus({ preventScroll: true });
  play(panel, [{ transform: offset() }, { transform: 'none' }], DRAWER_TIMING.open);
  play(scrim, [{ opacity: 0 }, { opacity: 1 }], 280);
  for (const [i, row] of [...dialog.querySelectorAll('[data-cart-row]')].entries()) {
    play(row, [{ opacity: 0, transform: 'translate3d(14px,0,12px)' }, { opacity: 1, transform: 'none' }], DRAWER_TIMING.row, 90 + Math.min(i, 4) * 45);
  }
  play(dialog.querySelector('[data-cart-scan]') || panel, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 600, 100);
  return { close, dispose, settle, get closing() { return closing; } };
}
