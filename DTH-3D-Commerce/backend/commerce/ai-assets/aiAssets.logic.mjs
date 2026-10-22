import path from 'node:path';
import { createHash } from 'node:crypto';

export const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_MODEL_BYTES = 128 * 1024 * 1024;
export const VERSION_IDS = Object.freeze(['v1', 'v2', 'v3']);
export const ACTIVE_STATUSES = new Set(['SUBMITTING', 'PENDING', 'IN_PROGRESS', 'QUEUED']);

export function imageId(name, stat) {
  return createHash('sha256').update(`${name}\0${stat.size}\0${Math.trunc(stat.mtimeMs)}`).digest('hex').slice(0, 32);
}
export function safeName(name) {
  return typeof name === 'string' && name.length > 0 && name.length <= 240 && !/[\\/\0]/.test(name)
    && !name.startsWith('.') && name !== '..' && IMAGE_EXTS.has(path.extname(name).toLowerCase());
}
export function validateSelection(ids) {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 4 || ids.some(id => typeof id !== 'string' || !/^[a-f0-9]{32}$/.test(id)) || new Set(ids).size !== ids.length) {
    throw new Error('Choose 1–4 different gallery images.');
  }
  return ids;
}
export function validateVersion(version) {
  if (!VERSION_IDS.includes(version)) throw new Error('Select NVX V1, V2 or V3.');
  return version;
}
export function isGLBHeader(head, total) {
  if (!Buffer.isBuffer(head) || head.length < 20) return false;
  return head.readUInt32LE(0) === 0x46546c67 && head.readUInt32LE(4) === 2
    && head.readUInt32LE(8) === total && head.readUInt32LE(16) === 0x4e4f534a
    && head.readUInt32LE(12) <= total - 20;
}
export function safeDownloadUrl(url, hosts = ['assets.meshy.ai']) {
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('Meshy returned an invalid download URL.'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !hosts.includes(parsed.hostname) || parsed.port) {
    throw new Error('Meshy returned a download URL outside the trusted asset hosts.');
  }
  return parsed.href;
}
export function cleanTaskResponse(task) {
  return {
    status: ['PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'CANCELED'].includes(task?.status) ? task.status : 'IN_PROGRESS',
    progress: Number.isFinite(task?.progress) ? Math.min(100, Math.max(0, task.progress)) : 0,
    consumedCredits: Number.isFinite(task?.consumed_credits) ? task.consumed_credits : null,
    failureMessage: typeof task?.task_error?.message === 'string' ? task.task_error.message.slice(0, 300) : '',
  };
}
