import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface TokenPayload {
  userId: string;
  role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
  email: string;
}

export interface OfferTokenPayload {
  waitlistEntryId: string;
  showId: string;
  categoryId: string;
  customerId: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as any);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export function generateOfferToken(payload: OfferTokenPayload, expiresInSeconds: number): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: expiresInSeconds } as any);
}

export function verifyOfferToken(token: string): OfferTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as OfferTokenPayload;
}
