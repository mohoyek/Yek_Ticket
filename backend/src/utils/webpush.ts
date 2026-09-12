/**
 * Workers-native Web Push (RFC 8291 encryption + RFC 8292 VAPID auth).
 * Uses only WebCrypto — works on Cloudflare Workers without nodejs_compat.
 */

// ---------- base64url helpers ----------

export function b64urlToBytes(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function jsonToB64url(obj: unknown): string {
  return bytesToB64url(new TextEncoder().encode(JSON.stringify(obj)));
}

// ---------- VAPID (RFC 8292) ----------

/**
 * Build the VAPID Authorization header.
 * @param privateKeyB64url VAPID private key, base64url-encoded 32-byte ECDSA P-256 private scalar
 */
async function vapidHeader(
  audience: string,
  subject: string,
  publicKeyB64url: string,
  privateKeyB64url: string
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const signingInput =
    jsonToB64url(header) + '.' + jsonToB64url(payload);

  // Decode the private scalar and compute the public point (x, y).
  // WebCrypto cannot derive the public point from a d-only JWK (importKey rejects
  // missing x/y), so we compute the point multiplication manually with bigint math.
  const dBytes = b64urlToBytes(privateKeyB64url);
  const { x, y } = ecPointFromScalar(dBytes);

  const key = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: bytesToB64url(x),
      y: bytesToB64url(y),
      d: privateKeyB64url,
    } as JsonWebKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput)
  );
  // WebCrypto ECDSA signatures are already raw r||s (64 bytes) per the spec —
  // no DER conversion is needed.
  const raw = new Uint8Array(sig);

  return `vapid t=${signingInput}.${bytesToB64url(raw)}, k=${publicKeyB64url}`;
}

// ---------- NIST P-256 point math (for VAPID public-key derivation) ----------

const P = 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn;
const A = (P - 3n);
const B = 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn;
const GX = 0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296n;
const GY = 0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5n;

function ecAdd(p1: [bigint, bigint] | null, p2: [bigint, bigint]): [bigint, bigint] | null {
  if (!p1) return p2;
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  if (x1 === x2) {
    if ((y1 + y2) % P === 0n) return null;
    return ecDouble(p1);
  }
  const slope = ((y2 - y1) * modInverse(x2 - x1, P)) % P;
  const x3 = (slope * slope - x1 - x2) % P;
  const y3 = (slope * (x1 - x3) - y1) % P;
  return [((x3 % P) + P) % P, ((y3 % P) + P) % P];
}

function ecDouble(p: [bigint, bigint]): [bigint, bigint] | null {
  const [x, y] = p;
  if (y === 0n) return null;
  const slope = (3n * x * x + A) * modInverse(2n * y, P) % P;
  const x3 = (slope * slope - 2n * x) % P;
  const y3 = (slope * (x - x3) - y) % P;
  return [((x3 % P) + P) % P, ((y3 % P) + P) % P];
}

