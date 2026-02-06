
import React, { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { Note, Subject } from '../types';

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todas');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [newPreview, setNewPreview] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [notesRes, subjectsRes] = await Promise.all([
      supabase.from('notes').select('*').order('created_at', { ascending: false }),
      supabase.from('subjects').select('*').order('name', { ascending: true })
    ]);

    if (notesRes.error) console.error('Error fetching notes:', notesRes.error.message);
    if (subjectsRes.error) console.error('Error fetching subjects:', subjectsRes.error.message);

    setNotes(notesRes.data || []);
    setSubjects(subjectsRes.data || []);

    if (subjectsRes.data && subjectsRes.data.length > 0) {
      setSelectedSubjectId(subjectsRes.data[0].id);
    }

    setLoading(false);
  };

  const addNote = async () => {
    if (!newTitle || !selectedSubjectId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const subject = subjects.find(s => s.id === selectedSubjectId);
    if (!subject) return;

    const { error } = await supabase.from('notes').insert([
      {
        title: newTitle,
        category: subject.name,
        subject_id: subject.id,
        preview: newPreview,
        user_id: user.id,
        tags: [subject.name.toUpperCase()]
      },
    ]);

    if (error) {
      console.error('Error adding note:', error.message);
    } else {
      setNewTitle('');
      setNewPreview('');
      setShowAddForm(false);
      fetchData();
    }
  };

  const categories = ['Todas', ...subjects.map(s => s.name)];

  const renderNoteCard = (note: Note) => (
    <div key={note.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2 hover:border-[#008080]/30 transition-colors">
      <div>
        <h3 className="font-bold text-sm mb-1 line-clamp-2 text-[#111718]">{note.title}</h3>
        <p className="text-[11px] text-gray-500 line-clamp-3 leading-relaxed">{note.preview}</p>
      </div>
      <div className="mt-auto flex flex-wrap gap-1">
        {(note.tags || []).map(tag => (
          <span key={tag} className="px-2 py-0.5 rounded-[4px] text-[9px] font-bold bg-[#F0F7F7] text-[#008080] uppercase tracking-wider">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );

  const renderFolderSection = (subjectName: string, subjectNotes: Note[]) => (
    <div key={subjectName} className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <span className="material-symbols-outlined text-[#008080] text-[20px] material-symbols-fill">folder</span>
        <h2 className="font-bold text-[#111718] text-base">{subjectName}</h2>
        <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
          {subjectNotes.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {subjectNotes.map(renderNoteCard)}
      </div>
    </div>
  );

  return (
    <div className="px-4 pt-8 pb-32">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Notas de Estudo</h1>
            <p className="text-sm text-gray-500">Organizadas por matérias</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-[#008080] text-white shadow-lg shadow-[#008080]/20 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>

        {showAddForm && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 mb-8 ring-1 ring-black/5">
            <h3 className="font-bold text-[#111718]">Nova Nota</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Título da nota"
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] transition-all"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Selecione a Pasta (Matéria)</label>
                <select
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-[#008080]/20"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  {subjects.length === 0 && <option disabled>Crie uma matéria primeiro</option>}
                </select>
              </div>
              <textarea
                placeholder="Conteúdo ou resumo..."
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#008080]/20"
                rows={3}
                value={newPreview}
                onChange={(e) => setNewPreview(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={addNote}
                disabled={subjects.length === 0}
                className="flex-1 bg-[#008080] text-white py-3 rounded-xl font-bold disabled:opacity-50 shadow-md shadow-[#008080]/10"
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

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
            <input
              className="w-full h-11 pl-10 pr-4 bg-[#f4f1ee] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#008080]/50 placeholder:text-gray-400"
              placeholder="Buscar em todas as pastas..."
              type="text"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === cat ? 'bg-[#008080] text-white' : 'bg-[#f4f1ee] text-gray-600'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <main className="space-y-10">
        {loading ? (
          <p className="text-center text-gray-500 py-10">Carregando gavetas...</p>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-dashed border-gray-200">
              <span className="material-symbols-outlined text-gray-300 text-3xl">folder_off</span>
            </div>
            <h3 className="text-gray-900 font-bold mb-1">Sem pastas criadas</h3>
            <p className="text-sm text-gray-500">Crie matérias para que suas notas tenham um lugar.</p>
          </div>
        ) : (
          <>
            {filter === 'Todas' ? (
              subjects.map(subject => {
                const subjectNotes = notes.filter(n => n.subject_id === subject.id);
                if (subjectNotes.length === 0) return null;
                return renderFolderSection(subject.name, subjectNotes);
              })
            ) : (
              // Individual folder view
              renderFolderSection(filter, notes.filter(n => n.category === filter))
            )}

            {filter === 'Todas' && !notes.some(n => !!n.subject_id) && notes.length > 0 && (
              renderFolderSection('Sem Categoria', notes.filter(n => !n.subject_id))
            )}

            {notes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-gray-300 text-3xl">create_new_folder</span>
                </div>
                <h3 className="text-gray-900 font-bold mb-1">Pastas vazias</h3>
                <p className="text-sm text-gray-500">Comece a preencher suas pastas com anotações.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Notes;
