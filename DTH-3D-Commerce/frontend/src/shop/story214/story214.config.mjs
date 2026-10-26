/** Presentation budgets, not a promise of performance on every device. */
export const STORY214 = Object.freeze({
  version: '21.4', desktopQuality: 'ultra', compactQuality: 'high',
  scrubSeconds: 0.38, travelStart: 0.58, travelEnd: 0.96,
  segmentViewport: 1.18, rawCacheMiB: 192, rawCacheEntries: 3,
  maxConcurrentDownloads: 1, loadingTimeoutMs: 90000,
});
export const QUALITY214 = Object.freeze({
  high: Object.freeze({ dpr: 1.5, bytes: 64*1048576, decodedBytes: 256*1048576, vertices: 2000000, triangles: 1500000 }),
  ultra: Object.freeze({ dpr: 2, bytes: 128*1048576, decodedBytes: 512*1048576, vertices: 4000000, triangles: 3000000 }),
});
export function quality214(compact = false) { return compact ? QUALITY214.high : QUALITY214.ultra; }
