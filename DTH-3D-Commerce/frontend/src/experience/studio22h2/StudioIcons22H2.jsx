export default function StudioIcon22H2({ name, className = '' }) {
  const shapes = {
    overview: <><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-28 12 12)"/><path d="M16 3.5 19 5l-1.2 3"/></>,
    pick: <><circle cx="12" cy="12" r="6"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/><circle cx="12" cy="12" r="1"/></>,
    orbit: <><path d="m12 2 9 5v10l-9 5-9-5V7Z M3 7l9 5 9-5M12 12v10"/></>,
    suspension: <><path d="M12 2v3m0 14v3m-4-5 8-2-8-3 8-3-8-2 8-2"/><circle cx="12" cy="2" r="1"/><circle cx="12" cy="22" r="1"/></>,
    wheels: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v7m-8 6 6-3m8-8-5 5m-1 4v7m2-8 6 3"/></>,
    brakes: <><circle cx="11" cy="12" r="8"/><circle cx="11" cy="12" r="3"/><path d="M17 6h4v9h-4M11 4v2m-6 5H3m8 7v2"/></>,
    exhausts: <><path d="m4 16 4 4 10-10-4-4Z M14 6l2-2 4 4-2 2M4 16l-2 2 4 4 2-2"/></>,
    mirrors: <><ellipse cx="8" cy="7" rx="5" ry="3" transform="rotate(-18 8 7)"/><path d="m11 9 5 8v5m-3 0h6"/></>,
    reset: <><path d="M5 6a8 8 0 1 1-1 10M5 2v5h5"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
  };
  return <svg className={`s222-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[name] || shapes.orbit}</svg>;
}
