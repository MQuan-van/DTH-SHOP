const paths = {
  overview: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  products: 'm12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9M8 5.25l8 4.5',
  ai: 'm12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3ZM20 2v4M18 4h4',
  experience: 'M4 4h16v16H4zM9 8l7 4-7 4V8Z',
  vehicles: 'M3 16h18M5 16l2-7h10l2 7M7 9l1-4h8l1 4M6 16v4M18 16v4M6 12h12',
  orders: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6',
  inbox: 'M4 4h16v14h-5l-3 3-3-3H4V4ZM7 8h10M7 12h6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  diagonal: 'M6 18 18 6M6 6h12v12',
  plus: 'M12 5v14M5 12h14',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'm6 6 12 12M6 18 18 6',
  account: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  chevron: 'm9 5 7 7-7 7',
};
export default function PremiumIcon213({ name = 'overview', size = 20, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
    <path d={paths[name] || paths.overview}/>
  </svg>;
}
