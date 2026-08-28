import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-hs3';

export async function GET(req: Request) {
  try {
    let hostelId: string | null = null;
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
        if (decoded.hostelId) hostelId = decoded.hostelId;
        if (!hostelId && (decoded.userId || decoded.id)) {
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId || decoded.id },
            select: { hostelId: true },
          });
          if (user) hostelId = user.hostelId;
        }
      } catch {
        // Fallback
      }
    }

    if (!hostelId) {
      const fallbackHostel = await prisma.hostel.findFirst();
      hostelId = fallbackHostel?.id || null;
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

    const notifications = await prisma.notification.findMany({
      where: {
        ...(hostelId ? { hostelId } : {}),
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}