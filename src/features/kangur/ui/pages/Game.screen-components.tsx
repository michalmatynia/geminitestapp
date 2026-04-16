'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { type useTranslations } from 'next-intl';
import type { RefObject } from 'react';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { KangurPriorityAssignments } from '@/features/kangur/ui/components/assignments/KangurPriorityAssignments';
import { KangurAssignmentSpotlight } from '@/features/kangur/ui/components/assignments/KangurAssignmentSpotlight';
import { KangurGameHomeActionsWidget } from '@/features/kangur/ui/components/game-home/KangurGameHomeActionsWidget';
import { KangurGameHomeDuelsInvitesWidget } from '@/features/kangur/ui/components/game-home/KangurGameHomeDuelsInvitesWidget';
import { KangurGameHomeHeroWidget } from '@/features/kangur/ui/components/game-home/KangurGameHomeHeroWidget';
import { KangurGameHomeQuestWidget } from '@/features/kangur/ui/components/game-home/KangurGameHomeQuestWidget';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
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
} from '@/features/kangur/ui/pages/GameHome.constants';
import { type resolveKangurGameHomeVisibility } from '@/features/kangur/ui/pages/GameHome.visibility';
import {
  KangurGameHomeSections,
} from '@/features/kangur/ui/pages/GameHome.layout';
import {
  createLaunchableGameScreenComponentConfigFromRuntime,
  getKangurLaunchableGameScreenComponentConfig,
} from '@/features/kangur/ui/pages/Game.launchable-screens';
import { type createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import {
  isKangurLaunchableGameScreen,
  type KangurLaunchableGameScreen,
} from '@/features/kangur/ui/services/game-launch';
import type { KangurGameScreen, KangurProgressState } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import type {
  GameHomeScreenRefs,
  GameLaunchableRuntime,
  GameLaunchableScreenRefs,
  GameSessionScreenRefs,
} from './Game.screen-refs';

const GAME_SCREEN_TITLE_ID = 'kangur-game-screen-title';

const DynamicLoadingFallback = (): React.JSX.Element => (
  <div className='h-24 w-full animate-pulse rounded-2xl bg-slate-100/60' />
);

const Leaderboard = dynamic(() => import('@/features/kangur/ui/components/Leaderboard'), {
  loading: DynamicLoadingFallback,
  ssr: false,
});

const PlayerProgressCard = dynamic(() => import('@/features/kangur/ui/components/PlayerProgressCard'), {
  loading: DynamicLoadingFallback,
  ssr: false,
});

const KangurGameKangurSessionWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/game-runtime/KangurGameKangurSessionWidget').then((m) => ({
      default: m.KangurGameKangurSessionWidget,
    })),
  { ssr: false }
);

const KangurGameKangurSetupWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/game-setup/KangurGameKangurSetupWidget').then((m) => ({
      default: m.KangurGameKangurSetupWidget,
    })),
  { ssr: false }
);

const KangurGameOperationSelectorWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/game-setup/KangurGameOperationSelectorWidget').then((m) => ({
      default: m.KangurGameOperationSelectorWidget,
    })),
  { ssr: false }
);

const KangurGameQuestionWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/game-runtime/KangurGameQuestionWidget').then((m) => ({
      default: m.KangurGameQuestionWidget,
    })),
  { ssr: false }
);

const KangurGameResultWidget = dynamic(
  () =>
    import('@/features/kangur/ui/components/game-runtime/KangurGameResultWidget').then((m) => ({
      default: m.KangurGameResultWidget,
    })),
  { ssr: false }
);

type GameTranslations = ReturnType<typeof useTranslations>;
type GameMotionProps = ReturnType<typeof createKangurPageTransitionMotionProps>;

const getGameScreenLabel = (
  translations: GameTranslations,
  screenKey: KangurGameScreen
): string => translations(`screens.${screenKey}.label`);

