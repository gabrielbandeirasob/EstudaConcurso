
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase } from '../src/lib/supabase';
import { Subject, Session as StudySession } from '../types';

const Dashboard: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const [subjectsRes, sessionsRes] = await Promise.all([
        supabase.from('subjects').select('*').order('percentage', { ascending: false }),
        supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(5)
      ]);

      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (sessionsRes.data) setSessions(sessionsRes.data);
      setLoading(false);
    };

    loadData();
  }, []);

  const chartData = subjects.length > 0
    ? subjects.map(s => ({ name: s.name, value: s.percentage || 10, color: s.color || '#008080' }))
    : [{ name: 'Nenhuma matéria', value: 100, color: '#f3f4f6' }];

  const totalStudiedToday = "4.5"; // This would ideally be calculated from sessions

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#008080]"></div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 mt-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center overflow-hidden">
            <img src={user?.user_metadata?.avatar_url || "https://picsum.photos/seed/alex/100"} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-[11px] text-[#618389] font-medium">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
            </p>
            <h2 className="text-base font-bold leading-tight tracking-tight">Olá, {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}</h2>
          </div>
        </div>
        <button className="size-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100">
          <span className="material-symbols-outlined text-xl text-gray-500">notifications</span>
        </button>
      </header>

      {/* Main Stats */}
      <section className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Seu Progresso</h1>
        <p className="text-[#618389] mt-1">Você estudou {totalStudiedToday} horas hoje.</p>
      </section>

      {/* Cycle Progress Chart */}
      <section className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#618389] mb-3">Ciclo Atual</h3>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="relative size-48 flex items-center justify-center mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{subjects.length}</span>
              <span className="text-[10px] text-[#618389] uppercase tracking-tighter">Matérias</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full">
            {subjects.slice(0, 3).map((s) => (
              <div key={s.id} className="flex flex-col items-center text-center">
                <div className="size-2 rounded-full mb-1" style={{ backgroundColor: s.color || '#008080' }}></div>
                <span className="text-[11px] font-semibold truncate w-full">{s.name}</span>
                <span className="text-[10px] text-[#618389]">{s.percentage}%</span>
              </div>
            ))}
          </div>

          <button className="mt-6 w-full py-3 bg-teal-50 text-[#008080] font-bold rounded-xl text-sm transition-all hover:bg-teal-100">
            Editar Pesos do Ciclo
          </button>
        </div>
      </section>

      {/* Recent Sessions */}
      <section className="mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#618389] mb-3">Sessões Recentes</h3>
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Nenhuma sessão recente.</p>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-50 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-lg bg-teal-50 text-[#008080] flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-xl">{session.icon || 'history'}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{session.subject_name}</p>
                    <p className="text-[10px] text-[#618389]">{session.duration} • {session.status}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-300">chevron_right</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Floating Action Button */}
      <button className="fixed bottom-24 right-6 size-14 bg-[#008080] text-white rounded-full shadow-lg shadow-teal-600/30 flex items-center justify-center z-20">
        <span className="material-symbols-outlined text-2xl font-bold">play_arrow</span>
      </button>
    </div>
  );
};

export default Dashboard;
