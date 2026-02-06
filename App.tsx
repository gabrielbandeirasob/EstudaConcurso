
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Subjects from './components/Subjects';
import Timer from './components/Timer';
import Notes from './components/Notes';
import { AppTab } from './types';
import { supabase } from './src/lib/supabase';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) console.error('Error logging in:', error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#008080]"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfcfb] px-6">
        <h1 className="text-3xl font-bold text-[#008080] mb-8">Estuda Concuros</h1>
        <p className="text-gray-600 mb-12 text-center">Organize seus estudos e alcance sua aprovação.</p>
        <button
          onClick={handleLogin}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Entrar com Google
        </button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case AppTab.DASHBOARD:
        return <Dashboard />;
      case AppTab.SUBJECTS:
        return <Subjects />;
      case AppTab.TIMER:
        return <Timer onBack={() => setActiveTab(AppTab.DASHBOARD)} />;
      case AppTab.NOTES:
        return <Notes />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-[#fdfcfb]">
      <header className="px-6 pt-8 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-medium text-gray-500">Bem-vindo,</h2>
          <h1 className="text-xl font-bold text-[#023840]">{session.user.user_metadata.full_name || session.user.email}</h1>
        </div>
        <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors">
          <span className="material-symbols-outlined">logout</span>
        </button>
      </header>

      {renderContent()}

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 w-full h-20 bg-white/95 backdrop-blur-lg border-t border-gray-100 px-6 flex items-center justify-between z-50">
        <button
          onClick={() => setActiveTab(AppTab.DASHBOARD)}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === AppTab.DASHBOARD ? 'text-[#008080]' : 'text-[#618389]'}`}
        >
          <span className={`material-symbols-outlined text-2xl ${activeTab === AppTab.DASHBOARD ? 'material-symbols-fill' : ''}`}>grid_view</span>
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab(AppTab.SUBJECTS)}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === AppTab.SUBJECTS ? 'text-[#008080]' : 'text-[#618389]'}`}
        >
          <span className={`material-symbols-outlined text-2xl ${activeTab === AppTab.SUBJECTS ? 'material-symbols-fill' : ''}`}>book</span>
          <span className="text-[10px] font-medium">Matérias</span>
        </button>

        <button
          onClick={() => setActiveTab(AppTab.TIMER)}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === AppTab.TIMER ? 'text-[#008080]' : 'text-[#618389]'}`}
        >
          <span className={`material-symbols-outlined text-2xl ${activeTab === AppTab.TIMER ? 'material-symbols-fill' : ''}`}>timer</span>
          <span className="text-[10px] font-medium">Timer</span>
        </button>

        <button
          onClick={() => setActiveTab(AppTab.NOTES)}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === AppTab.NOTES ? 'text-[#008080]' : 'text-[#618389]'}`}
        >
          <span className={`material-symbols-outlined text-2xl ${activeTab === AppTab.NOTES ? 'material-symbols-fill' : ''}`}>edit_note</span>
          <span className="text-[10px] font-medium">Notas</span>
        </button>
      </nav>

      {/* OS Home Indicator Mock */}
      <div className="fixed bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-gray-200 rounded-full z-50"></div>
    </div>
  );
};

export default App;