function GameScreenFrame(props: {
  children: React.ReactNode;
  className: string;
  motionProps: GameMotionProps;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  screenKey: KangurGameScreen;
  screenLabel: string;
  screenRef?: RefObject<HTMLDivElement | null>;
  testId?: string;
}): React.JSX.Element {
  const { children, className, motionProps, screenHeadingRef, screenKey, screenLabel, screenRef, testId } =
    props;

  return (
    <motion.div
      key={screenKey}
      {...motionProps}
      className={cn('w-full min-w-0 max-w-full', className)}
      data-testid={testId}
      ref={screenRef}
    >
      <h2 id={GAME_SCREEN_TITLE_ID} ref={screenHeadingRef} tabIndex={-1} className='sr-only'>
        {screenLabel}
      </h2>
      {children}
    </motion.div>
  );
}

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
  translations: GameTranslations;
}): React.JSX.Element {
  const { basePath, homeActionsRef, homeVisibility, translations } = props;

  return (
    <>
      <div id='kangur-home-actions' ref={homeActionsRef}>
        <KangurGameHomeActionsWidget hideWhenScreenMismatch={false} />
      </div>
      <KangurGameHomeDuelsInvitesWidget hideWhenScreenMismatch={false} />
      {homeVisibility.hideLearnerWidgetsForParent ? (
        <GameHomeMissingLearnerState basePath={basePath} translations={translations} />
      ) : null}
    </>
  );
}

function GameHomeScreen(props: {
  basePath: string;
  canAccessParentAssignments: boolean;
  homeMotionProps: GameMotionProps;
  homeRefs: GameHomeScreenRefs;
  homeVisibility: ReturnType<typeof resolveKangurGameHomeVisibility>;
  progress: KangurProgressState | null | undefined;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  translations: GameTranslations;
}): React.JSX.Element {
  const {
    basePath,
    canAccessParentAssignments,
    homeMotionProps,
    homeRefs,
    homeVisibility,
    progress,
    screenHeadingRef,
    translations,
  } = props;

  return (
    <GameScreenFrame
      className={GAME_HOME_LAYOUT_CLASSNAME}
      motionProps={homeMotionProps}
      screenHeadingRef={screenHeadingRef}
      screenKey='home'
      screenLabel={getGameScreenLabel(translations, 'home')}
      testId='kangur-game-home-layout'
    >
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
            translations={translations}
          />
        }
        actionsColumnProps={{ testId: 'kangur-home-actions-column' }}
        quest={<KangurGameHomeQuestWidget hideWhenScreenMismatch={false} />}
        questSectionProps={{
          headingId: 'kangur-home-quest-heading',
          headingLabel: translations('home.questHeading'),
          id: 'kangur-home-quest',
          ref: homeRefs.homeQuestRef,
        }}
        summary={
          <KangurGameHomeHeroWidget
            hideWhenScreenMismatch={false}
            showIntro={false}
            showAssignmentSpotlight={false}
          />
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
        leaderboard={<Leaderboard />}
        leaderboardColumnProps={{
          id: 'kangur-home-leaderboard',
          ref: homeRefs.homeLeaderboardRef,
        }}
        playerProgress={progress ? <PlayerProgressCard progress={progress} /> : null}
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
    </GameScreenFrame>
  );
}

function GameLaunchableScreen(props: {
  activeLaunchableGameRuntime: GameLaunchableRuntime | null;
  launchableGameInstanceId?: string | null;
  launchableGameRuntimeLoading: boolean;
  launchableGameScreenRefs: GameLaunchableScreenRefs;
  screen: KangurLaunchableGameScreen;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  screenMotionProps: GameMotionProps;
  translations: GameTranslations;
}): React.JSX.Element {
  const {
    activeLaunchableGameRuntime,
    launchableGameInstanceId,
    launchableGameRuntimeLoading,
    launchableGameScreenRefs,
    screen,
    screenHeadingRef,
    screenMotionProps,
    translations,
  } = props;
  const screenLabel = getGameScreenLabel(translations, screen);

  if (launchableGameRuntimeLoading) {
    return (
      <GameScreenFrame
        className='w-full flex flex-col items-center'
        motionProps={screenMotionProps}
        screenHeadingRef={screenHeadingRef}
        screenKey={screen}
        screenLabel={screenLabel}
        screenRef={launchableGameScreenRefs[screen]}
      >
        <div data-testid='kangur-game-launchable-runtime-loading' />
      </GameScreenFrame>
    );
  }

  if (launchableGameInstanceId && !activeLaunchableGameRuntime) {
    return (
      <GameScreenFrame
        className='w-full flex flex-col items-center'
        motionProps={screenMotionProps}
        screenHeadingRef={screenHeadingRef}
        screenKey={screen}
        screenLabel={screenLabel}
        screenRef={launchableGameScreenRefs[screen]}
      >
        <div data-testid='kangur-game-launchable-runtime-missing' />
      </GameScreenFrame>
    );
  }

  const config = activeLaunchableGameRuntime
    ? createLaunchableGameScreenComponentConfigFromRuntime(activeLaunchableGameRuntime)
    : getKangurLaunchableGameScreenComponentConfig(screen);
  const ScreenComponent = config.Component;

  return (
    <GameScreenFrame
      className={config.className}
      motionProps={screenMotionProps}
      screenHeadingRef={screenHeadingRef}
      screenKey={screen}
      screenLabel={screenLabel}
      screenRef={launchableGameScreenRefs[screen]}
    >
      <ScreenComponent />
    </GameScreenFrame>
  );
}

