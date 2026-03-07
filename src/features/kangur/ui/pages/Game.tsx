'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';

import Leaderboard from '@/features/kangur/ui/components/Leaderboard';
import { KangurGameCalendarTrainingWidget } from '@/features/kangur/ui/components/KangurGameCalendarTrainingWidget';
import { KangurGameGeometryTrainingWidget } from '@/features/kangur/ui/components/KangurGameGeometryTrainingWidget';
import { KangurGameHomeActionsWidget } from '@/features/kangur/ui/components/KangurGameHomeActionsWidget';
import { KangurGameHomeHeroWidget } from '@/features/kangur/ui/components/KangurGameHomeHeroWidget';
import { KangurGameKangurSessionWidget } from '@/features/kangur/ui/components/KangurGameKangurSessionWidget';
import { KangurGameKangurSetupWidget } from '@/features/kangur/ui/components/KangurGameKangurSetupWidget';
import { KangurGameNavigationWidget } from '@/features/kangur/ui/components/KangurGameNavigationWidget';
import { KangurGameOperationSelectorWidget } from '@/features/kangur/ui/components/KangurGameOperationSelectorWidget';
import { KangurGameQuestionWidget } from '@/features/kangur/ui/components/KangurGameQuestionWidget';
import { KangurGameResultWidget } from '@/features/kangur/ui/components/KangurGameResultWidget';
import { KangurGameTrainingSetupWidget } from '@/features/kangur/ui/components/KangurGameTrainingSetupWidget';
import { KangurPriorityAssignments } from '@/features/kangur/ui/components/KangurPriorityAssignments';
import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { PlayerProgressCard, XpToast } from '@/features/kangur/ui/components/progress';
import { KangurPageContainer, KangurPageShell } from '@/features/kangur/ui/design/primitives';
import {
  KangurGameRuntimeBoundary,
  useKangurGameRuntime,
} from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import type { KangurGameScreen } from '@/features/kangur/ui/types';

const GAME_BRAND_NAME = 'Sprycio';
const GAME_MAIN_ID = 'kangur-game-main';
const GAME_TITLE_ID = 'kangur-game-page-title';
const GAME_SCREEN_TITLE_ID = 'kangur-game-screen-title';

const GAME_SCREEN_LABELS: Record<KangurGameScreen, string> = {
  home: 'Ekran startowy',
  training: 'Konfiguracja treningu',
  kangur_setup: 'Konfiguracja sesji Kangura Matematycznego',
  kangur: 'Sesja Kangura Matematycznego',
  calendar_quiz: 'Cwiczenia z kalendarzem',
  geometry_quiz: 'Cwiczenia z figurami',
  operation: 'Wybor rodzaju gry',
  playing: 'Pytanie do rozwiazania',
  result: 'Wynik gry',
};

