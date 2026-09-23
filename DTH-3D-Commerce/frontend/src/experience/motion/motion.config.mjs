/** One Home-only switch restores the original showroom without changing commerce. */
export const CINEMATIC_CONFIG = {
  enabled: true,
  productId: 'apex-suspension',
  storyScreens: 3.2,
  scrubSeconds: 0.55,
  entranceSeconds: 1.15,
  settleRate: 11,
  pointerRadians: 0.045,
  loadTimeoutMs: 20000,
  maxDpr: 1.5,
  ecoDpr: 1,
  chapters: [
    { id: 'form', at: 0, label: 'Form', title: ['Beyond', 'the surface.'], note: 'A different perspective on your next build.' },
    { id: 'surface', at: 0.29, label: 'Surface', title: ['Every angle.', 'Every detail.'], note: 'Get closer to the spring, finish and silhouette.' },
    { id: 'assembly', at: 0.61, label: 'Assembly', title: ['One part.', 'Many perspectives.'], note: 'An illustrative assembly. Scroll to take it apart.' },
    { id: 'build', at: 1, label: 'Your build', title: ['Find your', 'next angle.'], note: 'Choose your vehicle. Explore the matching collection.' },
  ],
};

// Creative framing only. These are scene units, NOT dimensions/specifications.
export const STORY_FRAMES = [
  { at: 0, camera: [0, 0.35, 8.4], target: [0, 0, 0], position: [0.8, 0.10, 0], rotation: [-0.08, -0.50, -0.32], scale: 1.4, explode: 0 },
  { at: 0.15, camera: [0.7, 0.45, 7.5], target: [0.25, 0.1, 0], position: [0.8, 0.10, 0], rotation: [-0.06, -0.20, -0.19], scale: 1.4, explode: 0 },
  { at: 0.29, camera: [1.6, 0.7, 5.5], target: [0.75, 0.3, 0], position: [1.0, 0.02, 0], rotation: [0.02, 0.50, 0.12], scale: 1.4, explode: 0 },
  { at: 0.44, camera: [1.3, 0.8, 7.8], target: [0.15, 0.05, 0], position: [0.6, 0, 0], rotation: [0.04, 0.24, 0.05], scale: 1.4, explode: 0.4 },
  { at: 0.61, camera: [1.4, 0.65, 10.5], target: [0, 0, 0], position: [0.5, 0, 0], rotation: [0, 0.08, 0], scale: 1.4, explode: 1 },
  { at: 0.74, camera: [-0.8, 0.8, 10], target: [0, 0, 0], position: [0.5, 0, 0], rotation: [0, -0.16, 0], scale: 1.4, explode: 1 },
  { at: 0.9, camera: [-0.3, 0.35, 8.7], target: [0, 0, 0], position: [-0.7, 0.08, 0], rotation: [-0.06, -0.45, 0.25], scale: 1.4, explode: 0 },
  { at: 1, camera: [0, 0.3, 8.4], target: [0, 0, 0], position: [-0.9, 0.08, 0], rotation: [-0.06, -0.45, 0.25], scale: 1.4, explode: 0 },
];
export const INSPECT_FRAME = { camera: [0, 0.3, 8.6], target: [0, 0, 0], position: [0, 0, 0], rotation: [0, -0.4, -0.12], scale: 1.4, explode: 0 };
