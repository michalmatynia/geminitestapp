'use client';

import { type useTranslations } from 'next-intl';
import { useEffect, type RefObject } from 'react';

import { LazyMotionDiv } from '@/features/kangur/ui/components/LazyAnimatePresence';
import {
  createLaunchableGameScreenComponentConfigFromRuntime,
  getKangurLaunchableGameScreenComponentConfig,
} from '@/features/kangur/ui/pages/Game.launchable-screens';
import { type createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { type KangurLaunchableGameScreen } from '@/features/kangur/ui/services/game-launch';
import { cn } from '@/features/kangur/shared/utils';

import { useGameLaunchableRuntime } from './Game.launchable-runtime';
import type { GameLaunchableScreenRefs } from './Game.screen-refs';

type GameTranslations = ReturnType<typeof useTranslations>;
type GameMotionProps = ReturnType<typeof createKangurPageTransitionMotionProps>;

const GAME_SCREEN_TITLE_ID = 'kangur-game-screen-title';

const getGameScreenLabel = (
  translations: GameTranslations,
  screenKey: KangurLaunchableGameScreen
): string => translations(`screens.${screenKey}.label`);

function GameScreenFrame(props: {
  children: React.ReactNode;
  className: string;
  motionProps: GameMotionProps;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  screenKey: KangurLaunchableGameScreen;
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

export default function GameDeferredLaunchableScreen(props: {
  launchableGameInstanceId?: string | null;
  launchableGameScreenRefs: GameLaunchableScreenRefs;
  screen: KangurLaunchableGameScreen;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  screenMotionProps: GameMotionProps;
  translations: GameTranslations;
}): React.JSX.Element {
  const {
    launchableGameInstanceId,
    launchableGameScreenRefs,
    screen,
    screenHeadingRef,
    screenMotionProps,
    translations,
  } = props;
  const { activeLaunchableGameRuntime, launchableGameRuntimeLoading } =
    useGameLaunchableRuntime({
      launchableGameInstanceId,
      screen,
    });
  const screenLabel = getGameScreenLabel(translations, screen);

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
