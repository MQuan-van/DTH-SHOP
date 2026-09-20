import { useRef } from 'react';
import { useSectionReveal } from '../hooks/useStudioMotion.js';
export default function SectionShell({ id, className = '', motion, motionEnabled, children, ...props }) {
  const ref = useRef(null);
  useSectionReveal(ref, motionEnabled, motion);
  return <section id={id} ref={ref} className={`home-section ${className}`} {...props}>{children}</section>;
}
