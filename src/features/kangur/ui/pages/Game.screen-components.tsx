'use client';

import dynamic from 'next/dynamic';
import { type useTranslations } from 'next-intl';
import type { RefObject } from 'react';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { KangurGameHomeActionsWidget } from '@/features/kangur/ui/components/game-home/KangurGameHomeActionsWidget';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurIdleReady } from '@/features/kangur/ui/hooks/useKangurIdleReady';
import {
  KangurButton,
  KangurEmptyState,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import {
  GAME_HOME_LAYOUT_CLASSNAME,
  GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS,
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

const SecondaryHomeWidgetFallback = ({
  testId,
}: {
  testId: string;
}): React.JSX.Element => (
  <div
    className='h-24 w-full animate-pulse rounded-2xl bg-slate-100/60'
    data-testid={testId}
  />
);

const Leaderboard = dynamic(() => import('@/features/kangur/ui/components/Leaderboard'), {
  loading: DynamicLoadingFallback,
  ssr: false,
});

const PlayerProgressCard = dynamic(() => import('@/features/kangur/ui/components/PlayerProgressCard'), {
  loading: DynamicLoadingFallback,
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
    loading: () => <SecondaryHomeWidgetFallback testId='kangur-home-duels-invites-fallback' />,
    ssr: false,
  }
);

const KangurGameHomeQuestWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/game-home/KangurGameHomeQuestWidget').then((m) => ({
      default: m.KangurGameHomeQuestWidget,
    })),
  {
    loading: () => <SecondaryHomeWidgetFallback testId='kangur-home-quest-fallback' />,
    ssr: false,
  }
);

const KangurGameHomeHeroWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/game-home/KangurGameHomeHeroWidget').then((m) => ({
      default: m.KangurGameHomeHeroWidget,
    })),
  {
    loading: () => <SecondaryHomeWidgetFallback testId='kangur-home-hero-fallback' />,
    ssr: false,
  }
);

const KangurPriorityAssignments = dynamic(
  () =>
    import('@/features/kangur/ui/components/assignments/KangurPriorityAssignments').then((m) => ({
      default: m.KangurPriorityAssignments,
    })),
  {
    loading: () => <SecondaryHomeWidgetFallback testId='kangur-home-priority-assignments-fallback' />,
    ssr: false,
  }
);

const KangurAssignmentSpotlight = dynamic(
  () =>
    import('@/features/kangur/ui/components/assignments/KangurAssignmentSpotlight').then((m) => ({
      default: m.KangurAssignmentSpotlight,
    })),
  {
    loading: () => <SecondaryHomeWidgetFallback testId='kangur-home-parent-spotlight-fallback' />,
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
  shouldMountSecondaryHomeWidgets: boolean;
  translations: GameTranslations;
}): React.JSX.Element {
  const { basePath, homeActionsRef, homeVisibility, shouldMountSecondaryHomeWidgets, translations } =
    props;

  return (
    <>
      <div id='kangur-home-actions' ref={homeActionsRef}>
        <KangurGameHomeActionsWidget hideWhenScreenMismatch={false} />
      </div>
      {shouldMountSecondaryHomeWidgets ? (
        <KangurGameHomeDuelsInvitesWidget hideWhenScreenMismatch={false} />
      ) : (
        <SecondaryHomeWidgetFallback testId='kangur-home-duels-invites-fallback' />
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
  const shouldMountSecondaryHomeWidgets = useKangurIdleReady({
    minimumDelayMs: GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS,
  });

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
        parentSpotlight={<KangurAssignmentSpotlight basePath={basePath} enabled={canAccessParentAssignments} />}
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
            shouldMountSecondaryHomeWidgets={shouldMountSecondaryHomeWidgets}
            translations={translations}
          />
        }
        actionsColumnProps={{ testId: 'kangur-home-actions-column' }}
        quest={
          shouldMountSecondaryHomeWidgets ? (
            <KangurGameHomeQuestWidget hideWhenScreenMismatch={false} />
          ) : (
            <SecondaryHomeWidgetFallback testId='kangur-home-quest-fallback' />
          )
        }
        questSectionProps={{
          headingId: 'kangur-home-quest-heading',
          headingLabel: translations('home.questHeading'),
          id: 'kangur-home-quest',
          ref: homeRefs.homeQuestRef,
        }}
        summary={
          shouldMountSecondaryHomeWidgets ? (
            <KangurGameHomeHeroWidget
              hideWhenScreenMismatch={false}
              showIntro={false}
              showAssignmentSpotlight={false}
            />
          ) : (
            <SecondaryHomeWidgetFallback testId='kangur-home-hero-fallback' />
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
          shouldMountSecondaryHomeWidgets ? (
            <Leaderboard deferUntilVisible />
          ) : (
            <SecondaryHomeWidgetFallback testId='kangur-home-leaderboard-fallback' />
          )
        }
        leaderboardColumnProps={{
          id: 'kangur-home-leaderboard',
          ref: homeRefs.homeLeaderboardRef,
        }}
        playerProgress={
          progress ? (
            shouldMountSecondaryHomeWidgets ? (
              <PlayerProgressCard progress={progress} />
            ) : (
              <SecondaryHomeWidgetFallback testId='kangur-home-player-progress-fallback' />
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