function GameKangurModeScreen(props: {
  screen: 'kangur' | 'kangur_setup';
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  screenMotionProps: GameMotionProps;
  sessionRefs: Pick<GameSessionScreenRefs, 'kangurSessionRef' | 'kangurSetupRef'>;
  translations: GameTranslations;
}): React.JSX.Element {
  const { screen, screenHeadingRef, screenMotionProps, sessionRefs, translations } = props;

  if (screen === 'kangur_setup') {
    return (
      <GameScreenFrame
        className='w-full flex flex-col items-center'
        motionProps={screenMotionProps}
        screenHeadingRef={screenHeadingRef}
        screenKey='kangur_setup'
        screenLabel={getGameScreenLabel(translations, 'kangur_setup')}
        screenRef={sessionRefs.kangurSetupRef}
      >
        <KangurGameKangurSetupWidget />
      </GameScreenFrame>
    );
  }

  return (
    <GameScreenFrame
      className='w-full max-w-lg flex flex-col items-center'
      motionProps={screenMotionProps}
      screenHeadingRef={screenHeadingRef}
      screenKey='kangur'
      screenLabel={getGameScreenLabel(translations, 'kangur')}
      screenRef={sessionRefs.kangurSessionRef}
    >
      <KangurGameKangurSessionWidget />
    </GameScreenFrame>
  );
}

function GameOperationSelectorScreen(props: {
  screen: 'operation' | 'training';
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  screenMotionProps: GameMotionProps;
  sessionRefs: Pick<GameSessionScreenRefs, 'operationSelectorRef' | 'trainingSetupRef'>;
  translations: GameTranslations;
}): React.JSX.Element {
  const { screen, screenHeadingRef, screenMotionProps, sessionRefs, translations } = props;
  const screenRef =
    screen === 'training' ? sessionRefs.trainingSetupRef : sessionRefs.operationSelectorRef;

  return (
    <GameScreenFrame
      className='w-full flex flex-col items-center'
      motionProps={screenMotionProps}
      screenHeadingRef={screenHeadingRef}
      screenKey={screen}
      screenLabel={getGameScreenLabel(translations, screen)}
      screenRef={screenRef}
    >
      <KangurGameOperationSelectorWidget />
    </GameScreenFrame>
  );
}

function GamePlayingScreen(props: {
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  screenMotionProps: GameMotionProps;
  translations: GameTranslations;
}): React.JSX.Element {
  const { screenHeadingRef, screenMotionProps, translations } = props;

  return (
    <GameScreenFrame
      className='flex w-full flex-col items-center'
      motionProps={screenMotionProps}
      screenHeadingRef={screenHeadingRef}
      screenKey='playing'
      screenLabel={getGameScreenLabel(translations, 'playing')}
    >
      <KangurGameQuestionWidget />
    </GameScreenFrame>
  );
}

