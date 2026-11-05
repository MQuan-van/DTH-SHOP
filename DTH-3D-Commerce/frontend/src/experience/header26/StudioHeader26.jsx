import { useLayoutEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header25 from '../studio25Preview/Header25.jsx';
import { safeBagCount25 } from '../studio25Preview/header25.logic.mjs';
import AccountAccess232 from '../refinement232/AccountAccess232.jsx';
import { liveVehicle26, shouldOpenCart26 } from './header26.logic.mjs';

function RouterSurface26({ href, ...props }) { return <Link to={href} {...props} />; }

/** Live store adapter: presentation never owns auth, vehicle persistence or cart state. */
export default function StudioHeader26({ vehicle, count, disabled, onChooseVehicle, openCart, headerRef }) {
  const location = useLocation(), bagCount = safeBagCount25(count);
  useLayoutEffect(() => {
    const html = document.documentElement, previous = html.getAttribute('data-studio-header26');
    html.setAttribute('data-studio-header26', 'true');
    return () => { previous === null ? html.removeAttribute('data-studio-header26') : html.setAttribute('data-studio-header26', previous); };
  }, []);
  function bag(event) {
    if (!shouldOpenCart26(event, location.pathname)) return;
    event.preventDefault(); openCart(event.currentTarget);
  }
  return <Header25 vehicle={vehicle} vehiclePresentation={liveVehicle26(vehicle)} vehicleDisabled={disabled}
    active="studio" onVehicle={onChooseVehicle} elementRef={headerRef} live linkComponent={RouterSurface26}
    accountSlot={<AccountAccess232 className="dsp25-header-account" plainIcon />}
    bagSlot={<Link to="/bag" className="dsp25-header-bag" onClick={bag} aria-label={`Shopping bag, ${bagCount} items`} aria-haspopup="dialog" aria-controls="dth-cart-drawer">
      <svg className="dsp25-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 8h14l1 14H4L5 8Z"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/></svg><span aria-hidden="true">{bagCount > 99 ? '99+' : bagCount}</span>
    </Link>} />;
}
