'use client';

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
import KangurHeroMilestoneSummary from '@/features/kangur/ui/components/KangurHeroMilestoneSummary';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurParentDashboardRuntime } from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  KangurButton,
  KangurCardDescription,
  KangurCardTitle,
  KangurSectionEyebrow,
  KangurStatusChip,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
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
    return (
      <KangurPageIntroCard
        accent='indigo'
        className='mx-auto w-full max-w-2xl'
        description='Ten widok pokazuje prywatne postepy ucznia, wiec wymaga konta rodzica. Jesli go jeszcze nie masz, zaloz je bez opuszczania StudiQ.'
        headingAs='h1'
        onBack={handleGoHome}
        testId='kangur-parent-dashboard-hero'
        title='Panel Rodzica / Nauczyciela'
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
            Zaloguj sie
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
            >
              Utworz konto rodzica
            </button>
          </KangurButton>
        </div>
      </KangurPageIntroCard>
    );
  }

  if (!canManageLearners) {
    return (
      <KangurPageIntroCard
        accent='slate'
        className='mx-auto w-full max-w-2xl'
        description='Ten widok jest dostepny tylko dla konta rodzica, ktore zarzadza profilami uczniow.'
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
          Wroc do profilu ucznia
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
          Rola: <span className='font-semibold [color:var(--kangur-page-text)]'>{viewerRoleLabel}</span>. Konto
          wlasciciela: <span className='font-semibold [color:var(--kangur-page-text)]'>{viewerName}</span>. Wybrany
          uczen:{' '}
          <span className='font-semibold [color:var(--kangur-page-text)]'>
            {activeLearner?.displayName ?? 'Brak profilu'}
          </span>
          .
        </>
      }
      headingAs='h1'
      onBack={handleGoToProfile}
      testId='kangur-parent-dashboard-hero'
      title='Panel Rodzica'
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
          <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-2'>
                <KangurStatusChip
                  accent='violet'
                  labelStyle='caps'
                >
                  {dailyQuest.assignment.questLabel ?? 'Misja dnia'}
                </KangurStatusChip>
                <KangurStatusChip
                  accent={dailyQuestAccent}
                  labelStyle='caps'
                >
                  {dailyQuest.progress.percent}%
                </KangurStatusChip>
                <KangurStatusChip
                  accent={dailyQuest.reward.status === 'claimed' ? 'emerald' : dailyQuestAccent}
                  labelStyle='caps'
                >
                  {dailyQuest.reward.label}
                </KangurStatusChip>
              </div>
              <KangurCardTitle as='p' className='mt-3'>
                {activeLearner?.displayName ? `${activeLearner.displayName}: ` : ''}
                {dailyQuest.assignment.title}
              </KangurCardTitle>
              <KangurCardDescription as='p' className='mt-1 leading-5' size='xs'>
                {dailyQuest.progress.summary}
              </KangurCardDescription>
            </div>
            <KangurButton asChild className='w-full sm:w-auto sm:shrink-0' size='sm' variant='surface'>
              <Link
                href={buildAssignmentHref(basePath, dailyQuest.assignment.action)}
                targetPageKey={dailyQuest.assignment.action.page}
                transitionAcknowledgeMs={PARENT_DASHBOARD_ROUTE_ACKNOWLEDGE_MS}
                transitionSourceId='parent-dashboard-daily-quest'
              >
                {dailyQuest.assignment.action.label}
              </Link>
            </KangurButton>
          </div>
        </div>
      ) : null}

      <div className='mb-3 text-left' data-testid='kangur-parent-dashboard-track-summary'>
        <KangurSectionEyebrow as='p' className='mb-2 tracking-[0.18em]'>
          Sciezki postepu ucznia
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
