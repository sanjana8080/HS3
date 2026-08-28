import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'hs3-super-secure-production-jwt-secret-key-32chars';

// Simple Base64URL JWT Generator
function signJwt(payload: object): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = Buffer.from(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`).toString('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, role = 'STUDENT', hostelName, rollNumber, roomNumber, otp } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Verify OTP if provided by frontend registration flow
    if (otp) {
      const otpModel = (prisma as any).otp || (prisma as any).oTP;
      const validRecord = await otpModel.findFirst({
        where: {
          email: cleanEmail,
          code: otp.trim(),
          expiresAt: { gt: new Date() },
        },
      });

      if (!validRecord) {
        return NextResponse.json({ error: 'Invalid or expired OTP code.' }, { status: 400 });
      }

      // Cleanup used OTP
      await otpModel.deleteMany({ where: { email: cleanEmail } });
    }

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    // 3. Resolve or Auto-Create Hostel
    const targetHostelName = hostelName?.trim() || 'Main Campus Hostel';
    const cleanCode = targetHostelName.replace(/\s+/g, '-').toUpperCase().slice(0, 10) || 'HOSTEL-01';

    let hostel = await prisma.hostel.findFirst({
      where: {
        OR: [
          { name: { equals: targetHostelName, mode: 'insensitive' } },
          { code: cleanCode },
        ],
      },
    });

    if (!hostel) {
      hostel = await prisma.hostel.findFirst();

      if (!hostel) {
        hostel = await prisma.hostel.create({
          data: {
            name: targetHostelName,
            code: cleanCode,
            address: 'Campus Grounds',
          },
        });
      }
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Create user linked to valid hostelId
    const userRole = role === 'SUPERVISOR' || role === 'ADMIN' ? 'SUPERVISOR' : 'STUDENT';

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: userRole,
        hostelId: hostel.id,
        rollNumber: rollNumber?.trim() || null,
        roomNumber: roomNumber?.trim() || null,
      },
    });

    // 6. Create session JWT token
    const token = signJwt({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      hostelId: hostel.id,
    });

    const response = NextResponse.json(
      {
        message: 'Account registered successfully',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201 }
    );

    // 7. Set auth cookie
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create account.' }, { status: 500 });
  }
}