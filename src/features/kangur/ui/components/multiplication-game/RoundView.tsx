import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KangurPracticeGameShell,
  KangurPracticeGameProgress,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import { KangurGlassPanel } from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';
import { type createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { useMultiplicationArrayGame } from './context';
import { MultiplicationArrayCounters } from './Counters';
import { MultiplicationArrayGroups } from './Groups';
import { TOTAL_ROUNDS } from './constants';

function MultiplicationArrayRoundHeader({ a, b, allCollected, total }: { a: number; b: number; allCollected: boolean; total: number }): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  return (
    <div className='text-center'>
      <p className='mb-1 text-xs font-bold uppercase tracking-wide text-purple-400'>
        {translations('multiplicationArray.inRound.header')}
      </p>
      <p className='text-3xl font-extrabold text-purple-600'>
        {a} × {b}{' '}
        <span className='[color:var(--kangur-page-muted-text)]'>
          = {allCollected ? <span className='text-green-500'>{total}</span> : '?'}
        </span>
      </p>
    </div>
  );
}

function MultiplicationArrayCelebration({ a, b, total, allCollected }: { a: number; b: number; total: number; allCollected: boolean }): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  return (
    <AnimatePresence>
      {allCollected ? (
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className='text-center'
          exit={{ opacity: 0 }}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
        >
          <p className='text-2xl font-extrabold text-green-600'>
            🎉 {a} × {b} = {total}!
          </p>
          <p className='mt-1 text-sm [color:var(--kangur-page-muted-text)]'>
            {translations('multiplicationArray.inRound.celebrationDetail', { a: String(a), b: String(b), total: String(total) })}
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function MultiplicationArrayRoundView({
  roundIndex,
  roundMotionProps,
}: {
  roundIndex: number;
  roundMotionProps: ReturnType<typeof createKangurPageTransitionMotionProps>;
}): React.JSX.Element {
  const { a, b, collected, translations } = useMultiplicationArrayGame();
  const total = a * b;
  const collectedCount = collected.size * b;
  const allCollected = collected.size === a;

  return (
    <KangurPracticeGameShell
      className='w-full max-w-4xl'
      data-testid='multiplication-array-game-shell'
    >
      <KangurPracticeGameProgress
        accent='indigo'
        currentRound={roundIndex}
        dataTestId='multiplication-array-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <AnimatePresence mode='wait'>
        <motion.div key={`${roundIndex}-${a}-${b}`} {...roundMotionProps} className='w-full'>
          <KangurGlassPanel
            className={cn('flex w-full flex-col items-center', KANGUR_PANEL_GAP_CLASSNAME)}
            data-testid='multiplication-array-round-shell'
            padding='lg'
            surface='solid'
            variant='soft'
          >
            <MultiplicationArrayRoundHeader a={a} b={b} allCollected={allCollected} total={total} />
            <MultiplicationArrayCounters collectedCount={collectedCount} total={total} />
            <MultiplicationArrayGroups />
            <MultiplicationArrayCelebration a={a} b={b} total={total} allCollected={allCollected} />

            {!allCollected ? (
              <p className='text-center text-xs [color:var(--kangur-page-muted-text)]'>
                {translations('multiplicationArray.inRound.progress', {
                  collected: collected.size,
                  total: a,
                })}
              </p>
            ) : null}
          </KangurGlassPanel>
        </motion.div>
      </AnimatePresence>
    </KangurPracticeGameShell>
  );
}
