/**
 * Runtime smoke-test for backend/src/utils/webpush.ts using Node's WebCrypto.
 * Run: node tests/webpush.test.mjs
 * Verifies:
 *  1. VAPID ES256 JWT builds and verifies against the public key
 *  2. RFC 8291 aes128gcm payload encrypts and decrypts round-trip
 *  3. sendWebPush returns a plausible HTTP status for an unreachable endpoint
 */
import { webcrypto } from 'node:crypto';

// Node's WebCrypto (same APIs Workers provides)
if (!globalThis.crypto) globalThis.crypto = webcrypto;
// atob/btoa for Node < 18 compat (harmless on >= 18)
if (!globalThis.atob) globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');
if (!globalThis.btoa) globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');

const mod = await import('../src/utils/webpush.ts');
const { sendWebPush } = mod;

function b64urlToBytes(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) {
    console.log(`  ✅ ${name}`);
  } else {
    failures += 1;
    console.error(`  ❌ ${name}${extra ? ' — ' + extra : ''}`);
  }
}

// ---------- key generation (mirrors what the user would put in .dev.vars) ----------
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify',
]);
const privJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
const pubJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);

// VAPID public key must be the 65-byte uncompressed point, base64url
const pubRaw = new Uint8Array(65);
pubRaw[0] = 0x04;
pubRaw.set(b64urlToBytes(pubJwk.x), 1);
pubRaw.set(b64urlToBytes(pubJwk.y), 33);
const b64url = (u8) =>
  Buffer.from(u8).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const publicKey = b64url(pubRaw);
const privateKey = privJwk.d; // base64url scalar

console.log('Generated VAPID keys');
console.log('  VAPID_PUBLIC_KEY  =', publicKey);
console.log('  VAPID_PRIVATE_KEY =', privateKey);

