import React, { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { Subject } from '../types';

const Subjects: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Topic management states
  const [newTopicNames, setNewTopicNames] = useState<{ [key: string]: string }>({});
  const [showTopicInput, setShowTopicInput] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Fetch subjects ordered by order_index, then name
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('order_index', { ascending: true })
        .order('name', { ascending: true });

      if (subjectsError) throw subjectsError;

      // Fetch all topics for these subjects
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .order('created_at', { ascending: true });

      if (topicsError) throw topicsError;

      if (subjectsData) {
        const subjectsWithTopics = subjectsData.map(s => ({
          ...s,
          topics: topicsData ? topicsData.filter(t => t.subject_id === s.id) : []
        }));
        setSubjects(subjectsWithTopics);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateColor = () => {
    // Generate distinct, vibrant colors
    const hues = [160, 200, 240, 280, 320, 30, 60, 90, 120];
    const randomHue = hues[Math.floor(Math.random() * hues.length)];
    return `hsl(${randomHue}, 70%, 45%)`;
  };

  const addSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !user) return;

    // Calculate next order index
    const maxIndex = subjects.reduce((max, s) => Math.max(max, s.order_index || 0), 0);

    const { data, error } = await supabase.from('subjects').insert([
      {
        name: newSubject,
        user_id: user.id,
        icon: 'book',
        color: generateColor(), // Use generated color
        percentage: 0,
        order_index: maxIndex + 1
      },
    ]).select();

    if (error) {
      alert('Erro ao adicionar matéria');
      console.error(error);
    } else {
      setSubjects([...subjects, { ...data[0], topics: [] }]);
      setNewSubject('');
    }
  };

  const deleteSubject = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta matéria?')) return;

    const { error } = await supabase.from('subjects').delete().eq('id', id);

    if (error) {
      alert('Erro ao excluir matéria');
    } else {
      setSubjects(subjects.filter((s) => s.id !== id));
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === subjects.length - 1) return;

    const newSubjects = [...subjects];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Swap items
    [newSubjects[index], newSubjects[targetIndex]] = [newSubjects[targetIndex], newSubjects[index]];

    // Update local state temporarily to show immediate feedback
    setSubjects(newSubjects);

    // Update order_index for swapped items in backend
    try {
      const itemA = newSubjects[index];
      const itemB = newSubjects[targetIndex];

      await supabase.from('subjects').upsert([
        { id: itemA.id, order_index: index, user_id: user.id },
        { id: itemB.id, order_index: targetIndex, user_id: user.id }
      ]);

      itemA.order_index = index;
      itemB.order_index = targetIndex;
      // setSubjects([...newSubjects]); // already set

    } catch (err) {
      console.error("Failed to reorder", err);
      fetchSubjects(); // Revert on error
    }
  };

  const addTopic = async (subjectId: string) => {
    const topicName = newTopicNames[subjectId];
    if (!topicName?.trim()) return;

    try {
      const { data, error } = await supabase.from('topics').insert([{
        subject_id: subjectId,
        name: topicName.trim(),
        user_id: user.id
      }]).select();

      if (error) throw error;

      // Update local state
      const newTopic = data[0];
      setSubjects(subjects.map(s => {
        if (s.id === subjectId) {
          return {
            ...s,
            topics: [...(s.topics || []), newTopic]
          };
        }
        return s;
      }));

      // Clear input
      setNewTopicNames({ ...newTopicNames, [subjectId]: '' });
      setShowTopicInput({ ...showTopicInput, [subjectId]: false });

    } catch (error) {
      console.error('Error adding topic:', error);
      alert('Erro ao adicionar tópico');
    }
  };

  const deleteTopic = async (topicId: string, subjectId: string) => {
    if (!confirm('Excluir tópico?')) return;
    try {
      const { error } = await supabase.from('topics').delete().eq('id', topicId);
      if (error) throw error;

      setSubjects(subjects.map(s => {
        if (s.id === subjectId) {
          return {
            ...s,
            topics: s.topics?.filter(t => t.id !== topicId)
          };
        }
        return s;
      }));
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir tópico');
    }
  };

  return (
    <div className="px-6 py-4 pb-32">
      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#111718]">Matérias</h1>
        <p className="text-[#618389] mt-1">Gerencie seu ciclo de estudos.</p>
      </header>

      <form onSubmit={addSubject} className="mb-8 sticky top-0 bg-[#FDFBF7] z-10 py-2">
        <div className="flex gap-2 p-2 bg-white rounded-2xl shadow-sm border border-gray-100 placeholder:text-gray-400">
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Nova matéria..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-[#111718] font-medium"
          />
          <button
            type="submit"
            disabled={!newSubject.trim()}
            className="size-10 bg-[#111718] text-white rounded-xl flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#008080]"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map((subject, index) => (
            <div key={subject.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1 mr-2 opacity-50">
                    <button
                      onClick={() => handleReorder(index, 'up')}
                      disabled={index === 0}
                      className="hover:text-[#008080] disabled:opacity-20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">arrow_drop_up</span>
                    </button>
                    <button
                      onClick={() => handleReorder(index, 'down')}
                      disabled={index === subjects.length - 1}
                      className="hover:text-[#008080] disabled:opacity-20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">arrow_drop_down</span>
                    </button>
                  </div>
                  <div className={`size-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm`} style={{ backgroundColor: subject.color }}>
                    {subject.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#111718] leading-tight">{subject.name}</h3>
                    <p className="text-[10px] text-[#618389] font-medium uppercase tracking-wider">{subject.topics?.length || 0} Tópicos</p>
                  </div>
                </div>

                <button
                  onClick={() => deleteSubject(subject.id)}
                  className="size-8 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>

              {/* Topics Section */}
              <div className="mt-4 pl-[3.25rem] space-y-2">
                {/* Existing Topics */}
                {(subject.topics || []).map(topic => (
                  <div key={topic.id} className="flex items-center justify-between group/topic py-1">
                    <div className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-gray-200"></div>
                      <span className="text-sm text-gray-600">{topic.name}</span>
                    </div>
                    <button
                      onClick={() => deleteTopic(topic.id, subject.id)}
                      className="text-gray-300 hover:text-red-400 opacity-0 group-hover/topic:opacity-100 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}

                {/* Add Topic Input */}
                {showTopicInput[subject.id] ? (
                  <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-1">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Nome do tópico..."
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#008080] outline-none"
                      value={newTopicNames[subject.id] || ''}
                      onChange={(e) => setNewTopicNames({ ...newTopicNames, [subject.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addTopic(subject.id);
                        if (e.key === 'Escape') setShowTopicInput({ ...showTopicInput, [subject.id]: false });
                      }}
                    />
                    <button
                      onClick={() => addTopic(subject.id)}
                      className="text-[#008080] hover:bg-teal-50 p-1 rounded"
                    >
                      <span className="material-symbols-outlined text-lg">check</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowTopicInput({ ...showTopicInput, [subject.id]: true })}
                    className="flex items-center gap-2 text-[11px] font-bold text-[#008080] hover:underline mt-2"
                  >
                    <span className="material-symbols-outlined text-sm">add</span> Adicionar tópico
                  </button>
                )}
              </div>
            </div>
          ))}

          {subjects.length === 0 && (
            <div className="text-center py-12 px-4 rounded-3xl border-2 border-dashed border-gray-100">
              <span className="material-symbols-outlined text-4xl text-gray-200 mb-2">auto_stories</span>
              <p className="text-gray-400 text-sm">Adicione sua primeira matéria para começar.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Subjects;
