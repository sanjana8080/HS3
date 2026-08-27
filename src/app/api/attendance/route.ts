import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { attendanceSchema } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('hs3_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validatedData = attendanceSchema.parse(body);

    const mealDate = new Date(validatedData.date);
    mealDate.setHours(0, 0, 0, 0);

    const record = await db.attendance.upsert({
      where: {
        userId_date_mealType: {
          userId: payload.userId,
          date: mealDate,
          mealType: validatedData.mealType,
        },
      },
      update: { status: validatedData.status },
      create: {
        userId: payload.userId,
        date: mealDate,
        mealType: validatedData.mealType,
        status: validatedData.status,
      },
    });

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update attendance' }, { status: 400 });
  }
}