import {
  BookOpen,
  Home,
  LayoutGrid,
  LogIn,
  LogOut,
  UserRound,
} from 'lucide-react';
import { useMemo } from 'react';

import {
  appendKangurUrlParams,
  getKangurHomeHref,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import KangurBadgeTrackHighlights from '@/features/kangur/ui/components/KangurBadgeTrackHighlights';
import KangurDailyQuestHighlightCardContent from '@/features/kangur/ui/components/KangurDailyQuestHighlightCardContent';
import KangurHeroMilestoneSummary from '@/features/kangur/ui/components/KangurHeroMilestoneSummary';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurParentDashboardRuntime } from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  KangurButton,
  KangurSectionEyebrow,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';

const PARENT_DASHBOARD_ROUTE_ACKNOWLEDGE_MS = 110;

const buildAssignmentHref = (
  basePath: string,
  action: {
    page: 'Game' | 'Lessons' | 'ParentDashboard' | 'LearnerProfile';
    query?: Record<string, string>;
  }
): string => {
  const href = createPageUrl(action.page, basePath);
  return action.query ? appendKangurUrlParams(href, action.query, basePath) : href;
};

export function KangurParentDashboardHeroWidget({
  showActions = true,
}: {
  showActions?: boolean;
}): React.JSX.Element {
  const routeNavigator = useKangurRouteNavigator();
  const {
    activeLearner,
    basePath,
    canManageLearners,
    isAuthenticated,
    logout,
    navigateToLogin,
    progress,
    viewerName,
    viewerRoleLabel,
  } = useKangurParentDashboardRuntime();
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
        onBack={handleGoHome}
        testId='kangur-parent-dashboard-hero'
        title={guestHeroContent?.title ?? 'Panel Rodzica / Nauczyciela'}
      >
        <div className='grid w-full gap-3 sm:flex sm:w-auto sm:flex-row'>
          <KangurButton
            className='w-full sm:w-auto'
            onClick={() => {
              navigateToLogin();
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
                navigateToLogin({ authMode: 'create-account' });
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

  const dailyQuest = useMemo(() => getCurrentKangurDailyQuest(progress), [progress]);
  const dailyQuestAccent =
    dailyQuest?.reward.status === 'claimed'
      ? 'emerald'
      : dailyQuest?.progress.status === 'completed'
        ? 'amber'
        : dailyQuest?.progress.status === 'in_progress'
          ? 'indigo'
          : 'slate';

  return (
    <KangurPageIntroCard
      accent='indigo'
      className='mx-auto w-full max-w-2xl'
      description={
        <>
          {dashboardHeroContent?.summary ? `${dashboardHeroContent.summary} ` : null}
          Rola: <span className='font-semibold [color:var(--kangur-page-text)]'>{viewerRoleLabel}</span>. Konto
          właściciela: <span className='font-semibold [color:var(--kangur-page-text)]'>{viewerName}</span>. Wybrany
          uczeń:{' '}
          <span className='font-semibold [color:var(--kangur-page-text)]'>
            {activeLearner?.displayName ?? 'Brak profilu'}
          </span>
          .
        </>
      }
      headingAs='h1'
      onBack={handleGoToProfile}
      testId='kangur-parent-dashboard-hero'
      title={dashboardHeroContent?.title ?? 'Panel Rodzica'}
    >
      {dailyQuest ? (
        <div
          className='soft-card mb-3 rounded-[28px] border border-indigo-200/80 px-4 py-4 text-left shadow-[0_18px_40px_-32px_rgba(79,99,216,0.35)]'
          data-testid='kangur-parent-dashboard-daily-quest'
          style={{
            background:
              'color-mix(in srgb, var(--kangur-soft-card-background) 88%, rgba(224,231,255,0.92))',
          }}
        >
          <KangurDailyQuestHighlightCardContent
            action={
              <KangurButton
                asChild
                className='w-full sm:w-auto sm:shrink-0'
                size='sm'
                variant='surface'
              >
                <Link
                  href={buildAssignmentHref(basePath, dailyQuest.assignment.action)}
                  targetPageKey={dailyQuest.assignment.action.page}
                  transitionAcknowledgeMs={PARENT_DASHBOARD_ROUTE_ACKNOWLEDGE_MS}
                  transitionSourceId='parent-dashboard-daily-quest'
                >
                  {dailyQuest.assignment.action.label}
                </Link>
              </KangurButton>
            }
            description={dailyQuest.progress.summary}
            progressAccent={dailyQuestAccent}
            progressLabel={`${dailyQuest.progress.percent}%`}
            questLabel={dailyQuest.assignment.questLabel ?? 'Misja dnia'}
            rewardAccent={dailyQuest.reward.status === 'claimed' ? 'emerald' : dailyQuestAccent}
            rewardLabel={dailyQuest.reward.label}
            title={
              <>
                {activeLearner?.displayName ? `${activeLearner.displayName}: ` : ''}
                {dailyQuest.assignment.title}
              </>
            }
          />
        </div>
      ) : null}

      <div className='mb-3 text-left' data-testid='kangur-parent-dashboard-track-summary'>
        <KangurSectionEyebrow as='p' className='mb-2 tracking-[0.18em]'>
          Ścieżki postępu ucznia
        </KangurSectionEyebrow>
        <KangurHeroMilestoneSummary
          className='mb-3'
          dataTestIdPrefix='kangur-parent-dashboard-hero-milestone'
          progress={progress}
        />
        <KangurBadgeTrackHighlights
          dataTestIdPrefix='kangur-parent-dashboard-track'
          limit={3}
          progress={progress}
        />
      </div>

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
