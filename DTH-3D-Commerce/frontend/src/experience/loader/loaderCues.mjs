import { LOADER_CONFIG } from './loader.config.mjs';
export const CUE_REFERENCE_MS = 2500;
export const FRAGMENT_COUNT = 3;
/** Static clipped regions; only opacity/transform are animated. */
export function buildLoaderCues(brandMs = LOADER_CONFIG.brandMs) {
  const total = Number.isFinite(brandMs) && brandMs >= 1000 && brandMs <= 7000
    ? brandMs : LOADER_CONFIG.brandMs;
  const scale = total / CUE_REFERENCE_MS;
  const cue = (delay, duration) => Object.freeze({ delay: delay * scale, duration: duration * scale });
  return Object.freeze({
    total,
    fragments: Object.freeze([cue(100, 1050), cue(240, 1190), cue(370, 1240)]),
    face: cue(640, 980),
    silver: cue(1260, 580),
    aura: cue(250, 1400),
    underline: cue(940, 850),
    recognitionHoldMs: 650 * scale,
  });
}
