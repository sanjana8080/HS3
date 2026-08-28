import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-hs3';

async function getHostelId(req: Request): Promise<string | null> {
  const rawCookie = req.headers.get('cookie') || '';
  const match = rawCookie.match(/(?:^|;\s*)token=([^;]+)/);
  let token = match ? decodeURIComponent(match[1]) : null;

  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get('token')?.value || null;
  }

  if (token) {
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      if (decoded.hostelId) return decoded.hostelId;
      if (decoded.userId || decoded.id) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId || decoded.id },
          select: { hostelId: true },
        });
        if (user) return user.hostelId;
      }
    } catch {
      // Fallback
    }
  }

  const defaultHostel = await prisma.hostel.findFirst();
  return defaultHostel?.id || null;
}

export async function GET(req: Request) {
  try {
    const hostelId = await getHostelId(req);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const menus = await prisma.menu.findMany({
      where: {
        ...(hostelId ? { hostelId } : {}),
        date: today,
      },
    });

    const formattedMeals = menus.map((m) => ({
      name: m.mealType === 'SNACKS' ? 'Evening Snacks' : m.mealType.charAt(0) + m.mealType.slice(1).toLowerCase(),
      mealType: m.mealType,
      items: m.items,
      calories: m.calories ? `${m.calories} kcal` : '450 kcal',
    }));

    return NextResponse.json({ meals: formattedMeals });
  } catch (error) {
    console.error('Menu fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mealType, items, calories, date } = body;

    const hostelId = await getHostelId(req);
    if (!hostelId) {
      return NextResponse.json({ error: 'Hostel not found' }, { status: 400 });
    }

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);

    // 1. Update or create the menu entry
    const updatedMenu = await prisma.menu.upsert({
      where: {
        date_mealType_hostelId: {
          date: targetDate,
          mealType,
          hostelId,
        },
      },
      update: {
        items,
        calories: Number(calories) || null,
      },
      create: {
        date: targetDate,
        mealType,
        items,
        calories: Number(calories) || null,
        hostelId,
      },
    });

    // 2. Create notification record for registered students
    const mealLabel = mealType === 'SNACKS' ? 'Evening Snacks' : mealType.charAt(0) + mealType.slice(1).toLowerCase();
    await prisma.notification.create({
      data: {
        title: `${mealLabel} Menu Updated`,
        message: `Today's ${mealLabel.toLowerCase()} items have been refreshed: ${items.slice(0, 3).join(', ')}${items.length > 3 ? '...' : ''}`,
        mealType,
        hostelId,
      },
    });

    return NextResponse.json({ success: true, menu: updatedMenu }, { status: 200 });
  } catch (error) {
    console.error('Menu save & notification error:', error);
    return NextResponse.json({ error: 'Failed to update menu' }, { status: 500 });
  }
}