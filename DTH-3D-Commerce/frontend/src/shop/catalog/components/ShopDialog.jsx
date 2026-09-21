import { useId, useLayoutEffect, useRef } from 'react';
import ShopIcon from './ShopIcon';
import styles from '../ShopPage.module.css';

export default function ShopDialog({ title, onClose, children, className = '', motion = true, duration = 240, restoreFocus }) {
  const ref = useRef(null), headingId = useId();
  const restoreRef = useRef(restoreFocus);
  useLayoutEffect(() => {
    const dialog = ref.current;
    const previous = restoreRef.current || document.activeElement;
    const oldOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = oldOverflow;
      if (previous?.isConnected && !document.querySelector('dialog[open]')) previous.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} className={`${styles.dialog} ${className}`} aria-labelledby={headingId}
    data-motion={motion ? 'on' : 'off'} style={{ '--shop-dialog-duration': `${duration}ms` }}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === ref.current) { const r = ref.current.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose(); } }}>
    <header className={styles.dialogHeader}><h2 id={headingId}>{title}</h2><button autoFocus type="button" className={styles.iconButton} aria-label="Close dialog" onClick={onClose}><ShopIcon name="close" /></button></header>
    {children}
  </dialog>;
}
