import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { MealType } from '@prisma/client';

function getTodayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    let userHostelId: string | undefined = undefined;

    if (token) {
      const payload = await verifyToken(token);
      if (payload && typeof payload === 'object' && 'hostelId' in payload) {
        userHostelId = payload.hostelId as string;
      }
    }

    const today = getTodayUTC();

    const userWhereClause = userHostelId
      ? { role: 'STUDENT' as const, hostelId: userHostelId }
      : { role: 'STUDENT' as const };

    const totalStudents = await prisma.user.count({
      where: userWhereClause,
    });

    const mealTypes: MealType[] = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
    const headcounts: Record<string, { eating: number; skipping: number; total: number }> = {};

    for (const meal of mealTypes) {
      const attendanceWhereClause = userHostelId
        ? {
            date: today,
            mealType: meal,
            user: { hostelId: userHostelId },
          }
        : {
            date: today,
            mealType: meal,
          };

      const records = await prisma.attendance.findMany({
        where: attendanceWhereClause,
        select: { status: true },
      });

      const eating = records.filter((r) => r.status === 'EATING').length;
      const skipping = records.filter((r) => r.status === 'SKIPPED').length;

      headcounts[meal] = {
        eating,
        skipping,
        total: totalStudents,
      };
    }

    return NextResponse.json({
      date: today,
      totalStudents,
      headcounts,
    });
  } catch (error: any) {
    console.error('Supervisor Headcount Error:', error);
    return NextResponse.json({ error: 'Failed to fetch headcount data' }, { status: 500 });
  }
}