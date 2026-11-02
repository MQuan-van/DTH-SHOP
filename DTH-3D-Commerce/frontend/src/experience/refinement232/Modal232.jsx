import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import './refinement232.css';

/** Native modal gives top-layer rendering, inert background and keyboard focus containment. */
export default function Modal232({ title, children, onDismiss, className = '', returnTo, label = 'Close dialog' }) {
  const el = useRef(null), closeButton = useRef(null), done = useRef(onDismiss), closing = useRef(false), id = useId();
  done.current = onDismiss;
  useEffect(() => {
    const dialog = el.current, previous = returnTo || document.activeElement;
    const overflow = document.body.style.overflow;
    closing.current = false;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    closeButton.current?.focus({ preventScroll: true });
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const context = gsap.context(() => {
      if (!media.matches) gsap.fromTo(dialog, { opacity: 0, y: 14, scale: .975 }, { opacity: 1, y: 0, scale: 1, duration: .24, ease: 'power3.out', clearProps: 'transform,opacity' });
    }, dialog);
    const reduce = () => { if (media.matches) { gsap.killTweensOf(dialog); gsap.set(dialog, { clearProps: 'transform,opacity' }); if (closing.current) done.current(); } };
    media.addEventListener('change', reduce);
    return () => {
      context.revert(); gsap.killTweensOf(dialog); media.removeEventListener('change', reduce);
      if (dialog.open) dialog.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  function dismiss() {
    if (closing.current) return;
    closing.current = true;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { done.current(); return; }
    gsap.to(el.current, { opacity: 0, y: 8, scale: .985, duration: .14, ease: 'power2.in', overwrite: true, onComplete: () => done.current() });
  }
  return createPortal(<dialog ref={el} className={`r232-dialog ${className}`} aria-labelledby={id}
    onCancel={e => { if (e.target !== el.current) return; e.preventDefault(); dismiss(); }}>
    <header className="r232-dialog-head"><h2 id={id}>{title}</h2><button ref={closeButton} type="button" onClick={dismiss} aria-label={label} className="r232-close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
    {typeof children === 'function' ? children(dismiss) : children}
  </dialog>, document.body);
}
