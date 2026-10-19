import { freezeProfile, PROFILE_LIMITS, validate3DProfile, modelPath } from '../../../../../shared/product3dProfile.mjs';
import { APEX_PROFILE } from '../advanced/hotspots.mjs';
import { frameDistance } from '../inspection.logic.mjs';

const d = frameDistance(800, 600);
const position = (theta, phi, radius) => [radius*Math.sin(phi)*Math.sin(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.cos(theta)];
/** Presentation coordinates below are normalized viewer units; NOT physical dimensions. */
export const APEX_PRODUCT_3D_PROFILE = freezeProfile({
  schemaVersion: 1,
  profileId: 'apex-suspension-product-study', productId: 'apex-suspension', version: '1.0.0',
  asset: { url: '/models/dth-demo/apex-suspension.glb', sha256: 'b40e2490d0c7d847b4cbb5cd7a486de6a7d805716e8d386b543f074c140a4cc3' },
  // Applied around the auto-centred model, in order: normalize -> scale -> XYZ rotation -> offset.
  transform: { rotation: [0,0,0], scale: 1, offset: [0,0,0] },
  camera: { fov: 36, presets: {
    front: { position: position(.28, Math.PI/2-.08, d), target: [0,0,0] },
    side: { position: [d,0,0], target: [0,0,0] },
    rear: { position: position(Math.PI, Math.PI/2-.08, d), target: [0,0,0] },
    detail: { position: position(.28, Math.PI/2-.16, d*.76), target: [0,0,0] },
  } },
  modes: { surface: true, technical: true, hotspots: true },
  // Reuse the authored Step 12.2 notes, NOT a geometry-inferred description.
  hotspots: APEX_PROFILE.hotspots.map(h => ({ id:h.id, label:h.label, description:h.text, position:h.position.slice(), focus:null })),
  provenance: { source:'demo', tool:'DTH bundled demonstrator', license:'Unverified; consult project asset provenance',
    attribution:'Illustrative product, not a manufacturer scan.', captureDate:null, optimized:null, purpose:'visualization-only' },
});

/** Register reviewed profiles here. This release does not add a database field or Admin upload. */
export const PRODUCT_3D_PROFILES = Object.freeze([APEX_PRODUCT_3D_PROFILE]);
export function selectProduct3DProfile(product, registry = PRODUCT_3D_PROFILES) {
  if(!Array.isArray(registry) || registry.length>PROFILE_LIMITS.registry) return {status:'invalid-profile',candidate:null,reason:'Invalid profile registry; automatic framing.'};
  // An invalid entry must not bring down the page or be mistaken for a different product.
  const matching=registry.filter(p=>p && typeof p==='object' && Object.getOwnPropertyDescriptor(p,'productId')?.value===product?.id);
  if(!matching.length) return {status:'automatic',candidate:null,reason:'No product profile; automatic framing.'};
  if(matching.length!==1) return {status:'invalid-profile',candidate:null,reason:'Duplicate product profiles; automatic framing.'};
  const parsed=validate3DProfile(matching[0]);
  if(!parsed.ok) return {status:'invalid-profile',candidate:null,reason:'Invalid presentation profile; automatic framing.'};
  if(parsed.profile.asset.url!==modelPath(product?.modelUrl))return {status:'binding-mismatch',candidate:null,reason:'Model path has changed; automatic framing without annotations.'};
  return {status:'pending',candidate:parsed.profile,reason:'Checking model identity…'};
}
