import jwt from 'jsonwebtoken';
import type { JWTPayload } from '../env.node.js';

export async function signJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInDays: number = 7
): Promise<string> {
  return jwt.sign(
    payload,
    secret,
    {
      expiresIn: `${expiresInDays}d`,
      algorithm: 'HS256',
    }
  );
}

export async function verifyJWT(
  token: string,
  secret: string
): Promise<JWTPayload> {
  const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
  return payload as JWTPayload;
}
