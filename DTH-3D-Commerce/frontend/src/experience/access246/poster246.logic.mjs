import { STUDY_POSTER245, studioPoster245 } from '../access245/director245.logic.mjs';

/** Native 500×480 capture of Blue Vault Overview, 2026-11-05.
 * Same original GLB / default presentation binding as the preceding study.
 * Re-capture after model bytes, presentation or this scene's lighting change.
 */
export const STUDY_POSTER246 = Object.freeze({
  ...STUDY_POSTER245,
  src: '/branding/access246/ohlins-vault-79d2b2bd.jpg',
  theme: 'blue-vault-246',
});
export function studioPoster246(product) {
  return studioPoster245(product) ? STUDY_POSTER246 : null;
}
