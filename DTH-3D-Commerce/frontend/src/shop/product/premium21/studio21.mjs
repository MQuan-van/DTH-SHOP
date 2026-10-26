/** Presentation only: these controls never change GLB geometry or authored materials. */
export const STUDIO_PRESETS21 = Object.freeze({
  original: Object.freeze({ label: 'Original', environment: 0.7, ambient: 0.28, hemi: 0.65, key: 2, fill: 1.25, rim: 0 }),
  studio: Object.freeze({ label: 'Studio', environment: 0.85, ambient: 0.12, hemi: 0.25, key: 1.65, fill: 0.65, rim: 0.65 }),
  detail: Object.freeze({ label: 'Detail', environment: 0.65, ambient: 0.1, hemi: 0.2, key: 2.2, fill: 0.4, rim: 0.95 }),
});
export const DEFAULT_STUDIO21 = Object.freeze({ preset: 'studio', exposure: 1, quality: 'balanced' });
export function normalizeStudio21(input) {
  const preset = Object.hasOwn(STUDIO_PRESETS21, input?.preset ?? '') ? input.preset : DEFAULT_STUDIO21.preset;
  const exposure = typeof input?.exposure === 'number' && Number.isFinite(input.exposure)
    ? Math.min(1.4, Math.max(0.7, input.exposure)) : DEFAULT_STUDIO21.exposure;
  return { preset, exposure, quality: input?.quality === 'sharp' ? 'sharp' : 'balanced' };
}
export function studioDpr21(input, eco = false, originalMax = 1.5) {
  if (eco) return [1, 1];
  const base = Number.isFinite(originalMax) ? Math.min(2, Math.max(1, originalMax)) : 1.5;
  return [1, normalizeStudio21(input).quality === 'sharp' ? 2 : base];
}
export function formatAssetStats21(report) {
  if (!report || !Number.isFinite(report.byteLength) || !Number.isFinite(report.triangles)) return '';
  if (report.byteLength < 0 || report.triangles < 0) return '';
  return `${(report.byteLength / 1048576).toFixed(1)} MiB · ${Math.round(report.triangles).toLocaleString('en-GB')} triangles`;
}
