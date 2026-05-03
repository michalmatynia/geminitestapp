'use client';

import dynamic from 'next/dynamic';
import { type useTranslations } from 'next-intl';
import { useEffect, type RefObject } from 'react';

import { LazyMotionDiv } from '@/features/kangur/ui/components/LazyAnimatePresence';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { type createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { type KangurGameScreen } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import type { GameSessionScreenRefs } from './Game.screen-refs';

type GameTranslations = ReturnType<typeof useTranslations>;
type GameMotionProps = ReturnType<typeof createKangurPageTransitionMotionProps>;

const GAME_SCREEN_TITLE_ID = 'kangur-game-screen-title';

const Leaderboard = dynamic(() => import('@/features/kangur/ui/components/Leaderboard'), {
  loading: () => <div className='h-24 w-full animate-pulse rounded-2xl bg-slate-100/60' />,
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
}): React.JSX.Element {
  const { children, className, motionProps, screenHeadingRef, screenKey, screenLabel, screenRef } =
    props;

  return (
    <LazyMotionDiv
      key={screenKey}
      {...motionProps}
      className={cn('w-full min-w-0 max-w-full', className)}
      ref={screenRef}
    >
      <h2 id={GAME_SCREEN_TITLE_ID} ref={screenHeadingRef} tabIndex={-1} className='sr-only'>
        {screenLabel}
      </h2>
      {children}
    </LazyMotionDiv>
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

export default function GameDeferredNonHomeScreen(props: {
  screen: Exclude<KangurGameScreen, 'home'>;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  screenMotionProps: GameMotionProps;
  sessionRefs: GameSessionScreenRefs;
  translations: GameTranslations;
}): React.JSX.Element | null {
  const { screen, screenHeadingRef, screenMotionProps, sessionRefs, translations } = props;

  useEffect(() => {
    const heading = screenHeadingRef.current;
    if (!heading) {
      return;
    }

    try {
      heading.focus({ preventScroll: true });
    } catch {
      heading.focus();
    }
  }, [screen, screenHeadingRef]);

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
