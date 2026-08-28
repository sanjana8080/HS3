import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-hs3';
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

    const mealLabel = mealType === 'SNACKS' ? 'Evening Snacks' : mealType.charAt(0) + mealType.slice(1).toLowerCase();
    const notificationMessage = `Today's ${mealLabel.toLowerCase()} items have been refreshed: ${items.slice(0, 3).join(', ')}${items.length > 3 ? '...' : ''}`;

    // 2. Safe notification record creation (prevents TypeScript build crashes)
    if ((prisma as any).notification) {
      try {
        await (prisma as any).notification.create({
          data: {
            title: `${mealLabel} Menu Updated`,
            message: notificationMessage,
            mealType,
            hostelId,
          },
        });
      } catch (dbNotifErr) {
        console.error('Notification creation note:', dbNotifErr);
      }
    }

    // 3. Trigger email via Resend if API key is provided
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Hostel Dining <onboarding@resend.dev>',
          to: ['delivered@resend.dev'], // Defaults to test inbox or your registered account
          subject: `🍽️ Updated Mess Menu: ${mealLabel}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; background-color: #100e14; color: #F5E6EB; border-radius: 12px;">
              <h2 style="color: #F4A8C4;">HS³ Hostel Dining Alert</h2>
              <p><strong>${mealLabel}</strong> menu has just been updated by the hostel supervisor:</p>
              <ul style="line-height: 1.6;">
                ${items.map((it: string) => `<li>${it}</li>`).join('')}
              </ul>
              <p style="font-size: 12px; color: #B3A6BC;">Log into the HS³ portal to confirm your attendance.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Resend email error:', emailErr);
      }
    }

    return NextResponse.json({ success: true, menu: updatedMenu }, { status: 200 });
  } catch (error) {
    console.error('Menu save & notification error:', error);
    return NextResponse.json({ error: 'Failed to update menu' }, { status: 500 });
  }
}