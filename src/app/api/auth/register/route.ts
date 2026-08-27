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
    const { name, email, password, role = 'STUDENT', hostelName, rollNumber, roomNumber } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    // Resolve or Auto-Create Hostel
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
      // Fallback: Check if ANY hostel exists
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user linked to valid hostel.id
    const userRole = role === 'SUPERVISOR' || role === 'ADMIN' ? 'SUPERVISOR' : 'STUDENT';

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: userRole,
        hostelId: hostel.id,
        rollNumber: rollNumber?.trim() || null,
        roomNumber: roomNumber?.trim() || null,
      },
    });

    // Create session JWT token
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

    // Set auth cookie
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