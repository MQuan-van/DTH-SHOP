// Shared data schema is also validated by the publication API.
export { DEFAULT_EXPERIENCE as CINEMATIC_CONFIG, STORY_FRAMES, INSPECT_FRAME } from '../../../../shared/experience.mjs';

// Home only. Admin camera authoring remains still unless its timeline is played.
export const HOME_AUTOROTATE = Object.freeze({
  enabled: true,
  secondsPerTurn: 16,
  direction: -1, // Clockwise when viewed from above the +Y axis.
  scrollResumeDelay: 0.35,
});

// Presentation policy, deliberately separate from the persisted camera/asset schema.
// Only Home opts into these values; Admin still edits the same saved keyframes.
export const HOME_SHOWROOM = Object.freeze({
  scrollLinked: false,
  wheelZoom: false,
  extraHeightPx: 100,
  pedestalScale: Object.freeze([1.4, 1, 1.12]),
  compactPedestalScale: Object.freeze([1.12, 1, 1.05]),
});
