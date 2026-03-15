import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/KangurIconSummaryOptionCard';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurLearnerSessionHistory } from '@/features/kangur/services/ports';
import { useKangurParentDashboardRuntime } from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
  KangurIconBadge,
  KangurMetaText,
  KangurPanelIntro,
  KangurSelectField,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { cn } from '@/shared/utils';

const kangurPlatform = getKangurPlatform();

export function KangurParentDashboardLearnerManagementWidget(): React.JSX.Element | null {
  const {
    activeLearner,
    canAccessDashboard,
    createForm,
    editForm,
    feedback,
    handleCreateLearner,
    handleDeleteLearner,
    handleSaveLearner,
    isSubmitting,
    isCreateLearnerModalOpen,
    learners,
    selectLearner,
    setCreateLearnerModalOpen,
    updateCreateField,
    updateEditField,
    progress,
  } = useKangurParentDashboardRuntime();
  const { entry: learnerManagementContent } = useKangurPageContentEntry(
    'parent-dashboard-learner-management'
  );
  const [isCreatePasswordVisible, setIsCreatePasswordVisible] = useState(false);
  const [isEditLearnerModalOpen, setIsEditLearnerModalOpen] = useState(false);
  const [isProfileMetricsModalOpen, setIsProfileMetricsModalOpen] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<KangurLearnerSessionHistory | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const activeLearnerId = activeLearner?.id ?? null;
  const isRemovalPending = Boolean(activeLearnerId && pendingRemovalId === activeLearnerId);
  const lastActivityAt = useMemo(() => {
    let latestMs = 0;
    const pushDate = (value: string | null | undefined): void => {
      if (!value) {
        return;
      }
      const timestamp = Date.parse(value);
      if (!Number.isNaN(timestamp) && timestamp > latestMs) {
        latestMs = timestamp;
      }
    };

    if (progress.activityStats) {
      Object.values(progress.activityStats).forEach((entry) => {
        pushDate(entry.lastPlayedAt);
      });
    }

    Object.values(progress.lessonMastery ?? {}).forEach((entry) => {
      pushDate(entry.lastCompletedAt);
    });

    return latestMs > 0 ? latestMs : null;
  }, [progress.activityStats, progress.lessonMastery]);
  const formatDateTime = (value: string | number | null | undefined): string => {
    if (!value) {
      return 'Brak danych';
    }
    const date = typeof value === 'number' ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Brak danych';
    }
    return new Intl.DateTimeFormat('pl-PL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };
  const formatSessionDuration = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined) {
      return 'Brak danych';
    }
    const normalized = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(normalized / 60);
    const remainingSeconds = normalized % 60;
    if (minutes === 0) {
      return `${remainingSeconds}s`;
    }
    return `${minutes}m ${`${remainingSeconds}`.padStart(2, '0')}s`;
  };
  const lastActivityLabel = formatDateTime(lastActivityAt);
  const sessions = sessionHistory?.sessions ?? [];

  useEffect(() => {
    if (pendingRemovalId && pendingRemovalId !== activeLearnerId) {
      setPendingRemovalId(null);
    }
  }, [activeLearnerId, pendingRemovalId]);

  useEffect(() => {
    if (!isCreateLearnerModalOpen) {
      setIsCreatePasswordVisible(false);
    }
  }, [isCreateLearnerModalOpen]);

  useEffect(() => {
    if (!activeLearnerId) {
      setIsEditLearnerModalOpen(false);
      setIsProfileMetricsModalOpen(false);
      setPendingRemovalId(null);
    }
  }, [activeLearnerId]);

  useEffect(() => {
    if (!isEditLearnerModalOpen) {
      setPendingRemovalId(null);
    }
  }, [isEditLearnerModalOpen]);

  useEffect(() => {
    if (!isProfileMetricsModalOpen || !activeLearnerId) {
      return;
    }

    let isActive = true;
    setIsLoadingSessions(true);
    setSessionsError(null);
    setSessionHistory(null);

    kangurPlatform.learnerSessions
      .list(activeLearnerId)
      .then((history) => {
        if (!isActive) {
          return;
        }
        setSessionHistory(history);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }
        setSessionsError('Nie udało się wczytać historii sesji.');
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingSessions(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeLearnerId, isProfileMetricsModalOpen]);

  const handleEditSave = async (): Promise<void> => {
    const saved = await handleSaveLearner();
    if (saved) {
      setIsEditLearnerModalOpen(false);
    }
  };

  const handleEditDelete = async (learnerId: string): Promise<void> => {
    const removed = await handleDeleteLearner(learnerId);
    if (removed) {
      setIsEditLearnerModalOpen(false);
    }
  };

  if (!canAccessDashboard) {
    return null;
  }

  return (
    <div className='flex flex-col gap-5'>
      <KangurGlassPanel className='flex flex-col gap-5' padding='lg' surface='mistStrong' variant='soft'>
        <KangurPanelIntro
          className='gap-1.5'
          eyebrow='Profile uczniów'
          title={
            learnerManagementContent?.title ?? 'Zarządzaj profilami bez opuszczania panelu'
          }
          titleAs='h2'
          titleClassName='text-lg font-bold tracking-[-0.02em]'
          description={
            learnerManagementContent?.summary ??
            'Rodzic loguje się emailem, a uczniowie dostają osobne nazwy logowania i hasła.'
          }
          descriptionClassName='max-w-2xl'
        />

        <div className='grid gap-3 min-[420px]:grid-cols-2'>
          {learners.map((learner) => {
            const isActiveLearner = learner.id === activeLearner?.id;
            const initial = learner.displayName.trim().charAt(0).toUpperCase() || '?';
            const learnerStatusLabel = learner.status === 'active' ? 'aktywny' : 'wyłączony';
            return (
              <KangurIconSummaryOptionCard
                accent='indigo'
                aria-pressed={isActiveLearner}
                aria-label={`Profil ucznia: ${learner.displayName} (${learnerStatusLabel})`}
                buttonClassName='rounded-[30px] px-5 py-4 text-left'
                data-doc-id='parent_learner_profile_card'
                data-testid={`parent-dashboard-learner-card-${learner.id}`}
                emphasis={isActiveLearner ? 'accent' : 'neutral'}
                key={learner.id}
                onClick={() => void selectLearner(learner.id)}
              >
                <KangurIconSummaryCardContent
                  aside={
                    <KangurStatusChip
                      accent={learner.status === 'active' ? 'emerald' : 'slate'}
                      className='uppercase tracking-wide'
                      size='sm'
                    >
                      {learner.status === 'active' ? 'Aktywny' : 'Wyłączony'}
                    </KangurStatusChip>
                  }
                  asideClassName='ml-auto flex shrink-0 flex-col items-end gap-2 self-start'
                  className='w-full items-center'
                  contentClassName='min-w-0 flex-1'
                  description={`Login: ${learner.loginName}`}
                  descriptionClassName='text-xs'
                  footer={
                    <div
                      className={cn(
                        'text-xs font-semibold',
                        isActiveLearner
                          ? 'text-indigo-600'
                          : '[color:var(--kangur-page-muted-text)]'
                      )}
                    >
                      {isActiveLearner
                        ? 'Aktualnie wybrany profil'
                        : 'Kliknij, aby przełączyć profil'}
                    </div>
                  }
                  footerClassName='mt-2'
                  headerClassName='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'
                  icon={
                    <KangurIconBadge
                      accent={isActiveLearner ? 'indigo' : 'slate'}
                      className='shrink-0 text-lg font-extrabold'
                      data-testid={`parent-dashboard-learner-icon-${learner.id}`}
                      size='md'
                    >
                      {initial}
                    </KangurIconBadge>
                  }
                  title={learner.displayName}
                  titleClassName='font-bold leading-normal'
                />
              </KangurIconSummaryOptionCard>
            );
          })}
        </div>

        <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center'>
          <KangurButton
            className='w-full sm:w-auto'
            disabled={isSubmitting || !activeLearner}
            onClick={() => setIsEditLearnerModalOpen(true)}
            size='sm'
            variant='surface'
            data-doc-id='parent_open_edit_learner'
          >
            Edytuj Profil
          </KangurButton>
          <KangurButton
            className='w-full sm:w-auto'
            disabled={isSubmitting || !activeLearner}
            onClick={() => setIsProfileMetricsModalOpen(true)}
            size='sm'
            variant='surface'
            data-doc-id='parent_open_profile_metrics'
          >
            Metryka
          </KangurButton>
        </div>

        <DialogPrimitive.Root
          open={isCreateLearnerModalOpen}
          onOpenChange={setCreateLearnerModalOpen}
        >
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay
              className={cn(
                'fixed inset-0 z-50 backdrop-blur-[2px]',
                'data-[state=open]:animate-in data-[state=closed]:animate-out',
                'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
              )}
              style={{
                background:
                  'color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 16%, rgba(2,6,23,0.7))',
              }}
            />
            <DialogPrimitive.Content
              className={cn(
                'fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),42rem)]',
                'max-h-[calc(100vh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
                'outline-none'
              )}
              data-testid='parent-create-learner-modal'
            >
              <DialogPrimitive.Title className='sr-only'>Nowy profil ucznia</DialogPrimitive.Title>
              <DialogPrimitive.Description className='sr-only'>
                Dodaj dziecko i od razu ustaw jego login oraz hasło do gry.
              </DialogPrimitive.Description>

              <DialogPrimitive.Close asChild>
                <button
                  aria-label='Zamknij dodawanie profilu'
                  className={cn(
                    'absolute right-4 top-4 z-10 cursor-pointer rounded-full border border-amber-200/80',
                    'px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
                    'shadow-[0_16px_34px_-26px_rgba(249,115,22,0.5)] transition'
                  )}
                  style={{
                    background:
                      'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, rgba(254,243,199,0.95)) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 82%, rgba(255,237,213,0.9)) 100%)',
                    color: '#9a5418',
                  }}
                  type='button'
                >
                  Zamknij
                </button>
              </DialogPrimitive.Close>

              <KangurGlassPanel
                className='flex flex-col gap-4'
                padding='lg'
                surface='mistStrong'
                variant='soft'
              >
                <KangurPanelIntro
                  eyebrow='Nowy profil'
                  description='Dodaj dziecko i od razu ustaw jego login oraz hasło do gry.'
                />

                <div className='grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3'>
                  <KangurTextField
                    accent='indigo'
                    maxLength={120}
                    value={createForm.displayName}
                    onChange={(event) => updateCreateField('displayName', event.target.value)}
                    placeholder='Imię Ucznia'
                    aria-label='Imię Ucznia'
                    title='Imię Ucznia'
                  />
                  <div className='flex flex-col gap-1'>
                    <KangurTextField
                      accent='indigo'
                      inputMode='numeric'
                      pattern='[0-9]*'
                      type='number'
                      min={3}
                      max={99}
                      step={1}
                      value={createForm.age}
                      onChange={(event) => {
                        const normalized = event.target.value.replace(/[^0-9]/g, '');
                        updateCreateField('age', normalized);
                      }}
                      placeholder='Wiek ucznia'
                      aria-label='Wiek ucznia'
                      title='Wiek ucznia'
                    />
                    <span className='text-xs [color:var(--kangur-page-muted-text)]'>
                      opcjonalnie
                    </span>
                  </div>
                  <KangurTextField
                    accent='indigo'
                    autoCapitalize='none'
                    maxLength={80}
                    pattern='[A-Za-z0-9]*'
                    spellCheck={false}
                    value={createForm.loginName}
                    onChange={(event) => {
                      const normalized = event.target.value.replace(/[^a-zA-Z0-9]/g, '');
                      updateCreateField('loginName', normalized);
                    }}
                    placeholder='nick'
                    aria-label='nick'
                    title='nick'
                  />
                  <div className='relative'>
                    <KangurTextField
                      accent='indigo'
                      type={isCreatePasswordVisible ? 'text' : 'password'}
                      minLength={8}
                      maxLength={160}
                      value={createForm.password}
                      onChange={(event) => updateCreateField('password', event.target.value)}
                      placeholder='Hasło'
                      aria-label='Hasło'
                      title='Hasło'
                      className='pr-12'
                    />
                    <button
                      type='button'
                      onClick={() => setIsCreatePasswordVisible((prev) => !prev)}
                      aria-label={
                        isCreatePasswordVisible ? 'Ukryj hasło' : 'Pokaż hasło'
                      }
                      className={cn(
                        'absolute right-3 top-1/2 -translate-y-1/2 rounded-full',
                        'p-2 text-slate-500 transition hover:text-slate-700',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200/70'
                      )}
                    >
                      {isCreatePasswordVisible ? (
                        <EyeOff className='size-4' aria-hidden='true' />
                      ) : (
                        <Eye className='size-4' aria-hidden='true' />
                      )}
                    </button>
                  </div>
                </div>

                <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center'>
                  <KangurButton
                    className='w-full sm:w-auto'
                    disabled={isSubmitting}
                    onClick={() => void handleCreateLearner()}
                    size='sm'
                    variant='surface'
                    data-doc-id='parent_create_learner'
                  >
                    Dodaj ucznia
                  </KangurButton>
                  {feedback ? (
                    <div
                      className='text-sm [color:var(--kangur-page-muted-text)]'
                      role='status'
                      aria-live='polite'
                      aria-atomic='true'
                    >
                      {feedback}
                    </div>
                  ) : null}
                </div>
              </KangurGlassPanel>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </KangurGlassPanel>

      <DialogPrimitive.Root
        open={isProfileMetricsModalOpen}
        onOpenChange={setIsProfileMetricsModalOpen}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 backdrop-blur-[2px]',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
            )}
            style={{
              background:
                'color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 16%, rgba(2,6,23,0.7))',
            }}
          />
          <DialogPrimitive.Content
            className={cn(
              'fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),42rem)]',
              'max-h-[calc(100vh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
              'outline-none'
            )}
            data-testid='parent-profile-metrics-modal'
            onEscapeKeyDown={() => setIsProfileMetricsModalOpen(false)}
            onInteractOutside={() => setIsProfileMetricsModalOpen(false)}
            onPointerDownOutside={() => setIsProfileMetricsModalOpen(false)}
          >
            <DialogPrimitive.Title className='sr-only'>
              Szczegóły profilu ucznia
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className='sr-only'>
              Szybkie dane o aktywnym profilu ucznia, w tym ostatnia aktywność.
            </DialogPrimitive.Description>

            <DialogPrimitive.Close asChild>
              <button
                aria-label='Zamknij metrykę profilu'
                className={cn(
                  'absolute right-4 top-4 z-10 cursor-pointer rounded-full border border-amber-200/80',
                  'px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
                  'shadow-[0_16px_34px_-26px_rgba(249,115,22,0.5)] transition'
                )}
                style={{
                  background:
                    'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, rgba(254,243,199,0.95)) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 82%, rgba(255,237,213,0.9)) 100%)',
                  color: '#9a5418',
                }}
                type='button'
              >
                Zamknij
              </button>
            </DialogPrimitive.Close>

            {activeLearner ? (
              <KangurGlassPanel
                className='flex flex-col gap-4'
                padding='lg'
                surface='mistSoft'
                variant='soft'
              >
                <KangurSummaryPanel
                  accent='indigo'
                  description='Szybkie dane o aktywnym profilu ucznia, w tym ostatnia aktywność.'
                  label='Szczegóły profilu'
                >
                  <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                    <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                      <KangurMetaText caps size='xs'>
                        Login ucznia
                      </KangurMetaText>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {activeLearner.loginName}
                      </div>
                    </div>
                    <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                      <KangurMetaText caps size='xs'>
                        Status profilu
                      </KangurMetaText>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {activeLearner.status === 'active' ? 'Aktywny' : 'Wyłączony'}
                      </div>
                    </div>
                    <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                      <KangurMetaText caps size='xs'>
                        Wiek
                      </KangurMetaText>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {typeof activeLearner.age === 'number'
                          ? `${activeLearner.age} lat`
                          : 'Brak danych'}
                      </div>
                    </div>
                    <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                      <KangurMetaText caps size='xs'>
                        Ostatnie logowanie / aktywność
                      </KangurMetaText>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {lastActivityLabel}
                      </div>
                    </div>
                    <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                      <KangurMetaText caps size='xs'>
                        Profil utworzony
                      </KangurMetaText>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {formatDateTime(activeLearner.createdAt)}
                      </div>
                    </div>
                    <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                      <KangurMetaText caps size='xs'>
                        Ostatnia aktualizacja profilu
                      </KangurMetaText>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {formatDateTime(activeLearner.updatedAt)}
                      </div>
                    </div>
                  </div>
                </KangurSummaryPanel>

                <KangurSummaryPanel
                  accent='slate'
                  description='Historia logowań ucznia z czasem rozpoczęcia i zakończenia.'
                  label='Sesje logowania'
                >
                  {isLoadingSessions ? (
                    <KangurEmptyState
                      accent='slate'
                      align='center'
                      data-testid='parent-profile-sessions-loading'
                      description='Ładujemy historię sesji ucznia.'
                      title='Ładowanie sesji...'
                    />
                  ) : sessionsError ? (
                    <KangurEmptyState
                      accent='rose'
                      align='center'
                      data-testid='parent-profile-sessions-error'
                      description='Spróbuj odświeżyć metrykę za chwilę.'
                      title={sessionsError}
                    />
                  ) : sessions.length === 0 ? (
                    <KangurEmptyState
                      accent='slate'
                      align='center'
                      data-testid='parent-profile-sessions-empty'
                      description='Sesje ucznia pojawią się tutaj po pierwszym logowaniu.'
                      title='Brak sesji logowania.'
                    />
                  ) : (
                    <div className='mt-3 max-h-72 overflow-y-auto pr-1'>
                      <div className='flex flex-col gap-2'>
                        {sessions.map((session, index) => {
                          const endedLabel = session.endedAt
                            ? formatDateTime(session.endedAt)
                            : 'W trakcie';
                          const durationLabel = session.endedAt
                            ? formatSessionDuration(session.durationSeconds)
                            : 'W trakcie';
                          return (
                            <div
                              key={session.id}
                              className='rounded-[20px] border border-slate-200/80 bg-white/80 px-4 py-3'
                              data-testid={`parent-profile-session-${session.id}`}
                            >
                              <div className='flex items-center justify-between text-xs font-semibold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                                <span>{`Sesja ${index + 1}`}</span>
                                <span>{session.endedAt ? 'Zakończona' : 'Aktywna'}</span>
                              </div>
                              <div className='mt-2 grid gap-3 sm:grid-cols-3'>
                                <div>
                                  <KangurMetaText caps size='xs'>
                                    Start
                                  </KangurMetaText>
                                  <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                                    {formatDateTime(session.startedAt)}
                                  </div>
                                </div>
                                <div>
                                  <KangurMetaText caps size='xs'>
                                    Koniec
                                  </KangurMetaText>
                                  <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                                    {endedLabel}
                                  </div>
                                </div>
                                <div>
                                  <KangurMetaText caps size='xs'>
                                    Czas trwania
                                  </KangurMetaText>
                                  <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                                    {durationLabel}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </KangurSummaryPanel>
              </KangurGlassPanel>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <DialogPrimitive.Root
        open={isEditLearnerModalOpen}
        onOpenChange={setIsEditLearnerModalOpen}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 backdrop-blur-[2px]',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
            )}
            style={{
              background:
                'color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 16%, rgba(2,6,23,0.7))',
            }}
          />
          <DialogPrimitive.Content
            className={cn(
              'fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),42rem)]',
              'max-h-[calc(100vh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
              'outline-none'
            )}
            data-testid='parent-edit-learner-modal'
            onEscapeKeyDown={() => setIsEditLearnerModalOpen(false)}
            onInteractOutside={() => setIsEditLearnerModalOpen(false)}
            onPointerDownOutside={() => setIsEditLearnerModalOpen(false)}
          >
            <DialogPrimitive.Title className='sr-only'>
              Edytuj profil ucznia
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className='sr-only'>
              Zmieniaj dane profilu ucznia, login, hasło oraz status aktywności.
            </DialogPrimitive.Description>

            <DialogPrimitive.Close asChild>
              <button
                aria-label='Zamknij edycję profilu'
                className={cn(
                  'absolute right-4 top-4 z-10 cursor-pointer rounded-full border border-amber-200/80',
                  'px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
                  'shadow-[0_16px_34px_-26px_rgba(249,115,22,0.5)] transition'
                )}
                style={{
                  background:
                    'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, rgba(254,243,199,0.95)) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 82%, rgba(255,237,213,0.9)) 100%)',
                  color: '#9a5418',
                }}
                type='button'
              >
                Zamknij
              </button>
            </DialogPrimitive.Close>

            {activeLearner ? (
              <KangurGlassPanel
                className='flex flex-col gap-4'
                padding='lg'
                surface='mistSoft'
                variant='soft'
              >
                <KangurPanelIntro
                  eyebrow='Wybrany profil'
                  description={
                    <>
                      Aktualizujesz dane ucznia{' '}
                      <span className='font-semibold [color:var(--kangur-page-text)]'>
                        {activeLearner.displayName}
                      </span>
                      .
                    </>
                  }
                />
                <div className='grid gap-3 min-[420px]:grid-cols-2'>
                  <KangurTextField
                    accent='indigo'
                    maxLength={120}
                    value={editForm.displayName}
                    onChange={(event) => updateEditField('displayName', event.target.value)}
                    placeholder='Imie ucznia'
                    aria-label='Imie ucznia'
                    title='Imie ucznia'
                  />
                  <KangurTextField
                    accent='indigo'
                    maxLength={80}
                    value={editForm.loginName}
                    onChange={(event) => updateEditField('loginName', event.target.value)}
                    placeholder='Login ucznia'
                    aria-label='Login ucznia'
                    title='Login ucznia'
                  />
                  <KangurTextField
                    accent='indigo'
                    type='password'
                    minLength={8}
                    maxLength={160}
                    value={editForm.password}
                    onChange={(event) => updateEditField('password', event.target.value)}
                    placeholder='Nowe hasło (opcjonalnie)'
                    aria-label='Nowe hasło (opcjonalnie)'
                    title='Nowe hasło (opcjonalnie)'
                  />
                  <KangurSelectField
                    accent='indigo'
                    value={editForm.status}
                    onChange={(event) =>
                      updateEditField(
                        'status',
                        event.target.value === 'disabled' ? 'disabled' : 'active'
                      )
                    }
                    aria-label='Status ucznia'
                    title='Status ucznia'
                  >
                    <option value='active'>Aktywny</option>
                    <option value='disabled'>Wyłączony</option>
                  </KangurSelectField>
                </div>
                <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center'>
                  <KangurButton
                    className='w-full sm:w-auto'
                    disabled={isSubmitting}
                    onClick={() => void handleEditSave()}
                    size='sm'
                    variant='surface'
                    data-doc-id='parent_save_learner'
                  >
                    Zapisz ucznia
                  </KangurButton>
                  <KangurButton
                    className='w-full sm:w-auto text-rose-600 hover:text-rose-700'
                    disabled={isSubmitting}
                    onClick={() => setPendingRemovalId(activeLearner.id)}
                    size='sm'
                    variant='surface'
                    data-doc-id='parent_remove_learner'
                  >
                    Usuń profil ucznia
                  </KangurButton>
                  <div className='text-xs [color:var(--kangur-page-muted-text)]'>
                    Login i hasło należą do ucznia, ale konto pozostaje własnością rodzica.
                  </div>
                </div>
                {isRemovalPending ? (
                  <div
                    className='rounded-[20px] border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700'
                    role='alert'
                  >
                    <p className='font-semibold'>
                      Uwaga: usunięcie profilu ucznia usuwa jego login i dostęp do danych. Tej
                      operacji nie da się cofnąć.
                    </p>
                    <div className='mt-3 flex flex-col gap-2 sm:flex-row sm:items-center'>
                      <KangurButton
                        className='w-full sm:w-auto'
                        disabled={isSubmitting}
                        onClick={() => setPendingRemovalId(null)}
                        size='sm'
                        variant='surface'
                      >
                        Anuluj
                      </KangurButton>
                      <KangurButton
                        className='w-full sm:w-auto border-rose-500 bg-rose-500 text-white hover:bg-rose-600 hover:border-rose-600'
                        disabled={isSubmitting}
                        onClick={() => {
                          setPendingRemovalId(null);
                          void handleEditDelete(activeLearner.id);
                        }}
                        size='sm'
                        variant='primary'
                      >
                        Potwierdź usunięcie
                      </KangurButton>
                    </div>
                  </div>
                ) : null}
              </KangurGlassPanel>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
