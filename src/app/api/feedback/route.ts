import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Extract basic keyword trends handling nullable comments
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
    const { userId, mealType, rating, comment, tags } = body;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const feedback = await prisma.feedback.create({
      data: {
        userId,
        mealType,
        rating: Number(rating),
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