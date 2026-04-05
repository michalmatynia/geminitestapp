'use client';

import React, { createContext, useContext, useMemo, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { scheduleKangurRoundFeedback } from '@/features/kangur/ui/services/round-transition';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import { getKangurMiniGameFinishLabel } from '@/features/kangur/ui/constants/mini-game-i18n';
import type {
  KangurMiniGameFinishVariantProps,
  KangurRewardBreakdownEntry,
  KangurIntlTranslate,
} from '@/features/kangur/ui/types';
import { internalError } from '@/shared/errors/app-error';

export type MultiplicationResultQuestion = {
  type: 'result';
  a: number;
  b: number;
  correct: number;
  choices: number[];
};

export type MultiplicationBlankQuestion = {
  type: 'blank';
  a: number;
  b: number;
  correct: number;
  product: number;
  shown: number;
  missingA: boolean;
  choices: number[];
};

export type MultiplicationQuestion = MultiplicationResultQuestion | MultiplicationBlankQuestion;

const TOTAL = 8;

const buildPositiveMultiplicationChoices = (correct: number, upperBound = Number.POSITIVE_INFINITY): number[] => {
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const wrong =
      correct + (Math.floor(Math.random() * 6) + 1) * (Math.random() < 0.5 ? 1 : -1);
    if (wrong > 0 && wrong !== correct && wrong <= upperBound) {
      wrongs.add(wrong);
    }
  }
  return [...wrongs, correct].sort(() => Math.random() - 0.5);
};

const buildMultiplicationBlankQuestion = ({
  a,
  b,
}: {
  a: number;
  b: number;
}): MultiplicationBlankQuestion => {
  const missingA = Math.random() < 0.5;
  const shown = missingA ? b : a;
  const missing = missingA ? a : b;

  return {
    type: 'blank',
    a,
    b,
    correct: missing,
    product: a * b,
    shown,
    missingA,
    choices: buildPositiveMultiplicationChoices(missing, 12),
  };
};

const buildMultiplicationResultQuestion = ({
  a,
  b,
}: {
  a: number;
  b: number;
}): MultiplicationResultQuestion => ({
  type: 'result',
  a,
  b,
  correct: a * b,
  choices: buildPositiveMultiplicationChoices(a * b),
});

function generateQuestion(round: number): MultiplicationQuestion {
  const useBlank = round % 2 === 1;
  const a = Math.floor(Math.random() * 9) + 2;
  const b = Math.floor(Math.random() * 9) + 2;

  if (useBlank) {
    return buildMultiplicationBlankQuestion({ a, b });
  }

  return buildMultiplicationResultQuestion({ a, b });
}

export type MultiplicationGameContextValue = {
  state: {
    roundIndex: number;
    score: number;
    done: boolean;
    xpEarned: number;
    xpBreakdown: KangurRewardBreakdownEntry[];
    question: MultiplicationQuestion;
    selected: number | null;
    confirmed: boolean;
    isCoarsePointer: boolean;
    finishLabel: string;
    translations: KangurIntlTranslate;
    TOTAL: number;
  };
  actions: {
    handleSelect: (choice: number) => void;
    handleConfirm: () => void;
    resetSession: () => void;
    onFinish: () => void;
  };
};

const MultiplicationGameContext = createContext<MultiplicationGameContextValue | null>(null);

export function MultiplicationGameProvider({
  children,
  ...props
}: KangurMiniGameFinishVariantProps & { children: React.ReactNode }) {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const finishLabel = getKangurMiniGameFinishLabel(
    translations,
    props.finishLabelVariant === 'play' ? 'play' : 'lesson'
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [question, setQuestion] = useState<MultiplicationQuestion>(() => generateQuestion(0));
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const sessionStartedAtRef = useRef(Date.now());

  const resetSession = useCallback(() => {
    setRoundIndex(0);
    setScore(0);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    setQuestion(generateQuestion(0));
    setSelected(null);
    setConfirmed(false);
    sessionStartedAtRef.current = Date.now();
  }, []);

  const advanceRound = useCallback((newScore: number) => {
    if (roundIndex + 1 >= TOTAL) {
      const progress = loadProgress({ ownerKey });
      const reward = createLessonPracticeReward(progress, 'multiplication', newScore, TOTAL);
      addXp(reward.xp, reward.progressUpdates, { ownerKey });
      void persistKangurSessionScore({
        operation: 'multiplication',
        score: newScore,
        totalQuestions: TOTAL,
        correctAnswers: newScore,
        timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
        xpEarned: reward.xp,
      });
      setXpEarned(reward.xp);
      setXpBreakdown(reward.breakdown ?? []);
      setScore(newScore);
      setDone(true);
      return;
    }

    setScore(newScore);
    setRoundIndex((current) => current + 1);
    setQuestion(generateQuestion(roundIndex + 1));
    setSelected(null);
    setConfirmed(false);
  }, [ownerKey, roundIndex]);

  const handleConfirm = useCallback(() => {
    if (selected === null || confirmed) {
      return;
    }

    setConfirmed(true);
    const newScore = selected === question.correct ? score + 1 : score;
    scheduleKangurRoundFeedback(() => {
      advanceRound(newScore);
    });
  }, [selected, confirmed, question.correct, score, advanceRound]);

  const handleSelect = useCallback((choice: number) => {
    if (confirmed) {
      return;
    }
    setSelected(choice);
  }, [confirmed]);

  const contextValue = useMemo(() => ({
    state: {
      roundIndex,
      score,
      done,
      xpEarned,
      xpBreakdown,
      question,
      selected,
      confirmed,
      isCoarsePointer,
      finishLabel,
      translations,
      TOTAL,
    },
    actions: {
      handleSelect,
      handleConfirm,
      resetSession,
      onFinish: props.onFinish,
    },
  }), [
    roundIndex,
    score,
    done,
    xpEarned,
    xpBreakdown,
    question,
    selected,
    confirmed,
    isCoarsePointer,
    finishLabel,
    translations,
    handleSelect,
    handleConfirm,
    resetSession,
    props.onFinish,
  ]);

  return (
    <MultiplicationGameContext.Provider value={contextValue}>
      {children}
    </MultiplicationGameContext.Provider>
  );
}

export function useMultiplicationGameContext(): MultiplicationGameContextValue {
  const context = useContext(MultiplicationGameContext);
  if (!context) {
    throw internalError('useMultiplicationGameContext must be used within a MultiplicationGameProvider');
  }
  return context;
}
