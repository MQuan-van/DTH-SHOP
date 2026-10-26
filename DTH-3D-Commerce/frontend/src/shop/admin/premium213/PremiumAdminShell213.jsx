import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { connectionLabel } from '../ops18b/opsPro.logic.mjs';
import PremiumIcon213 from './PremiumIcon213.jsx';
import PremiumAction213 from './PremiumAction213.jsx';
import { usePremiumEntry213, usePremiumMotion213 } from './usePremiumMotion213.js';
import { PREMIUM213, hasUnread, initials, navHref, sectionForPath } from './premium213.logic.mjs';
import './premium213.css';

const iconFor = { '': 'overview', inbox: 'inbox', products: 'products', experience: 'experience',
  'ai-assets': 'ai', vehicles: 'vehicles', orders: 'orders' };

function Navigation({ modules, unread, onNavigate }) {
  const { pathname } = useLocation();
  const nav = useRef(null), indicator = useRef(null);
  useLayoutEffect(() => {
    const element = nav.current, mark = indicator.current;
    if (!element || !mark) return undefined;
    const media = gsap.matchMedia();
    media.add({ reduced: '(prefers-reduced-motion: reduce)', all: '(min-width: 0px)' }, ctx => {
      let tween;
      const measure = () => {
        const active = element.querySelector('a[aria-current="page"]');
        if (!active || element.getBoundingClientRect().width === 0) { mark.style.opacity = '0'; return; }
        const box = element.getBoundingClientRect(), target = active.getBoundingClientRect();
        tween?.kill();
        const values = { y: target.top - box.top, height: target.height, opacity: 1 };
        if (ctx.conditions.reduced || !mark.dataset.positioned) gsap.set(mark, values);
        else tween = gsap.to(mark, { ...values, duration: .32, ease: 'power3.out', overwrite: true });
        mark.dataset.positioned = 'true';
      };
      measure();
      const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
      observer?.observe(element);
      window.addEventListener('resize', measure, { passive: true });
      return () => { observer?.disconnect(); window.removeEventListener('resize', measure); tween?.kill(); };
    }, element);
    return () => media.revert();
  }, [pathname, modules]);
  return <nav ref={nav} className="p213-nav" aria-label="Admin navigation">
    <span ref={indicator} className="p213-nav-indicator" aria-hidden="true"/>
    {modules.map(([path, label]) => <NavLink end={!path} key={path} to={navHref(path)} onClick={onNavigate}>
      <PremiumIcon213 name={iconFor[path] || 'overview'}/><span>{label}</span>
      {path === 'inbox' && unread && <i className="p213-unread" aria-label="Unread conversations"/>}
    </NavLink>)}
  </nav>;
}

function Operator({ user, onNavigate }) {
  return <footer className="p213-operator">
    <span className="p213-avatar" aria-hidden="true">{initials(user?.email)}</span>
    <div><strong>{user?.email}</strong><span>Administrator</span></div>
    <Link to="/account" onClick={onNavigate} className="p213-account" aria-label="Account settings"><PremiumIcon213 name="account" size={18}/></Link>
  </footer>;
}

