'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Utensils, CheckCircle2, XCircle, LogOut, Clock, Flame, Sparkles, Loader2 } from 'lucide-react';

interface MenuData {
  id: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';
  items: string[];
  calories?: number;
  isSpecial: boolean;
}

interface AttendanceRecord {
  mealType: string;
  status: 'EATING' | 'SKIPPED' | 'NOT_RESPONDED';
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [attendances, setAttendances] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/menu/today');
      if (!res.ok) throw new Error('Unauthorized');
      const data = await res.json();
      setUserData(data.user);
      setMenus(data.menus || []);

      const attMap: Record<string, string> = {};
      data.attendances?.forEach((att: AttendanceRecord) => {
        attMap[att.mealType] = att.status;
      });
      setAttendances(attMap);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAttendance = async (mealType: string, status: 'EATING' | 'SKIPPED') => {
    const todayStr = new Date().toISOString().split('T')[0];
    setActionLoading(mealType);

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayStr, mealType, status }),
      });

      if (res.ok) {
        setAttendances((prev) => ({ ...prev, [mealType]: status }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const mealOrder = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
  const sortedMenus = [...menus].sort(
    (a, b) => mealOrder.indexOf(a.mealType) - mealOrder.indexOf(b.mealType)
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">HS³ Mess</h1>
              <p className="text-xs text-slate-500">{userData?.hostel?.name || 'Main Campus Hostel'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-900">{userData?.name}</p>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                {userData?.dietaryPref}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Today's Dining Schedule</h2>
            <p className="text-xs text-slate-500">
              Mark your meal attendance ahead of time to minimize mess food waste
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 self-start">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>

        {/* Meal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedMenus.map((menu) => {
            const status = attendances[menu.mealType];
            const isPending = actionLoading === menu.mealType;

            return (
              <div
                key={menu.id}
                className={`bg-white rounded-xl border p-5 transition-all ${
                  menu.isSpecial ? 'border-amber-300 ring-1 ring-amber-300/50 shadow-sm' : 'border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {menu.mealType}
                    </span>
                    {menu.isSpecial && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3" /> Special
                      </span>
                    )}
                  </div>
                  {menu.calories && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <Flame className="w-3.5 h-3.5 text-orange-500" /> {menu.calories} kcal
                    </span>
                  )}
                </div>

                {/* Items List */}
                <ul className="space-y-1.5 mb-5 min-h-[70px]">
                  {menu.items.map((item, idx) => (
                    <li key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      {item}
                    </li>
                  ))}
                </ul>

                {/* Attendance Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500">Attendance:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAttendance(menu.mealType, 'EATING')}
                      disabled={isPending}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        status === 'EATING'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Eating
                    </button>
                    <button
                      onClick={() => handleAttendance(menu.mealType, 'SKIPPED')}
                      disabled={isPending}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        status === 'SKIPPED'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Skipping
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}