import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { headerVehicle25, safeBagCount25, studioHref25 } from './header25.logic.mjs';
import './header26.css';

const destinations = [
  { id: 'studio', label: 'Studio', href: '/' },
  { id: 'build', label: 'Build', href: '/shop?mode=build' },
  { id: 'shop', label: 'Shop', href: '/shop?mode=shop' },
  { id: 'story', label: 'Story', href: '/story' },
];
function HeaderIcon25({ name }) {
  const paths = {
    bag: <><path d="M5 8h14l1 14H4L5 8Z"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/></>,
    account: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2.5a7 7 0 0 1 14 0V21"/></>,
    menu: <><path d="M4 8h16M4 16h16"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
  };
  return <svg className={`dsp25-header-icon dsp25-header-icon-${name}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}

/** Shared presentation. Preview panels or the live store supply actions and link semantics. */
export default function Header25({ vehicle, onVehicle, onAccount, onBag, bagCount = 0, active = 'studio', studioHref = '/', vehiclePresentation, vehicleDisabled = false, accountSlot, bagSlot, linkComponent: LinkSurface = 'a', elementRef, live = false }) {
  const root = useRef(null), nav = useRef(null), rail = useRef(null), trigger = useRef(null), navId = useId();
  const [open, setOpen] = useState(false), ride = vehiclePresentation || headerVehicle25(vehicle), count = safeBagCount25(bagCount);
  const assignRoot = useCallback(node => { root.current = node; if (typeof elementRef === 'function') elementRef(node); else if (elementRef) elementRef.current = node; }, [elementRef]);

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.timeline({ defaults: { ease: 'power3.out', duration: .34 } })
          .fromTo('[data-header25-enter]', { opacity: 0, y: 4 }, { opacity: 1, y: 0, stagger: .035, clearProps: 'transform,opacity' });
      }
    }, root);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)'), stop = () => { if (reduced.matches) context.revert(); };
    reduced.addEventListener('change', stop);
    return () => { reduced.removeEventListener('change', stop); context.revert(); };
  }, []);

  useLayoutEffect(() => {
    const container = nav.current, marker = rail.current;
    if (!container || !marker) return;
    const links = [...container.querySelectorAll('a')], media = matchMedia('(prefers-reduced-motion: reduce)');
    let hovered = null, focused = links.find(link => link.contains(document.activeElement)) || null, live = true, move;
    const context = gsap.context(() => {
      const xTo = gsap.quickTo(marker, 'x', { duration: .28, ease: 'power3.out' });
      move = (instant = false) => {
        if (!live || !container.clientWidth) return;
        const target = hovered || focused || links.find(link => link.getAttribute('aria-current') === 'page');
        if (!target) { marker.style.opacity = '0'; return; }
        const x = target.offsetLeft + target.offsetWidth / 2 - 14;
        marker.style.opacity = '1'; xTo(x);
        if (instant || media.matches) xTo.tween.progress(1);
      };
      move(true);
    }, root);
    const enter = event => { hovered = event.currentTarget; move(); };
    const leave = () => { hovered = null; move(); };
    const focusIn = event => { hovered = null; focused = links.find(link => link.contains(event.target)) || null; move(); };
    const focusOut = event => { focused = links.find(link => link.contains(event.relatedTarget)) || null; move(); };
    const resized = () => move(true), reduced = () => move(true);
    links.forEach(link => link.addEventListener('pointerenter', enter));
    container.addEventListener('pointerleave', leave); container.addEventListener('focusin', focusIn); container.addEventListener('focusout', focusOut);
    const observer = new ResizeObserver(resized); observer.observe(container); links.forEach(link => observer.observe(link));
    media.addEventListener('change', reduced); document.fonts?.ready.then(() => { if (live) move(true); });
    return () => {
      live = false; observer.disconnect(); media.removeEventListener('change', reduced);
      links.forEach(link => link.removeEventListener('pointerenter', enter));
      container.removeEventListener('pointerleave', leave); container.removeEventListener('focusin', focusIn); container.removeEventListener('focusout', focusOut); context.revert();
    };
  }, [active, open]);

  useEffect(() => {
    const wide = matchMedia('(min-width: 1041px)'), close = () => { if (wide.matches) setOpen(false); };
    wide.addEventListener('change', close);
    return () => wide.removeEventListener('change', close);
  }, []);
  useEffect(() => {
    if (!open) return;
    nav.current?.querySelector('a')?.focus({ preventScroll: true });
    const escape = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus({ preventScroll: true }); } };
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('keydown', escape); document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', escape); document.removeEventListener('pointerdown', outside); };
  }, [open]);

  function action(callback, event) { setOpen(false); callback?.(event.currentTarget); }

  return <header ref={assignRoot} className="dsp25-header" data-open={open} data-design="precision26" data-live={live || undefined} onClickCapture={event => { if (event.target.closest?.('a')) setOpen(false); }}><div className="dsp25-header-inner">
    <LinkSurface className="dsp25-header-brand" href="/" aria-label="DTH home" data-header25-enter>
      <span className="dsp25-header-mark" aria-hidden="true"><i/><i/><i/></span>
      <strong translate="no">DTH</strong>
    </LinkSurface>

    <nav ref={nav} id={navId} className="dsp25-header-nav" aria-label="Main navigation" data-header25-enter>
      {destinations.map(destination => <LinkSurface key={destination.id} href={destination.id === 'studio' ? studioHref25(studioHref) : destination.href} aria-current={active === destination.id ? 'page' : undefined} onClick={() => setOpen(false)}><span>{destination.label}</span></LinkSurface>)}
      <span className="dsp25-header-rail" ref={rail} aria-hidden="true"/>
    </nav>

    <div className="dsp25-header-actions" data-header25-enter>
      <button className="dsp25-header-ride" type="button" disabled={vehicleDisabled} aria-label={ride.accessibleLabel} aria-haspopup="dialog" title={ride.selected ? ride.label : 'Choose vehicle'} onClick={event => action(onVehicle, event)}>
        <span className="dsp25-header-garage" aria-hidden="true"><i/><i/><i/></span>
        <span className="dsp25-header-ride-full">{ride.selected ? ride.label : 'Choose vehicle'}</span><span className="dsp25-header-ride-compact">{ride.selected ? ride.compact : 'NVX'}</span>
      </button>
      {accountSlot || <button className="dsp25-header-account" type="button" aria-label="Open DTH account" aria-haspopup="dialog" onClick={event => action(onAccount, event)}>
        <HeaderIcon25 name="account"/><span>My DTH</span>
      </button>}
      {bagSlot || <button className="dsp25-header-bag" type="button" aria-label={`Open shopping bag, ${count} ${count === 1 ? 'item' : 'items'}`} aria-haspopup="dialog" onClick={event => action(onBag, event)}><HeaderIcon25 name="bag"/><span aria-hidden="true">{count > 99 ? '99+' : count}</span></button>}
      <button className="dsp25-header-menu" type="button" ref={trigger} aria-expanded={open} aria-controls={navId} aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(value => !value)}><HeaderIcon25 name={open ? 'close' : 'menu'}/></button>
    </div>
  </div></header>;
}
