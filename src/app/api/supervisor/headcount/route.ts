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
    if (!payload || (payload.role !== 'SUPERVISOR' && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch total registered students in the hostel
    const totalStudents = await db.user.count({
      where: { hostelId: payload.hostelId, role: 'STUDENT' },
    });

    // Fetch attendance grouped by mealType and status
    const attendances = await db.attendance.findMany({
      where: {
        date: today,
        user: { hostelId: payload.hostelId },
      },
    });

    // Aggregate counts
    const mealTypes = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
    const summary = mealTypes.map((meal) => {
      const mealRecords = attendances.filter((a) => a.mealType === meal);
      const eatingCount = mealRecords.filter((a) => a.status === 'EATING').length;
      const skippedCount = mealRecords.filter((a) => a.status === 'SKIPPED').length;
      const unrespondedCount = totalStudents - (eatingCount + skippedCount);

      return {
        mealType: meal,
        eating: eatingCount,
        skipped: skippedCount,
        unresponded: Math.max(0, unrespondedCount),
        totalStudents,
      };
    });

    return NextResponse.json({ summary, totalStudents });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to aggregate headcount data' }, { status: 500 });
  }
}