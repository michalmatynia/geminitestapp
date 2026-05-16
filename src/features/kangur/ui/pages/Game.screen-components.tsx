'use client';

import dynamic from 'next/dynamic';
import { useLocale, type useTranslations } from 'next-intl';
import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { KangurGameHomeActionsWidget } from '@/features/kangur/ui/components/game-home/KangurGameHomeActionsWidget';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurIdleReady } from '@/features/kangur/ui/hooks/useKangurIdleReady';
import { prefetchKangurPageContentStore } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { prefetchKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { prefetchKangurLeaderboardScores } from '@/features/kangur/ui/hooks/useKangurLeaderboardState';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  KangurButton,
  KangurEmptyState,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_TIGHT_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import {
  GAME_HOME_FAR_FOLD_IDLE_DELAY_MS,
  GAME_HOME_LAYOUT_CLASSNAME,
  GAME_HOME_NEAR_FOLD_IDLE_DELAY_MS,
} from '@/features/kangur/ui/pages/GameHome.constants';
import { type resolveKangurGameHomeVisibility } from '@/features/kangur/ui/pages/GameHome.visibility';
import {
  KangurGameHomeSections,
} from '@/features/kangur/ui/pages/GameHome.layout';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import type {
  GameHomeScreenRefs,
} from './Game.screen-refs';

const GAME_SCREEN_TITLE_ID = 'kangur-game-screen-title';

const DynamicLoadingFallback = (): React.JSX.Element => (
  <div className='h-24 w-full animate-pulse rounded-2xl bg-slate-100/60' />
);

const SkeletonRow = ({ className }: { className?: string }): React.JSX.Element => (
  <div className={cn('h-4 animate-pulse rounded-full bg-slate-100/70', className)} />
);

const SkeletonBlock = ({ className }: { className?: string }): React.JSX.Element => (
  <div className={cn('animate-pulse rounded-2xl bg-slate-100/60', className)} />
);

const DuelsInvitesSkeleton = (): React.JSX.Element => (
  <div className='flex flex-col gap-3 rounded-2xl bg-white/40 p-4' data-testid='kangur-home-duels-invites-fallback'>
    <SkeletonRow className='w-1/3' />
    <SkeletonBlock className='h-16 w-full' />
    <SkeletonBlock className='h-16 w-full' />
  </div>
);

const QuestSkeleton = (): React.JSX.Element => (
  <div className='flex flex-col gap-3 rounded-2xl bg-white/40 p-4' data-testid='kangur-home-quest-fallback'>
    <SkeletonRow className='w-2/5' />
    <SkeletonBlock className='h-24 w-full' />
  </div>
);

const HeroSkeleton = (): React.JSX.Element => (
  <div className='flex flex-col gap-3 rounded-2xl bg-white/40 p-4' data-testid='kangur-home-hero-fallback'>
    <SkeletonRow className='w-1/4' />
    <SkeletonBlock className='h-32 w-full' />
    <SkeletonRow className='w-1/2' />
  </div>
);

const LeaderboardSkeleton = (): React.JSX.Element => (
  <div className='flex flex-col gap-3 rounded-2xl bg-white/40 p-4' data-testid='kangur-home-leaderboard-fallback'>
    <SkeletonRow className='w-1/3' />
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className='flex items-center gap-3'>
        <SkeletonBlock className='h-8 w-8 flex-shrink-0 rounded-full' />
        <SkeletonRow className='flex-1' />
      </div>
    ))}
  </div>
);

const PlayerProgressSkeleton = (): React.JSX.Element => (
  <div className='flex flex-col gap-3 rounded-2xl bg-white/40 p-4' data-testid='kangur-home-player-progress-fallback'>
    <SkeletonRow className='w-2/5' />
    <SkeletonBlock className='h-20 w-full' />
    <SkeletonBlock className='h-8 w-full' />
  </div>
);

const ParentSpotlightSkeleton = (): React.JSX.Element => (
  <div className='flex flex-col gap-3 rounded-2xl bg-white/40 p-4' data-testid='kangur-home-parent-spotlight-fallback'>
    <SkeletonRow className='w-1/2' />
    <SkeletonBlock className='h-28 w-full' />
  </div>
);

const Leaderboard = dynamic(() => import('@/features/kangur/ui/components/Leaderboard'), {
  loading: LeaderboardSkeleton,
  ssr: false,
});

const PlayerProgressCard = dynamic(() => import('@/features/kangur/ui/components/PlayerProgressCard'), {
  loading: PlayerProgressSkeleton,
  ssr: false,
});

const KangurGameHomeDuelsInvitesWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/game-home/KangurGameHomeDuelsInvitesWidget').then(
      (m) => ({
        default: m.KangurGameHomeDuelsInvitesWidget,
      })
    ),
  {
    loading: DuelsInvitesSkeleton,
    ssr: false,
  }
);

const KangurGameHomeQuestWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/game-home/KangurGameHomeQuestWidget').then((m) => ({
      default: m.KangurGameHomeQuestWidget,
    })),
  {
    loading: QuestSkeleton,
    ssr: false,
  }
);

const KangurGameHomeHeroWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/game-home/KangurGameHomeHeroWidget').then((m) => ({
      default: m.KangurGameHomeHeroWidget,
    })),
  {
    loading: HeroSkeleton,
    ssr: false,
  }
);

const KangurPriorityAssignments = dynamic(
  () =>
    import('@/features/kangur/ui/components/assignments/KangurPriorityAssignments').then((m) => ({
      default: m.KangurPriorityAssignments,
    })),
  {
    loading: DynamicLoadingFallback,
    ssr: false,
  }
);

const KangurAssignmentSpotlight = dynamic(
  () =>
    import('@/features/kangur/ui/components/assignments/KangurAssignmentSpotlight').then((m) => ({
      default: m.KangurAssignmentSpotlight,
    })),
  {
    loading: ParentSpotlightSkeleton,
    ssr: false,
  }
);

type GameTranslations = ReturnType<typeof useTranslations>;
const getGameScreenLabel = (translations: GameTranslations): string => translations('screens.home.label');

function GameHomeMissingLearnerState(props: {
  basePath: string;
  translations: GameTranslations;
}): React.JSX.Element {
  const { basePath, translations } = props;

  return (
    <KangurEmptyState
      align='left'
      className='text-left'
      padding='md'
      title={translations('home.missingLearnerTitle')}
      description={translations('home.missingLearnerDescription')}
    >
      <div className={`${KANGUR_TIGHT_ROW_CLASSNAME} w-full sm:items-center`}>
        <KangurButton
          asChild
          className='w-full sm:w-auto'
          size='sm'
          variant='primary'
          data-doc-id='home_parent_add_learner'
        >
          <Link
            href={createPageUrl('ParentDashboard', basePath)}
            targetPageKey='ParentDashboard'
            transitionSourceId='game-home-parent-add-learner'
          >
            {translations('home.addLearner')}
          </Link>
        </KangurButton>
      </div>
    </KangurEmptyState>
  );
}

function GameHomeActionsColumn(props: {
  basePath: string;
  homeActionsRef: RefObject<HTMLDivElement | null>;
  homeVisibility: ReturnType<typeof resolveKangurGameHomeVisibility>;
  shouldMountNearFoldWidgets: boolean;
  translations: GameTranslations;
}): React.JSX.Element {
  const { basePath, homeActionsRef, homeVisibility, shouldMountNearFoldWidgets, translations } =
    props;

  return (
    <>
      <div id='kangur-home-actions' ref={homeActionsRef}>
        <KangurGameHomeActionsWidget hideWhenScreenMismatch={false} />
      </div>
      {shouldMountNearFoldWidgets ? (
        <KangurGameHomeDuelsInvitesWidget hideWhenScreenMismatch={false} />
      ) : (
        <DuelsInvitesSkeleton />
      )}
      {homeVisibility.hideLearnerWidgetsForParent ? (
        <GameHomeMissingLearnerState basePath={basePath} translations={translations} />
      ) : null}
    </>
  );
}

