
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
      setShowCompletionModal(true); // Open modal instead of auto-saving
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

      const { error } = await supabase.from('sessions').insert([{
        subject_name: selectedSubject.name,
        topic_name: selectedTopic?.name || null,
        duration: durationDisplay,
        status: 'Concluído',
        user_id: user.id,
        icon: selectedSubject.icon || 'book',
        color: 'bg-teal-50 text-teal-600',
        notes: sessionNotes // Save the notes
      }]);

      if (error) throw error;
      alert('Sessão salva com sucesso!');
      setShowCompletionModal(false);
      setSessionNotes('');
      setSeconds(initialSeconds); // Reset timer
      fetchData();
    } catch (error: any) {
      console.error('Error saving session:', error);
      alert('Erro ao salvar sessão: ' + error.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubjectChange = (value: string) => {
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
              {isActive ? (
                <>
                  <span className="text-7xl font-bold tracking-tighter">{time.m}</span>
                  <span className="text-4xl font-light opacity-30 mx-1">:</span>
                  <span className="text-7xl font-bold tracking-tighter">{time.s}</span>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => setInitialSeconds(prev => Math.max(60, prev - 300))}
                      className="size-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined">remove</span>
                    </button>
                    <div className="flex items-baseline">
                      <span className="text-7xl font-bold tracking-tighter">{Math.floor(initialSeconds / 60)}</span>
                      <span className="text-2xl font-bold opacity-30 ml-1">m</span>
                    </div>
                    <button
                      onClick={() => setInitialSeconds(prev => prev + 300)}
                      className="size-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <p className="text-[#618389] text-xs font-bold tracking-widest mt-2 uppercase">Trabalho Profundo</p>
          </div>
        </div>

        {!isActive && (
          <p className="mt-4 text-[10px] text-[#618389] uppercase tracking-widest font-bold">Ajuste o tempo acima</p>
        )}

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
              // Finish Early logic
              if (isActive || seconds < initialSeconds) {
                setShowCompletionModal(true);
                setIsActive(false);
              } else {
                // Reset if not started
                setSeconds(initialSeconds);
              }
            }}
            className="size-16 bg-white text-[#111718] rounded-2xl font-bold border border-gray-100 shadow-sm active:scale-95 transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[24px]">stop</span>
          </button>
        </div>
      </footer>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-[#111718] mb-2">Sessão Finalizada</h3>
            <p className="text-sm text-gray-500 mb-4">
              Tempo estudado: <span className="text-[#008080] font-bold">
                {Math.floor((initialSeconds - seconds) / 60)}m {(initialSeconds - seconds) % 60}s
              </span>
            </p>

            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Anotações (Opcional)</label>
            <textarea
              className="w-full h-32 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#008080]/20 outline-none resize-none mb-6"
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
                className="flex-1 py-3 text-gray-500 font-bold text-sm bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
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
