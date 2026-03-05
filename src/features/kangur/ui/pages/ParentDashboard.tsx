import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BarChart2, BookOpen, ClipboardList, Eye, EyeOff } from 'lucide-react';
import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import Link from 'next/link';
import { AssignmentPanel, ProgressOverview, ScoreHistory } from '@/features/kangur/ui/components/dashboard';
import { loadProgress } from '@/features/kangur/ui/services/progress';

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

const PIN = '1234';

export default function ParentDashboard() {
  const { basePath } = useKangurRouting();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [activeTab, setActiveTab] = useState<ParentDashboardTabId>('progress');

  const progress = loadProgress();

  const handleUnlock = () => {
    if (pin === PIN) {
      setUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPin('');
    }
  };

  if (!unlocked) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex flex-col items-center justify-center px-4'>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className='bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center gap-5'
        >
          <div className='text-6xl'>🔐</div>
          <h1 className='text-2xl font-extrabold text-gray-800 text-center'>
            Panel Rodzica / Nauczyciela
          </h1>
          <p className='text-gray-400 text-sm text-center'>Wprowadź PIN, aby uzyskać dostęp.</p>
          <p className='text-xs text-gray-300 text-center'>(domyślny PIN: 1234)</p>

          <div className='relative w-full'>
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setPinError(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder='Wpisz PIN...'
              maxLength={10}
              className={`w-full border-2 rounded-2xl px-4 py-3 text-lg text-center font-bold tracking-widest focus:outline-none transition ${
                pinError ? 'border-red-400 bg-red-50' : 'border-indigo-200 focus:border-indigo-400'
              }`}
            />
            <button
              onClick={() => setShowPin((v) => !v)}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
            >
              {showPin ? <EyeOff className='w-5 h-5' /> : <Eye className='w-5 h-5' />}
            </button>
          </div>

          {pinError && (
            <p className='text-red-500 text-sm font-semibold'>
              Nieprawidłowy PIN. Spróbuj ponownie.
            </p>
          )}

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleUnlock}
            className='w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-extrabold py-3 rounded-2xl shadow-lg text-lg'
          >
            Wejdź 🚀
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
        <Link
          href={createPageUrl('Game', basePath)}
          className='inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-700 font-semibold text-sm transition'
        >
          <ArrowLeft className='w-4 h-4' /> Wróć do gry
        </Link>
        <button
          onClick={() => setUnlocked(false)}
          className='text-sm text-gray-400 hover:text-gray-600 transition font-semibold'
        >
          🔒 Zablokuj
        </button>
      </div>

      <div className='w-full max-w-2xl px-4 py-8 flex flex-col gap-6'>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className='text-3xl font-extrabold text-gray-800'>📊 Panel Rodzica</h1>
          <p className='text-gray-500 mt-1'>Monitoruj postępy ucznia i przydzielaj zadania.</p>
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
