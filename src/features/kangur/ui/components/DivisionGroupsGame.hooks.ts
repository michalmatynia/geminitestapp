'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { DropResult } from '@hello-pangea/dnd';
import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { scheduleKangurRoundFeedback } from '@/features/kangur/ui/services/round-transition';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import type { DivisionGroupsGameProps, Round, TokenItem, ZoneId } from './DivisionGroupsGame.types';
import {
  TOTAL_ROUNDS,
  createRound,
  buildGroups,
  isZoneId,
  reorderWithinList,
  moveBetweenLists,
} from './DivisionGroupsGame.utils';

export function useDivisionGroupsGameState(_props: DivisionGroupsGameProps) {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [round, setRound] = useState<Round>(() => createRound(0));
  const [pool, setPool] = useState<TokenItem[]>(() => round.tokens);
  const [groups, setGroups] = useState<TokenItem[][]>(() => buildGroups(round.divisor));
  const [remainder, setRemainder] = useState<TokenItem[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const sessionStartedAtRef = useRef(Date.now());
  const isLocked = status === 'correct';

  const resetRound = useCallback((nextRound: Round): void => {
    setRound(nextRound);
    setPool(nextRound.tokens);
    setGroups(buildGroups(nextRound.divisor));
    setRemainder([]);
    setStatus('idle');
    setSelectedTokenId(null);
  }, []);

  const handleCorrectRound = useCallback((): void => {
    const nextScore = score + 1;
    scheduleKangurRoundFeedback(() => {
      if (roundIndex + 1 >= TOTAL_ROUNDS) {
        const progress = loadProgress({ ownerKey });
        const reward = createLessonPracticeReward(progress, 'division', nextScore, TOTAL_ROUNDS);
        addXp(reward.xp, reward.progressUpdates, { ownerKey });
        void persistKangurSessionScore({
          operation: 'division',
          score: nextScore,
          totalQuestions: TOTAL_ROUNDS,
          correctAnswers: nextScore,
          timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
          xpEarned: reward.xp,
        });
        setXpEarned(reward.xp);
        setXpBreakdown(reward.breakdown ?? []);
        setDone(true);
        return;
      }
      const nextIdx = roundIndex + 1;
      setRoundIndex(nextIdx);
      setScore(nextScore);
      resetRound(createRound(nextIdx));
    });
  }, [ownerKey, resetRound, roundIndex, score]);

  const handleWrongRound = useCallback((): void => {
    setStatus('wrong');
    scheduleKangurRoundFeedback(() => {
      setStatus('idle');
    });
  }, []);

  const handleCheck = useCallback((): void => {
    if (isLocked) return;
    const groupsCorrect = groups.every((g) => g.length === round.quotient);
    const remainderCorrect = remainder.length === round.remainder;
    if (groupsCorrect && remainderCorrect) {
      setStatus('correct');
      handleCorrectRound();
    } else {
      handleWrongRound();
    }
  }, [groups, handleCorrectRound, handleWrongRound, isLocked, remainder.length, round.quotient, round.remainder]);

  const handleRestart = useCallback((): void => {
    setRoundIndex(0);
    setScore(0);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    resetRound(createRound(0));
    sessionStartedAtRef.current = Date.now();
  }, [resetRound]);

  const handleDragEnd = useCallback((result: DropResult): void => {
    if (isLocked) return;
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceId = source.droppableId;
    const destId = destination.droppableId;
    if (!isZoneId(sourceId) || !isZoneId(destId)) return;

    const getList = (id: ZoneId): TokenItem[] => {
      if (id === 'pool') return pool;
      if (id === 'remainder') return remainder;
      const idx = parseInt(id.replace('group-', ''), 10);
      return groups[idx] ?? [];
    };

    const updateLists = (id: ZoneId, newList: TokenItem[]): void => {
      if (id === 'pool') setPool(newList);
      else if (id === 'remainder') setRemainder(newList);
      else {
        const idx = parseInt(id.replace('group-', ''), 10);
        setGroups((prev) => {
          const next = [...prev];
          next[idx] = newList;
          return next;
        });
      }
    };

    if (sourceId === destId) {
      updateLists(sourceId, reorderWithinList(getList(sourceId), source.index, destination.index));
    } else {
      const moved = moveBetweenLists(getList(sourceId), getList(destId), source.index, destination.index);
      updateLists(sourceId, moved.source);
      updateLists(destId, moved.destination);
    }
    setSelectedTokenId(null);
  }, [groups, isLocked, pool, remainder]);

  return {
    translations,
    isCoarsePointer,
    roundIndex,
    score,
    done,
    xpEarned,
    xpBreakdown,
    round,
    pool,
    groups,
    remainder,
    selectedTokenId,
    setSelectedTokenId,
    status,
    isLocked,
    handleCheck,
    handleRestart,
    handleDragEnd,
  };
}
