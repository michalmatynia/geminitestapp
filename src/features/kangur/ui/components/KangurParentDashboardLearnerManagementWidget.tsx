'use client';

import { useLocale } from 'next-intl';
import { Eye, EyeOff, Settings } from 'lucide-react';
import { memo, useEffect, useId, useMemo, useState } from 'react';

import { KangurDialog } from '@/features/kangur/ui/components/KangurDialog';
import { KangurDialogHeader } from '@/features/kangur/ui/components/KangurDialogHeader';
import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/KangurIconSummaryOptionCard';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurLearnerSessionHistory } from '@kangur/platform';
import {
  useKangurParentDashboardRuntimeActions,
  useKangurParentDashboardRuntimeOverviewState,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
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
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';


const kangurPlatform = getKangurPlatform();
const SESSION_PAGE_LIMIT = 20;
type ProfileModalTabId = 'settings' | 'metrics';
const PROFILE_MODAL_TABS: Array<{ id: ProfileModalTabId; docId: string }> = [
  { id: 'settings', docId: 'parent_profile_tab_settings' },
  { id: 'metrics', docId: 'parent_profile_tab_metrics' },
];

type LearnerManagementCopy = {
  activeSession: string;
  activeStatus: string;
  addLearner: string;
  ageLabel: string;
  agePlaceholder: string;
  ageValue: (age: number) => string;
  cancel: string;
  confirmRemoval: string;
  createModalClose: string;
  createModalDescription: string;
  createModalTitle: string;
  currentProfileDescriptionPrefix: string;
  currentProfileLabel: string;
  disabledStatus: string;
  durationLabel: string;
  endLabel: string;
  hidePassword: string;
  inProgress: string;
  lastActivityLabel: string;
  lastProfileUpdateLabel: string;
  learnerCardAriaLabel: (displayName: string, statusLabel: string) => string;
  learnerLoginDescription: (loginName: string) => string;
  learnerManagementDescription: string;
  learnerManagementEyebrow: string;
  learnerManagementTitle: string;
  learnerNameLabel: string;
  learnerNamePlaceholder: string;
  learnerNicknameLabel: string;
  learnerNicknamePlaceholder: string;
  learnerPasswordLabel: string;
  learnerProfileSettings: string;
  learnerStatusLabel: string;
  loadMoreSessions: string;
  loading: string;
  loginLabel: string;
  loginOwnershipNote: string;
  loginSessionsDescription: string;
  loginSessionsEmptyDescription: string;
  loginSessionsEmptyTitle: string;
  loginSessionsLabel: string;
  metricsDescription: string;
  metricsTab: string;
  metricsTitle: string;
  newPasswordOptional: string;
  newProfileEyebrow: string;
  noData: string;
  noSessionsError: string;
  olderSessionsError: string;
  optional: string;
  profileCreatedLabel: string;
  profileDetailsDescription: string;
  profileDetailsLabel: string;
  profileSettingsDescription: string;
  profileSettingsTitle: string;
  removeLearnerProfile: string;
  removalWarning: string;
  saveLearner: string;
  selectedProfileHint: string;
  settingsClose: string;
  settingsTab: string;
  sessionCompleted: string;
  sessionErrorDescription: string;
  sessionLabel: (index: number) => string;
  sessionsClose: string;
  sessionsLoadingDescription: string;
  sessionsLoadingTitle: string;
  showPassword: string;
  startLabel: string;
  statusLabel: string;
  switchProfileHint: string;
  tabListLabel: string;
  updatedProfileDescription: string;
  widgetFeedbackPrefix: string;
};

const getLearnerManagementCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): LearnerManagementCopy => {
  if (locale === 'en') {
    return {
      activeSession: 'Active',
      activeStatus: 'Active',
      addLearner: 'Add learner',
      ageLabel: 'Age',
      agePlaceholder: 'Learner age',
      ageValue: (age) => `${age} years`,
      cancel: 'Cancel',
      confirmRemoval: 'Confirm removal',
      createModalClose: 'Close learner profile creation',
      createModalDescription: 'Add a child and set their login and password right away.',
      createModalTitle: 'New learner profile',
      currentProfileDescriptionPrefix: 'You are updating learner ',
      currentProfileLabel: 'Selected profile',
      disabledStatus: 'Disabled',
      durationLabel: 'Duration',
      endLabel: 'End',
      hidePassword: 'Hide password',
      inProgress: 'In progress',
      lastActivityLabel: 'Last login / activity',
      lastProfileUpdateLabel: 'Last profile update',
      learnerCardAriaLabel: (displayName, statusLabel) =>
        `Learner profile: ${displayName} (${statusLabel})`,
      learnerLoginDescription: (loginName) => `Login: ${loginName}`,
      learnerManagementDescription:
        'The parent signs in with email, and learners get separate login names and passwords.',
      learnerManagementEyebrow: 'Learner profiles',
      learnerManagementTitle: 'Manage profiles without leaving the dashboard',
      learnerNameLabel: 'Learner name',
      learnerNamePlaceholder: 'Learner name',
      learnerNicknameLabel: 'Nickname',
      learnerNicknamePlaceholder: 'nickname',
      learnerPasswordLabel: 'Password',
      learnerProfileSettings: 'Learner profile settings',
      learnerStatusLabel: 'Learner status',
      loadMoreSessions: 'Show older sessions',
      loading: 'Loading...',
      loginLabel: 'Learner login',
      loginOwnershipNote:
        'The login and password belong to the learner, but the account remains owned by the parent.',
      loginSessionsDescription: 'Learner login history with start and end times.',
      loginSessionsEmptyDescription:
        'The learner sessions will appear here after the first sign-in.',
      loginSessionsEmptyTitle: 'No login sessions.',
      loginSessionsLabel: 'Login sessions',
      metricsDescription: 'Quick details about the active learner profile, including recent activity.',
      metricsTab: 'Metrics',
      metricsTitle: 'Learner profile metrics',
      newPasswordOptional: 'New password (optional)',
      newProfileEyebrow: 'New profile',
      noData: 'No data',
      noSessionsError: 'Could not load the session history.',
      olderSessionsError: 'Could not load older sessions.',
      optional: 'optional',
      profileCreatedLabel: 'Profile created',
      profileDetailsDescription:
        'Quick details about the active learner profile, including recent activity.',
      profileDetailsLabel: 'Profile details',
      profileSettingsDescription:
        'Change the learner profile details, login, password, and activity status.',
      profileSettingsTitle: 'Learner profile settings',
      removeLearnerProfile: 'Remove learner profile',
      removalWarning:
        'Warning: removing the learner profile removes their login and access to data. This action cannot be undone.',
      saveLearner: 'Save learner',
      selectedProfileHint: 'Currently selected profile',
      settingsClose: 'Close learner profile settings',
      settingsTab: 'Settings',
      sessionCompleted: 'Completed',
      sessionErrorDescription: 'Try refreshing the metrics in a moment.',
      sessionLabel: (index) => `Session ${index}`,
      sessionsClose: 'Close learner profile metrics',
      sessionsLoadingDescription: 'We are loading the learner session history.',
      sessionsLoadingTitle: 'Loading sessions...',
      showPassword: 'Show password',
      startLabel: 'Start',
      statusLabel: 'Profile status',
      switchProfileHint: 'Click to switch profile',
      tabListLabel: 'Learner profile',
      updatedProfileDescription:
        'Change the learner profile details, login, password, and activity status.',
      widgetFeedbackPrefix: '',
    };
  }

  return {
    activeSession: 'Aktywna',
    activeStatus: 'Aktywny',
    addLearner: 'Dodaj ucznia',
    ageLabel: 'Wiek',
    agePlaceholder: 'Wiek ucznia',
    ageValue: (age) => `${age} lat`,
    cancel: 'Anuluj',
    confirmRemoval: 'Potwierdź usunięcie',
    createModalClose: 'Zamknij dodawanie profilu',
    createModalDescription: 'Dodaj dziecko i od razu ustaw jego login oraz hasło do gry.',
    createModalTitle: 'Nowy profil ucznia',
    currentProfileDescriptionPrefix: 'Aktualizujesz dane ucznia ',
    currentProfileLabel: 'Wybrany profil',
    disabledStatus: 'Wyłączony',
    durationLabel: 'Czas trwania',
    endLabel: 'Koniec',
    hidePassword: 'Ukryj hasło',
    inProgress: 'W trakcie',
    lastActivityLabel: 'Ostatnie logowanie / aktywność',
    lastProfileUpdateLabel: 'Ostatnia aktualizacja profilu',
    learnerCardAriaLabel: (displayName, statusLabel) =>
      `Profil ucznia: ${displayName} (${statusLabel})`,
    learnerLoginDescription: (loginName) => `Login: ${loginName}`,
    learnerManagementDescription:
      'Rodzic loguje się emailem, a uczniowie dostają osobne nazwy logowania i hasła.',
    learnerManagementEyebrow: 'Profile uczniów',
    learnerManagementTitle: 'Zarządzaj profilami bez opuszczania panelu',
    learnerNameLabel: 'Imię ucznia',
    learnerNamePlaceholder: 'Imię ucznia',
    learnerNicknameLabel: 'Nick',
    learnerNicknamePlaceholder: 'nick',
    learnerPasswordLabel: 'Hasło',
    learnerProfileSettings: 'Ustawienia profilu ucznia',
    learnerStatusLabel: 'Status ucznia',
    loadMoreSessions: 'Pokaż starsze sesje',
    loading: 'Ładowanie...',
    loginLabel: 'Login ucznia',
    loginOwnershipNote:
      'Login i hasło należą do ucznia, ale konto pozostaje własnością rodzica.',
    loginSessionsDescription: 'Historia logowań ucznia z czasem rozpoczęcia i zakończenia.',
    loginSessionsEmptyDescription: 'Sesje ucznia pojawią się tutaj po pierwszym logowaniu.',
    loginSessionsEmptyTitle: 'Brak sesji logowania.',
    loginSessionsLabel: 'Sesje logowania',
    metricsDescription: 'Szybkie dane o aktywnym profilu ucznia, w tym ostatnia aktywność.',
    metricsTab: 'Metryka',
    metricsTitle: 'Metryka profilu ucznia',
    newPasswordOptional: 'Nowe hasło (opcjonalnie)',
    newProfileEyebrow: 'Nowy profil',
    noData: 'Brak danych',
    noSessionsError: 'Nie udało się wczytać historii sesji.',
    olderSessionsError: 'Nie udało się wczytać starszych sesji.',
    optional: 'opcjonalnie',
    profileCreatedLabel: 'Profil utworzony',
    profileDetailsDescription:
      'Szybkie dane o aktywnym profilu ucznia, w tym ostatnia aktywność.',
    profileDetailsLabel: 'Szczegóły profilu',
    profileSettingsDescription:
      'Zmieniaj dane profilu ucznia, login, hasło oraz status aktywności.',
    profileSettingsTitle: 'Ustawienia profilu ucznia',
    removeLearnerProfile: 'Usuń profil ucznia',
    removalWarning:
      'Uwaga: usunięcie profilu ucznia usuwa jego login i dostęp do danych. Tej operacji nie da się cofnąć.',
    saveLearner: 'Zapisz ucznia',
    selectedProfileHint: 'Aktualnie wybrany profil',
    settingsClose: 'Zamknij ustawienia profilu',
    settingsTab: 'Ustawienia',
    sessionCompleted: 'Zakończona',
    sessionErrorDescription: 'Spróbuj odświeżyć metrykę za chwilę.',
    sessionLabel: (index) => `Sesja ${index}`,
    sessionsClose: 'Zamknij metrykę profilu',
    sessionsLoadingDescription: 'Ładujemy historię sesji ucznia.',
    sessionsLoadingTitle: 'Ładowanie sesji...',
    showPassword: 'Pokaż hasło',
    startLabel: 'Start',
    statusLabel: 'Status profilu',
    switchProfileHint: 'Kliknij, aby przełączyć profil',
    tabListLabel: 'Profil ucznia',
    updatedProfileDescription:
      'Zmieniaj dane profilu ucznia, login, hasło oraz status aktywności.',
    widgetFeedbackPrefix: '',
  };
};

