import { createContext, useContext, useEffect, useState } from 'react';
export const JournalMotionContext = createContext(true);
export const useJournalMotion = () => useContext(JournalMotionContext);
export function useReducedMotion() {
  const read = () => typeof matchMedia !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [value, setValue] = useState(read);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return undefined;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setValue(media.matches);
    change(); media.addEventListener?.('change', change);
    return () => media.removeEventListener?.('change', change);
  }, []);
  return value;
}