export default function PremiumAdminShell213({ modules, user, support, children }) {
  const { pathname } = useLocation();
  const root = useRef(null), content = useRef(null), dialog = useRef(null), trigger = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closing = useRef(false), closeTween = useRef(null);
  const section = sectionForPath(pathname, modules), unread = hasUnread(support?.conversations);
  usePremiumMotion213(root, pathname);
  usePremiumEntry213(content, pathname);
  const closeNow = useCallback(() => {
    closeTween.current?.kill(); closeTween.current = null; closing.current = false;
    dialog.current?.close(); setDrawerOpen(false);
  }, []);
  const closeDrawer = useCallback(() => {
    if (closing.current || !dialog.current?.open) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { closeNow(); return; }
    closing.current = true;
    closeTween.current = gsap.to(dialog.current, { x: -24, opacity: 0, duration: .16, ease: 'power2.in', onComplete: closeNow });
  }, [closeNow]);
  useLayoutEffect(() => {
    if (!drawerOpen || !dialog.current) return undefined;
    const el = dialog.current;
    if (!el.open) el.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(el, { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: PREMIUM213.drawerSeconds,
        ease: 'back.out(1.12)', clearProps: 'transform,opacity' });
    }, el);
    const desktop = matchMedia(`(min-width: ${PREMIUM213.breakpoint + 1}px)`);
    const resized = () => { if (desktop.matches) closeNow(); };
    desktop.addEventListener('change', resized);
    return () => {
      desktop.removeEventListener('change', resized); closeTween.current?.kill(); closeTween.current = null;
      closing.current = false; media.revert(); if (el.open) el.close(); document.body.style.overflow = overflow;
      // Native dialog restores focus. Do not focus a now-hidden mobile trigger after resize.
      if (trigger.current?.getClientRects().length && document.activeElement === document.body) trigger.current.focus();
    };
  }, [drawerOpen, closeNow]);
  useEffect(() => { closeNow(); }, [pathname, closeNow]);
  useEffect(() => () => { closeTween.current?.kill(); }, []);

  return <section ref={root} className="dth-admin dth-premium213" data-ops18="true" data-ops18b="true" data-premium-admin="21.3A">
    <a className="p213-skip" href="#p213-content">Skip to content</a>
    <aside className="p213-sidebar" aria-label="Admin workspace">
      <Link className="p213-brand" to="/admin" aria-label="DTH Admin overview"><span className="p213-brand-mark">DTH</span><small>Admin</small></Link>
      <Navigation modules={modules} unread={unread}/>
      <Link className="p213-sidebar-store" to="/shop"><span>Open storefront</span><PremiumIcon213 name="diagonal" size={17}/></Link>
      <Operator user={user}/>
    </aside>
    <div className="p213-workspace">
      <header className="p213-topbar">
        <div className="p213-path">
          <button ref={trigger} className="p213-menu" type="button" onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation" aria-controls="p213-mobile-navigation" aria-expanded={drawerOpen}><PremiumIcon213 name="menu"/></button>
          <Link to="/admin">Admin</Link><span aria-hidden="true">/</span><span>{section}</span>
        </div>
        <div className="p213-top-actions"><span className="p213-connection" data-live={support?.status === 'live'} role="status"><i/>{connectionLabel(support?.status)}</span>
          <PremiumAction213 to="/shop" className="p213-view-site">View site <PremiumIcon213 name="diagonal" size={15}/></PremiumAction213>
        </div>
      </header>
      <main id="p213-content" className="dth-admin-main p213-main" tabIndex={-1}>
        <div ref={content} className="p213-content">{children}</div>
      </main>
    </div>
    <dialog ref={dialog} id="p213-mobile-navigation" className="p213-drawer" aria-label="Admin navigation"
      onCancel={e => { e.preventDefault(); closeDrawer(); }} onClose={() => setDrawerOpen(false)}
      onClick={e => { if (e.target === e.currentTarget) { const b = e.currentTarget.getBoundingClientRect();
        if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) closeDrawer(); } }}>
      <div className="p213-drawer-heading"><Link to="/admin" className="p213-brand" onClick={closeNow}><span className="p213-brand-mark">DTH</span></Link>
        <button type="button" className="p213-close" autoFocus onClick={closeDrawer} aria-label="Close navigation"><PremiumIcon213 name="close"/></button></div>
      <Navigation modules={modules} unread={unread} onNavigate={closeNow}/>
      <Link className="p213-sidebar-store" to="/shop" onClick={closeNow}>Open storefront <PremiumIcon213 name="diagonal" size={17}/></Link>
      <Operator user={user} onNavigate={closeNow}/>
    </dialog>
  </section>;
}