export const KangurParentDashboardLearnerManagementWidget = memo(
function KangurParentDashboardLearnerManagementWidget(): React.JSX.Element | null {
  const locale = normalizeSiteLocale(useLocale());
  const copy = useMemo(() => getLearnerManagementCopy(locale), [locale]);
  const isCoarsePointer = useKangurCoarsePointer();
  const compactActionClassName = isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full sm:w-auto';
  const {
    activeLearner,
    canAccessDashboard,
    createForm,
    editForm,
    feedback,
    isSubmitting,
    isCreateLearnerModalOpen,
    learners,
    progress,
  } = useKangurParentDashboardRuntimeOverviewState();
  const {
    handleCreateLearner,
    handleDeleteLearner,
    handleSaveLearner,
    selectLearner,
    setCreateLearnerModalOpen,
    updateCreateField,
    updateEditField,
  } = useKangurParentDashboardRuntimeActions();
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
      return copy.noData;
    }
    const date = typeof value === 'number' ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return copy.noData;
    }
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };
  const formatSessionDuration = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined) {
      return copy.noData;
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
    profileModalTab === 'metrics' ? copy.metricsTitle : copy.profileSettingsTitle;
  const profileModalDescription =
    profileModalTab === 'metrics' ? copy.metricsDescription : copy.profileSettingsDescription;
  const profileModalCloseLabel =
    profileModalTab === 'metrics' ? copy.sessionsClose : copy.settingsClose;

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
          setSessionsLoadMoreError(copy.olderSessionsError);
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
        setSessionsError(copy.noSessionsError);
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingSessions(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeLearnerId, copy.noSessionsError, isProfileSettingsModalOpen, profileModalTab]);

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
            eyebrow={copy.learnerManagementEyebrow}
            title={learnerManagementContent?.title ?? copy.learnerManagementTitle}
            description={learnerManagementContent?.summary ?? copy.learnerManagementDescription}
            descriptionClassName='max-w-2xl'
          />

          <div className='grid kangur-panel-gap sm:grid-cols-2'>
            {learners.map((learner) => {
              const isActiveLearner = learner.id === activeLearner?.id;
              const initial = learner.displayName.trim().charAt(0).toUpperCase() || '?';
              const learnerStatusLabel =
                learner.status === 'active' ? copy.activeStatus : copy.disabledStatus;
              return (
                <KangurIconSummaryOptionCard
                  accent='indigo'
                  aria-pressed={isActiveLearner}
                  aria-label={copy.learnerCardAriaLabel(learner.displayName, learnerStatusLabel)}
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
                        {learnerStatusLabel}
                      </KangurStatusChip>
                    }
                    asideClassName='self-start sm:ml-auto sm:w-auto'
                    className='w-full flex-col items-start sm:flex-row sm:items-center'
                    contentClassName='w-full min-w-0 flex-1'
                    description={copy.learnerLoginDescription(learner.loginName)}
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
                        {isActiveLearner ? copy.selectedProfileHint : copy.switchProfileHint}
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
            aria-label={copy.learnerProfileSettings}
            title={copy.learnerProfileSettings}
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
            title={copy.createModalTitle}
            description={copy.createModalDescription}
            closeAriaLabel={copy.createModalClose}
          />

          <KangurGlassPanel className='w-full' padding='lg' surface='mistStrong' variant='soft'>
            <KangurPanelStack>
              <KangurWidgetIntro
                eyebrow={copy.newProfileEyebrow}
                description={copy.createModalDescription}
              />

              <div className='grid kangur-panel-gap min-[420px]:grid-cols-2 xl:grid-cols-3'>
                <KangurTextField
                  accent='indigo'
                  maxLength={120}
                  value={createForm.displayName}
                  onChange={(event) => updateCreateField('displayName', event.target.value)}
                  placeholder={copy.learnerNamePlaceholder}
                  aria-label={copy.learnerNameLabel}
                  title={copy.learnerNameLabel}
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
                    placeholder={copy.agePlaceholder}
                    aria-label={copy.ageLabel}
                    title={copy.ageLabel}
                  />
                  <span className='text-xs [color:var(--kangur-page-muted-text)]'>
                    {copy.optional}
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
                  placeholder={copy.learnerNicknamePlaceholder}
                  aria-label={copy.learnerNicknameLabel}
                  title={copy.learnerNicknameLabel}
                />
                <div className='relative'>
                  <KangurTextField
                    accent='indigo'
                    type={isCreatePasswordVisible ? 'text' : 'password'}
                    minLength={8}
                    maxLength={160}
                    value={createForm.password}
                    onChange={(event) => updateCreateField('password', event.target.value)}
                    placeholder={copy.learnerPasswordLabel}
                    aria-label={copy.learnerPasswordLabel}
                    title={copy.learnerPasswordLabel}
                    className='pr-12'
                    id={createPasswordInputId}
                  />
                  <button
                    type='button'
                    onClick={() => setIsCreatePasswordVisible((prev) => !prev)}
                    aria-label={isCreatePasswordVisible ? copy.hidePassword : copy.showPassword}
                    aria-pressed={isCreatePasswordVisible}
                    aria-controls={createPasswordInputId}
                    className={cn(
                      'absolute right-3 top-1/2 -translate-y-1/2 rounded-full',
                      isCoarsePointer
                        ? 'h-11 w-11 touch-manipulation select-none active:scale-[0.97]'
                        : 'p-2',
                      'inline-flex items-center justify-center text-slate-500 transition hover:text-slate-700',
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
                  className={compactActionClassName}
                  disabled={isSubmitting}
                  onClick={() => void handleCreateLearner()}
                  size='sm'
                  variant='surface'
                  data-doc-id='parent_create_learner'
                >
                  {copy.addLearner}
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
                aria-label={copy.tabListLabel}
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
                    {tab.id === 'metrics' ? copy.metricsTab : copy.settingsTab}
                  </KangurButton>
                ))}
              </div>

              {profileModalTab === 'settings' ? (
                <KangurPanelStack>
                  <KangurWidgetIntro
                    eyebrow={copy.currentProfileLabel}
                    description={
                      <>
                        {copy.currentProfileDescriptionPrefix}
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
                      placeholder={copy.learnerNamePlaceholder}
                      aria-label={copy.learnerNameLabel}
                      title={copy.learnerNameLabel}
                    />
                    <KangurTextField
                      accent='indigo'
                      maxLength={80}
                      value={editForm.loginName}
                      onChange={(event) => updateEditField('loginName', event.target.value)}
                      placeholder={copy.loginLabel}
                      aria-label={copy.loginLabel}
                      title={copy.loginLabel}
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
                      placeholder={copy.newPasswordOptional}
                      aria-label={copy.newPasswordOptional}
                      title={copy.newPasswordOptional}
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
                      aria-label={copy.learnerStatusLabel}
                      title={copy.learnerStatusLabel}
                    >
                      <option value='active'>{copy.activeStatus}</option>
                      <option value='disabled'>{copy.disabledStatus}</option>
                    </KangurSelectField>
                  </div>
                  <KangurPanelRow className='sm:flex-wrap sm:items-center'>
                    <KangurButton
                      className={compactActionClassName}
                      disabled={isSubmitting}
                      onClick={() => void handleEditSave()}
                      size='sm'
                      variant='surface'
                      data-doc-id='parent_save_learner'
                    >
                      {copy.saveLearner}
                    </KangurButton>
                    <KangurButton
                      className={cn(compactActionClassName, 'text-rose-600 hover:text-rose-700')}
                      disabled={isSubmitting}
                      onClick={() => setPendingRemovalId(activeLearner.id)}
                      size='sm'
                      variant='surface'
                      data-doc-id='parent_remove_learner'
                    >
                      {copy.removeLearnerProfile}
                    </KangurButton>
                    <div className='text-xs [color:var(--kangur-page-muted-text)]'>
                      {copy.loginOwnershipNote}
                    </div>
                  </KangurPanelRow>
                  {isRemovalPending ? (
                    <div
                      className='rounded-[20px] border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700'
                      role='alert'
                    >
                      <p className='font-semibold'>{copy.removalWarning}</p>
                      <div className={`mt-3 ${KANGUR_TIGHT_ROW_CLASSNAME} sm:items-center`}>
                        <KangurButton
                          className={compactActionClassName}
                          disabled={isSubmitting}
                          onClick={() => setPendingRemovalId(null)}
                          size='sm'
                          variant='surface'
                        >
                          {copy.cancel}
                        </KangurButton>
                        <KangurButton
                          className={cn(
                            compactActionClassName,
                            'border-rose-500 bg-rose-500 text-white hover:bg-rose-600 hover:border-rose-600'
                          )}
                          disabled={isSubmitting}
                          onClick={() => {
                            setPendingRemovalId(null);
                            void handleEditDelete(activeLearner.id);
                          }}
                          size='sm'
                          variant='primary'
                        >
                          {copy.confirmRemoval}
                        </KangurButton>
                      </div>
                    </div>
                  ) : null}
                </KangurPanelStack>
              ) : (
                <KangurPanelStack>
                  <KangurSummaryPanel
                    accent='indigo'
                    description={copy.profileDetailsDescription}
                    label={copy.profileDetailsLabel}
                  >
                    <div className='mt-3 grid grid-cols-1 kangur-panel-gap sm:grid-cols-2'>
                      <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                        <KangurMetaText caps size='xs'>
                          {copy.loginLabel}
                        </KangurMetaText>
                        <div className='mt-1 break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {activeLearner.loginName}
                        </div>
                      </div>
                      <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                        <KangurMetaText caps size='xs'>
                          {copy.statusLabel}
                        </KangurMetaText>
                        <div className='mt-1 break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {activeLearner.status === 'active' ? copy.activeStatus : copy.disabledStatus}
                        </div>
                      </div>
                      <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                        <KangurMetaText caps size='xs'>
                          {copy.ageLabel}
                        </KangurMetaText>
                        <div className='mt-1 break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {typeof activeLearner.age === 'number'
                            ? copy.ageValue(activeLearner.age)
                            : copy.noData}
                        </div>
                      </div>
                      <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                        <KangurMetaText caps size='xs'>
                          {copy.lastActivityLabel}
                        </KangurMetaText>
                        <div className='mt-1 break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {lastActivityLabel}
                        </div>
                      </div>
                      <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                        <KangurMetaText caps size='xs'>
                          {copy.profileCreatedLabel}
                        </KangurMetaText>
                        <div className='mt-1 break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {formatDateTime(activeLearner.createdAt)}
                        </div>
                      </div>
                      <div className='rounded-[22px] border border-indigo-200/70 bg-white/80 px-4 py-3'>
                        <KangurMetaText caps size='xs'>
                          {copy.lastProfileUpdateLabel}
                        </KangurMetaText>
                        <div className='mt-1 break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {formatDateTime(activeLearner.updatedAt)}
                        </div>
                      </div>
                    </div>
                  </KangurSummaryPanel>

                  <KangurSummaryPanel
                    accent='slate'
                    description={copy.loginSessionsDescription}
                    label={copy.loginSessionsLabel}
                  >
                    {isLoadingSessions ? (
                      <KangurEmptyState
                        accent='slate'
                        align='center'
                        data-testid='parent-profile-sessions-loading'
                        description={copy.sessionsLoadingDescription}
                        title={copy.sessionsLoadingTitle}
                      />
                    ) : sessionsError ? (
                      <KangurEmptyState
                        accent='rose'
                        align='center'
                        data-testid='parent-profile-sessions-error'
                        description={copy.sessionErrorDescription}
                        title={sessionsError}
                      />
                    ) : sessions.length === 0 ? (
                      <KangurEmptyState
                        accent='slate'
                        align='center'
                        data-testid='parent-profile-sessions-empty'
                        description={copy.loginSessionsEmptyDescription}
                        title={copy.loginSessionsEmptyTitle}
                      />
                    ) : (
                      <div className='mt-3 max-h-72 overflow-y-auto pr-1'>
                        <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
                          {sessions.map((session, index) => {
                            const endedLabel = session.endedAt
                              ? formatDateTime(session.endedAt)
                              : copy.inProgress;
                            const durationLabel = session.endedAt
                              ? formatSessionDuration(session.durationSeconds)
                              : copy.inProgress;
                            return (
                              <div
                                key={session.id}
                                className='rounded-[20px] border border-slate-200/80 bg-white/80 px-4 py-3'
                                data-testid={`parent-profile-session-${session.id}`}
                              >
                                <div className='flex items-center justify-between text-xs font-semibold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                                  <span>{copy.sessionLabel(index + 1)}</span>
                                  <span>{session.endedAt ? copy.sessionCompleted : copy.activeSession}</span>
                                </div>
                                <div className='mt-2 grid kangur-panel-gap sm:grid-cols-3'>
                                  <div>
                                    <KangurMetaText caps size='xs'>
                                      {copy.startLabel}
                                    </KangurMetaText>
                                    <div className='mt-1 break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                                      {formatDateTime(session.startedAt)}
                                    </div>
                                  </div>
                                  <div>
                                    <KangurMetaText caps size='xs'>
                                      {copy.endLabel}
                                    </KangurMetaText>
                                    <div className='mt-1 break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                                      {endedLabel}
                                    </div>
                                  </div>
                                  <div>
                                    <KangurMetaText caps size='xs'>
                                      {copy.durationLabel}
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
                              className={compactActionClassName}
                              disabled={isLoadingMoreSessions}
                              onClick={() => void handleLoadMoreSessions()}
                              size='sm'
                              variant='surface'
                              data-doc-id='parent_profile_sessions_load_more'
                            >
                              {isLoadingMoreSessions ? copy.loading : copy.loadMoreSessions}
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
});
