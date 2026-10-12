import { useEffect, useId, useRef } from 'react';
import styles from './GarageWorkspace.module.css';
export default function GarageDialog({ title, onClose, busy, children }) {
  const ref = useRef(null), cancel = useRef(null), id = useId();
  useEffect(() => {
    const dialog = ref.current, previous = document.activeElement;
    dialog.showModal(); cancel.current?.focus({ preventScroll: true });
    return () => { if (dialog.open) dialog.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className={styles.dialog} aria-labelledby={id}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={event => { if (event.target === ref.current && !busy) onClose(); }}>
    <header className={styles.dialogHeader}><h2 id={id}>{title}</h2>
      <button ref={cancel} type="button" className={styles.iconButton} disabled={busy} onClick={onClose} aria-label="Cancel">×</button>
    </header>
    {children}
  </dialog>;
}
