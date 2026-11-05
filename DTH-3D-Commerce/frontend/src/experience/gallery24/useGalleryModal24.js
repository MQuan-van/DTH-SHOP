import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { externalGalleryOverlay24, mountGalleryHost24 } from './studio-gallery24.logic.mjs';

export function useGalleryInput24(signal, ownDialog) {
  const [blocked, setBlocked] = useState(false);
  useLayoutEffect(() => {
    const update = () => {
      const value = externalGalleryOverlay24(document.querySelectorAll('dialog[open], .dth-support-panel'), ownDialog.current);
      signal.set({ blocked: value }); setBlocked(value);
    };
    update(); const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    return () => { observer.disconnect(); signal.set({ blocked: false }); };
  }, [signal, ownDialog]);
  return blocked;
}

export function useGalleryModal24(expanded, setExpanded, slot, dialog, closeButton, expandButton) {
  const host = useMemo(() => { const el = document.createElement('div'); el.className = 'dgs24-portal-host'; return el; }, []);
  const wasExpanded = useRef(false);
  useLayoutEffect(() => {
    if (!mountGalleryHost24(host, slot.current, dialog.current, expanded)) {
      if (expanded) setExpanded(false);
      return;
    }
    if (!expanded) {
      if (wasExpanded.current) expandButton.current?.focus({ preventScroll: true });
      wasExpanded.current = false; return;
    }
    wasExpanded.current = true;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; closeButton.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.current?.open) dialog.current.close();
      document.body.style.overflow = overflow;
    };
  }, [host, expanded, setExpanded, slot, dialog, closeButton, expandButton]);
  useEffect(() => () => host.remove(), [host]);
  return host;
}
