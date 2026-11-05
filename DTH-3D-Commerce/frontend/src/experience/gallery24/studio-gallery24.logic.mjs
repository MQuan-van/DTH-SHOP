import { catalog22H2, playable22H2, bindProduct22H2, choose22H2 } from '../studio22h2/studio22h2.logic.mjs';
import { filterStudioSuspension22H2 } from '../studio22h2/studioSuspensionCatalog.mjs';

/** Only published StoreProvider records. No extra asset studies or fallback catalog. */
export function studioGalleryCatalog24(values, binding) {
  const list = playable22H2(filterStudioSuspension22H2(catalog22H2(values)));
  return list.map(record => bindProduct22H2(record, binding)).sort((a, b) =>
    Number(a.modelUrl.startsWith('/models/dth-demo/')) - Number(b.modelUrl.startsWith('/models/dth-demo/')));
}
export const studioGalleryDefault24 = (products, configured) =>
  products.find(p => p.id === configured)?.id || products.find(p => !p.modelUrl.startsWith('/models/dth-demo/'))?.id || choose22H2(products, '', '')?.id || '';
export const externalGalleryOverlay24 = (elements, ownDialog) => [...elements].some(element => element !== ownDialog);

/** Move the same portal host, not its React subtree: Canvas/GLB remain mounted. */
export function mountGalleryHost24(host, slot, dialog, expanded) {
  if (!host || !slot || !dialog) return false;
  if (expanded) {
    if (typeof dialog.showModal !== 'function') return false;
    slot.style.height = `${host.getBoundingClientRect().height}px`;
    dialog.appendChild(host);
    try { if (!dialog.open) dialog.showModal(); }
    catch { slot.appendChild(host); slot.style.height = ''; return false; }
  } else {
    if (dialog.open) dialog.close();
    slot.appendChild(host); slot.style.height = '';
  }
  return true;
}
