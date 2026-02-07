
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase } from '../src/lib/supabase';
import { Subject, Session as StudySession } from '../types';

const Dashboard: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [allSessions, setAllSessions] = useState<StudySession[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Get sessions for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [subjectsRes, sessionsRes, allSessionsRes] = await Promise.all([
        supabase.from('subjects').select('*').order('order_index', { ascending: true }).order('name', { ascending: true }),
        supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('sessions').select('*').gte('created_at', today.toISOString())
      ]);

      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (sessionsRes.data) setSessions(sessionsRes.data);
      if (allSessionsRes.data) setAllSessions(allSessionsRes.data);
      setLoading(false);
    };

    loadData();
  }, []);

  const parseDuration = (durationStr: string): number => {
    if (!durationStr) return 0;
    const value = parseInt(durationStr);
    if (isNaN(value)) return 0;
    if (durationStr.includes('h')) return value * 60;
    if (durationStr.includes('m')) return value;
    if (durationStr.includes('s')) return value / 60;
    return value;
  };

  const aggregatedData = allSessions.reduce((acc: Record<string, number>, session) => {
    const duration = parseDuration(session.duration || '');
    acc[session.subject_name] = (acc[session.subject_name] || 0) + duration;
    return acc;
  }, {});

  const totalMinutesToday: number = (Object.values(aggregatedData) as number[]).reduce((a: number, b: number) => a + b, 0);
  const totalStudiedToday = (totalMinutesToday / 60).toFixed(1);

  const chartData = Object.keys(aggregatedData).length > 0
    ? Object.entries(aggregatedData).map(([name, value]) => {
      const subject = subjects.find(s => s.name === name);
      return {
        name,
        value,
        color: subject?.color || '#008080'
      };
    })
    : [{ name: 'Nenhuma matéria estudada', value: 1, color: '#f3f4f6' }];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#008080]"></div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 pb-32 overflow-y-auto max-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 mt-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center overflow-hidden">
            <img src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} alt="Avatar" className="w-full h-full object-cover" />
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
        <p className="text-[#618389] mt-1">Você estudou {totalStudiedToday === "0.0" ? "0" : totalStudiedToday} horas hoje.</p>
      </section>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Study Distribution Chart (Today) */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#618389] mb-4">Estudo Diário (Hoje)</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative size-40 flex items-center justify-center mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{totalMinutesToday >= 60 ? Math.floor(totalMinutesToday / 60) + 'h' : Math.floor(totalMinutesToday) + 'm'}</span>
                <span className="text-[9px] text-[#618389] uppercase tracking-tighter">Estudados</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full">
              {chartData.filter((d: any) => d.name !== 'Nenhuma matéria estudada').map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: d.color }}></div>
                  <span className="text-[10px] font-semibold truncate flex-1">{d.name}</span>
                  <span className="text-[10px] text-[#618389] font-bold">{d.value >= 60 ? (d.value / 60).toFixed(1) + 'h' : Math.floor(d.value) + 'm'}</span>
                </div>
              ))}
              {Object.keys(aggregatedData).length === 0 && (
                <p className="col-span-2 text-center text-[10px] text-gray-400 italic">Inicie o timer para ver seu progresso hoje</p>
              )}
            </div>
          </div>
        </section>

        {/* Cycle of Studies Chart */}
        <section className="bg-[#111718] rounded-3xl p-6 shadow-xl shadow-black/5 flex flex-col h-full text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Ciclo de Estudos</h3>
            <span className="text-[9px] font-bold text-[#008080] bg-teal-50 px-2 py-0.5 rounded-full">{subjects.length} Matérias</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative size-40 flex items-center justify-center mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subjects.length > 0 ? subjects.map(s => ({ name: s.name, value: 1, color: s.color })) : [{ name: 'Vazio', value: 1, color: '#333' }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {(subjects.length > 0 ? subjects : [{ color: '#333' }]).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#008080'} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-teal-400 text-2xl">sync</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 w-full max-h-32 overflow-y-auto custom-scrollbar">
              {subjects.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/10 hover:bg-white/10 transition-colors cursor-default">
                  <div className="size-1.5 rounded-full" style={{ backgroundColor: s.color }}></div>
                  <span className="text-[9px] font-medium opacity-80">{s.name}</span>
                </div>
              ))}
              {subjects.length === 0 && (
                <p className="text-[10px] text-gray-500 italic">Cadastre matérias para montar seu ciclo</p>
              )}
            </div>
          </div>
        </section>
      </div>

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
                    <p className="text-[10px] text-[#618389]">
                      {session.topic_name && <span className="text-[#008080] font-bold">{session.topic_name} • </span>}
                      {session.duration} • {session.status}
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-300">chevron_right</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
