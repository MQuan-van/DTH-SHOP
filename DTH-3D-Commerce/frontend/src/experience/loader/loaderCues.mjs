import { LOADER_CONFIG } from './loader.config.mjs';

export const CUE_REFERENCE_MS = 3500;
/** Each cue finishes before 2850ms; the remaining 650ms is deliberately still. */
const windows = Object.freeze({
  grid: [0, 1300],
  brackets: [100, 900],
  rings: [300, 1900],
  stage: [250, 1550],
  face: [470, 1330],
  echo: [300, 1550],
  silver: [1640, 1100],
  glint: [2290, 410],
  cyan: [2170, 630],
  tagline: [2170, 650],
  underglow: [360, 2450],
});
export const RED_SEGMENT_COUNT = 7;
export const STREAK_COUNT = 4;

/** Invalid custom timings cannot create infinite or negative animation durations. */
export function buildLoaderCues(brandMs = LOADER_CONFIG.brandMs) {
  const total = Number.isFinite(brandMs) && brandMs >= 1000 && brandMs <= 7000
    ? brandMs : LOADER_CONFIG.brandMs;
  const scale = total / CUE_REFERENCE_MS;
  const cue = (delay, duration) => Object.freeze({ delay: delay * scale, duration: duration * scale });
  return Object.freeze({
    total,
    ...Object.fromEntries(Object.entries(windows).map(([key, value]) => [key, cue(...value)])),
    segments: Object.freeze(Array.from({ length: RED_SEGMENT_COUNT }, (_, i) => cue(100 + i * 125, 1400 - i * 75))),
    streaks: Object.freeze(Array.from({ length: STREAK_COUNT }, (_, i) => cue(600 + i * 240, 780))),
    recognitionHoldMs: 650 * scale,
  });
}
