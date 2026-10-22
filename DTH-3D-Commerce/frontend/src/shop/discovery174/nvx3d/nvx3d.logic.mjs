// Pure helpers: these are also exercised by tests/nvx-build-3d.test.mjs.
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const easeOutCubic = value => 1 - (1 - clamp(value, 0, 1)) ** 3;
export const easeInCubic = value => clamp(value, 0, 1) ** 3;

export function nextIndex(index, direction, length) {
  if (!Number.isInteger(length) || length <= 0) return -1;
  return ((index + Math.sign(direction)) % length + length) % length;
}

export function swipeDirection(dx, dy, width = 400) {
  const threshold = clamp(width * 0.12, 44, 88);
  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.35) return 0;
  return dx < 0 ? 1 : -1;
}

export function transitionDirection(previousId, nextId, vehicles, explicit = 0) {
  if (explicit) return Math.sign(explicit);
  const a = vehicles.findIndex(v => v.id === previousId);
  const b = vehicles.findIndex(v => v.id === nextId);
  return a < 0 || b < 0 || a === b ? 1 : Math.sign(b - a);
}

export function fitDistance(radius, verticalFovDegrees, aspect, padding = 1.16) {
  if (!(radius > 0) || !(aspect > 0)) throw new Error('Invalid model/camera bounds.');
  const vertical = verticalFovDegrees * Math.PI / 180;
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect);
  return radius * padding / Math.sin(Math.min(vertical, horizontal) / 2);
}

export function validateGLB(buffer, maxBytes = Infinity) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 20) {
    throw new Error('The model is not a complete GLB file.');
  }
  if (buffer.byteLength > maxBytes) throw new Error('The GLB exceeds the configured size limit.');
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67) {
    throw new Error('Expected GLB data, but received another file (possibly a 404 HTML page).');
  }
  if (view.getUint32(4, true) !== 2) throw new Error('Only glTF/GLB 2.0 is supported.');
  if (view.getUint32(8, true) !== buffer.byteLength) throw new Error('The GLB download is incomplete.');
  let offset = 12;
  let first = true;
  while (offset < buffer.byteLength) {
    if (offset + 8 > buffer.byteLength) throw new Error('Invalid GLB chunk header.');
    const size = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    if (size % 4 || offset + 8 + size > buffer.byteLength) throw new Error('Invalid GLB chunk length.');
    if (first && type !== 0x4e4f534a) throw new Error('The first GLB chunk must contain JSON.');
    first = false;
    offset += 8 + size;
  }
  return true;
}
