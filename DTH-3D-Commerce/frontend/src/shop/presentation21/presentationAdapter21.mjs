import { getPresentation21 } from '../../../../shared/productPresentation21.mjs';
import { frameDistance } from '../product/inspection.logic.mjs';
import { presentationFromBounds21 } from './presentationMath21.mjs';
/** Called after existing bounded parsing/geometry checks. No validation is bypassed. */
export function applyPresentation21(measured, resolved, product) {
  const settings=getPresentation21(product);
  if(!settings)return resolved;
  const bounds={min:measured.box.min.toArray(),max:measured.box.max.toArray()};
  return {...resolved,status:'admin-presentation',profile:null,
    reason:'Saved product presentation. Authored hotspots are not reused after an orientation override.',
    presentation:presentationFromBounds21(bounds,measured.normalization,settings,frameDistance)};
}
