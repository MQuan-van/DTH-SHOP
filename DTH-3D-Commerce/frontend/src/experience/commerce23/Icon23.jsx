export default function Icon23({name,className=''}) {
 const icons={
  vehicle:<><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="m5 17 4-7h5l5 7M9 10l3 7H5m7 0 4-10h-3m3 0h3M7 9h4"/></>,
  bag:<><path d="M5 7h14l1 14H4zM9 7V5a3 3 0 0 1 6 0v2"/></>,
  user:<><circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></>,
  menu:<path d="M3 7h18M3 17h18"/>,close:<path d="m5 5 14 14M19 5 5 19"/>,
  reset:<><path d="M3 10V4m0 6h6M4 9a8 8 0 1 1-1 7"/></>,
  focus:<><path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/><circle cx="12" cy="12" r="3"/></>,
  suspension:<><path d="m10 3 4 18M7 6l10-2M7 10l10-2M7 14l10-2M7 18l10-2"/></>,
  rims:<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v7m2 3 6 4M4 17l6-4"/></>,
  tires: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><path d="m6 5 2 2m8-2-2 2M3 12h3m12 0h3m-15 7 2-2m8 2-2-2"/></>,
  brakes:<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m17 5 4 2v7h-4z"/></>,
  exhausts:<><path d="m4 18 10-10 5 5L9 23zM14 8l3-4 4 4-2 5M3 18l-1 3 4 2"/></>,
  mirrors:<><path d="m9 12 7 9M4 6c6-4 14-3 14 1s-7 8-12 5-5-4-2-6Z"/></>,
  check:<path d="m5 12 4 4L20 5"/>,plus:<path d="M12 4v16M4 12h16"/>,minus:<path d="M4 12h16"/>,
  orbit:<><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-30 12 12)"/><circle cx="12" cy="12" r="3"/></>,
  search:<><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
 };
 return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]||icons.focus}</svg>;
}
