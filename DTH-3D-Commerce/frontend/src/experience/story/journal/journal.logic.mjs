/** Frames refer to the owner's two photos, NOT an inferred V1/V2/V3 classification. */
export const JOURNAL_SHOTS = Object.freeze([
  Object.freeze({ id: 'crew', label: 'The crew', image: 'crew', position: '50% 55%', zoom: 1,
    alt: 'Four personalised scooters gathered on a residential street.' }),
  Object.freeze({ id: 'line', label: 'The line', image: 'lineup', position: '50% 73%', zoom: 1,
    alt: 'A diagonal line of white, blue and dark scooters, viewed from the front.' }),
  Object.freeze({ id: 'details', label: 'The details', image: 'lineup', position: '54% 74%', zoom: 1.38,
    alt: 'A closer crop of the scooter front panels, wheels and suspension.' }),
]);
export const clampParallax = (centre, viewport, strength = .045) => {
  if (!Number.isFinite(centre) || !Number.isFinite(viewport) || viewport <= 0) return 0;
  return Math.max(-18, Math.min(18, (viewport / 2 - centre) * strength));
};
export function shotFor(id) { return JOURNAL_SHOTS.find(shot => shot.id === id) || JOURNAL_SHOTS[0]; }