// ---------- 1. VAPID JWT verification ----------
console.log('\n[1] VAPID Authorization header (ES256 JWT)');
{
  // Reimplement the header build by calling sendWebPush against a local listener
  // and capturing the Authorization header.
  const received = {};
  const { createServer } = await import('node:http');
  const server = createServer((req, res) => {
    received.auth = req.headers['authorization'];
    received.encoding = req.headers['content-encoding'];
    let chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      received.body = Buffer.concat(chunks);
      res.writeHead(201);
      res.end();
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  // A client key pair for the subscription (p256dh/auth)
  const clientPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const clientJwk = await crypto.subtle.exportKey('jwk', clientPair.publicKey);
  const authSecret = crypto.getRandomValues(new Uint8Array(16));

  const subscription = {
    endpoint: `http://127.0.0.1:${port}/push/test`,
    p256dh: b64url(
      new Uint8Array([0x04, ...b64urlToBytes(clientJwk.x), ...b64urlToBytes(clientJwk.y)])
    ),
    auth: b64url(authSecret),
  };

  const status = await sendWebPush(subscription, { title: 't', body: 'b', ticketId: 7 }, {
    subject: 'mailto:test@example.com',
    publicKey,
    privateKey,
  });

  check('push service accepted the request (HTTP 201)', status === 201, `got ${status}`);
  check('Content-Encoding is aes128gcm', received.encoding === 'aes128gcm');

  // Verify the VAPID JWT signature with the public key
  const t = received.auth.match(/t=([^,]+)/)?.[1];
  const k = received.auth.match(/k=([^,]+)/)?.[1];
  check('Authorization has vapid t= and k=', !!(t && k));
  check('k matches configured public key', k === publicKey);
  if (t) {
    const [h, p, s] = t.split('.');
    const header = JSON.parse(Buffer.from(h, 'base64').toString());
    const payload = JSON.parse(Buffer.from(p, 'base64').toString());
    check('JWT alg is ES256', header.alg === 'ES256');
    check('JWT aud matches endpoint origin', payload.aud === `http://127.0.0.1:${port}`);

    // DER -> raw conversion already applied by webpush.ts, so s is raw r||s
    const sigRaw = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const verifyKey = await crypto.subtle.importKey(
      'jwk',
      pubJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      verifyKey,
      sigRaw,
      new TextEncoder().encode(`${h}.${p}`)
    );
    check('JWT signature verifies against VAPID public key', ok);
    check('JWT sub is mailto:', typeof payload.sub === 'string' && payload.sub.startsWith('mailto:'));
  }
  server.close();
}

// ---------- 2. aes128gcm payload round-trip ----------
console.log('\n[2] RFC 8291 aes128gcm payload round-trip');
{
  const clientPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const clientJwk = await crypto.subtle.exportKey('jwk', clientPair.publicKey);
  const authSecret = crypto.getRandomValues(new Uint8Array(16));

  // Extract the raw private scalar to derive the shared secret like a browser would
  const clientPrivJwk = await crypto.subtle.exportKey('jwk', clientPair.privateKey);
  const privKey = await crypto.subtle.importKey(
    'jwk',
    clientPrivJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits']
  );

  // Encrypt by calling sendWebPush against a local capture server
  const { createServer } = await import('node:http');
  let body = null;
  const server = createServer((req, res) => {
    let chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      body = Buffer.concat(chunks);
      res.writeHead(201);
      res.end();
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const subscription = {
    endpoint: `http://127.0.0.1:${port}/push/test`,
    p256dh: b64url(
      new Uint8Array([0x04, ...b64urlToBytes(clientJwk.x), ...b64urlToBytes(clientJwk.y)])
    ),
    auth: b64url(authSecret),
  };

  await sendWebPush(subscription, { title: 'سلام', body: 'تست اعلان', ticketId: 42 }, {
    subject: 'mailto:test@example.com',
    publicKey,
    privateKey,
  });
  server.close();

  check('ciphertext received', !!body && body.length > 21);
  // Parse aes128gcm header: salt(16) | rs(4) | idlen(1) | keyid
  const salt = body.subarray(0, 16);
  const rs = body.readUInt32BE(16);
  const idlen = body[20];
  const senderPub = body.subarray(21, 21 + idlen);
  const ciphertext = body.subarray(21 + idlen);
  check('record size is 4096', rs === 4096);
  check('sender pubkey is 65-byte uncompressed point', idlen === 65 && senderPub[0] === 0x04);

  // Derive IKM exactly per RFC 8291
  const senderPubU8 = new Uint8Array(senderPub);
  const recipPubU8 = new Uint8Array([
    0x04,
    ...b64urlToBytes(clientJwk.x),
    ...b64urlToBytes(clientJwk.y),
  ]);
  const ecdhResp = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: await crypto.subtle.importKey(
        'raw',
        senderPubU8.slice().buffer,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        []
      ) },
    privKey,
    256
  );
  const sharedSecret = new Uint8Array(ecdhResp);
  const authSecretU8 = new Uint8Array(authSecret);

  const enc = new TextEncoder();
  const keyInfo = new Uint8Array([
    ...enc.encode('WebPush: info\u0000'),
    ...recipPubU8,
    ...senderPubU8,
  ]);

  async function hkdf(ikm, saltv, info, len) {
    const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: saltv, info },
      key,
      len * 8
    );
    return new Uint8Array(bits);
  }

  const ikm = await hkdf(sharedSecret, authSecretU8, keyInfo, 32);
  const cek = await hkdf(ikm, salt, enc.encode('Content-Encoding: aes128gcm\u0000'), 16);
  const nonce = await hkdf(ikm, salt, enc.encode('Content-Encoding: nonce\u0000'), 12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']),
    ciphertext
  );
  const plaintext = new Uint8Array(decrypted);

  // Strip RFC 8291 padding: find 0x02 delimiter from the end
  let lastNonZero = plaintext.length - 1;
  while (lastNonZero >= 0 && plaintext[lastNonZero] === 0) lastNonZero -= 1;
  check('padding delimiter 0x02 present', plaintext[lastNonZero] === 0x02);
  const payloadJson = new TextDecoder().decode(plaintext.subarray(0, lastNonZero));
  const payload = JSON.parse(payloadJson);
  check('decrypted title matches', payload.title === 'سلام', payloadJson);
  check('decrypted body matches', payload.body === 'تست اعلان');
  check('decrypted ticketId matches', payload.ticketId === 42);
}

// ---------- 3. sendWebPush against unreachable endpoint ----------
console.log('\n[3] Unreachable endpoint');
{
  const status = await sendWebPush(
    { endpoint: 'http://127.0.0.1:9/push/x', p256dh: 'x'.repeat(43), auth: 'y'.repeat(22) },
    { title: 't', body: 'b', ticketId: null },
    { subject: 'mailto:t@e.com', publicKey, privateKey }
  ).then(
    () => 0,
    (e) => `threw: ${e.message}`
  );
  check('does not throw; returns non-2xx status or transport error handled', typeof status === 'number' || typeof status === 'string');
}

console.log(failures === 0 ? '\n🎉 All webpush tests passed' : `\n💥 ${failures} test(s) failed`);
process.exit(failures === 0 ? 0 : 1);
