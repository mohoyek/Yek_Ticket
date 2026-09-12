/**
 * Generate a VAPID key pair for Web Push (RFC 8292).
 * Run: node scripts/generate-vapid-keys.mjs
 *
 * Put the output in backend/.dev.vars (local dev) and/or
 * `wrangler secret put VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (production).
 */
import { webcrypto } from 'node:crypto';

const pair = await webcrypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
);

const privJwk = await webcrypto.subtle.exportKey('jwk', pair.privateKey);
const pubJwk = await webcrypto.subtle.exportKey('jwk', pair.publicKey);

// VAPID public key = 65-byte uncompressed point (0x04 || X || Y), base64url
const decode = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const pubRaw = Buffer.concat([Buffer.from([0x04]), decode(pubJwk.x), decode(pubJwk.y)]);
const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

console.log('VAPID_PUBLIC_KEY=' + b64url(pubRaw));
console.log('VAPID_PRIVATE_KEY=' + privJwk.d);
console.log('');
console.log('# .dev.vars format:');
console.log(`VAPID_PUBLIC_KEY="${b64url(pubRaw)}"`);
console.log(`VAPID_PRIVATE_KEY="${privJwk.d}"`);
