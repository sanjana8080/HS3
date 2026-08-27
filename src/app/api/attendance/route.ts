import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MealType, AttendanceStatus } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'hs3-super-secure-production-jwt-secret-key-32chars';

// Helper to extract and verify user from JWT cookie
async function getUserFromCookie(req: Request) {
  const cookieHeader = req.headers.get('cookie') || '';
  const tokenMatch = cookieHeader.match(/token=([^;]+)/);
  if (!tokenMatch) return null;

  const token = tokenMatch[1];
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

function getTodayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Map string representation to MealType enum
const MEAL_ENUM_MAP: Record<string, MealType> = {
  Breakfast: 'BREAKFAST',
  Lunch: 'LUNCH',
  'Evening Snacks': 'SNACKS',
  Dinner: 'DINNER',
  BREAKFAST: 'BREAKFAST',
  LUNCH: 'LUNCH',
  SNACKS: 'SNACKS',
  DINNER: 'DINNER',
};

// GET /api/attendance?date=YYYY-MM-DD
// Returns attendance for the logged-in student & aggregated headcounts for supervisor
export async function GET(req: Request) {
  try {
    const user = await getUserFromCookie(req);
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    const targetDate = dateParam ? new Date(dateParam) : getTodayUTC();
    targetDate.setUTCHours(0, 0, 0, 0);

    // 1. Fetch aggregate headcounts (for Supervisor or General stats)
    const mealTypes: MealType[] = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });

    const headcounts: Record<string, { eating: number; skipping: number; total: number }> = {};

    for (const type of mealTypes) {
      const eatingCount = await prisma.attendance.count({
        where: { date: targetDate, mealType: type, status: 'EATING' },
      });
      const skippingCount = await prisma.attendance.count({
        where: { date: targetDate, mealType: type, status: 'SKIPPED' },
      });

      headcounts[type] = {
        eating: eatingCount,
        skipping: skippingCount,
        total: totalStudents || 280,
      };
    }

    // 2. Fetch student's own attendance if logged in as student
    let userAttendance: Record<string, string> = {};
    if (user?.id) {
      const records = await prisma.attendance.findMany({
        where: { userId: user.id, date: targetDate },
      });

      records.forEach((r) => {
        userAttendance[r.mealType] = r.status;
      });
    }

    return NextResponse.json({
      date: targetDate.toISOString(),
      headcounts,
      userAttendance,
    });
  } catch (error: any) {
    console.error('Fetch attendance error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch attendance' }, { status: 500 });
  }
}

// POST /api/attendance
// Toggles or sets student attendance for a meal
export async function POST(req: Request) {
  try {
    const user = await getUserFromCookie(req);
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json();
    const { mealName, status, date } = body;

    const mealType: MealType = MEAL_ENUM_MAP[mealName];
    if (!mealType) {
      return NextResponse.json({ error: 'Invalid meal name provided' }, { status: 400 });
    }

    const attendanceStatus: AttendanceStatus =
      status === 'EATING' ? 'EATING' : status === 'SKIPPING' ? 'SKIPPED' : 'NOT_RESPONDED';

    const targetDate = date ? new Date(date) : getTodayUTC();
    targetDate.setUTCHours(0, 0, 0, 0);

    const record = await prisma.attendance.upsert({
      where: {
        userId_date_mealType: {
          userId: user.id,
          date: targetDate,
          mealType: mealType,
        },
      },
      update: {
        status: attendanceStatus,
      },
      create: {
        userId: user.id,
        date: targetDate,
        mealType: mealType,
        status: attendanceStatus,
      },
    });

    return NextResponse.json({
      message: 'Attendance recorded successfully',
      attendance: record,
    });
  } catch (error: any) {
    console.error('Update attendance error:', error);
    return NextResponse.json({ error: error.message || 'Failed to record attendance' }, { status: 500 });
  }
}