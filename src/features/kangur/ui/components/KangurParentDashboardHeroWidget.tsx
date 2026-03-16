'use client';

import {
  BookOpen,
  Home,
  LayoutGrid,
  LogIn,
  LogOut,
  UserRound,
} from 'lucide-react';
import { type RefObject, useMemo } from 'react';

import { getKangurHomeHref, getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { KANGUR_LESSONS_SETTING_KEY, parseKangurLessons } from '@/features/kangur/settings';
import { KangurParentDashboardLearnerManagementWidget } from '@/features/kangur/ui/components/KangurParentDashboardLearnerManagementWidget';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useKangurParentDashboardRuntime } from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurSummaryPanel,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import { useKangurLearnerActivityStatus } from '@/features/kangur/ui/hooks/useKangurLearnerActivity';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { buildKangurLearnerLiveState } from '@/features/kangur/ui/services/learner-live-state';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';

const PARENT_DASHBOARD_ROUTE_ACKNOWLEDGE_MS = 110;
const LEARNER_ACTIVITY_REFRESH_MS = 10_000;

export function KangurParentDashboardHeroWidget({
  showActions = true,
  showLearnerManagement = false,
  learnerManagementAnchorRef,
}: {
  showActions?: boolean;
  showLearnerManagement?: boolean;
  learnerManagementAnchorRef?: RefObject<HTMLDivElement | null>;
}): React.JSX.Element {
  const routeNavigator = useKangurRouteNavigator();
  const {
    activeLearner,
    basePath,
    canManageLearners,
    isAuthenticated,
    logout,
    progress,
    setCreateLearnerModalOpen,
    viewerName,
    viewerRoleLabel,
  } = useKangurParentDashboardRuntime();
  const activeLearnerId = activeLearner?.id ?? null;
  const hasActiveLearner = Boolean(activeLearnerId);
  const { status: learnerActivityStatus, isLoading: isActivityLoading } =
    useKangurLearnerActivityStatus({
      enabled: canManageLearners && hasActiveLearner,
      learnerId: activeLearnerId,
      refreshIntervalMs: LEARNER_ACTIVITY_REFRESH_MS,
    });
  const settingsStore = useSettingsStore();
  const rawLessons = settingsStore.get(KANGUR_LESSONS_SETTING_KEY);
  const lessons = useMemo(() => parseKangurLessons(rawLessons), [rawLessons]);
  const learnerLiveState = useMemo(
    () =>
      buildKangurLearnerLiveState({
        activityStatus: learnerActivityStatus,
        isActivityLoading,
        progress,
        lessons,
        basePath,
      }),
    [basePath, isActivityLoading, learnerActivityStatus, lessons, progress]
  );
  const isLearnerOnline = learnerLiveState.isOnline;
  const activityLabel = learnerLiveState.label;
  const activityDescription = learnerLiveState.description;
  const activityHref = learnerLiveState.href;
  const shouldShowActivityLink = learnerLiveState.showLink;
  const { openLoginModal } = useKangurLoginModal();
  const { entry: guestHeroContent } = useKangurPageContentEntry('parent-dashboard-guest-hero');
  const { entry: dashboardHeroContent } = useKangurPageContentEntry('parent-dashboard-hero');
  const handleGoHome = (): void => {
    routeNavigator.push(getKangurHomeHref(basePath), {
      acknowledgeMs: PARENT_DASHBOARD_ROUTE_ACKNOWLEDGE_MS,
      pageKey: 'Game',
      sourceId: 'parent-dashboard-hero:back-home',
    });
  };
  const handleGoToProfile = (): void => {
    routeNavigator.push(createPageUrl('LearnerProfile', basePath), {
      acknowledgeMs: PARENT_DASHBOARD_ROUTE_ACKNOWLEDGE_MS,
      pageKey: 'LearnerProfile',
      sourceId: 'parent-dashboard-hero:back-profile',
    });
  };
  const handleCreateLearner = (): void => {
    setCreateLearnerModalOpen(true);
  };

  if (!isAuthenticated) {
    const guestDescription = guestHeroContent?.summary
      ? `${guestHeroContent.summary} Jeśli nie masz jeszcze konta rodzica, załóż je bez opuszczania StudiQ.`
      : 'Ten widok pokazuje prywatne postępy ucznia, więc wymaga konta rodzica. Jeśli go jeszcze nie masz, załóż je bez opuszczania StudiQ.';

    return (
      <KangurPageIntroCard
        accent='indigo'
        className='mx-auto w-full max-w-2xl'
        description={guestDescription}
        headingAs='h1'
        showBackButton={false}
        onBack={handleGoHome}
        testId='kangur-parent-dashboard-hero'
        title={guestHeroContent?.title ?? 'Panel Rodzica / Nauczyciela'}
      >
        <div className='grid w-full kangur-panel-gap sm:flex sm:w-auto sm:flex-row'>
          <KangurButton
            className='w-full sm:w-auto'
            onClick={() => {
              openLoginModal();
            }}
            size='lg'
            variant='primary'
            data-doc-id='profile_login'
          >
            <LogIn className='h-5 w-5' />
            Zaloguj się
          </KangurButton>
          <KangurButton
            asChild
            className='w-full sm:w-auto'
            size='lg'
            variant='surface'
          >
            <button
              onClick={() => {
                openLoginModal(null, { authMode: 'create-account' });
              }}
              type='button'
              aria-label='Utwórz konto rodzica'
            >
              Utwórz konto rodzica
            </button>
          </KangurButton>
        </div>
      </KangurPageIntroCard>
    );
  }

  if (!canManageLearners) {
    const restrictedDescription = guestHeroContent?.summary
      ? `${guestHeroContent.summary} Ten widok jest dostępny tylko dla konta rodzica, które zarządza profilami uczniów.`
      : 'Ten widok jest dostępny tylko dla konta rodzica, które zarządza profilami uczniów.';

    return (
      <KangurPageIntroCard
        accent='slate'
        className='mx-auto w-full max-w-2xl'
        description={restrictedDescription}
        headingAs='h1'
        showBackButton={false}
        onBack={handleGoToProfile}
        testId='kangur-parent-dashboard-hero'
        title='Panel Rodzica'
      >
        <KangurButton
          className='w-full sm:w-auto'
          onClick={handleGoToProfile}
          size='lg'
          variant='primary'
          data-doc-id='top_nav_profile'
        >
          Wróć do profilu ucznia
        </KangurButton>
      </KangurPageIntroCard>
    );
  }

  const shouldShowCreateLearner = showLearnerManagement && canManageLearners;

  return (
    <KangurPageIntroCard
      accent='indigo'
      className='mx-auto w-full max-w-2xl'
      description={
        <>
          Wybrany uczeń:{' '}
          <span className='break-words font-semibold [color:var(--kangur-page-text)]'>
            {activeLearner?.displayName ?? 'Brak profilu ucznia'}
          </span>
          .
          <span className='mt-1 block text-xs [color:var(--kangur-page-muted-text)]'>
            {viewerRoleLabel ?? 'Rodzic'}:{' '}
            <span className='break-words font-semibold [color:var(--kangur-page-text)]'>
              {viewerName}
            </span>
          </span>
        </>
      }
      headingAs='h1'
      headingAction={
        shouldShowCreateLearner ? (
          <KangurButton
            className='w-full sm:w-auto'
            onClick={handleCreateLearner}
            size='sm'
            variant='surface'
            data-doc-id='parent_open_create_learner'
          >
            Dodaj ucznia
          </KangurButton>
        ) : null
      }
      showBackButton={false}
      onBack={handleGoToProfile}
      testId='kangur-parent-dashboard-hero'
      title={dashboardHeroContent?.title ?? 'Panel Rodzica'}
    >
      {showLearnerManagement ? (
        <div className='mt-4 text-left' ref={learnerManagementAnchorRef}>
          <KangurParentDashboardLearnerManagementWidget />
          {!hasActiveLearner ? (
            <div className='mt-4'>
              <KangurEmptyState
                align='left'
                className='text-left'
                padding='md'
                title='Brak profilu ucznia'
                description='Dodaj lub wybierz profil ucznia w sekcji poniżej, aby zobaczyć postęp i misje dnia.'
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {hasActiveLearner ? (
        <KangurSummaryPanel
          accent={isLearnerOnline ? 'emerald' : 'slate'}
          className='mt-4 text-left'
          data-testid='kangur-parent-dashboard-learner-activity'
          description={activityDescription}
          label={activityLabel}
          padding='sm'
          tone='accent'
        >
          {shouldShowActivityLink ? (
            <KangurButton asChild className='w-full sm:w-auto' size='sm' variant='surface'>
              <Link
                href={activityHref ?? createPageUrl('Game', basePath)}
                transitionAcknowledgeMs={PARENT_DASHBOARD_ROUTE_ACKNOWLEDGE_MS}
                transitionSourceId='parent-dashboard-hero:learner-activity'
              >
                Otwórz aktywność
              </Link>
            </KangurButton>
          ) : null}
        </KangurSummaryPanel>
      ) : null}

      {showActions ? (
        <div className='flex flex-col items-center gap-2'>
          <div className='flex w-full justify-center'>
            <KangurTopNavGroup label='Szybkie akcje rodzica' className='w-full sm:w-auto'>
              <KangurButton asChild size='sm' variant='navigation'>
                <Link
                  href={getKangurHomeHref(basePath)}
                  targetPageKey='Game'
                  transitionAcknowledgeMs={PARENT_DASHBOARD_ROUTE_ACKNOWLEDGE_MS}
                  transitionSourceId='parent-dashboard-nav:home'
                >
                  <Home className='h-4 w-4' /> Gra
                </Link>
              </KangurButton>
              <KangurButton asChild size='sm' variant='navigation'>
                <Link
                  href={createPageUrl('Lessons', basePath)}
                  targetPageKey='Lessons'
                  transitionAcknowledgeMs={PARENT_DASHBOARD_ROUTE_ACKNOWLEDGE_MS}
                  transitionSourceId='parent-dashboard-nav:lessons'
                >
                  <BookOpen className='h-4 w-4' /> Lekcje
                </Link>
              </KangurButton>
              <KangurButton asChild size='sm' variant='navigation'>
                <Link
                  href={createPageUrl('LearnerProfile', basePath)}
                  targetPageKey='LearnerProfile'
                  transitionAcknowledgeMs={PARENT_DASHBOARD_ROUTE_ACKNOWLEDGE_MS}
                  transitionSourceId='parent-dashboard-nav:profile'
                >
                  <UserRound className='h-4 w-4' /> Profil
                </Link>
              </KangurButton>
              <KangurButton asChild size='sm' variant='navigationActive'>
                <Link
                  href={createPageUrl('ParentDashboard', basePath)}
                  targetPageKey='ParentDashboard'
                  transitionAcknowledgeMs={PARENT_DASHBOARD_ROUTE_ACKNOWLEDGE_MS}
                  transitionSourceId='parent-dashboard-nav:dashboard'
                >
                  <LayoutGrid className='h-4 w-4' /> Rodzic
                </Link>
              </KangurButton>
            </KangurTopNavGroup>
          </div>
          <KangurButton
            className='w-full sm:w-auto'
            onClick={() => logout(false)}
            size='sm'
            type='button'
            variant='ghost'
            data-doc-id='profile_logout'
          >
            <LogOut className='h-4 w-4' /> Wyloguj
          </KangurButton>
        </div>
      ) : null}
    </KangurPageIntroCard>
  );
}
