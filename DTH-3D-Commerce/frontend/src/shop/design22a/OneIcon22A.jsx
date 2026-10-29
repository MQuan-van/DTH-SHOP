import React from 'react';
const paths = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  garage: <><path d="m3 9 9-6 9 6v12H3Z"/><path d="M7 21V11h10v10M7 15h10M7 18h10"/></>,
  orders: <><path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>,
  profile: <><circle cx="12" cy="7" r="3.5"/><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2"/></>,
  vehicle: <><path d="m4 10 2-6h12l2 6v8H4Z"/><path d="M4 10h16M7 18v3M17 18v3M7 14h2M15 14h2"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  orbit: <><ellipse cx="12" cy="12" rx="10" ry="4.8" transform="rotate(-32 12 12)"/><circle cx="12" cy="12" r="3"/><path d="m18 4 3 1-1 3"/></>,
  reset: <><path d="M4 8a8.5 8.5 0 1 1-1 7M4 3v5h5"/></>,
  settings: <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.5" fill="currentColor"/><circle cx="15" cy="17" r="2.5" fill="currentColor"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  signout: <><path d="M10 3H4v18h6M10 12h11m-4-4 4 4-4 4"/></>,
  search: <><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/></>,
};
export default function OneIcon22A({name, ...props}) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.overview}</svg>;
}
