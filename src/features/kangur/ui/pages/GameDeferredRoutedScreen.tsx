'use client';

import dynamic from 'next/dynamic';
import { type useTranslations } from 'next-intl';
import { useMemo, type RefObject } from 'react';

import { usePrefersReducedMotion } from '@/features/kangur/ui/components/LazyAnimatePresence';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import {
  isKangurLaunchableGameScreen,
  type KangurLaunchableGameScreen,
} from '@/features/kangur/ui/services/game-launch';
import type { KangurGameScreen } from '@/features/kangur/ui/types';

import type { GameSessionScreenRefs } from './Game.screen-refs';

const GameDeferredLaunchableScreen = dynamic(
  () => import('@/features/kangur/ui/pages/GameDeferredLaunchableScreen'),
  { ssr: false }
);

const GameDeferredNonHomeScreen = dynamic(
  () => import('@/features/kangur/ui/pages/GameDeferredNonHomeScreen'),
  { ssr: false }
);

type GameTranslations = ReturnType<typeof useTranslations>;
type GameMotionProps = ReturnType<typeof createKangurPageTransitionMotionProps>;

export default function GameDeferredRoutedScreen(props: {
  launchableGameInstanceId?: string | null;
  screen: Exclude<KangurGameScreen, 'home'>;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  sessionRefs: GameSessionScreenRefs;
  translations: GameTranslations;
}): React.JSX.Element | null {
  const { launchableGameInstanceId, screen, screenHeadingRef, sessionRefs, translations } = props;
  const prefersReducedMotion = usePrefersReducedMotion();
  const screenMotionProps = useMemo<GameMotionProps>(
    () => createKangurPageTransitionMotionProps(prefersReducedMotion),
    [prefersReducedMotion]
  );

  if (isKangurLaunchableGameScreen(screen)) {
    return (
      <GameDeferredLaunchableScreen
        launchableGameInstanceId={launchableGameInstanceId}
        screen={screen}
        screenHeadingRef={screenHeadingRef}
        screenMotionProps={screenMotionProps}
        translations={translations}
      />
    );
  }

  return (
    <GameDeferredNonHomeScreen
      screen={screen}
      screenHeadingRef={screenHeadingRef}
      screenMotionProps={screenMotionProps}
      sessionRefs={sessionRefs}
      translations={translations}
    />
  );
}
