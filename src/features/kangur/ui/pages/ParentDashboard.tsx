import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BarChart2, BookOpen, ClipboardList, LogIn, LogOut, UserRound } from 'lucide-react';
import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import Link from 'next/link';
import { AssignmentPanel, ProgressOverview, ScoreHistory } from '@/features/kangur/ui/components/dashboard';

type ParentDashboardTabId = 'progress' | 'scores' | 'assign';

type ParentDashboardTab = {
  id: ParentDashboardTabId;
  label: string;
  icon: typeof BarChart2;
};

const TABS: ParentDashboardTab[] = [
  { id: 'progress', label: 'Postęp', icon: BarChart2 },
  { id: 'scores', label: 'Wyniki gier', icon: ClipboardList },
  { id: 'assign', label: 'Zadania', icon: BookOpen },
];

export default function ParentDashboard() {
  const { basePath } = useKangurRouting();
  const { isAuthenticated, user, navigateToLogin, logout } = useKangurAuth();
  const [activeTab, setActiveTab] = useState<ParentDashboardTabId>('progress');

  const progress = useKangurProgressState();
  const viewerName = user?.full_name?.trim() || user?.email?.trim() || 'Konto';
  const viewerRoleLabel = user?.role === 'admin' ? 'Nauczyciel' : 'Rodzic';

  if (!isAuthenticated) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex flex-col items-center justify-center px-4'>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className='bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center gap-5'
        >
          <div className='text-6xl'>🪪</div>
          <h1 className='text-2xl font-extrabold text-gray-800 text-center'>
            Panel Rodzica / Nauczyciela
          </h1>
          <p className='text-gray-500 text-sm text-center'>
            Ten widok pokazuje prywatne postępy ucznia, więc dostęp wymaga zalogowanego konta.
          </p>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={navigateToLogin}
            className='w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-extrabold py-3 rounded-2xl shadow-lg text-lg'
          >
            <span className='inline-flex items-center justify-center gap-2'>
              <LogIn className='w-5 h-5' />
              Zaloguj się
            </span>
          </motion.button>

          <Link
            href={createPageUrl('Game', basePath)}
            className='text-sm text-gray-400 hover:text-gray-600 transition flex items-center gap-1'
          >
            <ArrowLeft className='w-4 h-4' /> Wróć do gry
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex flex-col items-center'>
      {/* Top bar */}
      <div className='w-full bg-white/80 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Link
            href={createPageUrl('Game', basePath)}
            className='inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-700 font-semibold text-sm transition'
          >
            <ArrowLeft className='w-4 h-4' /> Wróć do gry
          </Link>
          <Link
            href={createPageUrl('LearnerProfile', basePath)}
            className='inline-flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 font-semibold transition'
          >
            <UserRound className='w-4 h-4' /> Profil
          </Link>
        </div>
        <div className='flex items-center gap-3'>
          <span className='hidden sm:inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500'>
            {viewerRoleLabel}
          </span>
          <button
            onClick={() => logout(false)}
            className='inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition font-semibold'
          >
            <LogOut className='w-4 h-4' /> Wyloguj
          </button>
        </div>
      </div>

      <div className='w-full max-w-2xl px-4 py-8 flex flex-col gap-6'>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className='text-3xl font-extrabold text-gray-800'>📊 Panel Rodzica</h1>
          <p className='text-gray-500 mt-1'>
            Konto: <span className='font-semibold text-gray-700'>{viewerName}</span>. Monitoruj
            postępy ucznia i przydzielaj zadania.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className='flex gap-2 bg-white rounded-2xl shadow p-1.5'>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon className='w-4 h-4' />
                <span className='hidden sm:inline'>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode='wait'>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            {activeTab === 'progress' && <ProgressOverview progress={progress} />}
            {activeTab === 'scores' && <ScoreHistory playerName={null} />}
            {activeTab === 'assign' && <AssignmentPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
