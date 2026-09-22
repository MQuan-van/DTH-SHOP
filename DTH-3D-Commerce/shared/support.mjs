import { InputError } from './domain.mjs';
export const CHAT_LIMITS = Object.freeze({ text: 3000, uploadBytes: 5 * 1024 * 1024, storedBytes: 2 * 1024 * 1024, pixels: 16000000, pageSize: 40, connectionsPerUser: 4 });
export const CHAT_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function chatId(value) { if (typeof value !== 'string' || !CHAT_ID.test(value)) throw new InputError('Conversation or message not found.', 404); return value; }
export function messageInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Invalid message.');
  const clientId = chatId(body.clientId);
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (body.text != null && typeof body.text !== 'string') throw new InputError('Message must be text.');
  if (text.length > CHAT_LIMITS.text) throw new InputError('Use at most 3000 characters.');
  let image = null;
  if (body.image != null) {
    if (!['image/jpeg','image/png','image/webp'].includes(body.image?.mime) || typeof body.image.base64 !== 'string') throw new InputError('Choose a JPEG, PNG or WebP image.');
    const raw = body.image.base64;
    if (!raw || raw.length > Math.ceil(CHAT_LIMITS.uploadBytes / 3) * 4 || raw.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) throw new InputError('Invalid image or image larger than 5 MiB.');
    image = { mime: body.image.mime, base64: raw };
  }
  if (!text && !image) throw new InputError('Write a message or choose an image.');
  return { clientId, text, image };
}
export function pageNumber(value, fallback = 1) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,4}$/.test(value)) throw new InputError('Invalid page.');
  return Number(value);
}
export function sequence(value) { if (!Number.isSafeInteger(value) || value < 0) throw new InputError('Invalid read position.'); return value; }
export function searchText(value) { if (value == null) return ''; if (typeof value !== 'string' || value.length > 100) throw new InputError('Search is too long.'); return value.trim(); }
export const literalPattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
