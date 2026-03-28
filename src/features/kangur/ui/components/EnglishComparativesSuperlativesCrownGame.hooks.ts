'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { DropResult } from '@hello-pangea/dnd';

import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type {
  KangurMiniGameFeedbackState,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';

import { ENGLISH_COMPARE_AND_CROWN_ROUNDS } from './EnglishComparativesSuperlativesCrownGame.data';
import {
  buildRoundState,
  countRoundCorrect,
  getSlotIdFromDroppable,
  isSlotDroppable,
  takeTokenFromState,
  TOTAL_ROUNDS,
  TOTAL_TARGETS,
  type RoundState,
} from './EnglishComparativesSuperlativesCrownGame.utils';

export function useEnglishComparativesSuperlativesCrownGameState() {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();

  const [roundIndex, setRoundIndex] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>(() =>
    buildRoundState(ENGLISH_COMPARE_AND_CROWN_ROUNDS[0])
  );
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [feedback, setFeedback] = useState<KangurMiniGameFeedbackState>(null);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const sessionStartedAtRef = useRef(Date.now());

  const round =
    ENGLISH_COMPARE_AND_CROWN_ROUNDS[roundIndex] ?? ENGLISH_COMPARE_AND_CROWN_ROUNDS[0];

  const selectedToken = useMemo(() => {
    if (!selectedTokenId) return null;
    return (
      roundState.pool.find((token) => token.id === selectedTokenId) ??
      Object.values(roundState.slots).find((token) => token?.id === selectedTokenId) ??
      null
    );
  }, [roundState.pool, roundState.slots, selectedTokenId]);

  useEffect(() => {
    setRoundState(buildRoundState(round));
    setChecked(false);
    setRoundCorrect(0);
    setFeedback(null);
    setSelectedTokenId(null);
  }, [round]);

  const isRoundComplete = round.actions.every((action) => Boolean(roundState.slots[action.id]));

  const handleAssignToken = (slotId: string): void => {
    if (checked || !selectedTokenId) return;
    setRoundState((prev) => {
      const extracted = takeTokenFromState(prev, selectedTokenId);
      if (!extracted.token) return prev;
      const nextPool = [...extracted.pool];
      const nextSlots = { ...extracted.slots };
      const displaced = nextSlots[slotId];
      if (displaced && displaced.id !== extracted.token.id) {
        nextPool.push(displaced);
      }
      nextSlots[slotId] = extracted.token;
      return { pool: nextPool, slots: nextSlots };
    });
    setSelectedTokenId(null);
  };

  const handleReturnToPool = (): void => {
    if (checked || !selectedTokenId) return;
    setRoundState((prev) => {
      const extracted = takeTokenFromState(prev, selectedTokenId);
      if (!extracted.token) return prev;
      return {
        pool: [...extracted.pool, extracted.token],
        slots: extracted.slots,
      };
    });
    setSelectedTokenId(null);
  };

  const handleDragEnd = (result: DropResult): void => {
    const { source, destination } = result;
    if (!destination || checked) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    setRoundState((prev) => {
      if (source.droppableId === 'pool') {
        const sourcePool = [...prev.pool];
        const [token] = sourcePool.splice(source.index, 1);
        if (!token) return prev;

        if (destination.droppableId === 'pool') {
          sourcePool.splice(destination.index, 0, token);
          return { pool: sourcePool, slots: { ...prev.slots } };
        }

        if (!isSlotDroppable(destination.droppableId)) return prev;
        const slotId = getSlotIdFromDroppable(destination.droppableId);
        const nextSlots = { ...prev.slots };
        const displaced = nextSlots[slotId];
        if (displaced) {
          sourcePool.splice(destination.index, 0, displaced);
        }
        nextSlots[slotId] = token;
        return { pool: sourcePool, slots: nextSlots };
      }

      if (!isSlotDroppable(source.droppableId)) return prev;
      const sourceSlotId = getSlotIdFromDroppable(source.droppableId);
      const sourceToken = prev.slots[sourceSlotId];
      if (!sourceToken) return prev;

      const nextSlots = { ...prev.slots };
      nextSlots[sourceSlotId] = null;

      if (destination.droppableId === 'pool') {
        const nextPool = [...prev.pool];
        nextPool.splice(destination.index, 0, sourceToken);
        return { pool: nextPool, slots: nextSlots };
      }

      if (!isSlotDroppable(destination.droppableId)) return prev;
      const destinationSlotId = getSlotIdFromDroppable(destination.droppableId);
      const displaced = prev.slots[destinationSlotId];
      nextSlots[destinationSlotId] = sourceToken;
      nextSlots[sourceSlotId] = displaced ?? null;
      return { pool: [...prev.pool], slots: nextSlots };
    });

    setSelectedTokenId(null);
  };

  const handleReset = (): void => {
    setRoundState(buildRoundState(round));
    setChecked(false);
    setRoundCorrect(0);
    setFeedback(null);
    setSelectedTokenId(null);
  };

  const handleCheck = (): void => {
    if (!isRoundComplete || checked) return;
    const correct = countRoundCorrect(round, roundState);
    const isPerfect = correct === round.actions.length;
    setRoundCorrect(correct);
    setFeedback({
      kind: isPerfect ? 'success' : 'error',
      text: isPerfect
        ? 'Perfect! Every scene has the right comparative or superlative.'
        : 'Try again and check whether you are comparing two things or crowning one winner.',
    });
    setSelectedTokenId(null);
    setChecked(true);
  };

  const handleNext = (): void => {
    if (!checked) return;
    const nextTotal = totalCorrect + roundCorrect;
    setTotalCorrect(nextTotal);

    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      const progress = loadProgress({ ownerKey });
      const reward = createLessonPracticeReward(progress, {
        activityKey: 'english_compare_and_crown',
        lessonKey: 'english_comparatives_superlatives',
        correctAnswers: nextTotal,
        totalQuestions: TOTAL_TARGETS,
        strongThresholdPercent: 75,
      });
      addXp(reward.xp, reward.progressUpdates, { ownerKey });
      void persistKangurSessionScore({
        operation: 'english_comparatives_superlatives',
        score: nextTotal,
        totalQuestions: TOTAL_TARGETS,
        correctAnswers: nextTotal,
        timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
        xpEarned: reward.xp,
      });
      setXpEarned(reward.xp);
      setXpBreakdown(reward.breakdown ?? []);
      setDone(true);
      return;
    }

    setRoundIndex((current) => current + 1);
  };

  const handleRestart = (): void => {
    setRoundIndex(0);
    setRoundState(buildRoundState(ENGLISH_COMPARE_AND_CROWN_ROUNDS[0]));
    setChecked(false);
    setRoundCorrect(0);
    setTotalCorrect(0);
    setFeedback(null);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    setSelectedTokenId(null);
    sessionStartedAtRef.current = Date.now();
  };

  return {
    translations,
    isCoarsePointer,
    roundIndex,
    roundState,
    selectedTokenId,
    setSelectedTokenId,
    checked,
    roundCorrect,
    totalCorrect,
    feedback,
    done,
    xpEarned,
    xpBreakdown,
    round,
    selectedToken,
    isRoundComplete,
    handleAssignToken,
    handleReturnToPool,
    handleDragEnd,
    handleReset,
    handleCheck,
    handleNext,
    handleRestart,
  };
}
