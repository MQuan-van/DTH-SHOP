import test from 'node:test';
import assert from 'node:assert/strict';
import { cookieToken, digest, hashPassword, randomToken, rateLimiter, verifyPassword } from '../backend/commerce/security.mjs';
test('scrypt hash does not contain plaintext and verifies', async () => { const p = 'unique-demo-password-321'; const hash = await hashPassword(p); assert.ok(!hash.includes(p)); assert.equal(await verifyPassword(p, hash), true); assert.equal(await verifyPassword('wrong-password-123', hash), false); });
test('identical passwords receive distinct salts', async () => assert.notEqual(await hashPassword('unique-demo-password'), await hashPassword('unique-demo-password')));
test('invalid password hashes fail closed', async () => assert.equal(await verifyPassword('password', 'bad-hash'), false));
test('session tokens have 256 bits and hashes are distinct', () => { const a = randomToken(), b = randomToken(); assert.match(a, /^[a-f0-9]{64}$/); assert.notEqual(a, b); assert.notEqual(digest(a), a); });
test('cookie parser extracts only expected format', () => { const t = randomToken(); assert.equal(cookieToken(`a=1; dth_commerce_session=${t}; another=x`), t); assert.equal(cookieToken('dth_commerce_session=<script>'), ''); assert.equal(cookieToken(), ''); });
test('rate limiter blocks after the stated limit', () => { const limiter = rateLimiter({ max: 2, windowMs: 10000 }); let passed=0, status=0; const res={ setHeader(){}, status(s){status=s; return this;}, json(){} }; for(let i=0;i<3;i++)limiter({ip:'test'},res,()=>passed++); assert.equal(passed,2);assert.equal(status,429); });
