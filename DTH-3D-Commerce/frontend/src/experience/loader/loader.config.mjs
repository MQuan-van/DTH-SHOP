/** Presentation timing, NOT download progress. Keep the session key across visual upgrades. */
export const LOADER_CONFIG = Object.freeze({
  enabled: true,
  sessionKey: 'dth.ignition.seen.v1',
  logoUrl: '/branding/dth-logo-original.png',
  logoWidth: 1536,
  logoHeight: 1024,
  // The entire choreography scales to brandMs, including the final clear-logo hold.
  brandMs: 3500,
  exitMs: 750,
  quietExitMs: 100,
  // From React mount; still fail open if the network, image or page does not settle.
  maxCoverMs: 6500,
  posterBudgetMs: 450,
  waitingLabelMs: 4800,
});
