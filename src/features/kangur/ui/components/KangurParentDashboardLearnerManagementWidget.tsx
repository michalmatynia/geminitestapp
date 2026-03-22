'use client';

import { Eye, EyeOff, Settings } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';

import { KangurDialog } from '@/features/kangur/ui/components/KangurDialog';
import { KangurDialogHeader } from '@/features/kangur/ui/components/KangurDialogHeader';
import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/KangurIconSummaryOptionCard';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurLearnerSessionHistory } from '@kangur/platform';
import { useKangurParentDashboardRuntime } from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
  KangurIconBadge,
  KangurMetaText,
  KangurPanelRow,
  KangurPanelStack,
  KangurSelectField,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurTextField,
  KangurWidgetIntro,
} from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { cn } from '@/features/kangur/shared/utils';
import { withKangurClientError } from '@/features/kangur/observability/client';
import {
  KANGUR_STACK_COMPACT_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';


const kangurPlatform = getKangurPlatform();
const SESSION_PAGE_LIMIT = 20;
type ProfileModalTabId = 'settings' | 'metrics';
const PROFILE_MODAL_TABS: Array<{ id: ProfileModalTabId; label: string; docId: string }> = [
  { id: 'settings', label: 'Ustawienia', docId: 'parent_profile_tab_settings' },
  { id: 'metrics', label: 'Metryka', docId: 'parent_profile_tab_metrics' },
];

export function KangurParentDashboardLearnerManagementWidget(): React.JSX.Element | null {
  const isCoarsePointer = useKangurCoarsePointer();
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
  const createPasswordInputId = useId();
  const [isProfileSettingsModalOpen, setIsProfileSettingsModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<ProfileModalTabId>('settings');
  const [sessionHistory, setSessionHistory] = useState<KangurLearnerSessionHistory | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [isLoadingMoreSessions, setIsLoadingMoreSessions] = useState(false);
  const [sessionsLoadMoreError, setSessionsLoadMoreError] = useState<string | null>(null);
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
  const hasMoreSessions =
    sessionHistory?.hasMore ??
    (sessionHistory ? sessions.length < sessionHistory.totalSessions : false);
  const nextSessionOffset = sessionHistory?.nextOffset ?? Math.max(sessions.length, 0);
  const profileModalTitle =
    profileModalTab === 'metrics' ? 'Metryka profilu ucznia' : 'Ustawienia profilu ucznia';
  const profileModalDescription =
    profileModalTab === 'metrics'
      ? 'Szybkie dane o aktywnym profilu ucznia, w tym ostatnia aktywność.'
      : 'Zmieniaj dane profilu ucznia, login, hasło oraz status aktywności.';
  const profileModalCloseLabel =
    profileModalTab === 'metrics' ? 'Zamknij metrykę profilu' : 'Zamknij ustawienia profilu';

  const handleLoadMoreSessions = async (): Promise<void> => {
    if (!activeLearnerId || !sessionHistory || isLoadingMoreSessions) {
      return;
    }

    setIsLoadingMoreSessions(true);
    setSessionsLoadMoreError(null);
    await withKangurClientError(
      {
        source: 'kangur-parent-dashboard',
        action: 'load-more-sessions',
        description: 'Load more learner sessions in parent dashboard.',
        context: {
          learnerId: activeLearnerId,
          offset: nextSessionOffset,
        },
      },
      async () => {
        const history = await kangurPlatform.learnerSessions.list(activeLearnerId, {
          limit: SESSION_PAGE_LIMIT,
          offset: nextSessionOffset,
        });
        setSessionHistory((current) => {
          if (!current) {
            return history;
          }
          const existingIds = new Set(current.sessions.map((entry) => entry.id));
          const mergedSessions = [
            ...current.sessions,
            ...history.sessions.filter((entry) => !existingIds.has(entry.id)),
          ];
          const totalSessions = Math.max(current.totalSessions, history.totalSessions);
          const resolvedHasMore = history.hasMore ?? mergedSessions.length < totalSessions;
          const resolvedNextOffset = resolvedHasMore
            ? history.nextOffset ?? mergedSessions.length
            : null;
          return {
            ...history,
            sessions: mergedSessions,
            totalSessions,
            hasMore: resolvedHasMore,
            nextOffset: resolvedNextOffset,
          };
        });
      },
      {
        fallback: undefined,
        onError: () => {
          setSessionsLoadMoreError('Nie udało się wczytać starszych sesji.');
        },
      }
    );
    setIsLoadingMoreSessions(false);
  };

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
      setIsProfileSettingsModalOpen(false);
      setPendingRemovalId(null);
    }
  }, [activeLearnerId]);

  useEffect(() => {
    if (!isProfileSettingsModalOpen || profileModalTab !== 'settings') {
      setPendingRemovalId(null);
    }
  }, [isProfileSettingsModalOpen, profileModalTab]);

  useEffect(() => {
    if (!isProfileSettingsModalOpen || profileModalTab !== 'metrics' || !activeLearnerId) {
      return;
    }

    let isActive = true;
    setIsLoadingSessions(true);
    setIsLoadingMoreSessions(false);
    setSessionsError(null);
    setSessionsLoadMoreError(null);
    setSessionHistory(null);

    kangurPlatform.learnerSessions
      .list(activeLearnerId, { limit: SESSION_PAGE_LIMIT, offset: 0 })
      .then((history) => {
        if (!isActive) {
          return;
        }
        setSessionHistory(history);
      })
      .catch((error) => {
        void ErrorSystem.captureException(error);
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
  }, [activeLearnerId, isProfileSettingsModalOpen, profileModalTab]);

  const openProfileSettings = (tab: ProfileModalTabId = 'settings'): void => {
    setProfileModalTab(tab);
    setIsProfileSettingsModalOpen(true);
  };

  const handleProfileModalOpenChange = (open: boolean): void => {
    setIsProfileSettingsModalOpen(open);
    if (!open) {
      setProfileModalTab('settings');
    }
  };

  const handleEditSave = async (): Promise<void> => {
    const saved = await handleSaveLearner();
    if (saved) {
      setIsProfileSettingsModalOpen(false);
    }
  };

  const handleEditDelete = async (learnerId: string): Promise<void> => {
    const removed = await handleDeleteLearner(learnerId);
    if (removed) {
      setIsProfileSettingsModalOpen(false);
    }
  };

  if (!canAccessDashboard) {
    return null;
  }

  return (
    <KangurPanelStack>
      <KangurGlassPanel className='w-full' padding='lg' surface='mistStrong' variant='soft'>
        <KangurPanelStack>
          <KangurWidgetIntro
          className='gap-1.5'
          eyebrow='Profile uczniów'
          title={
            learnerManagementContent?.title ?? 'Zarządzaj profilami bez opuszczania panelu'
          }
          description={
            learnerManagementContent?.summary ??
            'Rodzic loguje się emailem, a uczniowie dostają osobne nazwy logowania i hasła.'
          }
          descriptionClassName='max-w-2xl'
        />

        <div className='grid kangur-panel-gap sm:grid-cols-2'>
          {learners.map((learner) => {
            const isActiveLearner = learner.id === activeLearner?.id;
            const initial = learner.displayName.trim().charAt(0).toUpperCase() || '?';
            const learnerStatusLabel = learner.status === 'active' ? 'aktywny' : 'wyłączony';
            return (
              <KangurIconSummaryOptionCard
                accent='indigo'
                aria-pressed={isActiveLearner}
                aria-label={`Profil ucznia: ${learner.displayName} (${learnerStatusLabel})`}
                buttonClassName='h-full w-full rounded-[30px] px-5 py-4 text-left'
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
                  asideClassName='self-start sm:ml-auto sm:w-auto'
                  className='w-full flex-col items-start sm:flex-row sm:items-center'
                  contentClassName='w-full min-w-0 flex-1'
                  description={`Login: ${learner.loginName}`}
                  descriptionClassName='break-words text-xs'
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
                  headerClassName={cn(
                    KANGUR_TIGHT_ROW_CLASSNAME,
                    'w-full items-start sm:items-start sm:justify-between'
                  )}
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
                  titleClassName='break-words font-bold leading-normal'
                />
              </KangurIconSummaryOptionCard>
            );
          })}
        </div>

        <KangurPanelRow className='sm:flex-wrap sm:items-center'>
          <KangurButton
            className={isCoarsePointer ? 'h-11 w-11 p-0' : 'h-9 w-9 p-0'}
            disabled={isSubmitting || !activeLearner}
            onClick={() => openProfileSettings('settings')}
            size='sm'
            variant='ghost'
            data-doc-id='parent_open_profile_settings'
            data-testid='parent-open-profile-settings'
            aria-label='Ustawienia profilu ucznia'
            title='Ustawienia profilu ucznia'
          >
            <Settings className='h-4 w-4' aria-hidden='true' />
          </KangurButton>
        </KangurPanelRow>

        <KangurDialog
          open={isCreateLearnerModalOpen}
          onOpenChange={setCreateLearnerModalOpen}
          overlayVariant='standard'
          contentSize='md'
        contentProps={{
          'data-testid': 'parent-create-learner-modal',
        }}
        >
          <KangurDialogHeader
            title='Nowy profil ucznia'
            description='Dodaj dziecko i od razu ustaw jego login oraz hasło do gry.'
            closeAriaLabel='Zamknij dodawanie profilu'
          />

          <KangurGlassPanel className='w-full' padding='lg' surface='mistStrong' variant='soft'>
            <KangurPanelStack>
              <KangurWidgetIntro
                eyebrow='Nowy profil'
                description='Dodaj dziecko i od razu ustaw jego login oraz hasło do gry.'
              />

              <div className='grid kangur-panel-gap min-[420px]:grid-cols-2 xl:grid-cols-3'>
                <KangurTextField
                  accent='indigo'
                  maxLength={120}
                  value={createForm.displayName}
                  onChange={(event) => updateCreateField('displayName', event.target.value)}
                  placeholder='Imię Ucznia'
                  aria-label='Imię Ucznia'
                  title='Imię Ucznia'
                />
                <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
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
                  <span className='text-xs [color:var(--kangur-page-muted-text)]'>opcjonalnie</span>
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
                    id={createPasswordInputId}
                  />
                  <button
                    type='button'
                    onClick={() => setIsCreatePasswordVisible((prev) => !prev)}
                    aria-label={isCreatePasswordVisible ? 'Ukryj hasło' : 'Pokaż hasło'}
                    aria-pressed={isCreatePasswordVisible}
                    aria-controls={createPasswordInputId}
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

              <KangurPanelRow className='sm:flex-wrap sm:items-center'>
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
              </KangurPanelRow>
            </KangurPanelStack>
          </KangurGlassPanel>
        </KangurDialog>
        </KangurPanelStack>
      </KangurGlassPanel>

      <KangurDialog
        open={isProfileSettingsModalOpen}
        onOpenChange={handleProfileModalOpenChange}
        overlayVariant='standard'
        contentSize='md'
        contentProps={{
          'data-testid': 'parent-profile-settings-modal',
          onEscapeKeyDown: () => handleProfileModalOpenChange(false),
          onInteractOutside: () => handleProfileModalOpenChange(false),
          onPointerDownOutside: () => handleProfileModalOpenChange(false),
        }}
      >
        <KangurDialogHeader
          title={profileModalTitle}
          description={profileModalDescription}
          closeAriaLabel={profileModalCloseLabel}
        />

        {activeLearner ? (
          <KangurGlassPanel className='w-full' padding='lg' surface='mistSoft' variant='soft'>
            <KangurPanelStack>
              <div
                className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} self-start`}
                role='tablist'
                aria-label='Profil ucznia'
              >
                {PROFILE_MODAL_TABS.map((tab) => (
                  <KangurButton
                    key={tab.id}
                    size='sm'
                    variant={profileModalTab === tab.id ? 'segmentActive' : 'segment'}
                    onClick={() => setProfileModalTab(tab.id)}
                    data-doc-id={tab.docId}
                    role='tab'
                    aria-selected={profileModalTab === tab.id}
                    tabIndex={profileModalTab === tab.id ? 0 : -1}
                  >
                    {tab.label}
                  </KangurButton>
                ))}
              </div>

              {profileModalTab === 'settings' ? (
                <KangurPanelStack>
                  <KangurWidgetIntro
                    eyebrow='Wybrany profil'
                    description={
                      <>
                        Aktualizujesz dane ucznia{' '}
                        <span className='break-words font-semibold [color:var(--kangur-page-text)]'>
                          {activeLearner.displayName}
                        </span>
                        .
                      </>
                    }
                  />
                  <div className='grid kangur-panel-gap min-[420px]:grid-cols-2'>
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
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        updateEditField('password', event.target.value)
                      }
                      placeholder='Nowe hasło (opcjonalnie)'
                      aria-label='Nowe hasło (opcjonalnie)'
                      title='Nowe hasło (opcjonalnie)'
                    />
                    <KangurSelectField
                      accent='indigo'
                      value={editForm.status}
                      onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
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
                  <KangurPanelRow className='sm:flex-wrap sm:items-center'>
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
                  </KangurPanelRow>
                  {isRemovalPending ? (
                    <div
                      className='rounded-[20px] border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700'
                      role='alert'
                    >
                      <p className='font-semibold'>
                        Uwaga: usunięcie profilu ucznia usuwa jego login i dostęp do danych. Tej
                        operacji nie da się cofnąć.
                      </p>
                      <div className={`mt-3 ${KANGUR_TIGHT_ROW_CLASSNAME} sm:items-center`}>
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
                </KangurPanelStack>
              ) : (
                <KangurPanelStack>
                  <KangurSummaryPanel
                    accent='indigo'
                    description='Szybkie dane o aktywnym profilu ucznia, w tym ostatnia aktywność.'
                    label='Szczegóły profilu'
                  >
                    <div className='mt-3 grid grid-cols-1 kangur-panel-gap sm:grid-cols-2'>
                      <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                        <KangurMetaText caps size='xs'>
                          Login ucznia
                        </KangurMetaText>
                        <div className='mt-1 break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {activeLearner.loginName}
                        </div>
                      </div>
                      <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                        <KangurMetaText caps size='xs'>
                          Status profilu
                        </KangurMetaText>
                        <div className='mt-1 break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {activeLearner.status === 'active' ? 'Aktywny' : 'Wyłączony'}
                        </div>
                      </div>
                      <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                        <KangurMetaText caps size='xs'>
                          Wiek
                        </KangurMetaText>
                        <div className='mt-1 break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {typeof activeLearner.age === 'number'
                            ? `${activeLearner.age} lat`
                            : 'Brak danych'}
                        </div>
                      </div>
                      <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                        <KangurMetaText caps size='xs'>
                          Ostatnie logowanie / aktywność
                        </KangurMetaText>
                        <div className='mt-1 break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {lastActivityLabel}
                        </div>
                      </div>
                      <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                        <KangurMetaText caps size='xs'>
                          Profil utworzony
                        </KangurMetaText>
                        <div className='mt-1 break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {formatDateTime(activeLearner.createdAt)}
                        </div>
                      </div>
                      <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                        <KangurMetaText caps size='xs'>
                          Ostatnia aktualizacja profilu
                        </KangurMetaText>
                        <div className='mt-1 break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
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
                        <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
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
                                <div className='mt-2 grid kangur-panel-gap sm:grid-cols-3'>
                                  <div>
                                    <KangurMetaText caps size='xs'>
                                      Start
                                    </KangurMetaText>
                                    <div className='mt-1 break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                                      {formatDateTime(session.startedAt)}
                                    </div>
                                  </div>
                                  <div>
                                    <KangurMetaText caps size='xs'>
                                      Koniec
                                    </KangurMetaText>
                                    <div className='mt-1 break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                                      {endedLabel}
                                    </div>
                                  </div>
                                  <div>
                                    <KangurMetaText caps size='xs'>
                                      Czas trwania
                                    </KangurMetaText>
                                    <div className='mt-1 break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                                      {durationLabel}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {hasMoreSessions ? (
                          <div className='mt-3 flex justify-center'>
                            <KangurButton
                              className='w-full sm:w-auto'
                              disabled={isLoadingMoreSessions}
                              onClick={() => void handleLoadMoreSessions()}
                              size='sm'
                              variant='surface'
                              data-doc-id='parent_profile_sessions_load_more'
                            >
                              {isLoadingMoreSessions ? 'Ładowanie...' : 'Pokaż starsze sesje'}
                            </KangurButton>
                          </div>
                        ) : null}
                        {sessionsLoadMoreError ? (
                          <div className='mt-2 text-xs text-rose-600'>{sessionsLoadMoreError}</div>
                        ) : null}
                      </div>
                    )}
                  </KangurSummaryPanel>
                </KangurPanelStack>
              )}
            </KangurPanelStack>
          </KangurGlassPanel>
        ) : null}
      </KangurDialog>
    </KangurPanelStack>
  );
}
