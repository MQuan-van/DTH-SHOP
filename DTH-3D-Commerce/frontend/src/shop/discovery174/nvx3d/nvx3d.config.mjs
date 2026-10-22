// Model paths are relative to Vite's public directory, not to src/.
// V1/V2 must stay null until their own, correct models are supplied.
// export const NVX_MODELS = Object.freeze({
//   'yamaha-nvx-v1': Object.freeze({
//     label: 'NVX V1', file: null, rotation: [0, 0, 0],
//   }),
//   'yamaha-nvx-v2': Object.freeze({
//     label: 'NVX V2', file: null, rotation: [0, 0, 0],
//   }),
//   'yamaha-nvx-v3': Object.freeze({
//     label: 'NVX V3', file: 'models/nvx/nvx-v3.glb', rotation: [0, 0, 0],
//   }),
// });

export const NVX_MODELS = Object.freeze({
  'yamaha-nvx-v1': Object.freeze({
    label: 'NVX V1',
    file: null,
    rotation: [0, 0, 0],
  }),

  'yamaha-nvx-v2': Object.freeze({
    label: 'NVX V2',
    file: 'models/nvx/nvx-v2.glb',
    rotation: [0, 0, 0],
  }),

  'yamaha-nvx-v3': Object.freeze({
    label: 'NVX V3',
    file: 'models/nvx/nvx-v3.glb',
    rotation: [0, 0, 0],
  }),
});


export const NVX_STAGE = Object.freeze({
  defaultPreviewId: 'yamaha-nvx-v3',
  normalizedSize: 4,
  cameraFov: 35,
  cameraAzimuth: Math.PI * 0.22,
  cameraPolar: Math.PI * 0.39,
  fitPadding: 1.16,
  autoRotateSpeed: 0.8,
  exitSeconds: 0.30,
  enterSeconds: 0.58,
  maxDpr: 1.5,
  // Safety limit, not a performance promise. Smaller assets remain preferable.
  maxModelBytes: 128 * 1024 * 1024,
  fetchTimeoutMs: 90000,
});

export function publicAsset(file) {
  if (!file) return null;
  const base = import.meta.env?.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}/${file.replace(/^\/+/, '')}`;
}
