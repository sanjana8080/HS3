import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const meals = await prisma.mealPlan.findMany({
      where: {
        date: {
          gte: today,
        },
      },
      orderBy: {
        mealType: 'asc',
      },
    });

    const mealNameMapping: Record<string, string> = {
      BREAKFAST: 'Breakfast',
      LUNCH: 'Lunch',
      SNACKS: 'Evening Snacks',
      DINNER: 'Dinner',
    };

    const formattedMeals = meals.map((m) => ({
      id: m.id,
      name: mealNameMapping[m.mealType] || m.mealType,
      items: m.items,
      calories: `${m.calories} kcal`,
      date: m.date,
    }));

    return NextResponse.json({ meals: formattedMeals });
  } catch (error) {
    console.error('Failed to fetch menu:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const tokenCookie = req.headers.get('cookie')?.split('; ').find(row => row.startsWith('token='));
    const token = tokenCookie ? tokenCookie.split('=')[1] : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: missing token' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { role?: string };
    if (decoded.role !== 'SUPERVISOR') {
      return NextResponse.json({ error: 'Forbidden: requires supervisor privileges' }, { status: 403 });
    }

    const { mealType, items, calories, date } = await req.json();

    if (!mealType || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid meal payload' }, { status: 400 });
    }

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Upsert the meal plan entry
    const mealPlan = await prisma.mealPlan.upsert({
      where: {
        date_mealType: {
          date: targetDate,
          mealType: mealType,
        },
      },
      update: {
        items,
        calories: Number(calories) || 450,
      },
      create: {
        mealType,
        items,
        calories: Number(calories) || 450,
        date: targetDate,
      },
    });

    const mealLabelMapping: Record<string, string> = {
      BREAKFAST: 'Breakfast (07:30 AM - 09:30 AM)',
      LUNCH: 'Lunch (12:30 PM - 02:30 PM)',
      SNACKS: 'Evening Snacks (05:00 PM - 06:15 PM)',
      DINNER: 'Dinner (07:45 PM - 09:45 PM)',
    };
    const mealLabel = mealLabelMapping[mealType] || mealType;
    const cleanMealName = mealType.charAt(0) + mealType.slice(1).toLowerCase();

    // 1. Create in-app notification entry safely
    try {
      if ((prisma as any).notification) {
        await (prisma as any).notification.create({
          data: {
            title: `Menu Updated: ${cleanMealName}`,
            message: `The menu for today's ${cleanMealName} has been updated. Items: ${items.join(', ')}`,
            type: 'MENU_UPDATE',
          },
        });
      }
    } catch (notifErr) {
      console.error('In-app notification creation error:', notifErr);
    }

    // 2. Dispatch custom styled HTML email via Resend
    if (resend) {
      try {
        await resend.emails.send({
          from: 'HS³ Dining <onboarding@resend.dev>',
          to: ['yerlesanjana@gmail.com'],
          subject: `🍽️ Updated Mess Menu: ${cleanMealName} (${calories || 450} kcal)`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              </head>
              <body style="margin: 0; padding: 32px 16px; background-color: #0c0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #17141f; border-radius: 24px; border: 1px solid rgba(244, 168, 196, 0.2); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); background: linear-gradient(180deg, #231b2c 0%, #17141f 100%);">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td>
                            <div style="display: inline-block; padding: 6px 14px; background-color: #2e2238; border: 1px solid rgba(244, 168, 196, 0.3); border-radius: 12px; font-size: 13px; font-weight: 700; color: #F4A8C4; letter-spacing: 0.5px;">
                              HS³ CAMPUS DINING
                            </div>
                          </td>
                          <td align="right">
                            <span style="font-size: 11px; font-weight: 600; color: #10B981; background-color: rgba(16, 185, 129, 0.12); padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(16, 185, 129, 0.25);">
                              ● Live Update
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Body Content -->
                  <tr>
                    <td style="padding: 32px;">
                      <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #FFF0F5; letter-spacing: -0.3px;">
                        ${cleanMealName} Menu Updated
                      </h1>
                      <p style="margin: 0 0 24px 0; font-size: 13px; color: #B3A6BC; line-height: 1.5;">
                        The hostel supervisor has modified the meal schedule. Please verify your attendance to prevent food waste.
                      </p>

                      <!-- Meal Session Badge Card -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #110e16; border: 1px solid rgba(244, 168, 196, 0.12); border-radius: 16px; margin-bottom: 24px;">
                        <tr>
                          <td style="padding: 16px 20px;">
                            <div style="font-size: 11px; text-transform: uppercase; font-weight: 600; color: #8C8198; letter-spacing: 0.8px;">Session & Energy Target</div>
                            <div style="font-size: 15px; font-weight: 700; color: #F4A8C4; margin-top: 4px;">
                              ${mealLabel}
                            </div>
                          </td>
                          <td align="right" style="padding: 16px 20px;">
                            <div style="font-size: 14px; font-weight: 700; color: #FFF0F5; font-family: monospace; background-color: #231b2c; padding: 6px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); display: inline-block;">
                              🔥 ${calories || 450} kcal
                            </div>
                          </td>
                        </tr>
                      </table>

                      <!-- Items List -->
                      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #8C8198; letter-spacing: 0.8px; margin-bottom: 12px;">
                        Today's Menu Items:
                      </div>
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                        ${items
                          .map(
                            (item: string) => `
                          <tr>
                            <td style="padding: 10px 14px; background-color: #1a1622; border-left: 3px solid #F4A8C4; border-radius: 8px; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: #F5E6EB;">
                              ✓ ${item}
                            </td>
                          </tr>
                          <tr><td height="6"></td></tr>
                        `
                          )
                          .join('')}
                      </table>

                      <!-- CTA Action Button -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td align="center">
                            <a href="https://hs-3.vercel.app/dashboard" target="_blank" style="display: block; width: 100%; box-sizing: border-box; text-align: center; padding: 14px 24px; background: linear-gradient(135deg, #F4A8C4 0%, #E8A4C8 100%); color: #24131C; text-decoration: none; font-size: 13px; font-weight: 700; border-radius: 14px; box-shadow: 0 4px 14px rgba(244, 168, 196, 0.3);">
                              Open Portal to Confirm Attendance &rarr;
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 32px; background-color: #110e16; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
                      <p style="margin: 0; font-size: 11px; color: #7A6E85;">
                        HS³ Zero-Waste Hostel Initiative • Main Campus Dining Portal
                      </p>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
          `,
        });
      } catch (emailErr) {
        console.error('Resend email dispatch error:', emailErr);
      }
    }

    return NextResponse.json({ success: true, meal: mealPlan });
  } catch (error) {
    console.error('Failed to update meal plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}