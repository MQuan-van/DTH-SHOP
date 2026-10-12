import { LOADER_CONFIG } from './loader.config.mjs';
/** Wake at the next real policy milestone, not every 50ms. State changes also re-run the Gate effect. */
export function nextLoaderCheckDelay({ elapsed = 0, brandElapsed = 0, logoReady = false, reduced = false } = {}, config = LOADER_CONFIG) {
  const sane = n => Number.isFinite(n) ? Math.max(0, n) : 0;
  const clock = sane(elapsed), brand = sane(brandElapsed);
  const deadlines = [config.maxCoverMs - clock];
  if (clock < config.waitingLabelMs) deadlines.push(config.waitingLabelMs - clock);
  if (logoReady && !reduced && brand < config.brandMs) deadlines.push(config.brandMs - brand);
  return Math.max(1, Math.ceil(Math.min(...deadlines)));
}
