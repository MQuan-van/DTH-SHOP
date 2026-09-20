export default function Icon({ name, ...props }) {
  const paths = {
    bag: <><path d="M5 7h14l1 14H4L5 7Z" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /></>,
    vehicle: <><path d="m4 10 2-5h12l2 5M3 10h18v8H3zM6 18v3m12-3v3M6 14h2m8 0h2" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>,
    cube: <><path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5m-9 5v10m-5-17 10 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 22v-3a8 8 0 0 1 16 0v3" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.arrow}</svg>;
}
