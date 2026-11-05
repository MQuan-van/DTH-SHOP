import { Euler, Quaternion, MathUtils } from 'three';
import { validateAttachment242 } from '../../../../shared/mount-calibration242.mjs';
import { NVX_MODELS } from '../../shop/discovery174/nvx3d/nvx3d.config.mjs';
import { categoryId } from '../../../../shared/categories.mjs';

export const VEHICLE242 = 'yamaha-nvx-v2';
export const PRODUCT242 = 'ohlins';
export const PROFILE_FILE242 = 'yamaha-nvx-v2__ohlins__suspension-rear.mount.json';
export function numericCommit242(text, initialText, edited) {
  if (!edited || text === initialText) return {changed:false};
  if (typeof text !== 'string' || !text.trim()) throw new Error('Enter a number.');
  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error('Enter a finite number.');
  return {changed:true,value};
}
export function calibrationProduct242(products) {
  return products?.find(item => item.id === PRODUCT242 && item.active !== false && categoryId(item.category) === 'suspension') || null;
}
export function calibrationVehicle242(manifest, sourceMode = 'published') {
  if (!['published','local'].includes(sourceMode)) throw new Error('Unknown vehicle model source.');
  if (sourceMode === 'local') manifest = {data:{}};
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) || !manifest.data || typeof manifest.data !== 'object' || Array.isArray(manifest.data)) throw new Error('The published vehicle manifest is invalid. Reload the assets.');
  const published = manifest.data[VEHICLE242], spec = NVX_MODELS[VEHICLE242];
  let assetUrl = spec?.file ? `/${spec.file.replace(/^\/+/, '')}` : null;
  if (published != null) {
    if (typeof published.url !== 'string' || !/^\/?api\/shop\/ai-assets\/models\/v2\.glb\?rev=[a-f0-9-]{36}$/.test(published.url)) throw new Error('Published NVX V2 has an invalid asset reference. No other vehicle was substituted.');
    assetUrl = `/${published.url.replace(/^\/+/, '')}`;
  }
  if (!assetUrl) throw new Error('NVX V2 has no model. Supply its own asset before calibrating.');
  return { id: VEHICLE242, assetUrl, rotationXYZ: [...(spec.rotation || [0, 0, 0])], source: published ? 'Published model' : 'Local NVX V2' };
}
export function attachmentFields242(value) {
  const pose = validateAttachment242(value), rotation = new Euler().setFromQuaternion(new Quaternion(...pose.quaternion), 'XYZ');
  return { position: [...pose.position], rotation: [rotation.x, rotation.y, rotation.z].map(MathUtils.radToDeg), scale: pose.scale };
}
export function changeAttachmentField242(pose, kind, index, number) {
  const next = validateAttachment242(pose);
  if (!Number.isFinite(number)) throw new Error('Enter a finite number.');
  if (kind === 'scale') next.scale = number;
  else {
    if (![0, 1, 2].includes(index)) throw new Error('Choose a valid axis.');
    if (kind === 'position') next.position[index] = number;
    else if (kind === 'rotation') {
      const rotation = attachmentFields242(next).rotation; rotation[index] = number;
      next.quaternion = new Quaternion().setFromEuler(new Euler(...rotation.map(MathUtils.degToRad), 'XYZ')).toArray();
    } else throw new Error('Unknown attachment field.');
  }
  return validateAttachment242(next);
}
export function calibrationShortcut242({ key, ctrlKey = false, metaKey = false, shiftKey = false, altKey = false, editing = false } = {}) {
  if (editing || altKey || typeof key !== 'string') return null;
  const lower = key.toLowerCase();
  if (ctrlKey || metaKey) {
    if (lower === 'z') return shiftKey ? 'redo' : 'undo';
    return lower === 'y' ? 'redo' : null;
  }
  return ({w:'translate', e:'rotate', r:'scale', f:'part', home:'overview', escape:'cancel'})[lower] || null;
}
