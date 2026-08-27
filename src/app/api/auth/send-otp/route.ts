import { NextResponse } from 'next/server';
import { createAndSaveOtp } from '@/lib/otp';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { email, purpose } = await req.json();

    if (!email || !purpose) {
      return NextResponse.json(
        { error: 'Email and purpose are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    if (purpose === 'LOGIN') {
      const userExists = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (!userExists) {
        return NextResponse.json(
          { error: 'No account found with this email address.' },
          { status: 404 }
        );
      }
    }

    if (purpose === 'REGISTRATION') {
      const userExists = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (userExists) {
        return NextResponse.json(
          { error: 'An account with this email already exists.' },
          { status: 409 }
        );
      }
    }

    const otpCode = await createAndSaveOtp(cleanEmail, purpose);

    // Terminal log for dev testing
    console.log(`\n========================================`);
    console.log(`[HS³ AUTH OTP] Target: ${cleanEmail}`);
    console.log(`[HS³ AUTH CODE]: >>> ${otpCode} <<< (Expires in 5 mins)`);
    console.log(`========================================\n`);

    return NextResponse.json({
      message: `OTP sent successfully to ${cleanEmail}`,
      previewOtp: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
    });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate OTP' },
      { status: 500 }
    );
  }
}