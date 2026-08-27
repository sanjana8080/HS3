import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('hs3_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [user, menus, attendances] = await Promise.all([
      db.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, email: true, role: true, dietaryPref: true, hostel: true },
      }),
      db.menu.findMany({
        where: { hostelId: payload.hostelId, date: today },
      }),
      db.attendance.findMany({
        where: { userId: payload.userId, date: today },
      }),
    ]);

    return NextResponse.json({ user, menus, attendances });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch menu data' }, { status: 500 });
  }
}