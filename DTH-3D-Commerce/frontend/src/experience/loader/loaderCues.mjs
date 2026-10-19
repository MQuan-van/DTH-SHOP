import { LOADER_CONFIG } from './loader.config.mjs';
export const CUE_REFERENCE_MS = 2700;
export const FRAGMENT_COUNT = 3;
export function buildLoaderCues(brandMs = LOADER_CONFIG.brandMs) {
  const total = Number.isFinite(brandMs) && brandMs >= 1000 && brandMs <= 7000 ? brandMs : LOADER_CONFIG.brandMs;
  const scale = total / CUE_REFERENCE_MS;
  const cue = (delay, duration) => Object.freeze({ delay: delay * scale, duration: duration * scale });
  return Object.freeze({
    total,
    depth: cue(0, 1450), portal: cue(120, 1700),
    fragments: Object.freeze([cue(120, 1080), cue(270, 1180), cue(410, 1260)]),
    face: cue(720, 980), silver: cue(1390, 620), aura: cue(280, 1450), underline: cue(1050, 900),
    recognitionHoldMs: 690 * scale,
  });
}
