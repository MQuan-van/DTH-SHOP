import { useEffect } from 'react';

/**
 * Step 19C: presentation-only animations driven by the existing DOM.
 * No timer polling, no chat requests, no scroll interception, no message edits.
 */
const ease = 'cubic-bezier(.18,.82,.22,1)';

function play(node, frames, options, running) {
  if (!node || typeof node.animate !== 'function' || document.hidden || node.closest('[inert]')) return;
  try {
    const animation = node.animate(frames, { duration: 370, easing: ease, fill: 'none', ...options });
    running.add(animation);
    animation.finished.catch(() => {}).finally(() => running.delete(animation));
  } catch { /* CSS/static content remains completely usable. */ }
}

export default function useInboxKinetics(root, conversationId, enabled) {
  // Queue items animate the first time they enter the *scrollable queue* viewport.
  // Selecting another thread does not reset/reanimate the entire list.
  useEffect(() => {
    const host = root.current;
    if (!host || !enabled) return undefined;
    const scrollRoot = host.querySelector('[data-inbox-scroll-list]');
    if (!scrollRoot) return undefined;
    const seen = new WeakSet(), running = new Set();
    let queued = 0;
    let revealed = 0;
    const observer = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(entries => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            observer.unobserve(entry.target);
            play(entry.target,
              [ { opacity: .32, transform: 'translate3d(16px, 13px, 0) scale(.985)' },
                { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' } ],
              { duration: 390, delay: Math.min(revealed++, 5) * 48 }, running);
          }
        }, { root: scrollRoot, threshold: .15 }) : null;
    const scan = () => {
      queued = 0;
      for (const item of scrollRoot.querySelectorAll('[data-inbox-queue-item]')) {
        if (seen.has(item)) continue;
        seen.add(item);
        observer?.observe(item);
      }
    };
    const schedule = () => { if (!queued) queued = requestAnimationFrame(scan); };
    const mutations = new MutationObserver(schedule);
    mutations.observe(scrollRoot, { childList: true, subtree: true });
    schedule();
    return () => {
      mutations.disconnect(); observer?.disconnect();
      if (queued) cancelAnimationFrame(queued);
      for (const animation of running) animation.cancel();
    };
  }, [root, enabled]);

  // Only *new DOM message nodes* receive the small incoming-message transition.
  // The first hydration is capped to its most recent four, never every historic row.
  useEffect(() => {
    const host = root.current;
    if (!host || !enabled || !conversationId) return undefined;
    const seen = new WeakSet(), running = new Set();
    let queued = 0, hydrated = false;
    const scan = () => {
      queued = 0;
      const messages = [...host.querySelectorAll('[data-inbox-workspace] .dth-chat-messages .dth-chat-message')];
      const fresh = messages.filter(node => !seen.has(node));
      for (const node of fresh) seen.add(node);
      if (!fresh.length) return;
      const visible = fresh.slice(-4);
      visible.forEach((node, index) => {
        const side = node.dataset.own === 'true' ? 16 : -16;
        play(node,
          [ { opacity: .12, transform: `translate3d(${side}px, 11px, 0) scale(.985)` },
            { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' } ],
          { duration: hydrated ? 330 : 420, delay: hydrated ? 0 : index * 38 }, running);
      });
      hydrated = true;
    };
    const schedule = () => { if (!queued) queued = requestAnimationFrame(scan); };
    const mutations = new MutationObserver(schedule);
    mutations.observe(host, { childList: true, subtree: true });
    schedule();
    return () => {
      mutations.disconnect();
      if (queued) cancelAnimationFrame(queued);
      for (const animation of running) animation.cancel();
    };
  }, [root, conversationId, enabled]);
}
