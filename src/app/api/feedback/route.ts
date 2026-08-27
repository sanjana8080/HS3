import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Common words to ignore when extracting insights
const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with',
  'to', 'for', 'of', 'it', 'this', 'that', 'was', 'as', 'are', 'very', 'too',
  'food', 'mess', 'today', 'really', 'please', 'there', 'have', 'had', 'be', 'my'
]);

// Helper: Extract top 3 recurring issue clusters / keywords
function extractTopIssues(feedbacks: { comment: string; rating: number }[]) {
  const phraseCount: Record<string, { count: number; sampleRating: number[] }> = {};

  feedbacks.forEach((fb) => {
    if (!fb.comment) return;
    
    // Normalize and clean words
    const cleanWords = fb.comment
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    // 1. Count single high-impact words
    cleanWords.forEach((word) => {
      if (!phraseCount[word]) {
        phraseCount[word] = { count: 0, sampleRating: [] };
      }
      phraseCount[word].count += 1;
      phraseCount[word].sampleRating.push(fb.rating);
    });

    // 2. Count 2-word key combinations (e.g., "cold dal", "hard roti", "late breakfast")
    for (let i = 0; i < cleanWords.length - 1; i++) {
      const phrase = `${cleanWords[i]} ${cleanWords[i + 1]}`;
      if (!phraseCount[phrase]) {
        phraseCount[phrase] = { count: 0, sampleRating: [] };
      }
      phraseCount[phrase].count += 2; // Weight distinct 2-word phrases higher
      phraseCount[phrase].sampleRating.push(fb.rating);
    }
  });

  return Object.entries(phraseCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([keyword, data]) => {
      const avgRating = (
        data.sampleRating.reduce((sum, r) => sum + r, 0) / data.sampleRating.length
      ).toFixed(1);

      return {
        keyword: keyword.toUpperCase(),
        mentions: Math.min(data.count, feedbacks.length),
        avgRating: Number(avgRating),
        sentiment: Number(avgRating) < 3 ? 'Critical' : Number(avgRating) < 4 ? 'Moderate' : 'Positive',
      };
    });
}

export async function GET() {
  try {
    let hostel = await prisma.hostel.findFirst();
    if (!hostel) {
      return NextResponse.json({ feedbacks: [], trends: [] });
    }

    const feedbacks = await prisma.feedback.findMany({
      where: { hostelId: hostel.id },
      include: {
        user: {
          select: { name: true, rollNumber: true, roomNumber: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const trends = extractTopIssues(feedbacks);

    return NextResponse.json({
      feedbacks,
      trends, // Top 3 aggregated issues
    });
  } catch (error: any) {
    console.error('Fetch feedback error:', error);
    return NextResponse.json({ error: 'Failed to load feedbacks' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mealType, rating, comment, userId } = body;

    let hostel = await prisma.hostel.findFirst();
    if (!hostel) {
      return NextResponse.json({ error: 'Hostel not found' }, { status: 404 });
    }

    const newFeedback = await prisma.feedback.create({
      data: {
        mealType: mealType || 'LUNCH',
        rating: Number(rating) || 3,
        comment: comment || '',
        hostelId: hostel.id,
        userId: userId || undefined,
      },
    });

    return NextResponse.json({ message: 'Feedback submitted', feedback: newFeedback });
  } catch (error: any) {
    console.error('Submit feedback error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}