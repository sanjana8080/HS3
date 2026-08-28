import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MealType } from '@prisma/client';

function getTodayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mealType = (searchParams.get('mealType') || 'LUNCH') as MealType;
    const today = getTodayUTC();

    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        roomNumber: true,
        rollNumber: true,
        dietaryPref: true,
        attendances: {
          where: {
            date: today,
            mealType,
          },
          select: {
            status: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { roomNumber: 'asc' },
    });

    const formattedData = students.map((student) => ({
      id: student.id,
      name: student.name,
      roomNumber: student.roomNumber || 'N/A',
      rollNumber: student.rollNumber || 'N/A',
      dietaryPref: student.dietaryPref,
      status: student.attendances[0]?.status || 'NOT_RESPONDED',
      lastUpdated: student.attendances[0]?.updatedAt || null,
    }));

    return NextResponse.json({ records: formattedData });
  } catch (error: any) {
    console.error('Supervisor Attendance Error:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
  }
}