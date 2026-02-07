
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
          <div className="size-10 rounded-full bg-teal-50 dark:bg-teal-900/30 border border-teal-100 dark:border-teal-800 flex items-center justify-center overflow-hidden">
            <img src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-[11px] text-[#618389] dark:text-gray-400 font-medium">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
            </p>
            <h2 className="text-base font-bold leading-tight tracking-tight dark:text-gray-100">Olá, {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}</h2>
          </div>
        </div>
        <button className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-[#1a2428] shadow-sm border border-gray-100 dark:border-gray-800">
          <span className="material-symbols-outlined text-xl text-gray-500 dark:text-gray-400">notifications</span>
        </button>
      </header>

      {/* Main Stats */}
      <section className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight dark:text-white">Seu Progresso</h1>
        <p className="text-[#618389] dark:text-gray-400 mt-1">Você estudou {totalStudiedToday === "0.0" ? "0" : totalStudiedToday} horas hoje.</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Study Distribution Chart (Today) */}
        <section className="flex flex-col h-full">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#618389] dark:text-gray-400 mb-3">Estudo Diário (Hoje)</h3>
          <div className="bg-white dark:bg-[#1a2428] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center flex-1 justify-center transition-colors">
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
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-bold dark:text-white">{totalMinutesToday >= 60 ? Math.floor(totalMinutesToday / 60) + 'h' : Math.floor(totalMinutesToday) + 'm'}</span>
                <span className="text-[10px] text-[#618389] dark:text-gray-400 uppercase tracking-tighter">Estudados</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 w-full">
              {chartData.filter((d: any) => d.name !== 'Nenhuma matéria estudada').map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: d.color }}></div>
                  <span className="text-[11px] font-semibold truncate flex-1 dark:text-gray-200">{d.name}</span>
                  <span className="text-[10px] text-[#618389] dark:text-gray-400 font-bold">{d.value >= 60 ? (d.value / 60).toFixed(1) + 'h' : Math.floor(d.value) + 'm'}</span>
                </div>
              ))}
              {Object.keys(aggregatedData).length === 0 && (
                <p className="col-span-2 text-center text-[11px] text-gray-400 italic">Inicie o timer para ver seu progresso hoje</p>
              )}
            </div>
          </div>
        </section>

        {/* Cycle of Studies Chart */}
        <section className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#618389] dark:text-gray-400">Ciclo de Estudos</h3>
            <span className="text-[10px] font-bold text-[#008080] bg-teal-50 dark:bg-teal-900/40 px-2 py-0.5 rounded-full">{subjects.length} Matérias</span>
          </div>
          <div className="bg-white dark:bg-[#1a2428] rounded-[40px] p-6 pt-10 shadow-xl shadow-gray-200/50 dark:shadow-none flex flex-col items-center border border-gray-100 dark:border-gray-800 overflow-hidden flex-1 justify-between relative transition-colors">
            <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subjects.length > 0 ? subjects.map((s, i) => ({
                      name: s.name,
                      value: 1,
                      color: s.color || ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'][i % 8],
                      time: s.planned_time || '2,0h'
                    })) : [{ name: 'Vazio', value: 1, color: '#f3f4f6' }]}
                    cx="50%"
                    cy="50%"
                    innerRadius="50%"
                    outerRadius="100%"
                    paddingAngle={2}
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={2}
                    labelLine={false}
                    label={(props) => {
                      const { cx, cy, midAngle, innerRadius, outerRadius, index, name, time } = props;
                      const RADIAN = Math.PI / 180;
                      // Move label slightly more inwards
                      const radius = (innerRadius as number) + ((outerRadius as number) - (innerRadius as number)) * 0.50;
                      const x = (cx as number) + radius * Math.cos(-midAngle * RADIAN);
                      const y = (cy as number) + radius * Math.sin(-midAngle * RADIAN);

                      return (
                        <g>
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="text-[10px] font-bold pointer-events-none"
                            style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.3)' }}
                          >
                            <tspan x={x} dy="-0.6em">{name.length > 10 ? name.substring(0, 8) + '..' : name}</tspan>
                            <tspan x={x} dy="1.2em" fontSize="8px" opacity="0.9">{time}</tspan>
                          </text>
                        </g>
                      );
                    }}
                  >
                    {(subjects.length > 0 ? subjects : [{ color: '#f3f4f6' }]).map((entry: any, index: number) => {
                      const fallbackColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'];
                      const color = entry.color || fallbackColors[index % fallbackColors.length];
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Central Arrow - Fixed & Simplified */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white dark:bg-[#0f171a] rounded-full p-2 shadow-sm animate-[spin_6s_linear_infinite]">
                  <span className="material-symbols-outlined text-4xl text-orange-400">sync</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2 w-full">
              {subjects.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#0f171a]/50 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
                  <div className="size-2 rounded-full" style={{ backgroundColor: s.color || '#ddd' }}></div>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 truncate max-w-[80px]">{s.name}</span>
                </div>
              ))}
              {subjects.length === 0 && (
                <p className="text-[11px] text-gray-400 italic">Configure as matérias</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Recent Sessions */}
      <section className="mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#618389] dark:text-gray-400 mb-3">Sessões Recentes</h3>
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Nenhuma sessão recente.</p>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between bg-white dark:bg-[#1a2428] p-4 rounded-2xl border border-gray-50 dark:border-gray-800 shadow-sm transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-[#008080] dark:text-teal-400 flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-xl">{session.icon || 'history'}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold dark:text-gray-100">{session.subject_name}</p>
                    <p className="text-[10px] text-[#618389] dark:text-gray-400">
                      {session.topic_name && <span className="text-[#008080] dark:text-teal-500 font-bold">{session.topic_name} • </span>}
                      {session.duration} • {session.status}
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-300 dark:text-gray-600">chevron_right</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
