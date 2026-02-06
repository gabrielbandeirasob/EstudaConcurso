
import React, { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { Note } from '../types';

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todas');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Matemática');
  const [newPreview, setNewPreview] = useState('');

  const categories = ['Todas', 'Matemática', 'Biologia', 'História'];

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error.message);
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  const addNote = async () => {
    if (!newTitle) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('notes').insert([
      {
        title: newTitle,
        category: newCategory,
        preview: newPreview,
        user_id: user.id,
        tags: [newCategory.toUpperCase()]
      },
    ]);

    if (error) {
      console.error('Error adding note:', error.message);
    } else {
      setNewTitle('');
      setNewPreview('');
      setShowAddForm(false);
      fetchNotes();
    }
  };

  const filteredNotes = filter === 'Todas' ? notes : notes.filter(n => n.category === filter);

  return (
    <div className="px-4 pt-8 pb-32">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Notas de Estudo</h1>
            <p className="text-sm text-gray-500">Gerencie seu ciclo de aprendizagem</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-[#008080] text-white shadow-lg shadow-[#008080]/20 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>

        {showAddForm && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 mb-6">
            <h3 className="font-bold text-[#111718]">Nova Nota</h3>
            <input
              type="text"
              placeholder="Título da nota"
              className="w-full p-3 rounded-xl border border-gray-200"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <select
              className="w-full p-3 rounded-xl border border-gray-200"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              {categories.filter(c => c !== 'Todas').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <textarea
              placeholder="Conteúdo ou resumo..."
              className="w-full p-3 rounded-xl border border-gray-200"
              rows={3}
              value={newPreview}
              onChange={(e) => setNewPreview(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={addNote}
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

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
            <input
              className="w-full h-11 pl-10 pr-4 bg-[#f4f1ee] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#008080]/50 placeholder:text-gray-400"
              placeholder="Buscar suas notas..."
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

      <main className="space-y-8">
        {loading ? (
          <p className="text-center text-gray-500">Carregando...</p>
        ) : filteredNotes.length === 0 ? (
          <p className="text-center text-gray-500">Nenhuma nota encontrada.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredNotes.map((note) => (
              <div key={note.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
                <div className="h-24 flex items-center justify-center bg-[#008080]/5 rounded-lg border border-dashed border-[#008080]/20">
                  <span className="material-symbols-outlined text-[#008080]/40 text-3xl">description</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1 line-clamp-1">{note.title}</h3>
                  <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{note.preview}</p>
                </div>
                <div className="mt-auto flex flex-wrap gap-1">
                  {(note.tags || []).map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded text-[8px] font-bold bg-[#008080]/10 text-[#008080] uppercase">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Notes;
