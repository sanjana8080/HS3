import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { Role } from '@prisma/client';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'hs3-super-secret-default-key-change-in-production'
);

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  hostelId: string;
}

// Hash plaintext password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

// Compare plaintext password with hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Sign JWT Token
export async function signToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

// Verify JWT Token (works in Node.js & Edge Runtime / Middleware)
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(JWT_SECRET, token);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}