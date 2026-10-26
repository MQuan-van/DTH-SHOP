import { forwardRef } from 'react';
import { Link } from 'react-router-dom';

/** Keeps the hit area and the caller's handler stable. Only the inner span moves. */
const PremiumAction213 = forwardRef(function PremiumAction213(
  { to, children, className = '', tone = 'secondary', ...props }, ref,
) {
  const classes = `p213-action p213-action--${tone} ${className}`.trim();
  const content = <span data-premium-magnet-inner>{children}</span>;
  return to !== undefined
    ? <Link ref={ref} to={to} className={classes} data-premium-magnet {...props}>{content}</Link>
    : <button ref={ref} type="button" className={classes} data-premium-magnet {...props}>{content}</button>;
});
export default PremiumAction213;
