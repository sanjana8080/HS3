import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function createAndSaveOtp(email: string, purpose: 'REGISTRATION' | 'LOGIN'): Promise<string> {
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
  const cleanEmail = email.toLowerCase().trim();

  const otpClient = (prisma as any).otpVerification || (prisma as any).OtpVerification;

  // Invalidate previous unverified OTPs for this email & purpose
  if (otpClient?.deleteMany) {
    await otpClient.deleteMany({
      where: {
        email: cleanEmail,
        purpose,
      },
    });

    await otpClient.create({
      data: {
        email: cleanEmail,
        code,
        purpose,
        expiresAt,
      },
    });
  }

  return code;
}

export async function verifyOtpCode(
  email: string,
  code: string,
  purpose: 'REGISTRATION' | 'LOGIN'
): Promise<boolean> {
  const cleanEmail = email.toLowerCase().trim();
  const otpClient = (prisma as any).otpVerification || (prisma as any).OtpVerification;

  if (!otpClient) return false;

  const record = await otpClient.findFirst({
    where: {
      email: cleanEmail,
      code: code.trim(),
      purpose,
      verified: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) return false;

  await otpClient.update({
    where: { id: record.id },
    data: { verified: true },
  });

  return true;
}