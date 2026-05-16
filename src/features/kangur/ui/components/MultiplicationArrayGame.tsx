'use client';

import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';

import { getKangurMiniGameFinishLabel } from '@/features/kangur/ui/constants/mini-game-i18n';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { type KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { safeSetTimeout } from '@/shared/lib/timers';

import { type MultiplicationArrayProblem, pickProblem } from './multiplication-game/constants';
import { MultiplicationArrayGameContext } from './multiplication-game/context';
import {
  clearMultiplicationArrayAdvanceTimeout,
} from './multiplication-game/utils';
import {
  advanceMultiplicationArrayGameRound,
  resetMultiplicationArrayGame,
} from './multiplication-game/game-logic';
import { MultiplicationArraySummaryView } from './multiplication-game/SummaryView';
import { MultiplicationArrayRoundView } from './multiplication-game/RoundView';

type MultiplicationArrayGameProps = {
  finishLabel?: string;
  finishLabelVariant?: 'done' | 'topics';
  onFinish: () => void;
};

export default function MultiplicationArrayGame({
  finishLabel,
  finishLabelVariant = 'done',
  onFinish,
}: MultiplicationArrayGameProps): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const resolvedFinishLabel =
    finishLabel ??
    getKangurMiniGameFinishLabel(
      translations,
      finishLabelVariant === 'topics' ? 'topics' : 'done'
    );
  const prefersReducedMotion = useReducedMotion();
  const roundMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const [[a, b], setProblem] = useState<MultiplicationArrayProblem>(() => pickProblem());
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const sessionStartedAtRef = useRef<number | null>(Date.now());
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allCollected = collected.size === a;

  useEffect(() => {
    if (!allCollected || done || advanceTimeoutRef.current !== null) {
      return undefined;
    }

    setCelebrating(true);
    advanceTimeoutRef.current = safeSetTimeout(() => {
      advanceTimeoutRef.current = null;
      const newScore = score + 1;
      advanceMultiplicationArrayGameRound({
        a,
        b,
        newScore,
        ownerKey,
        roundIndex,
        sessionStartedAtRef,
        setCelebrating,
        setCollected,
        setDone,
        setProblem,
        setRoundIndex,
        setScore,
        setXpBreakdown,
        setXpEarned,
        pickProblem,
      });
    }, 1400);

    return () => {
      clearMultiplicationArrayAdvanceTimeout(advanceTimeoutRef);
    };
  }, [a, allCollected, b, done, ownerKey, roundIndex, score]);

  const handleFinishGame = (): void => {
    onFinish();
  };

  const handleRestart = (): void => {
    clearMultiplicationArrayAdvanceTimeout(advanceTimeoutRef);
    resetMultiplicationArrayGame({
      sessionStartedAtRef,
      setCelebrating,
      setCollected,
      setDone,
      setProblem,
      setRoundIndex,
      setScore,
      setXpBreakdown,
      setXpEarned,
      pickProblem,
    });
  };

  const handleTapGroup = (groupIndex: number): void => {
    if (collected.has(groupIndex) || celebrating) {
      return;
    }

    setCollected((previous) => new Set([...previous, groupIndex]));
  };

  const contextValue = {
    a,
    b,
    celebrating,
    collected,
    finishLabel: resolvedFinishLabel,
    isCoarsePointer,
    onFinish: handleFinishGame,
    onRestart: handleRestart,
    onTapGroup: handleTapGroup,
    translations,
  };

  if (done) {
    const percent = Math.round((score / 6) * 100);
    return (
      <MultiplicationArrayGameContext.Provider value={contextValue}>
        <MultiplicationArraySummaryView
          results={{
            percent,
            score,
            xpBreakdown,
            xpEarned,
          }}
        />
      </MultiplicationArrayGameContext.Provider>
    );
  }

  return (
    <MultiplicationArrayGameContext.Provider value={contextValue}>
      <MultiplicationArrayRoundView
        roundIndex={roundIndex}
        roundMotionProps={roundMotionProps}
      />
    </MultiplicationArrayGameContext.Provider>
  );
}
