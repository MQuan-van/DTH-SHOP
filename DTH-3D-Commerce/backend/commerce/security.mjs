import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export const digest = text => createHash('sha256').update(text).digest('hex');
export const randomToken = () => randomBytes(32).toString('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$32768$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || password.length > 128) return false;
  const [scheme, cost, salt, encoded] = String(stored).split('$');
  if (scheme !== 'scrypt' || cost !== '32768' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(encoded || '')) return false;
  const key = await derive(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(key, Buffer.from(encoded, 'hex'));
}
export function cookieToken(header = '') {
  const raw = header.split(';').map(s => s.trim()).find(s => s.startsWith('dth_commerce_session='))?.slice('dth_commerce_session='.length);
  return /^[a-f0-9]{64}$/.test(raw || '') ? raw : '';
}
/** In-memory limits for a single-process demonstrator. Use a shared limiter before production. */
export function rateLimiter({ max, windowMs, prefix = '' }) {
  const attempts = new Map();
  return (req, res, next) => {
    const now = Date.now(), key = `${prefix}:${req.ip}`;
    for (const [id, entry] of attempts) if (entry.expires <= now) attempts.delete(id);
    const entry = attempts.get(key) || { count: 0, expires: now + windowMs };
    entry.count++; attempts.set(key, entry);
    if (entry.count > max) { res.setHeader('Retry-After', Math.ceil((entry.expires - now) / 1000)); return res.status(429).json({ message: 'Too many attempts. Please try again later.' }); }
    next();
  };
}