function modInverse(a: bigint, m: bigint): bigint {
  // Standard iterative extended Euclidean algorithm.
  // Invariant: old_s * a ≡ old_r (mod m); when old_r reaches gcd = 1, old_s is the inverse.
  let [old_r, r] = [((a % m) + m) % m, m];
  let [old_s, s] = [1n, 0n];
  while (r > 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return ((old_s % m) + m) % m;
}

/** Multiply the P-256 generator by the private scalar → public point (x, y). */
export function ecPointFromScalar(dBytes: Uint8Array): { x: Uint8Array; y: Uint8Array } {
  let d = 0n;
  for (const b of dBytes) d = (d << 8n) | BigInt(b);

  // Double-and-add
  let result: [bigint, bigint] | null = null;
  let addend: [bigint, bigint] = [GX, GY];
  while (d > 0n) {
    if (d & 1n) result = ecAdd(result, addend);
    addend = ecDouble(addend) ?? [0n, 0n];
    d >>= 1n;
  }
  if (!result) throw new Error('Invalid private key');

  const to32 = (v: bigint) => {
    const out = new Uint8Array(32);
    let n = v;
    for (let i = 31; i >= 0; i--) {
      out[i] = Number(n & 0xffn);
      n >>= 8n;
    }
    return out;
  };
  return { x: to32(result[0]), y: to32(result[1]) };
}

// ---------- Payload encryption (RFC 8291 aes128gcm) ----------

async function encryptPayload(
  payload: Uint8Array,
  p256dhB64url: string,
  authB64url: string
): Promise<Uint8Array> {
  const recipientPub = b64urlToBytes(p256dhB64url);
  const authSecret = b64urlToBytes(authB64url);

  // Ephemeral sender key pair
  const sender = (await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )) as CryptoKeyPair;
  const senderPubJwk = (await crypto.subtle.exportKey('jwk', sender.publicKey)) as JsonWebKey;
  const senderPubBytes = concat(b64urlToBytes(senderPubJwk.x!), b64urlToBytes(senderPubJwk.y!));
  // Uncompressed point prefix 0x04
  const senderPub = concat(new Uint8Array([0x04]), senderPubBytes);

  // Shared secret via ECDH
  const recipRaw = recipientPub.buffer.slice(
    recipientPub.byteOffset,
    recipientPub.byteOffset + recipientPub.byteLength
  );
  const recipKey = await crypto.subtle.importKey(
    'raw',
    recipRaw as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { name: 'ECDH', public: recipKey } as any,
      sender.privateKey,
      256
    )
  );

  // HKDF
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyInfo = concat(
    new TextEncoder().encode('WebPush: info\x00'),
    recipientPub,
    senderPub
  );

  // HKDF chain per RFC 8291 §5.1:
  //   IKM  = HKDF(sharedSecret, authSecret, keyInfo)
  //   CEK  = HKDF(IKM, salt, "Content-Encoding: aes128gcm\0")
  //   nonce = HKDF(IKM, salt, "Content-Encoding: nonce\0")
  const ikm = await hkdf(sharedSecret, authSecret, keyInfo, 32);
  const cek = await hkdf(ikm, salt, new TextEncoder().encode('Content-Encoding: aes128gcm\x00'), 16);
  const nonce = await hkdf(ikm, salt, new TextEncoder().encode('Content-Encoding: nonce\x00'), 12);

  // Pad: payload + 0x02 delimiter + zero padding
  const maxPlaintext = 4096 - 17; // record size - tag
  const padded = new Uint8Array(Math.min(payload.length + 1, maxPlaintext));
  padded.set(payload.slice(0, Math.min(payload.length, maxPlaintext - 1)), 0);
  padded[padded.length - 1] = 0x02;

  // AES-128-GCM encrypt
  const cekKey = await crypto.subtle.importKey('raw', cek as unknown as BufferSource, 'AES-GCM', false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce as unknown as BufferSource },
    cekKey,
    padded as unknown as BufferSource
  );

  // aes128gcm header: salt(16) | rs(4, big-endian 4096) | idlen(1) | keyid(65 = sender pubkey)
  const header = new Uint8Array(16 + 4 + 1 + senderPub.length);
  header.set(salt, 0);
  const dv = new DataView(header.buffer);
  dv.setUint32(16, 4096);
  header[20] = senderPub.length;
  header.set(senderPub, 21);

  return concat(header, new Uint8Array(ciphertext));
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

async function hkdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    ikm as unknown as BufferSource,
    'HKDF',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt as unknown as BufferSource,
      info: info as unknown as BufferSource,
    },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

// ---------- Public API ----------

export interface WebPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface WebPushConfig {
  subject: string; // e.g. "mailto:support@example.com"
  publicKey: string; // VAPID public key, base64url (65-byte uncompressed point)
  privateKey: string; // VAPID private key, base64url (32-byte scalar)
}

/** Send an encrypted Web Push message. Returns the HTTP status of the push service. */
export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: { title: string; body: string; ticketId?: number | null },
  config: WebPushConfig
): Promise<number> {
  const audience = new URL(subscription.endpoint).origin;
  const authorization = await vapidHeader(
    audience,
    config.subject,
    config.publicKey,
    config.privateKey
  );

  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await encryptPayload(plaintext, subscription.p256dh, subscription.auth);

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '3600',
      Urgency: 'normal',
    },
    body: encrypted as unknown as BodyInit,
  });

  return response.status;
}
