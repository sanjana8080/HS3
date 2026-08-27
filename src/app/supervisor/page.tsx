'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Utensils, Users, UserCheck, UserX, Clock, RefreshCw, LogOut, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface MealSummary {
  mealType: string;
  eating: number;
  skipped: number;
  unresponded: number;
  totalStudents: number;
}

export default function SupervisorDashboard() {
  const router = useRouter();
  const [data, setData] = useState<MealSummary[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/supervisor/headcount');
      if (!res.ok) throw new Error('Unauthorized');
      const json = await res.json();
      setData(json.summary || []);
      setTotalStudents(json.totalStudents || 0);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">HS³ Supervisor</h1>
              <p className="text-xs text-slate-500">Live Kitchen & Headcount Projections</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Student View
            </Link>
            <button
              onClick={fetchData}
              className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
              title="Refresh Count"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
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

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Enrolled</p>
              <p className="text-2xl font-bold text-slate-900">{totalStudents}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today's Avg Turnout</p>
              <p className="text-2xl font-bold text-emerald-600">
                {data.length > 0 && totalStudents > 0
                  ? `${Math.round((data.reduce((acc, curr) => acc + curr.eating, 0) / (data.length * totalStudents)) * 100)}%`
                  : '0%'}
              </p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-lg bg-rose-50 text-rose-600">
              <UserX className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Opted Out (Skipped)</p>
              <p className="text-2xl font-bold text-rose-600">
                {data.reduce((acc, curr) => acc + curr.skipped, 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Meal Headcount Cards */}
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          Meal-wise Kitchen Preparation Forecast
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.map((meal) => {
            const expectedTotal = meal.eating + Math.round(meal.unresponded * 0.7); // 70% default probability for unresponded
            return (
              <div key={meal.mealType} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {meal.mealType}
                    </span>
                    <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full">
                      Forecast: ~{expectedTotal} plates
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Confirmed Eating:
                      </span>
                      <span className="font-bold text-slate-800">{meal.eating}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Confirmed Skipped:
                      </span>
                      <span className="font-bold text-slate-800">{meal.skipped}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full bg-amber-400" /> Unresponded:
                      </span>
                      <span className="font-bold text-slate-800">{meal.unresponded}</span>
                    </div>
                  </div>
                </div>

                {/* Turnout Progress Bar */}
                <div>
                  <div className="w-full bg-slate-100 rounded-full h-2 flex overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${(meal.eating / (totalStudents || 1)) * 100}%` }}
                    />
                    <div
                      className="bg-rose-500 h-full"
                      style={{ width: `${(meal.skipped / (totalStudents || 1)) * 100}%` }}
                    />
                    <div
                      className="bg-amber-300 h-full"
                      style={{ width: `${(meal.unresponded / (totalStudents || 1)) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 text-right mt-1.5">
                    {totalStudents > 0 ? Math.round((meal.eating / totalStudents) * 100) : 0}% confirmed
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}