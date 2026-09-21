/** Shop-only presentation. Does not change Home, GLB materials or dependencies. */
export const SHOP_CONFIG = {
  title: 'Find your next upgrade.',
  description: 'Get closer to the details. Find the right match for your ride.',
  pageSize: 9,
  priceStep: 50000,
  motion: {
    enabled: true,
    hoverScale: 1.10,
    hoverDurationMs: 420,
    gridDurationMs: 300,
    staggerMs: 35,
    modalDurationMs: 240,
    quickZoomMax: 2,
    quickZoomStep: 0.25,
  },
  categories: [
    { id: 'suspension', label: 'Suspension' },
    { id: 'wheels', label: 'Wheels' },
    { id: 'exhausts', label: 'Exhausts' },
    { id: 'mirrors', label: 'Mirrors' },
    { id: 'brakes', label: 'Brakes' },
  ],
  // Original demo geometry rendered to NEW transparent previews; originals are untouched.
  // Disable after replacing the demo assets with your own product photography.
  useDemoCutouts: true,
};
