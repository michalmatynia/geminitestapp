'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, type RefObject } from 'react';

import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import {
  GAME_PAGE_STANDARD_CONTAINER_CLASSNAME,
  GAME_HOME_UTILITY_IDLE_DELAY_MS,
} from '@/features/kangur/ui/pages/GameHome.constants';
import { resolveKangurGameHomeVisibility } from '@/features/kangur/ui/pages/GameHome.visibility';
import { GameHomeScreen } from '@/features/kangur/ui/pages/Game.screen-components';
import {
  useGameHomeScreenRefs,
} from '@/features/kangur/ui/pages/Game.screen-refs';
import {
  KangurGameRuntimeBoundary,
  useKangurGameRuntime,
} from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import dynamic from 'next/dynamic';
import { useKangurIdleReady } from '@/features/kangur/ui/hooks/useKangurIdleReady';
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS } from '@/features/kangur/ui/pages/GameHome.constants';
import type { KangurGameScreen } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';

const XpToast = dynamic(() => import('@/features/kangur/ui/components/game-runtime/XpToast'), {
  ssr: false,
});

const GameDeferredHomeEnhancements = dynamic(
  () => import('@/features/kangur/ui/pages/GameDeferredHomeEnhancements'),
  { ssr: false }
);

const GameDeferredNavigationWidget = dynamic(
  () => import('@/features/kangur/ui/pages/GameDeferredNavigationWidget'),
  { ssr: false }
);

const GameDeferredRoutedContent = dynamic(
  () => import('@/features/kangur/ui/pages/GameDeferredRoutedContent'),
  { ssr: false }
);

const GAME_BRAND_NAME = 'Sprycio';
const GAME_MAIN_ID = 'kangur-game-main';
const GAME_TITLE_ID = 'kangur-game-page-title';
const GAME_SCREEN_TITLE_ID = 'kangur-game-screen-title';
// GAME_TOP_RESET_SCREENS: screens that scroll the page back to the top when
// they become active. Setup and operation screens need a clean viewport;
// playing/result screens preserve the learner's scroll position.
const shouldResetGameScreenToTop = (screen: KangurGameScreen): boolean =>
  screen !== 'home' &&
  screen !== 'playing' &&
  screen !== 'result' &&
  screen !== 'kangur';

// focusGameScreenHeading moves keyboard focus to the active screen's heading
// after a screen transition. Uses preventScroll to avoid jarring jumps, with
// a plain focus() fallback for browsers that don't support the option.
const focusGameScreenHeading = (heading: HTMLHeadingElement | null): void => {
  if (!heading) {
    return;
  }

  withKangurClientErrorSync(
    {
      source: 'kangur-game',
      action: 'focus-screen-heading',
      description: 'Focus the active game screen heading.',
    },
    () => {
      heading.focus({ preventScroll: true });
      return true;
    },
    {
      fallback: () => {
        heading.focus();
        return false;
      },
    }
  );
};

type GameTranslations = ReturnType<typeof useTranslations>;
const getGameScreenLabel = (
  translations: GameTranslations,
  screenKey: KangurGameScreen
): string => translations(`screens.${screenKey}.label`);

const resolveGamePageReady = ({
  routeTransitionState,
  screen,
}: {
  routeTransitionState: ReturnType<typeof useOptionalKangurRouteTransitionState>;
  screen: KangurGameScreen;
}): boolean => {
  if (routeTransitionState?.activeTransitionKind === 'locale-switch') {
    return true;
  }

  if (
    routeTransitionState?.transitionPhase === 'waiting_for_ready' &&
    routeTransitionState.activeTransitionSkeletonVariant === 'game-session'
  ) {
    return screen !== 'home';
  }

  return true;
};

function useGameScreenFocusReset(
  screen: KangurGameScreen,
  screenHeadingRef: RefObject<HTMLHeadingElement | null>
): void {
  const previousScreenRef = useRef<KangurGameScreen | null>(null);

  useEffect(() => {
    if (previousScreenRef.current === null) {
      previousScreenRef.current = screen;
      return;
    }

    if (previousScreenRef.current === screen || typeof window === 'undefined') {
      previousScreenRef.current = screen;
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      if (shouldResetGameScreenToTop(screen)) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }

      focusGameScreenHeading(screenHeadingRef.current);
    });

    previousScreenRef.current = screen;
    return () => window.cancelAnimationFrame(frameId);
  }, [screen, screenHeadingRef]);
}

