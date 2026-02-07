
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
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');

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

  // Only update seconds when initialSeconds changes AND timer is NOT active/paused in middle
  // We only want to update seconds if we are in the "setup" phase (seconds === initialSeconds of previous state, roughly)
  // or more simply: if the user is adjusting the time, update the display.
  // But if the user paused (seconds < initialSeconds), do NOT reset 'seconds' just because 'initialSeconds' might have been touched (though UI hides buttons when active).
  useEffect(() => {
    if (!isActive && seconds === initialSeconds) {
      // This check is a bit weak if they paused exactly at initialSeconds, but practical.
      // Actually, the +/- buttons update initialSeconds. We should sync seconds to it ONLY if not "in progress".
      // Since buttons are hidden when isActive, we just need to ensure we don't reset if paused.
      // We can check if seconds matches the OLD initialSeconds, but we don't have it.
      // Simpler: The UI hides +/- when isActive. When !isActive, if we have NOT started (seconds === initialSeconds? No, that's circular).
      // Let's assume if the user hits +/- they WANT to change the current time.
      // If they paused, the Buttons are hidden? No, buttons are in the "else" block of isActive.
      // So if paused (!isActive), buttons SHOW. If they click them, they change initialSeconds.
      // If they change initialSeconds while paused, we PROBABLY want to reset the timer to that new time?
      // Or do we want to adjust the REMAINING time?
      // Standard behavior: Changing duration resets the timer.
      setSeconds(initialSeconds);
    }
  }, [initialSeconds]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else if (seconds === 0 && isActive) {
      setIsActive(false);
      setShowCompletionModal(true);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const handleSessionSave = async () => {
    if (!selectedSubject || isActionLoading) return;

    setIsActionLoading(true);
    const durationSeconds = initialSeconds - seconds;
    const durationMinutes = Math.floor(durationSeconds / 60);
    const durationDisplay = durationMinutes > 0 ? `${durationMinutes}m` : `${durationSeconds}s`;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Save the session
      const { error: sessionError } = await supabase.from('sessions').insert([{
        subject_name: selectedSubject.name,
        topic_name: selectedTopic?.name || null,
        duration: durationDisplay,
        status: 'Concluído',
        user_id: user.id,
        icon: selectedSubject.icon || 'book',
        color: selectedSubject.color || 'bg-teal-50 text-teal-600',
        notes: sessionNotes
      }]);

      if (sessionError) throw sessionError;

      // 2. If there are notes, also save to 'notes' table for the Notes tab
      if (sessionNotes.trim()) {
        const { error: noteError } = await supabase.from('notes').insert([
          {
            title: `Sessão: ${selectedSubject.name} (${new Date().toLocaleDateString('pt-BR')})`,
            category: selectedSubject.name,
            subject_id: selectedSubject.id,
            preview: sessionNotes,
            user_id: user.id,
            tags: [selectedSubject.name.toUpperCase(), 'SESSÃO']
          },
        ]);
        if (noteError) console.error('Error saving linked note:', noteError);
      }

      setShowCompletionModal(false);
      setSessionNotes('');
      setSeconds(initialSeconds);
      setIsActive(false);
      alert('Sessão e anotações salvas com sucesso!');
    } catch (error: any) {
      console.error('Error saving session:', error);
      alert('Erro ao salvar sessão: ' + error.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubjectChange = (value: string) => {
    const subject = subjects.find(s => s.id === value) || null;
    setSelectedSubject(subject);
    if (subject && subject.topics && subject.topics.length > 0) {
      setSelectedTopic(subject.topics[0]);
    } else {
      setSelectedTopic(null);
    }
  };

  const handleTopicChange = (value: string) => {
    const topic = selectedSubject?.topics?.find(t => t.id === value) || null;
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

  // New function to adjust time
  const adjustSeconds = (amount: number) => {
    const newValue = Math.max(60, initialSeconds + amount);
    setInitialSeconds(newValue);
    if (!isActive && seconds === initialSeconds) {
      setSeconds(newValue);
    } else if (!isActive) {
      // If paused, we might want it to reset or just adjust?
      // Let's reset for simplicity when adjusting time.
      setSeconds(newValue);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#0f171a] flex flex-col items-center transition-colors">
      <header className="w-full max-w-[480px] px-6 pt-12 pb-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <span className="material-symbols-outlined text-[28px]">chevron_left</span>
        </button>
        <div className="flex flex-col items-center text-center flex-1 mx-4 max-w-[240px]">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#008080] font-bold mb-1">
            {isActive ? 'Foco Ativo' : seconds < initialSeconds ? 'Pausado' : 'Configuração'}
          </span>

          <div className="w-full space-y-1">
            <select
              className="w-full bg-white/50 dark:bg-[#1a2428]/50 border border-teal-50 dark:border-teal-900/30 rounded-lg text-[#111718] dark:text-gray-100 text-sm font-bold text-center focus:ring-2 focus:ring-[#008080]/20 dark:focus:ring-teal-500/20 outline-none py-1 appearance-none transition-colors"
              value={selectedSubject?.id || ''}
              onChange={(e) => handleSubjectChange(e.target.value)}
              disabled={isActive || seconds < initialSeconds}
            >
              <option value="" disabled className="dark:bg-[#1a2428]">Selecione uma matéria</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id} className="dark:bg-[#1a2428]">{s.name}</option>
              ))}
            </select>

            <select
              className="w-full bg-transparent text-[#618389] dark:text-gray-400 text-[11px] font-medium text-center focus:ring-0 outline-none border-none py-0 appearance-none italic"
              value={selectedTopic?.id || ''}
              onChange={(e) => handleTopicChange(e.target.value)}
              disabled={isActive || seconds < initialSeconds || !selectedSubject?.topics?.length}
            >
              <option value="" className="dark:bg-[#0f171a]">{selectedSubject?.topics?.length ? 'Escolha um tópico...' : 'Sem tópicos'}</option>
              {selectedSubject?.topics?.map(t => (
                <option key={t.id} value={t.id} className="dark:bg-[#0f171a]">{t.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full opacity-0">
          <span className="material-symbols-outlined text-[28px]">settings</span>
        </button>
      </header>

      <main className="flex-1 w-full max-w-[480px] flex flex-col items-center justify-center px-8">
        <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
            <circle className="text-gray-100 dark:text-gray-800" cx="50" cy="50" fill="transparent" r="46" stroke="currentColor" strokeWidth="2"></circle>
            <circle
              className="text-[#008080] dark:text-teal-400 transition-all duration-1000"
              cx="50" cy="50" fill="transparent" r="46" stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="289"
              strokeDashoffset={289 - progress}
              strokeLinecap="round"
            ></circle>
          </svg>
          <div className="flex flex-col items-center z-10 transition-all">
            <div className="flex items-baseline text-[#111718] dark:text-gray-100">
              {isActive || (seconds < initialSeconds && seconds > 0) ? (
                <div className="flex flex-col items-center">
                  <div className="flex items-baseline">
                    <span className="text-7xl font-bold tracking-tighter">{time.m}</span>
                    <span className="text-4xl font-light opacity-30 mx-1">:</span>
                    <span className="text-7xl font-bold tracking-tighter">{time.s}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-8">
                  <button
                    onClick={(e) => { e.preventDefault(); adjustSeconds(-300); }}
                    className="size-12 rounded-full bg-teal-50 dark:bg-teal-900/30 text-[#008080] dark:text-teal-400 flex items-center justify-center hover:bg-teal-100 dark:hover:bg-teal-900/50 active:scale-95 transition-all shadow-sm cursor-pointer border-none"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <span className="material-symbols-outlined text-2xl">remove</span>
                  </button>
                  <div className="flex items-baseline">
                    <input
                      type="number"
                      value={Math.floor(initialSeconds / 60)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        const newSecs = Math.max(1, val) * 60;
                        setInitialSeconds(newSecs);
                        setSeconds(newSecs);
                      }}
                      className="w-24 bg-transparent border-none text-7xl font-bold tracking-tighter text-center focus:ring-0 outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none dark:text-white"
                    />
                    <span className="text-2xl font-bold opacity-30 dark:opacity-20 ml-1 select-none">m</span>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); adjustSeconds(300); }}
                    className="size-12 rounded-full bg-teal-50 dark:bg-teal-900/30 text-[#008080] dark:text-teal-400 flex items-center justify-center hover:bg-teal-100 dark:hover:bg-teal-900/50 active:scale-95 transition-all shadow-sm cursor-pointer border-none"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <span className="material-symbols-outlined text-2xl">add</span>
                  </button>
                </div>
              )}
            </div>
            <p className="text-[#618389] dark:text-gray-500 text-[10px] font-bold tracking-[0.2em] mt-2 uppercase select-none">Trabalho Profundo</p>
          </div>
        </div>

        {(!isActive && seconds === initialSeconds) && (
          <p className="mt-8 text-[10px] text-[#618389] uppercase tracking-widest font-bold animate-pulse">Ajuste o tempo acima</p>
        )}

        {selectedTopic && (
          <div className="mt-12 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a2428] rounded-full border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
              <span className="material-symbols-outlined text-[#008080] dark:text-teal-400 text-sm material-symbols-fill">target</span>
              <span className="text-[#111718] dark:text-gray-100 text-xs font-bold uppercase tracking-wider">{selectedTopic.name}</span>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full max-w-[480px] p-8 pb-32">
        <div className="flex gap-4 w-full">
          <button
            onClick={() => setIsActive(!isActive)}
            className={`flex-1 h-16 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 group ${isActive ? 'bg-white dark:bg-transparent text-[#111718] dark:text-white border border-gray-100 dark:border-gray-800' : 'bg-[#111718] dark:bg-white text-white dark:text-[#111718] shadow-black/10'}`}
          >
            <div className={`size-8 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-gray-100 dark:bg-white/10' : 'bg-white/10 dark:bg-gray-100 group-hover:bg-white/20 dark:group-hover:bg-gray-200'}`}>
              <span className="material-symbols-outlined text-[20px] material-symbols-fill">
                {isActive ? 'pause' : 'play_arrow'}
              </span>
            </div>
            {isActive ? 'Pausar' : seconds < initialSeconds ? 'Continuar' : 'Iniciar'}
          </button>
          <button
            onClick={() => {
              if (seconds < initialSeconds) {
                setShowCompletionModal(true);
                setIsActive(false);
              } else {
                setSeconds(initialSeconds);
              }
            }}
            className="size-16 bg-white dark:bg-[#1a2428] text-[#111718] dark:text-white rounded-2xl font-bold border border-gray-100 dark:border-gray-800 shadow-sm active:scale-95 transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[24px]">stop</span>
          </button>
        </div>
      </footer>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1a2428] rounded-3xl w-full max-w-sm p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 transition-colors">
            <h3 className="text-xl font-bold text-[#111718] dark:text-white mb-2">Sessão Finalizada</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Tempo estudado: <span className="text-[#008080] dark:text-teal-400 font-bold">
                {Math.floor((initialSeconds - seconds) / 60)}m {(initialSeconds - seconds) % 60}s
              </span>
            </p>

            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Anotações (Opcional)</label>
            <textarea
              className="w-full h-32 bg-gray-50 dark:bg-[#111718] border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-sm text-[#111718] dark:text-gray-100 focus:ring-2 focus:ring-[#008080]/20 dark:focus:ring-teal-500/20 outline-none resize-none mb-6 placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
              placeholder="O que você aprendeu hoje?"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  setSessionNotes('');
                  setSeconds(initialSeconds); // Reset without saving
                }}
                className="flex-1 py-3 text-gray-500 dark:text-gray-400 font-bold text-sm bg-gray-100 dark:bg-[#111718] rounded-xl hover:bg-gray-200 dark:hover:bg-black transition-colors"
                disabled={isActionLoading}
              >
                Descartar
              </button>
              <button
                onClick={handleSessionSave}
                className="flex-1 py-3 bg-[#008080] text-white font-bold text-sm rounded-xl hover:bg-[#006666] transition-colors flex items-center justify-center gap-2"
                disabled={isActionLoading}
              >
                {isActionLoading ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timer;
