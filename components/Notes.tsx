
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

  // Interaction state
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPreview, setEditPreview] = useState('');

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

    const fetchedNotes = notesRes.data || [];
    const fetchedSubjects = subjectsRes.data || [];

    setNotes(fetchedNotes);
    setSubjects(fetchedSubjects);

    // Folders are now collapsed by default as per request
    setExpandedFolders([]);

    if (fetchedSubjects.length > 0) {
      setSelectedSubjectId(fetchedSubjects[0].id);
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
      // Ensure the folder is expanded when a new note is added
      if (!expandedFolders.includes(subject.name)) {
        setExpandedFolders([...expandedFolders, subject.name]);
      }
      fetchData();
    }
  };

  const toggleFolder = (subjectName: string) => {
    setExpandedFolders(prev =>
      prev.includes(subjectName)
        ? prev.filter(name => name !== subjectName)
        : [...prev, subjectName]
    );
  };

  const handleEdit = () => {
    if (!selectedNote) return;
    setEditTitle(selectedNote.title);
    setEditPreview(selectedNote.preview || '');
    setIsEditing(true);
  };

  const handleUpdate = async () => {
    if (!selectedNote || !editTitle) return;

    const { error } = await supabase
      .from('notes')
      .update({ title: editTitle, preview: editPreview })
      .eq('id', selectedNote.id);

    if (error) {
      console.error('Error updating note:', error.message);
    } else {
      setIsEditing(false);
      setSelectedNote({ ...selectedNote, title: editTitle, preview: editPreview });
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    if (!confirm('Tem certeza que deseja excluir esta nota?')) return;

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', selectedNote.id);

    if (error) {
      console.error('Error deleting note:', error.message);
    } else {
      setIsEditing(false);
      setSelectedNote(null);
      fetchData();
    }
  };

  const categories = ['Todas', ...subjects.map(s => s.name)];

  const renderNoteCard = (note: Note) => (
    <div
      key={note.id}
      onClick={() => setSelectedNote(note)}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between gap-4 hover:border-[#008080]/30 transition-all active:scale-[0.99] cursor-pointer group"
    >
      <div className="flex-1 overflow-hidden">
        <h3 className="font-bold text-sm mb-0.5 truncate text-[#111718] group-hover:text-[#008080] transition-colors">{note.title}</h3>
        <p className="text-[11px] text-gray-400 truncate leading-relaxed">Clique para ver o conteúdo completo...</p>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {(note.tags || []).slice(0, 1).map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-[4px] text-[8px] font-bold bg-[#F0F7F7] text-[#008080] uppercase tracking-wider">
              {tag}
            </span>
          ))}
        </div>
        <span className="material-symbols-outlined text-gray-300 text-[18px] group-hover:text-[#008080] transition-colors">chevron_right</span>
      </div>
    </div>
  );

  const renderFolderSection = (subjectName: string, subjectNotes: Note[]) => {
    const isExpanded = expandedFolders.includes(subjectName) || filter !== 'Todas';

    return (
      <div key={subjectName} className="space-y-3">
        <button
          onClick={() => filter === 'Todas' && toggleFolder(subjectName)}
          className="flex items-center gap-3 px-1 w-full text-left group py-1"
        >
          <span className="material-symbols-outlined text-[#008080] text-[22px] transition-transform duration-200" style={{ fontVariationSettings: isExpanded ? '"FILL" 1' : '"FILL" 0' }}>
            {isExpanded ? 'folder_open' : 'folder'}
          </span>
          <h2 className="font-bold text-[#111718] text-base flex-1">{subjectName}</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {subjectNotes.length}
            </span>
            {filter === 'Todas' && (
              <span className={`material-symbols-outlined text-gray-300 text-[20px] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                keyboard_arrow_down
              </span>
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="flex flex-col gap-2 transition-all animate-in fade-in slide-in-from-top-1 duration-300">
            {subjectNotes.map(renderNoteCard)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="px-4 pt-8 pb-32">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Notas de Estudo</h1>
            <p className="text-sm text-gray-500">Clique nas pastas e notas para explorar</p>
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
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 bg-gray-100 rounded-full mb-4" />
            <p className="text-center text-gray-400 text-sm">Organizando materiais...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6 border border-dashed border-gray-200">
              <span className="material-symbols-outlined text-gray-300 text-4xl">folder_off</span>
            </div>
            <h3 className="text-gray-900 font-bold mb-2 text-lg">Sem pastas criadas</h3>
            <p className="text-sm text-gray-500 max-w-xs">Adicione matérias para que suas anotações tenham um lugar dedicado.</p>
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
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-gray-300 text-3xl">create_new_folder</span>
                </div>
                <h3 className="text-gray-900 font-bold mb-1">Pastas vazias</h3>
                <p className="text-sm text-gray-500">Suas anotações aparecerão aqui assim que você criá-las.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Note Detail Modal Overlay */}
      {selectedNote && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-0 sm:p-6"
          onClick={() => setSelectedNote(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] p-8 overflow-hidden shadow-2xl transition-all transform animate-in slide-in-from-bottom duration-500 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8 sm:hidden" />

            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F0F7F7] text-[#008080] uppercase tracking-widest border border-[#008080]/10">
                    📂 {selectedNote.category}
                  </span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-2xl font-black text-[#111718] leading-tight tracking-tight w-full border-b-2 border-[#008080]/20 focus:border-[#008080] outline-none py-1"
                    placeholder="Título da nota"
                  />
                ) : (
                  <h2 className="text-2xl font-black text-[#111718] leading-tight tracking-tight">{selectedNote.title}</h2>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedNote(null);
                  setIsEditing(false);
                }}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 hover:rotate-90 transition-all duration-300"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto no-scrollbar mb-8">
              {isEditing ? (
                <textarea
                  value={editPreview}
                  onChange={(e) => setEditPreview(e.target.value)}
                  className="w-full text-gray-600 text-[15px] leading-[1.8] font-medium border-2 border-gray-100 rounded-2xl p-4 focus:border-[#008080]/20 outline-none"
                  rows={8}
                  placeholder="Conteúdo da nota..."
                />
              ) : (
                <p className="text-gray-600 text-[15px] leading-[1.8] whitespace-pre-wrap font-medium">
                  {selectedNote.preview}
                </p>
              )}
            </div>

            <div className="flex gap-4">
              {isEditing ? (
                <>
                  <button
                    onClick={handleUpdate}
                    className="flex-1 py-4 px-6 bg-[#008080] text-white rounded-[20px] font-bold shadow-xl shadow-[#008080]/10 hover:bg-[#006666] active:scale-[0.98] transition-all"
                  >
                    Salvar Alterações
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-4 bg-gray-100 text-gray-600 rounded-[20px] font-bold hover:bg-gray-200 active:scale-[0.98] transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-14 h-14 flex items-center justify-center bg-red-50 border border-red-100 text-red-500 rounded-[20px] hover:bg-red-100 active:scale-[0.98] transition-all group"
                    title="Excluir Nota"
                  >
                    <span className="material-symbols-outlined group-hover:scale-110 transition-transform">delete</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedNote(null)}
                    className="flex-1 py-4 px-6 bg-[#111718] text-white rounded-[20px] font-bold shadow-xl shadow-black/10 hover:bg-black active:scale-[0.98] transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleEdit}
                    className="w-14 h-14 flex items-center justify-center bg-gray-50 border border-gray-100 text-[#008080] rounded-[20px] hover:bg-white active:scale-[0.98] transition-all group"
                    title="Editar Nota"
                  >
                    <span className="material-symbols-outlined group-hover:scale-110 transition-transform">edit_note</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes;
