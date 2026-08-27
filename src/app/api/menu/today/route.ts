import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MealType } from '@prisma/client';

function getTodayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const DEFAULT_SCHEDULE = [
  {
    name: 'Breakfast',
    mealType: 'BREAKFAST',
    time: '07:30 AM - 09:30 AM',
    items: ['Aloo Poha', 'Boiled Eggs / Sprouts', 'Tea / Masala Chai', 'Fresh Fruits'],
    calories: '380 kcal',
  },
  {
    name: 'Lunch',
    mealType: 'LUNCH',
    time: '12:30 PM - 02:30 PM',
    items: ['Paneer Butter Masala', 'Dal Tadka', 'Jeera Rice', 'Tandoori Roti', 'Gulab Jamun'],
    calories: '650 kcal',
  },
  {
    name: 'Evening Snacks',
    mealType: 'SNACKS',
    time: '05:00 PM - 06:15 PM',
    items: ['Veg Cutlet / Samosa', 'Mint Chutney', 'Filter Coffee'],
    calories: '240 kcal',
  },
  {
    name: 'Dinner',
    mealType: 'DINNER',
    time: '07:45 PM - 09:45 PM',
    items: ['Mix Veg Korma', 'Yellow Dal Fry', 'Steamed Rice', 'Phulka Chapati', 'Curd'],
    calories: '520 kcal',
  },
];

export async function GET() {
  try {
    const today = getTodayUTC();

    let hostel = await prisma.hostel.findFirst();
    if (!hostel) {
      hostel = await prisma.hostel.create({
        data: {
          name: 'Main Campus Hostel',
          code: 'HS3-01',
          address: 'Campus Grounds',
        },
      });
    }

    const savedMenus = await prisma.menu.findMany({
      where: {
        hostelId: hostel.id,
        date: today,
      },
    });

    const mealTimeMap: Record<string, string> = {
      BREAKFAST: '07:30 AM - 09:30 AM',
      LUNCH: '12:30 PM - 02:30 PM',
      SNACKS: '05:00 PM - 06:15 PM',
      DINNER: '07:45 PM - 09:45 PM',
    };

    const enumToName: Record<string, string> = {
      BREAKFAST: 'Breakfast',
      LUNCH: 'Lunch',
      SNACKS: 'Evening Snacks',
      DINNER: 'Dinner',
    };

    let meals = DEFAULT_SCHEDULE;

    if (savedMenus.length > 0) {
      meals = savedMenus.map((m) => ({
        name: enumToName[m.mealType] || m.mealType,
        mealType: m.mealType,
        time: mealTimeMap[m.mealType] || '08:00 AM - 09:00 AM',
        items: m.items,
        calories: m.calories ? `${m.calories} kcal` : '450 kcal',
      }));
    }

    return NextResponse.json({ meals });
  } catch (error: any) {
    console.error('Fetch menu error:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { meals } = body;

    let hostel = await prisma.hostel.findFirst();
    if (!hostel) {
      hostel = await prisma.hostel.create({
        data: {
          name: 'Main Campus Hostel',
          code: 'HS3-01',
          address: 'Campus Grounds',
        },
      });
    }

    const today = getTodayUTC();

    if (Array.isArray(meals)) {
      for (const m of meals) {
        const mealTypeEnum = m.mealType as MealType;
        await prisma.menu.upsert({
          where: {
            date_mealType_hostelId: {
              date: today,
              mealType: mealTypeEnum,
              hostelId: hostel.id,
            },
          },
          update: {
            items: m.items,
          },
          create: {
            date: today,
            mealType: mealTypeEnum,
            hostelId: hostel.id,
            items: m.items,
            calories: 500,
          },
        });
      }
    }

    return NextResponse.json({ message: 'Menu updated successfully' });
  } catch (error: any) {
    console.error('Update menu error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update menu' }, { status: 500 });
  }
}