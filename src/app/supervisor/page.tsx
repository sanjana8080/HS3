'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  UtensilsCrossed, 
  TrendingUp, 
  Sparkles, 
  Clock, 
  Save, 
  Plus, 
  Trash2, 
  Star, 
  MessageSquare, 
  LogOut,
  ChevronRight,
  Flame,
  Search,
  Filter,
  Loader2,
  CheckCheck
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface MealPlan {
  name: string;
  time: string;
  calories: string;
  items: string[];
  headcount: { eating: number; skipping: number; total: number };
  rating: number;
}

interface FeedbackItem {
  id: string;
  student: string;
  room: string;
  message: string;
  meal: string;
  time: string;
}

interface FeedbackTrend {
  keyword: string;
  mentions: number;
  avgRating: number;
  sentiment: 'Critical' | 'Moderate' | 'Positive';
}

interface AttendanceRecord {
  id: string;
  name: string;
  roomNumber: string;
  rollNumber: string;
  dietaryPref: string;
  status: 'EATING' | 'SKIPPED' | 'NOT_RESPONDED';
  lastUpdated: string | null;
}

const MEAL_NAME_TO_ENUM: Record<string, string> = {
  Breakfast: 'BREAKFAST',
  Lunch: 'LUNCH',
  'Evening Snacks': 'SNACKS',
  Dinner: 'DINNER',
};

