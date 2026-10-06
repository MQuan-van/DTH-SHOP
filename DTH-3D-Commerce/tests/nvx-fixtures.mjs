/** Synthetic test fixture, not a model/fitment source. Real repository fixture is also checked when present. */
import { NVX_DEMO_RECIPES } from '../shared/nvx.mjs';
export function makeNVXBaselineFixture() {
  return { demoOnly: true, version: 1, vehicles: [], products: NVX_DEMO_RECIPES.map((r, i) => ({
    id: r.productId, slug: r.productId, name: `Fixture ${r.productId}`, category: r.productId.split('-')[1],
    price: 100000 + i * 1000, currency: 'VND', active: true, demoOnly: true, finish: 'Test finish',
    description: 'Synthetic unit-test product', modelUrl: `/models/dth-demo/${r.productId}.glb`,
    imageUrl: `/previews/dth-demo/${r.productId}.png`, assetLicense: 'Original illustrative project asset',
    vehicleIds: [...r.oldIds], featured: i === 0,
  })) };
}
