import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BarChart2,
  BookOpen,
  ClipboardList,
  Home,
  LayoutGrid,
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
import {
  KangurButton,
  KangurPageContainer,
  KangurPageShell,
  KangurPageTopBar,
  KangurPanel,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_OPTION_CARD_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/shared/utils';
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
const FORM_CONTROL_CLASSNAME =
  'rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100';

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
      <KangurPageShell tone='dashboard' className='justify-center px-4'>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className='w-full max-w-sm'
        >
          <KangurPanel className='flex flex-col items-center gap-5 text-center' padding='xl' variant='elevated'>
            <div className='text-6xl'>🪪</div>
            <h1 className='text-2xl font-extrabold text-gray-800 text-center'>
              Panel Rodzica / Nauczyciela
            </h1>
            <p className='text-gray-500 text-sm text-center'>
              Ten widok pokazuje prywatne postępy ucznia, więc dostęp wymaga zalogowanego konta.
            </p>

            <KangurButton className='w-full' onClick={navigateToLogin} size='lg' variant='primary'>
              <LogIn className='w-5 h-5' />
              Zaloguj się
            </KangurButton>

            <KangurButton asChild size='sm' variant='ghost'>
              <Link href={createPageUrl('Game', basePath)}>
                <ArrowLeft className='w-4 h-4' /> Wróć do gry
              </Link>
            </KangurButton>
          </KangurPanel>
        </motion.div>
      </KangurPageShell>
    );
  }

  if (!user?.canManageLearners) {
    return (
      <KangurPageShell tone='dashboard' className='justify-center px-4'>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className='w-full max-w-sm'
        >
          <KangurPanel className='flex flex-col items-center gap-5 text-center' padding='xl' variant='elevated'>
            <div className='text-6xl'>🔒</div>
            <h1 className='text-2xl font-extrabold text-gray-800 text-center'>Panel Rodzica</h1>
            <p className='text-gray-500 text-sm text-center'>
              Ten widok jest dostepny tylko dla konta rodzica, ktore zarzadza profilami uczniow.
            </p>
            <KangurButton asChild size='lg' variant='primary'>
              <Link href={createPageUrl('LearnerProfile', basePath)}>Wroc do profilu ucznia</Link>
            </KangurButton>
          </KangurPanel>
        </motion.div>
      </KangurPageShell>
    );
  }

  return (
    <KangurPageShell tone='dashboard'>
      <KangurPageTopBar
        left={
          <KangurTopNavGroup>
            <KangurButton asChild size='md' variant='navigation'>
              <Link href={createPageUrl('Game', basePath)}>
                <Home className='h-[22px] w-[22px]' strokeWidth={2.1} />
                <span>Strona glowna</span>
              </Link>
            </KangurButton>
            <KangurProfileMenu
              basePath={basePath}
              isAuthenticated={isAuthenticated}
              onLogout={() => logout(false)}
              onLogin={navigateToLogin}
              isActive={false}
            />
            <KangurButton asChild size='md' variant='navigation'>
              <Link href={createPageUrl('Lessons', basePath)}>
                <BookOpen className='h-[22px] w-[22px]' strokeWidth={2.1} />
                <span>Lekcje</span>
              </Link>
            </KangurButton>
            <KangurButton asChild size='md' variant='navigationActive'>
              <Link href={createPageUrl('ParentDashboard', basePath)}>
                <LayoutGrid className='h-[22px] w-[22px]' strokeWidth={2.1} />
                <span>Rodzic</span>
              </Link>
            </KangurButton>
          </KangurTopNavGroup>
        }
        right={
          <>
            <span className='hidden sm:inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500'>
              Rola: {viewerRoleLabel}
            </span>
            <KangurButton onClick={() => logout(false)} size='sm' variant='ghost'>
              <LogOut className='w-4 h-4' /> Wyloguj
            </KangurButton>
          </>
        }
      />

      <KangurPageContainer className='max-w-2xl flex flex-col gap-6'>
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

        <KangurPanel className='flex flex-col gap-4' padding='lg' variant='soft'>
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
              const initial = learner.displayName.trim().charAt(0).toUpperCase() || '?';
              return (
                <button
                  aria-pressed={isActiveLearner}
                  data-testid={`parent-dashboard-learner-card-${learner.id}`}
                  key={learner.id}
                  type='button'
                  onClick={() => void selectLearner(learner.id)}
                  className={cn(
                    KANGUR_OPTION_CARD_CLASSNAME,
                    'flex items-start gap-4 rounded-[30px] px-5 py-4 text-left',
                    isActiveLearner
                      ? KANGUR_ACCENT_STYLES.indigo.activeCard
                      : cn('border-slate-200/80', KANGUR_ACCENT_STYLES.slate.hoverCard)
                  )}
                >
                  <span
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold shadow-sm',
                      isActiveLearner
                        ? KANGUR_ACCENT_STYLES.indigo.icon
                        : KANGUR_ACCENT_STYLES.slate.icon
                    )}
                  >
                    {initial}
                  </span>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <div className='font-bold text-slate-800'>{learner.displayName}</div>
                        <div className='text-xs text-slate-500'>Login: {learner.loginName}</div>
                      </div>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
                          learner.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        )}
                      >
                        {learner.status === 'active' ? 'Aktywny' : 'Wylaczony'}
                      </span>
                    </div>
                    <div
                      className={cn(
                        'mt-2 text-xs font-semibold',
                        isActiveLearner ? 'text-indigo-600' : 'text-slate-500'
                      )}
                    >
                      {isActiveLearner ? 'Aktualnie wybrany profil' : 'Kliknij, aby przełączyć profil'}
                    </div>
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
              className={FORM_CONTROL_CLASSNAME}
            />
            <input
              value={createForm.loginName}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, loginName: event.target.value }))
              }
              placeholder='Login ucznia'
              className={FORM_CONTROL_CLASSNAME}
            />
            <input
              type='password'
              value={createForm.password}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder='Haslo ucznia'
              className={FORM_CONTROL_CLASSNAME}
            />
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <KangurButton
              disabled={isSubmitting}
              onClick={() => void handleCreateLearner()}
              size='md'
              variant='primary'
            >
              Dodaj ucznia
            </KangurButton>
            {feedback && <div className='text-sm text-slate-500'>{feedback}</div>}
          </div>
        </KangurPanel>

        {activeLearner && (
          <KangurPanel className='flex flex-col gap-4' padding='lg' variant='soft'>
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
                className={FORM_CONTROL_CLASSNAME}
              />
              <input
                value={editForm.loginName}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, loginName: event.target.value }))
                }
                placeholder='Login ucznia'
                className={FORM_CONTROL_CLASSNAME}
              />
              <input
                type='password'
                value={editForm.password}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder='Nowe haslo (opcjonalnie)'
                className={FORM_CONTROL_CLASSNAME}
              />
              <select
                value={editForm.status}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, status: event.target.value }))
                }
                className={FORM_CONTROL_CLASSNAME}
              >
                <option value='active'>Aktywny</option>
                <option value='disabled'>Wylaczony</option>
              </select>
            </div>
            <div className='flex flex-wrap items-center gap-3'>
              <KangurButton
                disabled={isSubmitting}
                onClick={() => void handleSaveLearner()}
                size='md'
                variant='secondary'
              >
                Zapisz ucznia
              </KangurButton>
              <div className='text-xs text-slate-500'>
                Login i haslo naleza do ucznia, ale konto pozostaje wlasnoscia rodzica.
              </div>
            </div>
          </KangurPanel>
        )}

        {/* Tabs */}
        <KangurPanel className='flex gap-2 p-1.5' padding='md' variant='soft'>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <KangurButton
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn('flex-1 justify-center', activeTab === tab.id ? 'shadow-sm' : '')}
                size='md'
                variant={activeTab === tab.id ? 'primary' : 'secondary'}
              >
                <Icon className='w-4 h-4' />
                <span className='hidden sm:inline'>{tab.label}</span>
              </KangurButton>
            );
          })}
        </KangurPanel>

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
      </KangurPageContainer>
    </KangurPageShell>
  );
}
