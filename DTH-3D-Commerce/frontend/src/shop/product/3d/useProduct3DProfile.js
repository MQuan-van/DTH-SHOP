import { useMemo } from 'react';
import { selectProduct3DProfile } from './assetProfiles.mjs';
export function useProduct3DProfile(product) {
  return useMemo(() => selectProduct3DProfile(product), [product.id, product.modelUrl]);
}
