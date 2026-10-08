/** Step 17.2: presentation time is not network progress. Existing session key stays. */
export const LOADER_CONFIG = Object.freeze({
  enabled: true,
  sessionKey: 'dth.ignition.seen.v1',
  logoUrl: '/branding/dth-logo-original.png',
  logoWidth: 1536, logoHeight: 1024,
  brandMs: 2500,
  exitMs: 360,
  quietExitMs: 100,
  maxCoverMs: 6500,
  posterBudgetMs: 450,
  waitingLabelMs: 4800,
});