function GameResultScreen(props: {
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  screenMotionProps: GameMotionProps;
  sessionRefs: Pick<GameSessionScreenRefs, 'resultLeaderboardRef' | 'resultSummaryRef'>;
  translations: GameTranslations;
}): React.JSX.Element {
  const { screenHeadingRef, screenMotionProps, sessionRefs, translations } = props;

  return (
    <GameScreenFrame
      className={`flex w-full flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
      motionProps={screenMotionProps}
      screenHeadingRef={screenHeadingRef}
      screenKey='result'
      screenLabel={getGameScreenLabel(translations, 'result')}
    >
      <>
        <div ref={sessionRefs.resultSummaryRef} className='w-full flex flex-col items-center'>
          <KangurGameResultWidget />
        </div>
        <div ref={sessionRefs.resultLeaderboardRef} className='w-full'>
          <Leaderboard />
        </div>
      </>
    </GameScreenFrame>
  );
}

function GameNonLaunchableScreen(props: {
  basePath: string;
  canAccessParentAssignments: boolean;
  homeMotionProps: GameMotionProps;
  homeRefs: GameHomeScreenRefs;
  homeVisibility: ReturnType<typeof resolveKangurGameHomeVisibility>;
  progress: KangurProgressState | null | undefined;
  screen: Exclude<KangurGameScreen, KangurLaunchableGameScreen>;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  screenMotionProps: GameMotionProps;
  sessionRefs: Omit<GameSessionScreenRefs, 'launchableGameScreenRefs'>;
  translations: GameTranslations;
}): React.JSX.Element | null {
  const {
    basePath,
    canAccessParentAssignments,
    homeMotionProps,
    homeRefs,
    homeVisibility,
    progress,
    screen,
    screenHeadingRef,
    screenMotionProps,
    sessionRefs,
    translations,
  } = props;

  if (screen === 'home') {
    return (
      <GameHomeScreen
        basePath={basePath}
        canAccessParentAssignments={canAccessParentAssignments}
        homeMotionProps={homeMotionProps}
        homeRefs={homeRefs}
        homeVisibility={homeVisibility}
        progress={progress}
        screenHeadingRef={screenHeadingRef}
        translations={translations}
      />
    );
  }

  if (screen === 'playing') {
    return (
      <GamePlayingScreen
        screenHeadingRef={screenHeadingRef}
        screenMotionProps={screenMotionProps}
        translations={translations}
      />
    );
  }

  if (screen === 'result') {
    return (
      <GameResultScreen
        screenHeadingRef={screenHeadingRef}
        screenMotionProps={screenMotionProps}
        sessionRefs={sessionRefs}
        translations={translations}
      />
    );
  }

  if (screen === 'operation' || screen === 'training') {
    return (
      <GameOperationSelectorScreen
        screen={screen}
        screenHeadingRef={screenHeadingRef}
        screenMotionProps={screenMotionProps}
        sessionRefs={sessionRefs}
        translations={translations}
      />
    );
  }

  return (
    <GameKangurModeScreen
      screen={screen}
      screenHeadingRef={screenHeadingRef}
      screenMotionProps={screenMotionProps}
      sessionRefs={sessionRefs}
      translations={translations}
    />
  );
}

export function GameCurrentScreen(props: {
  activeLaunchableGameRuntime: GameLaunchableRuntime | null;
  basePath: string;
  canAccessParentAssignments: boolean;
  homeMotionProps: GameMotionProps;
  homeRefs: GameHomeScreenRefs;
  homeVisibility: ReturnType<typeof resolveKangurGameHomeVisibility>;
  launchableGameInstanceId?: string | null;
  launchableGameRuntimeLoading: boolean;
  progress: KangurProgressState | null | undefined;
  screen: KangurGameScreen;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  screenMotionProps: GameMotionProps;
  sessionRefs: GameSessionScreenRefs;
  translations: GameTranslations;
}): React.JSX.Element | null {
  const {
    activeLaunchableGameRuntime,
    basePath,
    canAccessParentAssignments,
    homeMotionProps,
    homeRefs,
    homeVisibility,
    launchableGameInstanceId,
    launchableGameRuntimeLoading,
    progress,
    screen,
    screenHeadingRef,
    screenMotionProps,
    sessionRefs,
    translations,
  } = props;

  if (isKangurLaunchableGameScreen(screen)) {
    return (
      <GameLaunchableScreen
        activeLaunchableGameRuntime={activeLaunchableGameRuntime}
        launchableGameInstanceId={launchableGameInstanceId}
        launchableGameRuntimeLoading={launchableGameRuntimeLoading}
        launchableGameScreenRefs={sessionRefs.launchableGameScreenRefs}
        screen={screen}
        screenHeadingRef={screenHeadingRef}
        screenMotionProps={screenMotionProps}
        translations={translations}
      />
    );
  }

  return (
    <GameNonLaunchableScreen
      basePath={basePath}
      canAccessParentAssignments={canAccessParentAssignments}
      homeMotionProps={homeMotionProps}
      homeRefs={homeRefs}
      homeVisibility={homeVisibility}
      progress={progress}
      screen={screen}
      screenHeadingRef={screenHeadingRef}
      screenMotionProps={screenMotionProps}
      sessionRefs={{
        kangurSessionRef: sessionRefs.kangurSessionRef,
        kangurSetupRef: sessionRefs.kangurSetupRef,
        operationSelectorRef: sessionRefs.operationSelectorRef,
        resultLeaderboardRef: sessionRefs.resultLeaderboardRef,
        resultSummaryRef: sessionRefs.resultSummaryRef,
        trainingSetupRef: sessionRefs.trainingSetupRef,
      }}
      translations={translations}
    />
  );
}
