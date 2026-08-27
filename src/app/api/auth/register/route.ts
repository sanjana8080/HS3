import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    // Verify hostel exists
    const hostel = await db.hostel.findUnique({
      where: { code: validatedData.hostelCode },
    });

    if (!hostel) {
      return NextResponse.json(
        { error: 'Invalid hostel code provided' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(validatedData.password);

    const user = await db.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: validatedData.role,
        dietaryPref: validatedData.dietaryPref,
        rollNumber: validatedData.rollNumber,
        roomNumber: validatedData.roomNumber,
        hostelId: hostel.id,
      },
    });

    // Generate JWT token
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      hostelId: user.hostelId,
    });

    const response = NextResponse.json(
      {
        message: 'Account created successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          dietaryPref: user.dietaryPref,
          hostelId: user.hostelId,
        },
      },
      { status: 201 }
    );

    // Set HttpOnly cookie
    response.cookies.set({
      name: 'hs3_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    if (error?.errors) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error while registering user' },
      { status: 500 }
    );
  }
}