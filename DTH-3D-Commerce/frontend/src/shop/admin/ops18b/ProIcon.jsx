export default function ProIcon({name='arrow',size=18,...props}) {
  const paths = {
    arrow:<><path d="M5 19 19 5M6 5h13v13"/></>,
    inbox:<><path d="M4 5h16v14H4zM4 13h5l2 3h2l2-3h5"/></>,
    cube:<><path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9M7 5.8l9 5"/></>,
    order:<><path d="M6 3h12v19l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/></>,
    vehicle:<><path d="M5 7h14l3 8v5h-3v-2H5v2H2v-5zM3 14h18M7 10h10"/><circle cx="7" cy="16" r=".5"/><circle cx="17" cy="16" r=".5"/></>,
    refresh:<><path d="M20 9a8 8 0 1 0 0 7M20 3v6h-6"/></>,
    check:<path d="m5 12 4 4L19 6"/>,
    close:<path d="m6 6 12 12M18 6 6 18"/>,
    search:<><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/></>,
    back:<path d="m14 5-7 7 7 7M7 12h14"/>,
    user:<><circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/></>,
    focus:<><path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/><path d="M8 8h8v8H8z"/></>,
    pause:<><path d="M9 5v14M15 5v14"/></>,
    play:<path d="m8 4 12 8-12 8z"/>,
    bolt:<path d="m13 2-8 12h6l-1 8 9-13h-6z"/>,
    note:<><path d="M4 4h16v12l-5 5H4zM15 21v-5h5M8 9h8M8 13h5"/></>,
    chevron:<path d="m8 5 7 7-7 7"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.arrow}</svg>;
}
