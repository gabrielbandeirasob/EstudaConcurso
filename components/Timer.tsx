
import React, { useState, useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import { Subject, Topic } from '../types';

interface TimerProps {
  onBack: () => void;
}

const Timer: React.FC<TimerProps> = ({ onBack }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [seconds, setSeconds] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [initialSeconds, setInitialSeconds] = useState(25 * 60);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subjectsRes, topicsRes] = await Promise.all([
        supabase.from('subjects').select('*').order('name', { ascending: true }),
        supabase.from('topics').select('*').order('name', { ascending: true })
      ]);

      if (subjectsRes.data) {
        const fetchedSubjects = (subjectsRes.data || []).map(s => ({
          ...s,
          topics: (topicsRes.data || []).filter(t => t.subject_id === s.id)
        }));
        setSubjects(fetchedSubjects);
        if (fetchedSubjects.length > 0) {
          setSelectedSubject(fetchedSubjects[0]);
          if (fetchedSubjects[0].topics && fetchedSubjects[0].topics.length > 0) {
            setSelectedTopic(fetchedSubjects[0].topics[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading timer data:', error);
    }
  };

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
    if (!selectedSubject || isActionLoading) return;

    setIsActionLoading(true);
    const durationSeconds = initialSeconds - seconds;
    const durationMinutes = Math.floor(durationSeconds / 60);
    const durationDisplay = durationMinutes > 0 ? `${durationMinutes}m` : `${durationSeconds}s`;

    console.log('Attempting to save session:', {
      subject: selectedSubject.name,
      topic: selectedTopic?.name,
      duration: durationDisplay
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('sessions').insert([{
        subject_name: selectedSubject.name,
        topic_name: selectedTopic?.name || null,
        duration: durationDisplay,
        status: 'Concluído',
        user_id: user.id,
        icon: selectedSubject.icon || 'book',
        color: 'bg-teal-50 text-teal-600'
      }]);

      if (error) throw error;
      alert('Sessão concluída e salva!');
      fetchData(); // Refresh topics if needed
    } catch (error: any) {
      console.error('Error saving session:', error);
      alert('Erro ao salvar sessão: ' + error.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubjectChange = (value: string) => {
    // Try to find by ID first, then by Name (fallback for easier automation)
    const subject = subjects.find(s => s.id === value || s.name === value) || null;
    setSelectedSubject(subject);
    if (subject && subject.topics && subject.topics.length > 0) {
      setSelectedTopic(subject.topics[0]);
    } else {
      setSelectedTopic(null);
    }
  };

  const handleTopicChange = (value: string) => {
    const topic = selectedSubject?.topics?.find(t => t.id === value || t.name === value) || null;
    setSelectedTopic(topic);
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
        <div className="flex flex-col items-center text-center flex-1 mx-4 max-w-[240px]">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#008080] font-bold mb-1">Foco Ativo</span>

          <div className="w-full space-y-1">
            <select
              className="w-full bg-white/50 border border-teal-50 rounded-lg text-[#111718] text-sm font-bold text-center focus:ring-2 focus:ring-[#008080]/20 outline-none py-1 appearance-none"
              value={selectedSubject?.id || ''}
              onChange={(e) => handleSubjectChange(e.target.value)}
              disabled={isActive}
            >
              <option value="" disabled>Selecione uma matéria</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id} data-name={s.name}>{s.name}</option>
              ))}
              {subjects.length === 0 && <option value="">Sem matérias</option>}
            </select>

            <select
              className="w-full bg-transparent text-[#618389] text-[11px] font-medium text-center focus:ring-0 outline-none border-none py-0 appearance-none italic"
              value={selectedTopic?.id || ''}
              onChange={(e) => handleTopicChange(e.target.value)}
              disabled={isActive || !selectedSubject?.topics?.length}
            >
              <option value="">{selectedSubject?.topics?.length ? 'Escolha um tópico...' : 'Sem tópicos'}</option>
              {selectedSubject?.topics?.map(t => (
                <option key={t.id} value={t.id} data-name={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
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

        {selectedTopic && (
          <div className="mt-12 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom duration-500">
            <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-full border border-teal-100/50">
              <span className="material-symbols-outlined text-[#008080] text-sm material-symbols-fill">target</span>
              <span className="text-[#008080] text-xs font-bold uppercase tracking-wider">{selectedTopic.name}</span>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full max-w-[480px] p-8 pb-32">
        <div className="flex gap-4 w-full">
          <button
            onClick={() => setIsActive(!isActive)}
            className="flex-1 h-16 bg-[#111718] text-white rounded-2xl font-bold text-lg shadow-xl shadow-black/10 active:scale-95 transition-all flex items-center justify-center gap-3 group"
          >
            <div className="size-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <span className="material-symbols-outlined text-[20px] material-symbols-fill">
                {isActive ? 'pause' : 'play_arrow'}
              </span>
            </div>
            {isActive ? 'Pausar' : 'Iniciar'}
          </button>
          <button
            onClick={() => {
              if (isActive || seconds < initialSeconds) {
                if (confirm('Deseja parar e salvar o progresso atual?')) {
                  handleSessionSave();
                }
              }
              setIsActive(false);
              setSeconds(initialSeconds);
            }}
            className="size-16 bg-white text-[#111718] rounded-2xl font-bold border border-gray-100 shadow-sm active:scale-95 transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[24px]">stop</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Timer;
