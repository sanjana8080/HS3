'use client';

import { useState, useEffect } from 'react';
import { 
  Utensils, 
  Sparkles, 
  Clock, 
  Check, 
  X, 
  Star, 
  MessageSquarePlus, 
  LogOut, 
  Calendar,
  Flame,
  Coffee,
  Sun,
  Moon,
  Cookie
} from 'lucide-react';

interface Meal {
  id: string;
  name: string;
  time: string;
  icon: any;
  items: string[];
  calories: string;
  status: 'EATING' | 'SKIPPING' | 'PENDING';
  rating: number;
}

const ICON_MAP: Record<string, any> = {
  Breakfast: Coffee,
  Lunch: Sun,
  'Evening Snacks': Cookie,
  Dinner: Moon,
  BREAKFAST: Coffee,
  LUNCH: Sun,
  SNACKS: Cookie,
  DINNER: Moon,
};

export default function StudentDashboard() {
  const [meals, setMeals] = useState<Meal[]>([
    {
      id: '1',
      name: 'Breakfast',
      time: '07:30 AM - 09:30 AM',
      icon: Coffee,
      items: ['Aloo Poha', 'Boiled Eggs / Sprouts', 'Tea / Masala Chai', 'Fresh Fruits'],
      calories: '380 kcal',
      status: 'PENDING',
      rating: 4,
    },
    {
      id: '2',
      name: 'Lunch',
      time: '12:30 PM - 02:30 PM',
      icon: Sun,
      items: ['Paneer Butter Masala', 'Dal Tadka', 'Jeera Rice', 'Tandoori Roti', 'Gulab Jamun'],
      calories: '650 kcal',
      status: 'PENDING',
      rating: 5,
    },
    {
      id: '3',
      name: 'Evening Snacks',
      time: '05:00 PM - 06:15 PM',
      icon: Cookie,
      items: ['Veg Cutlet / Samosa', 'Mint Chutney', 'Filter Coffee'],
      calories: '240 kcal',
      status: 'PENDING',
      rating: 0,
    },
    {
      id: '4',
      name: 'Dinner',
      time: '07:45 PM - 09:45 PM',
      icon: Moon,
      items: ['Mix Veg Korma', 'Yellow Dal Fry', 'Steamed Rice', 'Phulka Chapati', 'Curd'],
      calories: '520 kcal',
      status: 'PENDING',
      rating: 0,
    },
  ]);

  const [suggestion, setSuggestion] = useState('');
  const [submittedFeedback, setSubmittedFeedback] = useState(false);

  // Load today's live menu and saved attendance from database
  useEffect(() => {
    async function syncDashboardData() {
      try {
        const [menuRes, attendanceRes] = await Promise.all([
          fetch('/api/menu', { credentials: 'include' }),
          fetch('/api/attendance', { credentials: 'include' }),
        ]);

        let liveMeals = meals;

        if (menuRes.ok) {
          const menuData = await menuRes.json();
          if (menuData.meals && Array.isArray(menuData.meals)) {
            liveMeals = menuData.meals.map((m: any, idx: number) => ({
              id: String(idx + 1),
              name: m.name,
              time: m.time || '08:00 AM - 09:00 AM',
              icon: ICON_MAP[m.name] || Coffee,
              items: m.items || [],
              calories: m.calories || '450 kcal',
              status: 'PENDING',
              rating: 0,
            }));
          }
        }

        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          const userAtt = attendanceData.userAttendance || {};

          const enumToMealName: Record<string, string> = {
            BREAKFAST: 'Breakfast',
            LUNCH: 'Lunch',
            SNACKS: 'Evening Snacks',
            DINNER: 'Dinner',
          };

          liveMeals = liveMeals.map((meal) => {
            const currentEnum = Object.keys(enumToMealName).find(
              (key) => enumToMealName[key] === meal.name
            );
            const savedStatus = currentEnum ? userAtt[currentEnum] : null;

            return {
              ...meal,
              status:
                savedStatus === 'EATING'
                  ? 'EATING'
                  : savedStatus === 'SKIPPED'
                  ? 'SKIPPING'
                  : 'PENDING',
            };
          });
        }

        setMeals(liveMeals);
      } catch (err) {
        console.error('Failed to sync live dashboard data:', err);
      }
    }

    syncDashboardData();
  }, []);

  const toggleMealAttendance = async (id: string, newStatus: 'EATING' | 'SKIPPING') => {
    const targetMeal = meals.find((m) => m.id === id);
    if (!targetMeal) return;

    const nextStatus = targetMeal.status === newStatus ? 'PENDING' : newStatus;

    // Optimistic UI update
    setMeals((prev) =>
      prev.map((meal) => (meal.id === id ? { ...meal, status: nextStatus } : meal))
    );

    // Save to Database
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mealName: targetMeal.name,
          status: nextStatus,
        }),
      });
    } catch (err) {
      console.error('Failed to save attendance:', err);
    }
  };

  const handleRate = async (id: string, starCount: number) => {
    const targetMeal = meals.find((m) => m.id === id);
    if (!targetMeal) return;

    setMeals((prev) =>
      prev.map((meal) => (meal.id === id ? { ...meal, rating: starCount } : meal))
    );

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mealType: targetMeal.name,
          rating: starCount,
          comment: `Rated ${starCount} stars for ${targetMeal.name}`,
        }),
      });
    } catch (err) {
      console.error('Failed to save meal rating:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' 
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.location.replace('/login');
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) return;

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          comment: suggestion.trim(),
          mealType: 'LUNCH',
          rating: 5,
        }),
      });

      if (res.ok) {
        setSubmittedFeedback(true);
        setSuggestion('');
        setTimeout(() => setSubmittedFeedback(false), 4000);
      }
    } catch (err) {
      console.error('Failed to send suggestion:', err);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#100e14] text-[#F5E6EB] font-sans pb-16">
      
      {/* Ambient Glows */}
      <div className="fixed -top-24 -left-24 w-[480px] h-[480px] bg-[#E8A598]/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-[500px] h-[500px] bg-[#E8A4C8]/15 rounded-full blur-[180px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="sticky top-0 z-30 w-full border-b border-[#F4A8C4]/10 bg-[#16131c]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#231b2c] border border-[#F4A8C4]/25 flex items-center justify-center shadow-inner">
              <span className="text-base font-bold text-[#F4A8C4]">HS³</span>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-[#FFF0F5] flex items-center gap-1.5">
                Hostel Dining Portal
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F4A8C4]/15 text-[#F4A8C4] border border-[#F4A8C4]/25">
                  Student
                </span>
              </div>
              <p className="text-[11px] text-[#B3A6BC]">Main Campus Hostel</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1c1824] border border-white/[0.06] text-xs text-[#B3A6BC]">
              <Calendar className="w-3.5 h-3.5 text-[#F4A8C4]" />
              Today's Menu
            </div>
            <button
              onClick={handleLogout}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#231b2c] hover:bg-[#2e233b] border border-[#F4A8C4]/20 text-[#F4A8C4] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-5 sm:px-8 pt-8 space-y-8 relative z-10">
        
        {/* Banner Section */}
        <div className="relative p-6 sm:p-8 rounded-[2rem] bg-gradient-to-r from-[#201929]/90 to-[#191522]/90 border border-[#F4A8C4]/15 shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#F4A8C4]/10 border border-[#F4A8C4]/20 text-[#F4A8C4]">
              <Sparkles className="w-3 h-3" />
              Zero-Waste Hostel Initiative
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#FFF0F5]">
              Today's Dining Schedule
            </h1>
            <p className="text-xs sm:text-sm text-[#B3A6BC] max-w-xl">
              Mark whether you plan to eat or skip to help our mess crew prepare accurate headcounts and cut food waste.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-[#14111a]/70 border border-white/[0.06] p-4 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-[#F4A8C4]/10 border border-[#F4A8C4]/20 flex items-center justify-center text-[#F4A8C4]">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#B3A6BC]">Today's Energy</div>
              <div className="text-base font-semibold text-[#FFF0F5]">1,790 kcal</div>
            </div>
          </div>
        </div>

        {/* Meal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {meals.map((meal) => {
            const IconComponent = meal.icon;
            return (
              <div
                key={meal.id}
                className="p-6 rounded-[1.75rem] bg-[#17141f]/85 border border-[#F4A8C4]/10 hover:border-[#F4A8C4]/25 shadow-lg backdrop-blur-lg flex flex-col justify-between gap-6 transition-all duration-300"
              >
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#231b2c] border border-[#F4A8C4]/20 flex items-center justify-center text-[#F4A8C4]">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-[#FFF0F5]">{meal.name}</h2>
                        <span className="text-[11px] text-[#B3A6BC] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#F4A8C4]" />
                          {meal.time}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[#100e14] border border-white/[0.05] text-[#B3A6BC]">
                      {meal.calories}
                    </span>
                  </div>

                  {/* Menu Items List */}
                  <div className="mt-4 pt-3 border-t border-white/[0.05] space-y-1.5">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8C8198]">
                      On the menu:
                    </span>
                    <ul className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 text-xs text-[#E5D7E0]">
                      {meal.items.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 truncate">
                          <span className="w-1 h-1 rounded-full bg-[#F4A8C4]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Rating & Attendance Toggle */}
                <div className="pt-4 border-t border-white/[0.05] flex flex-col gap-3">
                  {/* Star Rating */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#B3A6BC]">Rate this meal:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRate(meal.id, star)}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              star <= meal.rating
                                ? 'text-[#F4A8C4] fill-[#F4A8C4]'
                                : 'text-[#443b4f]'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Eating / Skipping Buttons */}
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      onClick={() => toggleMealAttendance(meal.id, 'EATING')}
                      className={`py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        meal.status === 'EATING'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                          : 'bg-[#100e14] text-[#B3A6BC] hover:text-[#FFF0F5] border border-white/[0.05]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Eating
                    </button>

                    <button
                      onClick={() => toggleMealAttendance(meal.id, 'SKIPPING')}
                      className={`py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        meal.status === 'SKIPPING'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                          : 'bg-[#100e14] text-[#B3A6BC] hover:text-[#FFF0F5] border border-white/[0.05]'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      Skipping
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* Suggestion / Food Request Box */}
        <div className="p-6 sm:p-8 rounded-[2rem] bg-[#17141f]/85 border border-[#F4A8C4]/15 shadow-xl">
          <div className="flex items-center gap-2.5 mb-2">
            <MessageSquarePlus className="w-5 h-5 text-[#F4A8C4]" />
            <h2 className="text-lg font-semibold text-[#FFF0F5]">Mess Feedback & Menu Requests</h2>
          </div>
          <p className="text-xs text-[#B3A6BC] mb-4">
            Have a special dish request or hygiene feedback for the hostel supervisor? Drop it below.
          </p>

          <form onSubmit={handleFeedbackSubmit} className="space-y-3">
            <textarea
              rows={3}
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="e.g., Can we have Gulab Jamun this Sunday, or add more curd options for dinner?"
              className="w-full p-4 rounded-xl bg-[#110e16]/90 border border-[#F4A8C4]/15 text-sm text-[#FFF0F5] placeholder-[#6E6478] focus:outline-none focus:border-[#F4A8C4]/50 focus:ring-2 focus:ring-[#F4A8C4]/15 transition-all"
            />

            <div className="flex items-center justify-between">
              {submittedFeedback && (
                <span className="text-xs text-emerald-400 font-medium animate-pulse">
                  ✓ Suggestion recorded! Sent to supervisor.
                </span>
              )}
              <div className="flex-1" />
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#F4A8C4] to-[#E8A4C8] text-[#24131C] text-xs font-semibold shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer"
              >
                Submit Feedback
              </button>
            </div>
          </form>
        </div>

      </main>
    </div>
  );
}