
import React, { useState, useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import { Subject } from '../types';

interface TimerProps {
  onBack: () => void;
}

const Timer: React.FC<TimerProps> = ({ onBack }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [seconds, setSeconds] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [initialSeconds] = useState(25 * 60);

  useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase.from('subjects').select('*');
      if (data && data.length > 0) {
        setSubjects(data);
        setSelectedSubject(data[0]);
      }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else if (seconds === 0 && isActive) {
      setIsActive(false);
      handleSessionSave();
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const handleSessionSave = async () => {
    if (!selectedSubject) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const durationMinutes = Math.floor(initialSeconds / 60);

    await supabase.from('sessions').insert([{
      subject_name: selectedSubject.name,
      duration: `${durationMinutes}m`,
      status: 'Concluído',
      user_id: user.id,
      icon: selectedSubject.icon,
      color: 'bg-teal-50 text-teal-600'
    }]);

    alert('Sessão concluída e salva!');
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return {
      m: mins.toString().padStart(2, '0'),
      s: secs.toString().padStart(2, '0')
    };
  };

  const time = formatTime(seconds);
  const progress = (seconds / initialSeconds) * 289;

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center">
      <header className="w-full max-w-[480px] px-6 pt-12 pb-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
          <span className="material-symbols-outlined text-[28px]">chevron_left</span>
        </button>
        <div className="flex flex-col items-center text-center">
          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">Focado em</span>
          <select
            className="bg-transparent text-[#111718] text-lg font-bold border-none text-center focus:ring-0"
            value={selectedSubject?.id || ''}
            onChange={(e) => setSelectedSubject(subjects.find(s => s.id === e.target.value) || null)}
          >
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            {subjects.length === 0 && <option>Sem matérias</option>}
          </select>
        </div>
        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
          <span className="material-symbols-outlined text-[28px]">settings</span>
        </button>
      </header>

      <main className="flex-1 w-full max-w-[480px] flex flex-col items-center justify-center px-8">
        <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle className="text-gray-100" cx="50" cy="50" fill="transparent" r="46" stroke="currentColor" strokeWidth="2"></circle>
            <circle
              className="text-[#008080] transition-all duration-1000"
              cx="50" cy="50" fill="transparent" r="46" stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="289"
              strokeDashoffset={289 - progress}
              strokeLinecap="round"
            ></circle>
          </svg>
          <div className="flex flex-col items-center">
            <div className="flex items-baseline text-[#111718]">
              <span className="text-7xl font-bold tracking-tighter">{time.m}</span>
              <span className="text-4xl font-light opacity-30 mx-1">:</span>
              <span className="text-7xl font-bold tracking-tighter">{time.s}</span>
            </div>
            <p className="text-[#618389] text-xs font-bold tracking-widest mt-2 uppercase">Trabalho Profundo</p>
          </div>
        </div>
        <div className="mt-12 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#008080] material-symbols-fill">eco</span>
          <span className="text-gray-500 text-sm font-medium">Sessão de Foco</span>
        </div>
      </main>

      <footer className="w-full max-w-[480px] p-8 pb-32">
        <div className="flex gap-4 w-full">
          <button
            onClick={() => setIsActive(!isActive)}
            className="flex-1 h-14 bg-[#008080] text-white rounded-xl font-bold text-lg shadow-lg shadow-[#008080]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[24px] material-symbols-fill">
              {isActive ? 'pause' : 'play_arrow'}
            </span>
            {isActive ? 'Pausar' : 'Iniciar'}
          </button>
          <button
            onClick={() => { setIsActive(false); setSeconds(initialSeconds); }}
            className="flex-1 h-14 bg-[#F5F2ED] text-[#111718] rounded-xl font-bold text-lg border border-gray-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[24px]">stop</span>
            Parar
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Timer;