export default function SupervisorDashboard() {
  const [selectedDay, setSelectedDay] = useState('Thursday');
  const [isPublishing, setIsPublishing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [trends, setTrends] = useState<FeedbackTrend[]>([]);
  const [metrics, setMetrics] = useState({
    eatingNext: 0,
    totalExpected: 280,
    skippedToday: 0,
    avgRating: 4.3,
  });

  // Attendance Table state
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedAttendanceMeal, setSelectedAttendanceMeal] = useState('LUNCH');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  const [menuData, setMenuData] = useState<{ [day: string]: MealPlan[] }>({
    Thursday: [
      {
        name: 'Breakfast',
        time: '07:30 AM - 09:30 AM',
        calories: '380 kcal',
        items: ['Aloo Poha', 'Boiled Eggs / Sprouts', 'Masala Chai', 'Fresh Fruits'],
        headcount: { eating: 0, skipping: 0, total: 280 },
        rating: 4.2,
      },
      {
        name: 'Lunch',
        time: '12:30 PM - 02:30 PM',
        calories: '650 kcal',
        items: ['Paneer Butter Masala', 'Dal Tadka', 'Jeera Rice', 'Tandoori Roti', 'Gulab Jamun'],
        headcount: { eating: 0, skipping: 0, total: 280 },
        rating: 4.8,
      },
      {
        name: 'Evening Snacks',
        time: '05:00 PM - 06:15 PM',
        calories: '240 kcal',
        items: ['Veg Cutlet / Samosa', 'Mint Chutney', 'Filter Coffee'],
        headcount: { eating: 0, skipping: 0, total: 280 },
        rating: 3.9,
      },
      {
        name: 'Dinner',
        time: '07:45 PM - 09:45 PM',
        calories: '520 kcal',
        items: ['Mix Veg Korma', 'Yellow Dal Fry', 'Steamed Rice', 'Phulka Chapati', 'Curd'],
        headcount: { eating: 0, skipping: 0, total: 280 },
        rating: 4.1,
      },
    ],
  });

  // Fetch live menu, attendance headcount, and feedbacks from API
  useEffect(() => {
    async function loadSupervisorData() {
      try {
        const [menuRes, attRes, feedRes] = await Promise.all([
          fetch('/api/menu', { credentials: 'include' }),
          fetch('/api/attendance', { credentials: 'include' }),
          fetch('/api/feedback', { credentials: 'include' }),
        ]);

        if (menuRes.ok) {
          const mData = await menuRes.json();
          if (mData.meals && Array.isArray(mData.meals) && mData.meals.length > 0) {
            setMenuData((prev) => ({
              ...prev,
              [selectedDay]: mData.meals.map((m: any) => ({
                name: m.name,
                time: m.time || (m.name === 'Breakfast' ? '07:30 AM - 09:30 AM' : m.name === 'Lunch' ? '12:30 PM - 02:30 PM' : m.name === 'Evening Snacks' ? '05:00 PM - 06:15 PM' : '07:45 PM - 09:45 PM'),
                calories: m.calories || '450 kcal',
                items: m.items || [],
                headcount: { eating: 0, skipping: 0, total: 280 },
                rating: 4.5,
              })),
            }));
          }
        }

        if (attRes.ok) {
          const aData = await attRes.json();
          const headcounts = aData.headcounts || {};

          const enumMap: Record<string, string> = {
            BREAKFAST: 'Breakfast',
            LUNCH: 'Lunch',
            SNACKS: 'Evening Snacks',
            DINNER: 'Dinner',
          };

          let totalSkipped = 0;
          let lunchEating = 0;
          let totalPool = 280;

          setMenuData((prev) => {
            const current = prev[selectedDay] || [];
            const updated = current.map((meal) => {
              const matchedKey = Object.keys(enumMap).find((k) => enumMap[k] === meal.name);
              const count = matchedKey && headcounts[matchedKey] ? headcounts[matchedKey] : { eating: 0, skipping: 0, total: 280 };

              totalSkipped += count.skipping;
              if (meal.name === 'Lunch') {
                lunchEating = count.eating;
                totalPool = count.total;
              }

              return { ...meal, headcount: count };
            });

            return { ...prev, [selectedDay]: updated };
          });

          setMetrics((m) => ({
            ...m,
            eatingNext: lunchEating,
            totalExpected: totalPool,
            skippedToday: totalSkipped,
          }));
        }

        if (feedRes.ok) {
          const fData = await feedRes.json();
          if (fData.feedbacks) {
            const mappedFeedbacks: FeedbackItem[] = fData.feedbacks.map((fb: any) => ({
              id: fb.id,
              student: fb.user?.name || 'Anonymous Resident',
              room: fb.user?.roomNumber || 'N/A',
              message: fb.comment || 'No comment provided.',
              meal: fb.mealType || 'Meal',
              time: fb.createdAt ? new Date(fb.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
            }));
            setFeedbacks(mappedFeedbacks);
          }
          if (fData.trends) {
            setTrends(fData.trends);
          }
        }
      } catch (err) {
        console.error('Failed to load supervisor live data:', err);
      }
    }

    loadSupervisorData();
  }, [selectedDay]);

  // Fetch detailed room attendance list
  useEffect(() => {
    async function loadAttendanceList() {
      setLoadingAttendance(true);
      try {
        const res = await fetch(`/api/supervisor/attendance?mealType=${selectedAttendanceMeal}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.records) setAttendanceRecords(data.records);
        }
      } catch (err) {
        console.error('Failed to load room attendance list:', err);
      } finally {
        setLoadingAttendance(false);
      }
    }

    loadAttendanceList();
  }, [selectedAttendanceMeal]);

  const currentMeals = menuData[selectedDay] || menuData['Thursday'];

  const handleItemChange = (mealIndex: number, itemIndex: number, newValue: string) => {
    const updated = [...currentMeals];
    updated[mealIndex].items[itemIndex] = newValue;
    setMenuData({ ...menuData, [selectedDay]: updated });
  };

  const handleAddItem = (mealIndex: number) => {
    const updated = [...currentMeals];
    updated[mealIndex].items.push('New Dish Item');
    setMenuData({ ...menuData, [selectedDay]: updated });
  };

  const handleRemoveItem = (mealIndex: number, itemIndex: number) => {
    const updated = [...currentMeals];
    updated[mealIndex].items.splice(itemIndex, 1);
    setMenuData({ ...menuData, [selectedDay]: updated });
  };

  // Publish all updated meal plans to backend and trigger student notifications
  const handleSaveMenu = async () => {
    setIsPublishing(true);
    try {
      const savePromises = currentMeals.map((meal) => {
        const mealEnum = MEAL_NAME_TO_ENUM[meal.name] || 'LUNCH';
        const rawCalories = parseInt(meal.calories.replace(/\D/g, ''), 10) || 450;

        return fetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            mealType: mealEnum,
            items: meal.items.filter((i) => i.trim().length > 0),
            calories: rawCalories,
            date: new Date().toISOString(),
          }),
        });
      });

      await Promise.all(savePromises);

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4500);
    } catch (err) {
      console.error('Error publishing menu:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAcknowledge = (id: string) => {
    setAcknowledgedIds((prev) => new Set([...prev, id]));
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

  const filteredAttendance = attendanceRecords.filter((record) => {
    const matchesSearch =
      record.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="relative min-h-screen w-full bg-[#100e14] text-[#F5E6EB] font-sans pb-20">
      
      {/* Background Ambient Aura */}
      <div className="fixed -top-24 -left-24 w-[500px] h-[500px] bg-[#E8A598]/10 rounded-full blur-[170px] pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-[500px] h-[500px] bg-[#E8A4C8]/15 rounded-full blur-[180px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 w-full border-b border-[#F4A8C4]/10 bg-[#16131c]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#231b2c] border border-[#F4A8C4]/25 flex items-center justify-center shadow-inner">
              <span className="text-base font-bold text-[#F4A8C4]">HS³</span>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-[#FFF0F5] flex items-center gap-2">
                Supervisor Mess Console
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8A4C8]/15 text-[#F4A8C4] border border-[#F4A8C4]/25">
                  Admin Portal
                </span>
              </div>
              <p className="text-[11px] text-[#B3A6BC]">Campus Kitchen & Forecasting Command</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveMenu}
              disabled={isPublishing}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F4A8C4] to-[#E8A4C8] text-[#24131C] text-xs font-semibold shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Publish Weekly Menu
                </>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[#231b2c] hover:bg-[#2e233b] border border-[#F4A8C4]/20 text-[#F4A8C4] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <main className="max-w-7xl mx-auto px-5 sm:px-8 pt-8 space-y-8 relative z-10">
        
        {/* Metric Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#17141f]/85 border border-[#F4A8C4]/15 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between text-[#B3A6BC] mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Expected Next Meal</span>
              <Users className="w-4 h-4 text-[#F4A8C4]" />
            </div>
            <div className="text-2xl font-bold text-[#FFF0F5]">{metrics.eatingNext} / {metrics.totalExpected}</div>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Live headcounts recorded
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#17141f]/85 border border-[#F4A8C4]/15 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between text-[#B3A6BC] mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Skipped Today</span>
              <UtensilsCrossed className="w-4 h-4 text-[#E8A598]" />
            </div>
            <div className="text-2xl font-bold text-[#FFF0F5]">{metrics.skippedToday} Meals</div>
            <p className="text-[11px] text-[#F4A8C4] mt-1">Kitchen waste prevented</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#17141f]/85 border border-[#F4A8C4]/15 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between text-[#B3A6BC] mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Average Rating</span>
              <Star className="w-4 h-4 text-[#F4A8C4] fill-[#F4A8C4]" />
            </div>
            <div className="text-2xl font-bold text-[#FFF0F5]">4.3 / 5.0</div>
            <p className="text-[11px] text-[#B3A6BC] mt-1">Student review average</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#17141f]/85 border border-[#F4A8C4]/15 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between text-[#B3A6BC] mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">New Feedback</span>
              <MessageSquare className="w-4 h-4 text-[#BDB2CF]" />
            </div>
            <div className="text-2xl font-bold text-[#FFF0F5]">{feedbacks.length} Total</div>
            <p className="text-[11px] text-[#BDB2CF] mt-1">Live submissions from residents</p>
          </div>
        </div>

        {/* Save Confirmation Toast */}
        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center justify-between shadow-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Menu updates for <strong>{selectedDay}</strong> published! Real-time notifications dispatched to registered student portals.</span>
            </div>
          </div>
        )}

        {/* Day Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                selectedDay === day
                  ? 'bg-gradient-to-r from-[#F4A8C4] to-[#E8A4C8] text-[#24131C] shadow-lg scale-102'
                  : 'bg-[#17141f] text-[#B3A6BC] hover:text-[#FFF0F5] border border-white/[0.05]'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* 2-Column Section: Menu Editor & Feedback Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left 2 Cols: Menu Editor & Headcount Cards */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#FFF0F5]">{selectedDay}'s Daily Schedule</h2>
                <p className="text-xs text-[#B3A6BC]">Live editing propagates instantly to student devices upon publishing.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {currentMeals.map((meal, mealIdx) => (
                <div
                  key={meal.name}
                  className="p-6 rounded-[1.75rem] bg-[#17141f]/85 border border-[#F4A8C4]/15 backdrop-blur-md shadow-xl flex flex-col justify-between gap-5"
                >
                  {/* Card Header & Headcount Ratio */}
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-[#FFF0F5]">{meal.name}</h3>
                        <span className="text-[11px] text-[#B3A6BC] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-[#F4A8C4]" />
                          {meal.time}
                        </span>
                      </div>

                      {/* Headcount Badge */}
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                          {meal.headcount.eating} Eating
                        </span>
                        <div className="text-[10px] text-rose-400 mt-1 font-mono">
                          {meal.headcount.skipping} Skipping
                        </div>
                      </div>
                    </div>

                    {/* Editable Items */}
                    <div className="mt-4 pt-3 border-t border-white/[0.05] space-y-2">
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-[#8C8198]">
                        Menu Items (Click to edit):
                      </span>
                      
                      <div className="space-y-1.5">
                        {meal.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => handleItemChange(mealIdx, itemIdx, e.target.value)}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-[#110e16] border border-white/[0.07] text-xs text-[#FFF0F5] focus:outline-none focus:border-[#F4A8C4]/50 focus:ring-1 focus:ring-[#F4A8C4]/20 transition-all"
                            />
                            <button
                              onClick={() => handleRemoveItem(mealIdx, itemIdx)}
                              className="p-1.5 text-[#7A6E85] hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => handleAddItem(mealIdx)}
                        className="w-full mt-2 py-1.5 rounded-lg border border-dashed border-[#F4A8C4]/20 hover:border-[#F4A8C4]/50 text-[#F4A8C4] text-[11px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Add Dish
                      </button>
                    </div>
                  </div>

                  {/* Rating Indicator */}
                  <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between text-xs text-[#B3A6BC]">
                    <span>Average Student Rating:</span>
                    <span className="flex items-center gap-1 font-semibold text-[#F4A8C4]">
                      <Star className="w-3.5 h-3.5 fill-[#F4A8C4]" />
                      {meal.rating} / 5.0
                    </span>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Right Col: Student Feedback Inbox */}
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-[#FFF0F5]">Live Student Voice</h2>
              <p className="text-xs text-[#B3A6BC]">Suggestions & feedback from hostel residents.</p>
            </div>

            {/* Top 3 Keyword Trends Card */}
            {trends.length > 0 && (
              <div className="p-5 rounded-[2rem] bg-[#1a1523]/90 border border-[#F4A8C4]/30 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F4A8C4] flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-[#F4A8C4]" /> Top Issues & Trends
                  </span>
                  <span className="text-[10px] text-[#B3A6BC]">Auto-clustered</span>
                </div>

                <div className="space-y-2">
                  {trends.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#110e16]/90 border border-white/[0.06] flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#FFF0F5] tracking-wide">
                          #{t.keyword}
                        </div>
                        <div className="text-[10px] text-[#B3A6BC] mt-0.5">
                          {t.mentions} mentions • ⭐ {t.avgRating} / 5
                        </div>
                      </div>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          t.sentiment === 'Critical'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : t.sentiment === 'Moderate'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {t.sentiment}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Submissions List */}
            <div className="p-6 rounded-[2rem] bg-[#17141f]/85 border border-[#F4A8C4]/15 shadow-xl space-y-4">
              {feedbacks.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#110e16]/80 border border-white/[0.05] text-center text-xs text-[#7A6E85]">
                  No feedback submissions recorded yet today.
                </div>
              ) : (
                feedbacks.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-[#110e16]/80 border border-white/[0.05] hover:border-[#F4A8C4]/20 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#231b2c] border border-[#F4A8C4]/20 flex items-center justify-center text-[11px] font-bold text-[#F4A8C4]">
                          {item.student[0]}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-[#FFF0F5]">{item.student}</div>
                          <div className="text-[10px] text-[#B3A6BC]">Room {item.room}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-[#7A6E85]">{item.time}</span>
                    </div>

                    <p className="text-xs text-[#D8C7D3] italic leading-relaxed">
                      "{item.message}"
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-[#F4A8C4]/10 text-[#F4A8C4] border border-[#F4A8C4]/20">
                        {item.meal}
                      </span>
                      <button 
                        onClick={() => handleAcknowledge(item.id)}
                        className={`text-[11px] flex items-center gap-0.5 cursor-pointer transition-colors ${
                          acknowledgedIds.has(item.id)
                            ? 'text-emerald-400 font-medium'
                            : 'text-[#B3A6BC] hover:text-[#FFF0F5]'
                        }`}
                      >
                        {acknowledgedIds.has(item.id) ? (
                          <>
                            <CheckCheck className="w-3.5 h-3.5" /> Acknowledged
                          </>
                        ) : (
                          <>
                            Acknowledge <ChevronRight className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}

              <div className="p-3 rounded-xl bg-[#14111a] border border-dashed border-white/[0.07] text-center">
                <span className="text-[11px] text-[#7A6E85]">End of recent notifications</span>
              </div>
            </div>
          </div>

        </div>

        {/* Room-by-Room Attendance Log Table */}
        <section className="p-6 sm:p-8 rounded-[2rem] bg-[#17141f]/85 border border-[#F4A8C4]/15 backdrop-blur-md shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#FFF0F5]">Room Attendance & Intent Log</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F4A8C4]/15 text-[#F4A8C4] border border-[#F4A8C4]/25">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-[#B3A6BC] mt-0.5">Filter by meal session, search room numbers, or track diet preferences.</p>
            </div>

            {/* Meal Selector Tabs */}
            <div className="flex bg-[#110e16] p-1 rounded-xl border border-white/[0.07] text-xs">
              {['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedAttendanceMeal(type)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedAttendanceMeal === type
                      ? 'bg-gradient-to-r from-[#F4A8C4] to-[#E8A4C8] text-[#24131C] shadow-md'
                      : 'text-[#B3A6BC] hover:text-[#FFF0F5]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A6E85]" />
              <input
                type="text"
                placeholder="Search room number, student name, or roll no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#110e16] border border-white/[0.08] text-xs text-[#FFF0F5] placeholder-[#7A6E85] focus:outline-none focus:border-[#F4A8C4]/50 focus:ring-1 focus:ring-[#F4A8C4]/20 transition-all"
              />
            </div>

            <div className="relative flex items-center">
              <Filter className="w-3.5 h-3.5 absolute left-3.5 text-[#7A6E85] pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-9 pr-8 py-2 rounded-xl bg-[#110e16] border border-white/[0.08] text-xs text-[#FFF0F5] focus:outline-none focus:border-[#F4A8C4]/50 transition-all cursor-pointer appearance-none"
              >
                <option value="ALL" className="bg-[#17141f]">All Statuses</option>
                <option value="EATING" className="bg-[#17141f]">Eating Only</option>
                <option value="SKIPPED" className="bg-[#17141f]">Skipping Only</option>
                <option value="NOT_RESPONDED" className="bg-[#17141f]">No Response</option>
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full text-left text-xs text-[#D8C7D3]">
              <thead className="bg-[#110e16] text-[11px] font-semibold text-[#8C8198] uppercase tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="py-3 px-4">Room No.</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Roll No.</th>
                  <th className="py-3 px-4">Diet</th>
                  <th className="py-3 px-4">Intent Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {loadingAttendance ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#7A6E85]">
                      Loading real-time records...
                    </td>
                  </tr>
                ) : filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#7A6E85]">
                      No student records found matching this filter.
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#FFF0F5]">{item.roomNumber}</td>
                      <td className="py-3 px-4 font-medium text-[#FFF0F5]">{item.name}</td>
                      <td className="py-3 px-4 font-mono text-[#8C8198]">{item.rollNumber}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#231b2c] text-[#F4A8C4] border border-[#F4A8C4]/20">
                          {item.dietaryPref}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold font-mono ${
                            item.status === 'EATING'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                              : item.status === 'SKIPPED'
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}