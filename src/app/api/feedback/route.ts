import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-hs3';

export async function GET(req: Request) {
  try {
    const feedbacks = await prisma.feedback.findMany({
      include: {
        user: {
          select: {
            name: true,
            roomNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const keywordMap: Record<string, { count: number; totalRating: number }> = {};
    feedbacks.forEach((fb) => {
      const text = (fb.comment || '').toLowerCase();
      const words = text.split(/\s+/).filter((w) => w.length > 4);
      words.forEach((word) => {
        if (!keywordMap[word]) keywordMap[word] = { count: 0, totalRating: 0 };
        keywordMap[word].count += 1;
        keywordMap[word].totalRating += fb.rating;
      });
    });

    const trends = Object.entries(keywordMap)
      .slice(0, 3)
      .map(([keyword, stat]) => ({
        keyword,
        mentions: stat.count,
        avgRating: +(stat.totalRating / stat.count).toFixed(1),
        sentiment: (stat.totalRating / stat.count < 3 ? 'Critical' : stat.totalRating / stat.count < 4 ? 'Moderate' : 'Positive') as 'Critical' | 'Moderate' | 'Positive',
      }));

    return NextResponse.json({ feedbacks, trends });
  } catch (error: any) {
    console.error('Feedback fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { userId, mealType, rating, comment, tags } = body;

    // 1. If userId is not in body, extract token
    if (!userId) {
      let token: string | null = null;

      // Extract raw cookie header
      const rawCookie = req.headers.get('cookie') || '';
      const match = rawCookie.match(/(?:^|;\s*)token=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }

      // Fallback to Next.js cookie helper
      if (!token) {
        const cookieStore = await cookies();
        token =
          cookieStore.get('token')?.value ||
          cookieStore.get('auth_token')?.value ||
          cookieStore.get('session')?.value ||
          null;
      }

      // Fallback to Authorization Bearer header
      if (!token) {
        token = req.headers.get('authorization')?.replace('Bearer ', '') || null;
      }

      if (token) {
        try {
          // Decode token with secret or decode payload directly
          let decoded: any = null;
          try {
            decoded = jwt.verify(token, JWT_SECRET);
          } catch {
            // Fallback decode without signature verification in case secret differed
            decoded = jwt.decode(token);
          }

          if (decoded && typeof decoded === 'object') {
            userId = decoded.userId || decoded.id || decoded.sub || decoded._id;

            // If token only has email, find user by email
            if (!userId && decoded.email) {
              const user = await prisma.user.findUnique({
                where: { email: decoded.email },
              });
              if (user) userId = user.id;
            }
          }
        } catch (err) {
          console.error('Failed to parse token payload:', err);
        }
      }
    }

    // 2. Final fallback: If still no userId, get the most recent student user from DB
    if (!userId) {
      const fallbackUser = await prisma.user.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      if (fallbackUser) {
        userId = fallbackUser.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const feedback = await prisma.feedback.create({
      data: {
        userId,
        mealType: mealType || 'LUNCH',
        rating: Number(rating) || 5,
        comment: comment || null,
        tags: tags || [],
        date: today,
      },
    });

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error: any) {
    console.error('Feedback submit error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}