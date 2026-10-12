const paths = {
  bag: <><path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/></>,
  arrow: <><path d="M4 12h15M13 6l6 6-6 6"/></>,
  back: <path d="M20 12H5m6-6-6 6 6 6"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  warning: <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v.2"/></>,
  vehicle: <><path d="m6 5-3 7v7m18 0v-7l-3-7H6Zm-3 7h18M7 16h1m8 0h1M3 19v2m18-2v2"/></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 8a8 8 0 0 1 14-2l1 2M4 16l1 2a8 8 0 0 0 14-2"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/></>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
};
export default function CartPageIcon({ name, ...props }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.bag}</svg>; }