// GameContent is the inner game page component that consumes KangurGameRuntime.
// It owns:
//  - Screen rendering via GameHomeScreen / GameDeferredRoutedScreen
//    (home, operation, playing, result, training, kangur_setup, launchable game instances)
//  - AI Tutor session sync (registers the current game screen as the tutor context)
//  - Tutor anchor registration for game home widgets
//  - Learner activity ping (keeps the session alive during gameplay)
//  - Route page-ready signalling (tells the shell when the page is interactive)
//  - Screen heading focus management on screen transitions (accessibility)
//  - XP toast rendering (lazy-loaded, SSR disabled)
//  - Scroll-to-top on setup/operation screens
function GameContent(): React.JSX.Element {
  const translations = useTranslations('KangurGamePage');
  const runtime = useKangurGameRuntime();
  const { basePath, progress, screen, user, xpToast, launchableGameInstanceId } = runtime;
  const routing = useOptionalKangurRouting();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const canAccessParentAssignments = runtime.canAccessParentAssignments;
  const homeVisibility = useMemo(
    () =>
      resolveKangurGameHomeVisibility({
        canAccessParentAssignments,
        progress,
        user,
      }),
    [canAccessParentAssignments, progress, user]
  );
  const homeRefs = useGameHomeScreenRefs();
  const screenHeadingRef = useRef<HTMLHeadingElement>(null);
  const isMobile = useKangurMobileBreakpoint();
  const shouldUseStandardMobileScroll = isMobile;
  const currentScreenLabel = getGameScreenLabel(translations, screen);
  const shouldDelayInitialStandaloneHomeEnhancementsRef = useRef<boolean | null>(null);
  shouldDelayInitialStandaloneHomeEnhancementsRef.current ??=
    screen === 'home' && routing?.embedded !== true;
  const shouldDelayInitialStandaloneHomeEnhancements =
    shouldDelayInitialStandaloneHomeEnhancementsRef.current;
  const homeEnhancementsIdleReady = useKangurIdleReady({
    minimumDelayMs: shouldDelayInitialStandaloneHomeEnhancements
      ? GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS
      : 0,
  });
  const shouldMountDeferredHomeEnhancements =
    !shouldDelayInitialStandaloneHomeEnhancements || homeEnhancementsIdleReady;
  const shouldDelayInitialStandaloneHomeUtilitiesRef = useRef<boolean | null>(null);
  shouldDelayInitialStandaloneHomeUtilitiesRef.current ??=
    screen === 'home' && routing?.embedded !== true;
  const shouldDelayInitialStandaloneHomeUtilities =
    shouldDelayInitialStandaloneHomeUtilitiesRef.current;
  const homeUtilitiesIdleReady = useKangurIdleReady({
    minimumDelayMs: shouldDelayInitialStandaloneHomeUtilities
      ? GAME_HOME_UTILITY_IDLE_DELAY_MS
      : 0,
  });
  const shouldMountDeferredHomeUtilities =
    !shouldDelayInitialStandaloneHomeUtilities || homeUtilitiesIdleReady;
  const isGamePageReady = resolveGamePageReady({
    routeTransitionState,
    screen,
  });

  useKangurRoutePageReady({
    pageKey: 'Game',
    ready: isGamePageReady,
  });
  useGameScreenFocusReset(screen, screenHeadingRef);

  return (
    <>
      {screen === 'home' && shouldMountDeferredHomeEnhancements ? (
        <GameDeferredHomeEnhancements
          canAccessParentAssignments={canAccessParentAssignments}
          homeRefs={homeRefs}
          learnerId={runtime.user?.activeLearner?.id ?? null}
          title={currentScreenLabel}
          translations={translations}
        />
      ) : null}
      {/* Visual contract: <KangurPageShell tone='play' ...> is provided by KangurStandardPageLayout. */}
      <KangurStandardPageLayout
        tone='play'
        id='kangur-game-page'
        skipLinkTargetId={GAME_MAIN_ID}
        beforeNavigation={
          xpToast.visible ? (
            <XpToast
              xpGained={xpToast.xpGained}
              newBadges={xpToast.newBadges}
              breakdown={xpToast.breakdown}
              dailyQuest={xpToast.dailyQuest}
              nextBadge={xpToast.nextBadge}
              recommendation={xpToast.recommendation}
              visible={xpToast.visible}
            />
          ) : null
        }
        navigation={shouldMountDeferredHomeUtilities ? <GameDeferredNavigationWidget /> : null}
        afterNavigation={(
          <div role='status' aria-live='polite' aria-atomic='true' className='sr-only'>
            {translations('statusAnnouncement', { label: currentScreenLabel })}
          </div>
        )}
        containerProps={{
          as: 'section',
          'data-kangur-route-main': true,
          id: GAME_MAIN_ID,
          'aria-labelledby': `${GAME_TITLE_ID} ${GAME_SCREEN_TITLE_ID}`,
          className: cn(
            GAME_PAGE_STANDARD_CONTAINER_CLASSNAME,
            shouldUseStandardMobileScroll
              ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y'
              : null
          ),
        }}
      >
        <div className='w-full'>
          <h1 id={GAME_TITLE_ID} className='sr-only'>
            {GAME_BRAND_NAME}
          </h1>
          {screen === 'home' ? (
            <GameHomeScreen
              basePath={basePath}
              canAccessParentAssignments={canAccessParentAssignments}
              homeRefs={homeRefs}
              homeVisibility={homeVisibility}
              progress={progress}
              screenHeadingRef={screenHeadingRef}
              translations={translations}
            />
          ) : (
            <GameDeferredRoutedContent
              launchableGameInstanceId={launchableGameInstanceId}
              screen={screen}
              screenHeadingRef={screenHeadingRef}
              translations={translations}
            />
          )}
        </div>
      </KangurStandardPageLayout>
    </>
  );
}

// Game is the page entry point. It wraps GameContent in
// KangurGameRuntimeBoundary so the game runtime context is always available,
// even when the page is rendered outside the main app shell (e.g. in tests).
export default function Game(): React.JSX.Element {
  return (
    <KangurGameRuntimeBoundary enabled>
      <GameContent />
    </KangurGameRuntimeBoundary>
  );
}
