import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyOtpCode } from '@/lib/otp';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'hs3-super-secure-production-jwt-secret-key-32chars';

function signJwt(payload: object): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = Buffer.from(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`).toString('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function POST(req: Request) {
  try {
    const { email, password, otp } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (!user) {
      return NextResponse.json({ error: 'No account found with this email.' }, { status: 404 });
    }

    // Handle OTP verification or password check
    if (otp) {
      const isValidOtp = await verifyOtpCode(cleanEmail, otp);
      if (!isValidOtp) {
        return NextResponse.json({ error: 'Invalid or expired OTP code.' }, { status: 400 });
      }
    } else if (password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Password or OTP is required.' }, { status: 400 });
    }

    const token = signJwt({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hostelId: user.hostelId,
    });

    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}