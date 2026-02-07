
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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

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

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

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
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb] dark:bg-[#0f171a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#008080]"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfcfb] dark:bg-[#0f171a] px-6 transition-colors duration-300">
        <h1 className="text-4xl font-black text-[#008080] dark:text-teal-400 mb-8 tracking-tighter">Estuda Concursos</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-12 text-center text-balance max-w-sm">Organize seus estudos e alcance sua aprovação.</p>
        <button
          onClick={handleLogin}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-white dark:bg-[#1a2428] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 font-medium py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
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
    <div className="min-h-screen pb-24 bg-[#fdfcfb] dark:bg-[#0f171a] transition-colors duration-300">
      <header className="px-6 pt-8 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Bem-vindo,</h2>
          <h1 className="text-xl font-bold text-[#023840] dark:text-white transition-colors">{session.user.user_metadata.full_name || session.user.email}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-full bg-white dark:bg-[#1a2428] text-gray-400 dark:text-yellow-400 border border-gray-100 dark:border-gray-800 shadow-sm transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[22px]">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <button onClick={handleLogout} className="p-2.5 rounded-full bg-white dark:bg-[#1a2428] text-gray-400 hover:text-red-500 border border-gray-100 dark:border-gray-800 shadow-sm transition-all active:scale-95">
            <span className="material-symbols-outlined text-[22px]">logout</span>
          </button>
        </div>
      </header>

      {renderContent()}

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 w-full h-20 bg-white/95 dark:bg-[#1a2428]/95 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 px-6 flex items-center justify-between z-50 transition-colors">
        <button
          onClick={() => setActiveTab(AppTab.DASHBOARD)}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === AppTab.DASHBOARD ? 'text-[#008080]' : 'text-[#618389] dark:text-gray-500'}`}
        >
          <span className={`material-symbols-outlined text-2xl ${activeTab === AppTab.DASHBOARD ? 'material-symbols-fill' : ''}`}>grid_view</span>
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab(AppTab.SUBJECTS)}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === AppTab.SUBJECTS ? 'text-[#008080] dark:text-teal-400' : 'text-[#618389] dark:text-gray-500 hover:text-teal-600 dark:hover:text-gray-400'}`}
        >
          <span className={`material-symbols-outlined text-2xl ${activeTab === AppTab.SUBJECTS ? 'material-symbols-fill' : ''}`}>book</span>
          <span className="text-[10px] font-bold">Matérias</span>
        </button>

        <button
          onClick={() => setActiveTab(AppTab.TIMER)}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === AppTab.TIMER ? 'text-[#008080] dark:text-teal-400' : 'text-[#618389] dark:text-gray-500 hover:text-teal-600 dark:hover:text-gray-400'}`}
        >
          <span className={`material-symbols-outlined text-2xl ${activeTab === AppTab.TIMER ? 'material-symbols-fill' : ''}`}>timer</span>
          <span className="text-[10px] font-bold">Timer</span>
        </button>

        <button
          onClick={() => setActiveTab(AppTab.NOTES)}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === AppTab.NOTES ? 'text-[#008080] dark:text-teal-400' : 'text-[#618389] dark:text-gray-500 hover:text-teal-600 dark:hover:text-gray-400'}`}
        >
          <span className={`material-symbols-outlined text-2xl ${activeTab === AppTab.NOTES ? 'material-symbols-fill' : ''}`}>description</span>
          <span className="text-[10px] font-bold">Notas</span>
        </button>
      </nav>

      {/* OS Home Indicator Mock */}
      <div className="fixed bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full z-50 transition-colors"></div>
    </div>
  );
};

export default App;