export function GameHomeScreen(props: {
  basePath: string;
  canAccessParentAssignments: boolean;
  homeRefs: GameHomeScreenRefs;
  homeVisibility: ReturnType<typeof resolveKangurGameHomeVisibility>;
  progress: KangurProgressState | null | undefined;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  translations: GameTranslations;
}): React.JSX.Element {
  const {
    basePath,
    canAccessParentAssignments,
    homeRefs,
    homeVisibility,
    progress,
    screenHeadingRef,
    translations,
  } = props;
  const shouldMountNearFoldWidgets = useKangurIdleReady({
    minimumDelayMs: GAME_HOME_NEAR_FOLD_IDLE_DELAY_MS,
  });
  const shouldMountFarFoldWidgets = useKangurIdleReady({
    minimumDelayMs: GAME_HOME_FAR_FOLD_IDLE_DELAY_MS,
  });

  const queryClient = useQueryClient();
  const locale = useLocale();
  const { subject } = useKangurSubjectFocus();

  useEffect(() => {
    // Warm the page-content cache (hero copy, leaderboard copy) before widgets mount.
    // The fetch is shared across all widgets via React Query — a single network request
    // that fulfils both the hero and leaderboard CMS entries.
    void prefetchKangurPageContentStore(queryClient, locale);
  }, [queryClient, locale]);

  useEffect(() => {
    const preload = (): void => {
      void import('@/features/kangur/ui/components/game-home/KangurGameHomeDuelsInvitesWidget');
      void import('@/features/kangur/ui/components/game-home/KangurGameHomeQuestWidget');
      void import('@/features/kangur/ui/components/game-home/KangurGameHomeHeroWidget');
      void import('@/features/kangur/ui/components/Leaderboard');
      void import('@/features/kangur/ui/components/PlayerProgressCard');
      void import('@/features/kangur/ui/components/assignments/KangurAssignmentSpotlight');
      prefetchKangurLeaderboardScores(subject);
      if (canAccessParentAssignments) {
        void prefetchKangurAssignments(queryClient);
      }
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preload, { timeout: 200 });
      return () => { window.cancelIdleCallback(id); };
    }
    const id = setTimeout(preload, 200);
    return () => { clearTimeout(id); };
  }, [canAccessParentAssignments, queryClient, subject]);

  return (
    <div
      className={cn('w-full min-w-0 max-w-full', GAME_HOME_LAYOUT_CLASSNAME)}
      data-testid='kangur-game-home-layout'
    >
      <h2 id={GAME_SCREEN_TITLE_ID} ref={screenHeadingRef} tabIndex={-1} className='sr-only'>
        {getGameScreenLabel(translations)}
      </h2>
      <KangurGameHomeSections
        visibility={homeVisibility}
        parentSpotlight={<KangurAssignmentSpotlight basePath={basePath} enabled={canAccessParentAssignments} idleDelayMs={GAME_HOME_NEAR_FOLD_IDLE_DELAY_MS} />}
        parentSpotlightSectionProps={{
          headingId: 'kangur-home-parent-assignment-heading',
          headingLabel: translations('home.parentSuggestionsHeading'),
          id: 'kangur-home-parent-spotlight',
        }}
        actionsColumn={
          <GameHomeActionsColumn
            basePath={basePath}
            homeActionsRef={homeRefs.homeActionsRef}
            homeVisibility={homeVisibility}
            shouldMountNearFoldWidgets={shouldMountNearFoldWidgets}
            translations={translations}
          />
        }
        actionsColumnProps={{ testId: 'kangur-home-actions-column' }}
        quest={
          shouldMountNearFoldWidgets ? (
            <KangurGameHomeQuestWidget hideWhenScreenMismatch={false} />
          ) : (
            <QuestSkeleton />
          )
        }
        questSectionProps={{
          headingId: 'kangur-home-quest-heading',
          headingLabel: translations('home.questHeading'),
          id: 'kangur-home-quest',
          ref: homeRefs.homeQuestRef,
        }}
        summary={
          shouldMountNearFoldWidgets ? (
            <KangurGameHomeHeroWidget
              hideWhenScreenMismatch={false}
              showIntro={false}
              showAssignmentSpotlight={false}
            />
          ) : (
            <HeroSkeleton />
          )
        }
        summarySectionProps={{
          headingId: 'kangur-home-hero-heading',
          headingLabel: translations('home.summaryHeading'),
          id: 'kangur-home-summary',
        }}
        assignments={
          <KangurPriorityAssignments
            basePath={basePath}
            enabled={canAccessParentAssignments}
            idleDelayMs={GAME_HOME_NEAR_FOLD_IDLE_DELAY_MS}
            title={translations('home.priorityAssignmentsTitle')}
            emptyLabel={translations('home.priorityAssignmentsEmpty')}
          />
        }
        assignmentsSectionProps={{
          headingId: 'kangur-home-assignments-heading',
          headingLabel: translations('home.priorityAssignmentsHeading'),
          id: 'kangur-home-priority-assignments',
          ref: homeRefs.homeAssignmentsRef,
        }}
        leaderboard={
          shouldMountFarFoldWidgets ? (
            <Leaderboard deferUntilVisible idleDelayMs={0} />
          ) : (
            <LeaderboardSkeleton />
          )
        }
        leaderboardColumnProps={{
          id: 'kangur-home-leaderboard',
          ref: homeRefs.homeLeaderboardRef,
        }}
        playerProgress={
          progress ? (
            shouldMountFarFoldWidgets ? (
              <PlayerProgressCard progress={progress} />
            ) : (
              <PlayerProgressSkeleton />
            )
          ) : null
        }
        playerProgressColumnProps={{
          id: 'kangur-home-player-progress',
          ref: homeRefs.homeProgressRef,
        }}
        progressSectionProps={{
          headingId: 'kangur-home-progress-heading',
          headingLabel: translations('home.progressHeading'),
          id: 'kangur-home-progress',
        }}
      />
    </div>
  );
}
