import { sign, verify } from 'hono/jwt';
import type { JWTPayload, Env } from '../env';

export async function signJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInDays: number = 7
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      ...payload,
      iat: now,
      exp: now + expiresInDays * 24 * 60 * 60,
    },
    secret
  );
}

export async function verifyJWT(
  token: string,
  secret: string
): Promise<JWTPayload> {
  const payload = await verify(token, secret, 'HS256');
  return payload as unknown as JWTPayload;
}
