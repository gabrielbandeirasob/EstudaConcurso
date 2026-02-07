
import React, { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { Subject } from '../types';

const Subjects: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTime, setNewTime] = useState('');

  // Topics state
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  const [newTopicNames, setNewTopicNames] = useState<{ [key: string]: string }>({});
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      // Fetch subjects and their topics
      const [subjectsRes, topicsRes] = await Promise.all([
        supabase.from('subjects').select('*').order('created_at', { ascending: true }),
        supabase.from('topics').select('*').order('created_at', { ascending: true })
      ]);

      if (subjectsRes.error) throw subjectsRes.error;
      if (topicsRes.error) throw topicsRes.error;

      const fetchedSubjects = (subjectsRes.data || []).map(s => ({
        ...s,
        topics: (topicsRes.data || []).filter(t => t.subject_id === s.id)
      }));

      setSubjects(fetchedSubjects);
    } catch (error: any) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const addSubject = async () => {
    if (!newName || isActionLoading) return;

    setIsActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

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

      if (error) throw error;

      setNewName('');
      setNewTime('');
      setShowAddForm(false);
      await fetchSubjects();
    } catch (error: any) {
      alert('Erro ao adicionar matéria: ' + error.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const deleteSubject = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta matéria e todos os seus tópicos?')) return;

    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) {
      console.error('Error deleting subject:', error.message);
      alert('Erro ao excluir matéria: ' + error.message);
    } else {
      fetchSubjects();
    }
  };

  const toggleSubject = (id: string) => {
    setExpandedSubjects(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const addTopic = async (subjectId: string) => {
    const topicName = newTopicNames[subjectId];
    if (!topicName || isActionLoading) return;

    setIsActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('topics').insert([
        {
          name: topicName,
          subject_id: subjectId,
          user_id: user.id
        }
      ]);

      if (error) throw error;

      setNewTopicNames(prev => ({ ...prev, [subjectId]: '' }));
      await fetchSubjects();
    } catch (error: any) {
      alert('Erro ao adicionar tópico: ' + error.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const deleteTopic = async (id: string) => {
    const { error } = await supabase.from('topics').delete().eq('id', id);
    if (error) {
      console.error('Error deleting topic:', error.message);
      alert('Erro ao excluir tópico: ' + error.message);
    } else {
      fetchSubjects();
    }
  };

  return (
    <div className="min-h-screen pb-32">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-[#111718] mt-4">Matérias e Tópicos</h1>
        <p className="text-[#618389] text-sm mt-1">{subjects.length} matérias cadastradas</p>
      </header>

      <main className="px-6 space-y-4">
        {showAddForm && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 mb-4 animate-in slide-in-from-top duration-300">
            <h3 className="font-bold text-[#111718]">Nova Matéria</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nome da matéria (ex: Direito Administrativo)"
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#008080]/20 outline-none"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Tempo planejado (ex: 2h)"
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#008080]/20 outline-none"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={addSubject}
                disabled={isActionLoading}
                className="flex-1 bg-[#008080] text-white py-3 rounded-xl font-bold shadow-md shadow-[#008080]/10"
              >
                {isActionLoading ? 'Salvando...' : 'Salvar'}
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

        <section className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#008080]"></div>
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
              <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">library_books</span>
              <p className="text-gray-500 text-sm">Nenhuma matéria encontrada.<br />Clique no + para adicionar.</p>
            </div>
          ) : (
            subjects.map((subject) => (
              <div key={subject.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all">
                <div className="p-4 flex items-center gap-4">
                  <div
                    onClick={() => toggleSubject(subject.id)}
                    className="flex items-center justify-center rounded-xl bg-[#008080]/10 text-[#008080] shrink-0 size-12 cursor-pointer hover:scale-105 transition-transform"
                  >
                    <span className="material-symbols-outlined text-2xl">{subject.icon || 'book'}</span>
                  </div>
                  <div className="flex-1 cursor-pointer" onClick={() => toggleSubject(subject.id)}>
                    <p className="text-[#111718] text-base font-bold leading-tight">{subject.name}</p>
                    <p className="text-[#618389] text-[11px] font-medium uppercase tracking-wider mt-0.5">
                      {subject.topics?.length || 0} Tópicos • {subject.planned_time || '0h'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleSubject(subject.id)}
                      className={`size-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 transition-transform duration-300 ${expandedSubjects.includes(subject.id) ? 'rotate-180' : ''}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </button>
                    <button
                      onClick={() => deleteSubject(subject.id)}
                      className="size-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>

                {expandedSubjects.includes(subject.id) && (
                  <div className="border-t border-gray-50 bg-[#FBFBFA] p-4 animate-in slide-in-from-top duration-200">
                    <div className="space-y-3 mb-4">
                      <p className="text-[10px] font-bold text-[#618389] uppercase tracking-widest px-1">Tópicos da Matéria</p>
                      {subject.topics && subject.topics.length > 0 ? (
                        <div className="space-y-2">
                          {subject.topics.map(topic => (
                            <div key={topic.id} className="flex items-center justify-between bg-white px-3 py-2.5 rounded-xl border border-gray-100 shadow-sm group">
                              <span className="text-sm text-gray-700 font-medium">{topic.name}</span>
                              <button
                                onClick={() => deleteTopic(topic.id)}
                                className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <span className="material-symbols-outlined text-lg">close</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic px-1">Nenhum tópico adicionado ainda.</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Novo tópico..."
                        className="flex-1 text-sm p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#008080]/20 outline-none bg-white"
                        value={newTopicNames[subject.id] || ''}
                        onChange={(e) => setNewTopicNames({ ...newTopicNames, [subject.id]: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && addTopic(subject.id)}
                      />
                      <button
                        onClick={() => addTopic(subject.id)}
                        disabled={!newTopicNames[subject.id] || isActionLoading}
                        className="px-4 bg-[#008080] text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-xl">add</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </main>

      <div className="fixed bottom-24 right-6 flex flex-col items-center gap-1 z-10">
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center size-14 bg-[#008080] text-white rounded-full shadow-lg shadow-[#008080]/30 transition-transform active:scale-90"
        >
          <span className="material-symbols-outlined text-[28px]">add</span>
        </button>
        <span className="text-[10px] font-bold text-[#008080] uppercase tracking-wider">Materia</span>
      </div>
    </div>
  );
};

export default Subjects;
