import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../../shop/useStore';
import { isBuild232, memberLabel232 } from './refinement232.logic.mjs';
import './refinement232.css';
export default function AccountAccess232({ active = false }) {
  const store = useStore(), location = useLocation(), member = memberLabel232(store.user);
  useEffect(() => {
    const html = document.documentElement, previous = html.getAttribute('data-build-workspace232');
    html.setAttribute('data-build-workspace232', String(isBuild232(location.pathname, location.search)));
    return () => { previous === null ? html.removeAttribute('data-build-workspace232') : html.setAttribute('data-build-workspace232', previous); };
  }, [location.pathname, location.search]);
  return <Link to="/account" className="r232-account-access" aria-current={active ? 'page' : undefined} aria-label={member.signedIn ? 'Open your DTH account' : 'Sign in to DTH'}>
    <span className="r232-member-avatar" aria-hidden="true">{member.signedIn ? member.initial : <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>}</span>
    <span className="r232-member-label">{member.label}</span>
  </Link>;
}
