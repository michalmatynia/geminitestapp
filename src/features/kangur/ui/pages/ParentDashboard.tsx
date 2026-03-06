import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BarChart2,
  BookOpen,
  ClipboardList,
  LogIn,
  LogOut,
} from 'lucide-react';
import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import KangurAssignmentManager from '@/features/kangur/ui/components/KangurAssignmentManager';
import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import Link from 'next/link';
import { ProgressOverview, ScoreHistory } from '@/features/kangur/ui/components/dashboard';

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

const kangurPlatform = getKangurPlatform();

export default function ParentDashboard() {
  const { basePath } = useKangurRouting();
  const { isAuthenticated, user, navigateToLogin, logout, selectLearner, checkAppState } =
    useKangurAuth();
  const [activeTab, setActiveTab] = useState<ParentDashboardTabId>('progress');
  const [createForm, setCreateForm] = useState({
    displayName: '',
    loginName: '',
    password: '',
  });
  const [editForm, setEditForm] = useState({
    displayName: '',
    loginName: '',
    password: '',
    status: 'active',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const progress = useKangurProgressState();
  const activeLearner = user?.activeLearner ?? null;
  const viewerName = user?.email?.trim() || 'Konto';
  const scoreViewerName = activeLearner?.displayName?.trim() || user?.full_name?.trim() || null;
  const scoreViewerEmail = user?.email?.trim() || null;
  const viewerRoleLabel = user?.role === 'admin' ? 'Nauczyciel' : 'Rodzic';

  useEffect(() => {
    setEditForm({
      displayName: activeLearner?.displayName ?? '',
      loginName: activeLearner?.loginName ?? '',
      password: '',
      status: activeLearner?.status ?? 'active',
    });
  }, [activeLearner?.displayName, activeLearner?.id, activeLearner?.loginName, activeLearner?.status]);

  const handleCreateLearner = async (): Promise<void> => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const created = await kangurPlatform.learners.create(createForm);
      await selectLearner(created.id);
      setCreateForm({
        displayName: '',
        loginName: '',
        password: '',
      });
      setFeedback(`Dodano profil ucznia: ${created.displayName}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Nie udalo sie dodac ucznia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveLearner = async (): Promise<void> => {
    if (!activeLearner) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await kangurPlatform.learners.update(activeLearner.id, {
        displayName: editForm.displayName,
        loginName: editForm.loginName,
        ...(editForm.password.trim().length > 0 ? { password: editForm.password } : {}),
        status: editForm.status === 'disabled' ? 'disabled' : 'active',
      });
      await checkAppState();
      setEditForm((current) => ({ ...current, password: '' }));
      setFeedback('Zapisano dane ucznia.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Nie udalo sie zapisac zmian.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (!user?.canManageLearners) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex flex-col items-center justify-center px-4'>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className='bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center gap-5'
        >
          <div className='text-6xl'>🔒</div>
          <h1 className='text-2xl font-extrabold text-gray-800 text-center'>Panel Rodzica</h1>
          <p className='text-gray-500 text-sm text-center'>
            Ten widok jest dostepny tylko dla konta rodzica, ktore zarzadza profilami uczniow.
          </p>
          <Link
            href={createPageUrl('LearnerProfile', basePath)}
            className='inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white shadow'
          >
            Wroc do profilu ucznia
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex flex-col items-center'>
      {/* Top bar */}
      <div
        className='sticky top-0 z-20 w-full bg-white/80 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between'
      >
        <div className='flex items-center gap-3'>
          <Link
            href={createPageUrl('Game', basePath)}
            className='inline-flex items-center text-indigo-500 hover:text-indigo-700 font-semibold text-sm transition'
          >
            Strona główna
          </Link>
          <KangurProfileMenu
            basePath={basePath}
            isAuthenticated={isAuthenticated}
            onLogout={() => logout(false)}
            onLogin={navigateToLogin}
          />
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
            Konto wlasciciela: <span className='font-semibold text-gray-700'>{viewerName}</span>.
            Wybrany uczen:{' '}
            <span className='font-semibold text-gray-700'>
              {activeLearner?.displayName ?? 'Brak profilu'}
            </span>
            .
          </p>
        </motion.div>

        <section className='bg-white rounded-2xl shadow p-5 flex flex-col gap-4'>
          <div className='flex flex-col gap-1'>
            <div className='text-sm font-bold text-gray-500 uppercase tracking-wide'>
              Profile uczniow
            </div>
            <div className='text-sm text-gray-500'>
              Rodzic loguje sie emailem, a uczniowie dostaja osobne nazwy logowania i hasla.
            </div>
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            {user.learners.map((learner) => {
              const isActiveLearner = learner.id === activeLearner?.id;
              return (
                <button
                  key={learner.id}
                  type='button'
                  onClick={() => void selectLearner(learner.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    isActiveLearner
                      ? 'border-indigo-500 bg-indigo-50 shadow'
                      : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
                  }`}
                >
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <div className='font-bold text-slate-800'>{learner.displayName}</div>
                      <div className='text-xs text-slate-500'>Login: {learner.loginName}</div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                        learner.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {learner.status === 'active' ? 'Aktywny' : 'Wylaczony'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className='grid gap-3 md:grid-cols-3'>
            <input
              value={createForm.displayName}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, displayName: event.target.value }))
              }
              placeholder='Imie ucznia'
              className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
            />
            <input
              value={createForm.loginName}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, loginName: event.target.value }))
              }
              placeholder='Login ucznia'
              className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
            />
            <input
              type='password'
              value={createForm.password}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder='Haslo ucznia'
              className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
            />
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <button
              type='button'
              disabled={isSubmitting}
              onClick={() => void handleCreateLearner()}
              className='rounded-xl bg-indigo-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-indigo-600 disabled:opacity-60'
            >
              Dodaj ucznia
            </button>
            {feedback && <div className='text-sm text-slate-500'>{feedback}</div>}
          </div>
        </section>

        {activeLearner && (
          <section className='bg-white rounded-2xl shadow p-5 flex flex-col gap-4'>
            <div className='text-sm font-bold text-gray-500 uppercase tracking-wide'>
              Ustawienia wybranego ucznia
            </div>
            <div className='grid gap-3 md:grid-cols-2'>
              <input
                value={editForm.displayName}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, displayName: event.target.value }))
                }
                placeholder='Imie ucznia'
                className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
              />
              <input
                value={editForm.loginName}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, loginName: event.target.value }))
                }
                placeholder='Login ucznia'
                className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
              />
              <input
                type='password'
                value={editForm.password}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder='Nowe haslo (opcjonalnie)'
                className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
              />
              <select
                value={editForm.status}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, status: event.target.value }))
                }
                className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
              >
                <option value='active'>Aktywny</option>
                <option value='disabled'>Wylaczony</option>
              </select>
            </div>
            <div className='flex flex-wrap items-center gap-3'>
              <button
                type='button'
                disabled={isSubmitting}
                onClick={() => void handleSaveLearner()}
                className='rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60'
              >
                Zapisz ucznia
              </button>
              <div className='text-xs text-slate-500'>
                Login i haslo naleza do ucznia, ale konto pozostaje wlasnoscia rodzica.
              </div>
            </div>
          </section>
        )}

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
            {activeTab === 'scores' && (
              <ScoreHistory
                learnerId={activeLearner?.id ?? null}
                playerName={scoreViewerName}
                createdBy={scoreViewerEmail}
                basePath={basePath}
              />
            )}
            {activeTab === 'assign' && <KangurAssignmentManager basePath={basePath} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
