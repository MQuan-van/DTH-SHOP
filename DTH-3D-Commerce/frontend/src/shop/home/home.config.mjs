/**
 * HOME EDITOR — change content, order and motion here, not in StoreApp.jsx.
 * No new dependency; uses the existing Three.js stack + browser animations.
 * Timings: milliseconds. Rotations: radians. Rotation speed: radians/second.
 */
export const HOME_CONFIG = {
  sections: [
    { id: 'hero', enabled: true },
    { id: 'workflow', enabled: true },
    { id: 'categories', enabled: true },
    { id: 'featured', enabled: true },
    { id: 'fitment', enabled: true },
  ],
  motion: {
    enabled: true,
    entranceMs: 1000,
    staggerMs: 85,
    revealMs: 650,
    revealDistancePx: 24,
    ambientRingSeconds: 55,
  },
  hero: {
    eyebrow: 'DTH / THE DIGITAL SHOWROOM',
    headline: [' ', 'New arrivals'],
    description: 'Ship from the Malaysia Factory for 10-15 business days. Free shipping for first five orders. Limited stock available.',
    inspectLabel: 'Inspect in 3D',
    productLinkLabel: 'View product',
    annotations: true,
    scene: {
      camera: [0, 0.2, 6.8],
      fov: 34,
      minDistance: 4.2,
      maxDistance: 9,
      maxDpr: 1.5,
      exposure: 1.04,
      environmentIntensity: 0.65,
      ambientIntensity: 0.5,
      keyIntensity: 2.0,
      rimIntensity: 1.0,
      fillIntensity: 0.4,
      autoRotateSpeed: -1,
      floatAmplitude: 0.035,
      floatSpeed: 0.7,
      entranceMs: 1400,
      entranceTurn: -0.65,
    },
    exhibits: [
      {
        productId: 'apex-suspension',
        stillUrl: '/previews/home-stage/apex-suspension.png',
        label: 'Suspension',
        backdrop: 'DTH',
        geometry: 'Coil & damper',
        note: 'Explore the spring and reservoir silhouette.',
        rotation: [0, -0.4, -0.28],
        modelSize: 3.25,
      },
      {
        productId: 'apex-wheels',
        stillUrl: '/previews/home-stage/apex-wheels.png',
        label: 'Wheel',
        backdrop: 'DTH',
        geometry: 'Spoke & rim',
        note: 'Examine the spoke pattern and rim profile.',
        rotation: [0.08, -0.35, 0.04],
        modelSize: 3,
      },
      {
        productId: 'apex-exhausts',
        stillUrl: '/previews/home-stage/apex-exhausts.png',
        label: 'Exhaust',
        backdrop: 'DTH',
        geometry: 'Canister & outlet',
        note: 'Inspect the body, mounting bands and outlet.',
        rotation: [0, -0.28, 0.1],
        modelSize: 3.15,
      },
    ],
  },
  workflow: {
    steps: [
      { title: 'Select your vehicle', detail: 'Make. Model. Year.' },
      { title: 'Explore every angle', detail: 'Interactive product inspection.' },
      { title: 'Imagine your next build', detail: 'Demo checkout. No real payment.' },
    ],
  },
  categories: { eyebrow: 'CHOOSE YOUR DIRECTION', title: 'One studio. Every detail.' },
  featured: { eyebrow: 'THE SELECTED EDIT', title: 'Parts worth a closer look.', count: 4 },
  fitment: { eyebrow: 'THE NEXT STEP', title: 'Your ride. Your direction.', button: 'Select my vehicle' },
};

/** Pure helpers: also covered by tests, and safe for a changing API catalog. */
export function resolveExhibits(products, definitions = HOME_CONFIG.hero.exhibits) {
  const live = products.filter(p => p && p.active !== false);
  const selected = definitions.flatMap(definition => {
    const product = live.find(p => p.id === definition.productId);
    return product ? [{ ...definition, product }] : [];
  });
  if (selected.length || !live.length) return selected;
  const product = live[0];
  return [{ productId: product.id, label: product.category, backdrop: 'DTH',
    geometry: 'Product study', note: product.description, rotation: [0, -0.3, 0],
    modelSize: 3, product }];
}
export function enabledSections(config = HOME_CONFIG) {
  return config.sections.filter(s => s.enabled).map(s => s.id);
}
export const CATEGORY_LABELS = { suspension: 'Suspension', wheels: 'Wheels', exhausts: 'Exhausts', mirrors: 'Mirrors', brakes: 'Brakes' };