function GameContent(): React.JSX.Element {
  const { basePath, progress, screen, user, xpToast } = useKangurGameRuntime();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('home');
  const prefersReducedMotion = useReducedMotion();
  const screenHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousScreenRef = useRef<KangurGameScreen | null>(null);
  const currentScreenLabel = GAME_SCREEN_LABELS[screen];
  const screenMotionProps = useMemo(
    () =>
      prefersReducedMotion
        ? {
          initial: { opacity: 1, y: 0 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 1, y: 0 },
        }
        : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -20 },
        },
    [prefersReducedMotion]
  );

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
      screenHeadingRef.current?.focus();
    });

    previousScreenRef.current = screen;
    return () => window.cancelAnimationFrame(frameId);
  }, [screen]);

  const renderScreen = (
    screenKey: KangurGameScreen,
    className: string,
    children: React.ReactNode
  ): React.JSX.Element => (
    <motion.div key={screenKey} {...screenMotionProps} className={className}>
      <h2 id={GAME_SCREEN_TITLE_ID} ref={screenHeadingRef} tabIndex={-1} className='sr-only'>
        {GAME_SCREEN_LABELS[screenKey]}
      </h2>
      {children}
    </motion.div>
  );

  return (
    <KangurPageShell tone='play' className='min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100' id='kangur-game-page' skipLinkTargetId={GAME_MAIN_ID}>
      <KangurDocsTooltipEnhancer enabled={docsTooltipsEnabled} rootId='kangur-game-page' />
      <XpToast
        xpGained={xpToast.xpGained}
        newBadges={xpToast.newBadges}
        visible={xpToast.visible}
      />
      <KangurGameNavigationWidget />

      <div role='status' aria-live='polite' aria-atomic='true' className='sr-only'>
        Widok: {currentScreenLabel}
      </div>

      <KangurPageContainer
        id={GAME_MAIN_ID}
        aria-labelledby={`${GAME_TITLE_ID} ${GAME_SCREEN_TITLE_ID}`}
        className='flex flex-col items-center gap-10 pt-6 sm:pt-8'
      >
        <h1 id={GAME_TITLE_ID} className='sr-only'>
          {GAME_BRAND_NAME}
        </h1>
        <AnimatePresence mode='wait'>
          {screen === 'home' ? (
            renderScreen(
              'home',
              'flex w-full flex-col items-center gap-10',
              <>
                <section className='w-full max-w-[520px] space-y-5' aria-labelledby='kangur-home-start-heading'>
                  <h3 id='kangur-home-start-heading' className='sr-only'>
                    Rozpocznij gre
                  </h3>
                  <KangurGameHomeHeroWidget />
                  <KangurGameHomeActionsWidget />
                </section>

                {user ? (
                  <section className='mx-auto w-full max-w-[900px]' aria-labelledby='kangur-home-assignments-heading'>
                    <h3 id='kangur-home-assignments-heading' className='sr-only'>
                      Priorytetowe zadania
                    </h3>
                    <KangurPriorityAssignments
                      basePath={basePath}
                      enabled={Boolean(user)}
                      title='Priorytetowe zadania'
                      emptyLabel='Brak aktywnych zadan od rodzica.'
                    />
                  </section>
                ) : null}

                <section
                  className='grid w-full max-w-5xl gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'
                  aria-labelledby='kangur-home-progress-heading'
                >
                  <h3 id='kangur-home-progress-heading' className='sr-only'>
                    Ranking i postep
                  </h3>
                  <div className='order-2 xl:order-1'>
                    <Leaderboard />
                  </div>
                  <div className='order-1 flex justify-center xl:order-2 xl:justify-stretch'>
                    <PlayerProgressCard progress={progress} />
                  </div>
                </section>
              </>
            )
          ) : null}

          {screen === 'training' ? (
            renderScreen(
              'training',
              'w-full flex flex-col items-center',
              <KangurGameTrainingSetupWidget />
            )
          ) : null}

          {screen === 'kangur_setup' ? (
            renderScreen(
              'kangur_setup',
              'w-full flex flex-col items-center',
              <KangurGameKangurSetupWidget />
            )
          ) : null}

          {screen === 'kangur' ? (
            renderScreen(
              'kangur',
              'w-full max-w-lg flex flex-col items-center',
              <KangurGameKangurSessionWidget />
            )
          ) : null}

          {screen === 'calendar_quiz' ? (
            renderScreen(
              'calendar_quiz',
              'w-full max-w-lg flex flex-col items-center gap-4',
              <KangurGameCalendarTrainingWidget />
            )
          ) : null}

          {screen === 'geometry_quiz' ? (
            renderScreen(
              'geometry_quiz',
              'w-full max-w-lg flex flex-col items-center gap-4',
              <KangurGameGeometryTrainingWidget />
            )
          ) : null}

          {screen === 'operation' ? (
            renderScreen(
              'operation',
              'w-full flex flex-col items-center',
              <KangurGameOperationSelectorWidget />
            )
          ) : null}

          {screen === 'playing' ? (
            renderScreen(
              'playing',
              'flex w-full flex-col items-center',
              <KangurGameQuestionWidget />
            )
          ) : null}

          {screen === 'result' ? (
            renderScreen(
              'result',
              'flex w-full flex-col items-center gap-6',
              <>
                <KangurGameResultWidget />
                <Leaderboard />
              </>
            )
          ) : null}
        </AnimatePresence>
      </KangurPageContainer>
    </KangurPageShell>
  );
}

export default function Game(): React.JSX.Element {
  return (
    <KangurGameRuntimeBoundary enabled>
      <GameContent />
    </KangurGameRuntimeBoundary>
  );
}
