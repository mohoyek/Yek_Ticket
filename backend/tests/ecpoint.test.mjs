import { webcrypto } from 'node:crypto';
import { ecPointFromScalar, b64urlToBytes } from '../src/utils/webpush.ts';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const b64url = (u8) =>
  Buffer.from(u8).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log(`  ✅ ${name}`);
  else {
    failures += 1;
    console.error(`  ❌ ${name}${extra ? ' — ' + extra : ''}`);
  }
}

// Compare derived point vs the true point across several random keys
for (let i = 0; i < 5; i++) {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const dBytes = b64urlToBytes(jwk.d);

  const { x, y } = ecPointFromScalar(dBytes);

  const expectX = b64urlToBytes(jwk.x);
  const expectY = b64urlToBytes(jwk.y);
  const xOk = Buffer.compare(Buffer.from(x), Buffer.from(expectX)) === 0;
  const yOk = Buffer.compare(Buffer.from(y), Buffer.from(expectY)) === 0;
  check(`key ${i + 1}: x matches`, xOk);
  check(`key ${i + 1}: y matches`, yOk);
  if (!xOk) {
    console.log('    got     x:', Buffer.from(x).toString('hex'));
    console.log('    expect  x:', Buffer.from(expectX).toString('hex'));
  }
  if (!yOk) {
    console.log('    got     y:', Buffer.from(y).toString('hex'));
    console.log('    expect  y:', Buffer.from(expectY).toString('hex'));
  }
}

// modInverse sanity checks
const P = 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn;
const inv3mod7 = (3n * 5n) % 7n === 1n;
check('3*5 ≡ 1 (mod 7) sanity', inv3mod7);

console.log(failures === 0 ? '\n🎉 EC point math OK' : `\n💥 ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
