
import React, { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { Subject } from '../types';

const Subjects: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching subjects:', error.message);
    } else {
      setSubjects(data || []);
    }
    setLoading(false);
  };

  const addSubject = async () => {
    if (!newName) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('subjects').insert([
      {
        name: newName,
        planned_time: newTime,
        user_id: user.id,
        icon: 'book',
        color: '#008080',
        percentage: 0
      },
    ]);

    if (error) {
      console.error('Error adding subject:', error.message);
    } else {
      setNewName('');
      setNewTime('');
      setShowAddForm(false);
      fetchSubjects();
    }
  };

  const deleteSubject = async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) {
      console.error('Error deleting subject:', error.message);
    } else {
      fetchSubjects();
    }
  };

  return (
    <div className="min-h-screen">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-[#111718] mt-4">Gerenciar Matérias</h1>
        <p className="text-[#618389] text-sm mt-1">{subjects.length} matérias cadastradas</p>
      </header>

      <main className="px-6 space-y-6">
        {showAddForm && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-[#111718]">Nova Matéria</h3>
            <input
              type="text"
              placeholder="Nome da matéria (ex: Direito)"
              className="w-full p-3 rounded-xl border border-gray-200"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Tempo planejado (ex: 1h 30m)"
              className="w-full p-3 rounded-xl border border-gray-200"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={addSubject}
                className="flex-1 bg-[#008080] text-white py-3 rounded-xl font-bold"
              >
                Salvar
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <section>
          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-[#618389]">Carregando...</p>
            ) : subjects.length === 0 ? (
              <p className="text-center text-[#618389]">Nenhuma matéria encontrada.</p>
            ) : (
              subjects.map((subject) => (
                <div key={subject.id} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-center rounded-lg bg-[#008080]/10 text-[#008080] shrink-0 size-12">
                    <span className="material-symbols-outlined text-2xl">{subject.icon || 'book'}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[#111718] text-base font-semibold leading-tight">{subject.name}</p>
                    <p className="text-[#618389] text-xs font-normal">Tempo Planejado: {subject.planned_time}</p>
                  </div>
                  <button onClick={() => deleteSubject(subject.id)} className="text-gray-300 hover:text-red-400">
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <div className="fixed bottom-24 right-6 flex flex-col items-center gap-1">
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center size-16 bg-[#008080] text-white rounded-full shadow-lg shadow-[#008080]/30 transition-transform active:scale-90"
        >
          <span className="material-symbols-outlined text-[32px]">add</span>
        </button>
        <span className="text-[10px] font-bold text-[#008080] uppercase tracking-wider">Adicionar</span>
      </div>
    </div>
  );
};

export default Subjects;
