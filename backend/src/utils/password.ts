/**
 * Password hashing using PBKDF2-SHA256 via Web Crypto API
 * Works natively in Cloudflare Workers
 */

const ITERATIONS = 100_000;
const KEY_LENGTH = 64;
const DIGEST = 'SHA-256';

function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: DIGEST,
    },
    passwordKey,
    KEY_LENGTH * 8
  );

  return new Uint8Array(derivedBits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const hash = await deriveKey(password, salt);
  return `${bytesToHex(salt)}:${bytesToHex(hash)}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(':');
  const salt = hexToBytes(saltHex);
  const hash = await deriveKey(password, salt);
  return bytesToHex(hash) === hashHex;
}
