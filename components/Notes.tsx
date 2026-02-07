
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPreview, setEditPreview] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

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
    if (!newTitle || !selectedSubjectId || isActionLoading) return;

    setIsActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const subject = subjects.find(s => s.id === selectedSubjectId);
      if (!subject) throw new Error('Matéria não encontrada');

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

      if (error) throw error;

      setNewTitle('');
      setNewPreview('');
      setShowAddForm(false);

      if (!expandedFolders.includes(subject.name)) {
        setExpandedFolders([...expandedFolders, subject.name]);
      }
      await fetchData();
    } catch (error: any) {
      console.error('Error adding note:', error.message);
      alert('Erro ao adicionar nota: ' + error.message);
    } finally {
      setIsActionLoading(false);
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
    if (!selectedNote || !editTitle || isActionLoading) return;

    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('notes')
        .update({ title: editTitle, preview: editPreview })
        .eq('id', selectedNote.id);

      if (error) throw error;

      setIsEditing(false);
      setSelectedNote({ ...selectedNote, title: editTitle, preview: editPreview });
      await fetchData();
    } catch (error: any) {
      console.error('Error updating note:', error.message);
      alert('Erro ao atualizar nota: ' + error.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNote || isActionLoading) return;

    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', selectedNote.id);

      if (error) throw error;

      setIsEditing(false);
      setShowDeleteConfirm(false);
      setSelectedNote(null);
      await fetchData();
    } catch (error: any) {
      console.error('Error deleting note:', error.message);
      alert('Erro ao excluir nota: ' + error.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const categories = ['Todas', ...subjects.map(s => s.name)];

  const renderNoteCard = (note: Note) => (
    <div
      key={note.id}
      onClick={() => setSelectedNote(note)}
      className="bg-white dark:bg-[#1a2428] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 hover:border-[#008080]/30 transition-all active:scale-[0.99] cursor-pointer group"
    >
      <div className="flex-1 overflow-hidden">
        <h3 className="font-bold text-sm mb-0.5 truncate text-[#111718] dark:text-gray-100 group-hover:text-[#008080] dark:group-hover:text-teal-400 transition-colors">{note.title}</h3>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate leading-relaxed">Clique para ver o conteúdo completo...</p>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {(note.tags || []).slice(0, 1).map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-[4px] text-[8px] font-bold bg-[#F0F7F7] dark:bg-teal-900/30 text-[#008080] dark:text-teal-400 uppercase tracking-wider">
              {tag}
            </span>
          ))}
        </div>
        <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-[18px] group-hover:text-[#008080] dark:group-hover:text-teal-400 transition-colors">chevron_right</span>
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
          <span className="material-symbols-outlined text-[#008080] dark:text-teal-400 text-[22px] transition-transform duration-200" style={{ fontVariationSettings: isExpanded ? '"FILL" 1' : '"FILL" 0' }}>
            {isExpanded ? 'folder_open' : 'folder'}
          </span>
          <h2 className="font-bold text-[#111718] dark:text-gray-100 text-base flex-1">{subjectName}</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-gray-100 dark:bg-[#1a2428] text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full transition-colors border border-transparent dark:border-gray-800">
              {subjectNotes.length}
            </span>
            {filter === 'Todas' && (
              <span className={`material-symbols-outlined text-gray-300 dark:text-gray-600 text-[20px] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
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
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white transition-colors">Notas de Estudo</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Clique nas pastas e notas para explorar</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-[#008080] dark:bg-teal-500 text-white shadow-lg shadow-[#008080]/20 dark:shadow-teal-900/40 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>

        {showAddForm && (
          <div className="bg-white dark:bg-[#1a2428] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4 mb-8 ring-1 ring-black/5 transition-colors">
            <h3 className="font-bold text-[#111718] dark:text-gray-100">Nova Nota</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Título da nota"
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111718] text-[#111718] dark:text-gray-100 focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] transition-all placeholder-gray-400 dark:placeholder-gray-600"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase px-1">Selecione a Pasta (Matéria)</label>
                <select
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111718] text-[#111718] dark:text-gray-100 focus:ring-2 focus:ring-[#008080]/20 transition-colors"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id} className="dark:bg-[#1a2428]">{s.name}</option>
                  ))}
                  {subjects.length === 0 && <option disabled className="dark:bg-[#1a2428]">Crie uma matéria primeiro</option>}
                </select>
              </div>
              <textarea
                placeholder="Conteúdo ou resumo..."
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111718] text-[#111718] dark:text-gray-100 focus:ring-2 focus:ring-[#008080]/20 transition-colors placeholder-gray-400 dark:placeholder-gray-600"
                rows={3}
                value={newPreview}
                onChange={(e) => setNewPreview(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={addNote}
                disabled={subjects.length === 0 || isActionLoading}
                className="flex-1 bg-[#008080] dark:bg-teal-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 shadow-md shadow-[#008080]/10 flex items-center justify-center"
              >
                {isActionLoading ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                disabled={isActionLoading}
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-[20px]">search</span>
            <input
              className="w-full h-11 pl-10 pr-4 bg-[#f4f1ee] dark:bg-[#1a2428] border-none rounded-xl text-sm text-[#111718] dark:text-gray-100 focus:ring-2 focus:ring-[#008080]/50 placeholder:text-gray-400 dark:placeholder-gray-600 transition-colors"
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
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === cat ? 'bg-[#008080] dark:bg-teal-600 text-white' : 'bg-[#f4f1ee] dark:bg-[#1a2428] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
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
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-md p-0 sm:p-6"
          onClick={() => setSelectedNote(null)}
        >
          <div
            className="bg-white dark:bg-[#1a2428] w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] p-8 overflow-hidden shadow-2xl transition-all transform animate-in slide-in-from-bottom duration-500 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-8 sm:hidden" />

            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F0F7F7] dark:bg-teal-900/30 text-[#008080] dark:text-teal-400 uppercase tracking-widest border border-[#008080]/10 dark:border-teal-800 transition-colors">
                    📂 {selectedNote.category}
                  </span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-2xl font-black text-[#111718] dark:text-white leading-tight tracking-tight w-full border-b-2 border-[#008080]/20 dark:border-teal-500/20 focus:border-[#008080] dark:focus:border-teal-400 bg-transparent outline-none py-1"
                    placeholder="Título da nota"
                  />
                ) : (
                  <h2 className="text-2xl font-black text-[#111718] dark:text-white leading-tight tracking-tight">{selectedNote.title}</h2>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedNote(null);
                  setIsEditing(false);
                }}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-[#2a373d] rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:rotate-90 transition-all duration-300"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto no-scrollbar mb-8">
              {isEditing ? (
                <textarea
                  value={editPreview}
                  onChange={(e) => setEditPreview(e.target.value)}
                  className="w-full text-gray-600 dark:text-gray-300 text-[15px] leading-[1.8] font-medium border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-[#111718] rounded-2xl p-4 focus:border-[#008080]/20 dark:focus:border-teal-500/20 outline-none transition-colors"
                  rows={8}
                  placeholder="Conteúdo da nota..."
                />
              ) : (
                <p className="text-gray-600 dark:text-gray-300 text-[15px] leading-[1.8] whitespace-pre-wrap font-medium">
                  {selectedNote.preview}
                </p>
              )}
            </div>

            <div className="flex gap-4">
              {isEditing ? (
                <>
                  {showDeleteConfirm ? (
                    <div className="flex-1 flex gap-2 animate-in fade-in zoom-in duration-300">
                      <button
                        onClick={handleDelete}
                        disabled={isActionLoading}
                        className="flex-1 py-4 bg-red-500 dark:bg-red-600 text-white rounded-[20px] font-bold hover:bg-red-600 dark:hover:bg-red-700 active:scale-[0.98] transition-all"
                      >
                        {isActionLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-6 py-4 bg-gray-100 dark:bg-[#111718] text-gray-600 dark:text-gray-400 rounded-[20px] font-bold hover:bg-gray-200 dark:hover:bg-black active:scale-[0.98] transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handleUpdate}
                        disabled={isActionLoading}
                        className="flex-1 py-4 px-6 bg-[#008080] dark:bg-teal-600 text-white rounded-[20px] font-bold shadow-xl shadow-[#008080]/10 dark:shadow-teal-900/10 hover:bg-[#006666] dark:hover:bg-teal-700 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {isActionLoading ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setShowDeleteConfirm(false);
                        }}
                        className="px-6 py-4 bg-gray-100 dark:bg-[#2a373d] text-gray-600 dark:text-gray-400 rounded-[20px] font-bold hover:bg-gray-200 dark:hover:bg-[#1a2428] active:scale-[0.98] transition-all"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-14 h-14 flex items-center justify-center bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-500 dark:text-red-400 rounded-[20px] hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-[0.98] transition-all group"
                        title="Excluir Nota"
                      >
                        <span className="material-symbols-outlined group-hover:scale-110 transition-transform">delete</span>
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedNote(null)}
                    className="flex-1 py-4 px-6 bg-[#111718] dark:bg-white text-white dark:text-[#111718] rounded-[20px] font-bold shadow-xl shadow-black/10 hover:bg-black dark:hover:bg-gray-100 active:scale-[0.98] transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleEdit}
                    className="w-14 h-14 flex items-center justify-center bg-gray-50 dark:bg-[#2a373d] border border-gray-100 dark:border-gray-800 text-[#008080] dark:text-teal-400 rounded-[20px] hover:bg-white dark:hover:bg-[#1a2428] active:scale-[0.98] transition-all group"
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
