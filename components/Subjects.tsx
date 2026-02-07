import React, { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { Subject } from '../types';

const PREDEFINED_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
  '#D4A5A5', '#9B59B6', '#3498DB', '#1ABC9C', '#F39C12'
];

const Subjects: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [selectedColor, setSelectedColor] = useState(PREDEFINED_COLORS[0]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // UI state
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

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
        color: selectedColor,
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
      setSelectedColor(PREDEFINED_COLORS[0]);
      setShowColorPicker(false);
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

  const startEditing = (subject: Subject) => {
    setEditingId(subject.id);
    setEditName(subject.name);
    setEditColor(subject.color || PREDEFINED_COLORS[0]);
  };

  const handleUpdateSubject = async () => {
    if (!editingId || !editName.trim()) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .update({ name: editName, color: editColor })
        .eq('id', editingId);

      if (error) throw error;

      setSubjects(subjects.map(s =>
        s.id === editingId ? { ...s, name: editName, color: editColor } : s
      ));
      setEditingId(null);
    } catch (error) {
      console.error('Error updating subject:', error);
      alert('Erro ao atualizar matéria');
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

  const toggleExpand = (id: string) => {
    setExpandedSubjectId(expandedSubjectId === id ? null : id);
  };

  return (
    <div className="px-6 py-4 pb-32">
      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#111718] dark:text-white">Matérias</h1>
        <p className="text-[#618389] dark:text-gray-400 mt-1">Gerencie seu ciclo de estudos.</p>
      </header>

      <form onSubmit={addSubject} className="mb-6 bg-white dark:bg-[#1a2428] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-2 flex flex-col gap-2 transition-colors">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="size-10 rounded-2xl flex items-center justify-center shrink-0 transition-all border-none"
            style={{ backgroundColor: selectedColor }}
          >
            <span className="material-symbols-outlined text-white/50 text-xl">palette</span>
          </button>
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Adicionar nova matéria..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-[#111718] dark:text-gray-100 font-medium h-10 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={!newSubject.trim()}
            className="size-10 bg-[#111718] dark:bg-white text-white dark:text-[#1a2428] rounded-2xl flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>

        {showColorPicker && (
          <div className="flex flex-wrap gap-2 p-2 pt-0 animate-in fade-in slide-in-from-top-2">
            {PREDEFINED_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => { setSelectedColor(color); setShowColorPicker(false); }}
                className={`size-6 rounded-full transition-all ${selectedColor === color ? 'ring-2 ring-offset-2 dark:ring-offset-[#1a2428] ring-[#111718] dark:ring-white scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </form>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#008080]"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map((subject) => (
            <div key={subject.id} className="bg-white dark:bg-[#1a2428] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300">
              {editingId === subject.id ? (
                <div className="p-4 space-y-4 bg-gray-50/50 dark:bg-black/20">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-white dark:bg-[#111718] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-[#111718] dark:text-gray-100 focus:ring-2 focus:ring-[#008080]/20 outline-none font-bold placeholder-gray-400 dark:placeholder-gray-600"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {PREDEFINED_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditColor(color)}
                          className={`size-5 rounded-full transition-all ${editColor === color ? 'ring-2 ring-offset-1 dark:ring-offset-[#1a2428] ring-[#111718] dark:ring-white scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleUpdateSubject}
                        className="px-4 py-1.5 text-xs bg-[#111718] dark:bg-white text-white dark:text-[#1a2428] rounded-lg font-bold"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => toggleExpand(subject.id)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-black/10 transition-colors group select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0`} style={{ backgroundColor: subject.color }}>
                        {subject.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-[#111718] dark:text-gray-100 leading-tight flex items-center gap-2">
                          {subject.name}
                        </h3>
                        <p className="text-[10px] text-[#618389] dark:text-gray-400 font-medium uppercase tracking-wider">{subject.topics?.length || 0} Tópicos</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditing(subject); }}
                          className="size-8 rounded-full flex items-center justify-center text-gray-400 hover:text-[#008080] hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSubject(subject.id); }}
                          className="size-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                      <span className={`material-symbols-outlined text-gray-300 dark:text-gray-600 transition-transform duration-300 ${expandedSubjectId === subject.id ? 'rotate-180' : ''}`}>
                        keyboard_arrow_down
                      </span>
                    </div>
                  </div>

                  {/* Topics Section - Expandable */}
                  {expandedSubjectId === subject.id && (
                    <div className="bg-gray-50/50 dark:bg-[#111718]/40 border-t border-gray-100 dark:border-gray-800 p-4 pl-[4.5rem] space-y-2 animate-in slide-in-from-top-2 fade-in duration-200 transition-colors">
                      {/* Existing Topics */}
                      {(subject.topics || []).map(topic => (
                        <div key={topic.id} className="flex items-center justify-between group/topic py-1">
                          <div className="flex items-center gap-2">
                            <div className="size-1.5 rounded-full" style={{ backgroundColor: subject.color }}></div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{topic.name}</span>
                          </div>
                          <button
                            onClick={() => deleteTopic(topic.id, subject.id)}
                            className="text-gray-300 dark:text-gray-600 hover:text-red-400 opacity-0 group-hover/topic:opacity-100 transition-opacity"
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
                            className="flex-1 bg-white dark:bg-[#111718] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-[#111718] dark:text-gray-100 focus:ring-1 focus:ring-[#008080] outline-none placeholder-gray-400 dark:placeholder-gray-600"
                            value={newTopicNames[subject.id] || ''}
                            onChange={(e) => setNewTopicNames({ ...newTopicNames, [subject.id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') addTopic(subject.id);
                              if (e.key === 'Escape') setShowTopicInput({ ...showTopicInput, [subject.id]: false });
                            }}
                          />
                          <button
                            onClick={() => addTopic(subject.id)}
                            className="text-[#008080] dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 p-1 rounded transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">check</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowTopicInput({ ...showTopicInput, [subject.id]: true })}
                          className="flex items-center gap-2 text-[11px] font-bold text-[#008080] dark:text-teal-400 hover:underline mt-2 transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">add</span> Adicionar tópico
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {subjects.length === 0 && (
            <div className="text-center py-12 px-4 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
              <span className="material-symbols-outlined text-4xl text-gray-200 dark:text-gray-700 mb-2">auto_stories</span>
              <p className="text-gray-400 dark:text-gray-500 text-sm">Adicione sua primeira matéria para começar.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Subjects;
