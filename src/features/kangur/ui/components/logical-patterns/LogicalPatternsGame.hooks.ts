'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { DropResult } from '@hello-pangea/dnd';
import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import {
  getLogicalPatternDataset,
  type LogicalPatternSetId,
} from '../logical-patterns-workshop-data';
import {
  buildRoundState,
  createFallbackRound,
  getBlankIdFromSlot,
  isSlotId,
  removeTokenById,
} from './LogicalPatternsGame.utils';
import type { RoundState, BlankCell } from './LogicalPatternsGame.types';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';

export function useLogicalPatternsGameState(patternSetId: LogicalPatternSetId) {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  
  const patternDataset = useMemo(() => getLogicalPatternDataset(patternSetId), [patternSetId]);
  const { rounds, tiles } = patternDataset;
  const totalRounds = Math.max(rounds.length, 1);
  const totalTargets = useMemo(() => rounds.reduce((sum, r) => sum + r.sequence.filter(c => c.type === 'blank').length, 0), [rounds]);
  const fallbackRound = useMemo(() => createFallbackRound(), []);
  const firstRound = rounds[0] ?? fallbackRound;

  const [roundIndex, setRoundIndex] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>(() => buildRoundState(firstRound, tiles));
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [usedHint, setUsedHint] = useState(false);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const sessionStartedAtRef = useRef(Date.now());

  const round = rounds[roundIndex] ?? firstRound;
  const blanks = useMemo(() => round.sequence.filter((cell): cell is BlankCell => cell.type === 'blank'), [round.sequence]);
  const selectedToken = useMemo(() => selectedTokenId ? roundState.pool.find((t) => t.id === selectedTokenId) ?? null : null, [roundState.pool, selectedTokenId]);
  const isRoundComplete = useMemo(() => blanks.every((b) => roundState.slots[b.id]?.length), [blanks, roundState.slots]);

  const handleCheck = useCallback(() => {
    if (checked || !isRoundComplete) return;
    setSelectedTokenId(null);
    const correctCount = blanks.reduce((acc, b) => acc + (roundState.slots[b.id]?.[0]?.value === b.correctValue ? 1 : 0), 0);
    setRoundCorrect(correctCount);
    setStartedAt(prev => prev ?? Date.now());
    setCompletedAt(Date.now());
    setChecked(true);
  }, [blanks, checked, isRoundComplete, roundState.slots]);

  const goToNextRound = useCallback(() => {
    const elapsed = startedAt && completedAt ? Math.max(0, completedAt - startedAt) : null;
    const roundMax = blanks.length;
    const roundScore = Math.max(0, roundCorrect - (usedHint ? 1 : 0) - (elapsed && elapsed > 45000 ? 1 : 0));
    const nextScore = score + Math.min(roundScore, roundMax);
    setScore(nextScore);

    if (roundIndex + 1 >= totalRounds) {
      if (totalTargets > 0) {
        const progress = loadProgress({ ownerKey });
        const reward = createLessonPracticeReward(progress, 'logical_patterns', nextScore, totalTargets);
        addXp(reward.xp, reward.progressUpdates, { ownerKey });
        void persistKangurSessionScore({
          operation: 'logical',
          score: nextScore,
          totalQuestions: totalTargets,
          correctAnswers: nextScore,
          timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
          xpEarned: reward.xp,
        });
        setXpEarned(reward.xp);
        setXpBreakdown(reward.breakdown ?? []);
      }
      setDone(true);
      return;
    }
    const nextIndex = roundIndex + 1;
    const nextRound = rounds[nextIndex] ?? firstRound;
    setRoundIndex(nextIndex);
    setRoundState(buildRoundState(nextRound, tiles));
    setSelectedTokenId(null); setChecked(false); setShowHint(false); setUsedHint(false);
    setStartedAt(null); setCompletedAt(null); setRoundCorrect(0);
  }, [blanks.length, completedAt, firstRound, ownerKey, roundCorrect, roundIndex, rounds, score, startedAt, tiles, totalRounds, totalTargets, usedHint]);

  const restart = useCallback(() => {
    setRoundIndex(0); setRoundState(buildRoundState(firstRound, tiles));
    setSelectedTokenId(null); setChecked(false); setShowHint(false); setUsedHint(false);
    setStartedAt(null); setCompletedAt(null); setRoundCorrect(0); setScore(0);
    setDone(false); setXpEarned(0); setXpBreakdown([]);
    sessionStartedAtRef.current = Date.now();
  }, [firstRound, tiles]);

  const onDragEnd = useCallback((result: DropResult) => {
    if (checked) return;
    const { source, destination } = result;
    if (!destination) return;
    setStartedAt(curr => curr ?? Date.now());
    const sourceId = source.droppableId;
    const destId = destination.droppableId;
    if (sourceId === destId && source.index === destination.index) return;
    if (sourceId !== 'pool' && !isSlotId(sourceId)) return;
    if (destId !== 'pool' && !isSlotId(destId)) return;

    setRoundState((prev) => {
      const sourceList = sourceId === 'pool' ? [...prev.pool] : [...(prev.slots[getBlankIdFromSlot(sourceId)] ?? [])];
      const [moved] = sourceList.splice(source.index, 1);
      if (!moved) return prev;

      const nextSlots = { ...prev.slots };
      let nextPool = prev.pool;

      if (sourceId === 'pool') nextPool = sourceList;
      else nextSlots[getBlankIdFromSlot(sourceId)] = sourceList;

      if (destId === 'pool') {
        const updatedPool = [...nextPool];
        updatedPool.splice(destination.index, 0, moved);
        return { pool: updatedPool, slots: nextSlots };
      }

      const blankId = getBlankIdFromSlot(destId);
      const existing = nextSlots[blankId]?.[0] ?? null;
      if (existing) nextPool = [...nextPool, existing];
      nextSlots[blankId] = [moved];
      return { pool: nextPool, slots: nextSlots };
    });
    setSelectedTokenId(null);
  }, [checked]);

  const handleSlotClick = useCallback((blankId: string) => {
    if (checked) return;
    if (selectedTokenId) {
      setStartedAt(curr => curr ?? Date.now());
      setRoundState((prev) => {
        const { updated: nextPool, token } = removeTokenById(prev.pool, selectedTokenId);
        if (!token) return prev;
        const existing = prev.slots[blankId]?.[0] ?? null;
        return { pool: existing ? [...nextPool, existing] : nextPool, slots: { ...prev.slots, [blankId]: [token] } };
      });
      setSelectedTokenId(null);
      return;
    }
    setRoundState((prev) => {
      const existing = prev.slots[blankId]?.[0] ?? null;
      if (!existing) return prev;
      return { pool: [...prev.pool, existing], slots: { ...prev.slots, [blankId]: [] } };
    });
  }, [checked, selectedTokenId]);

  return {
    translations, isCoarsePointer, roundIndex, roundState, selectedTokenId, setSelectedTokenId, checked, setChecked,
    showHint, setShowHint, usedHint, setUsedHint, roundCorrect, score, done, xpEarned, xpBreakdown,
    round, blanks, tiles, selectedToken, isRoundComplete, totalRounds, totalTargets,
    handleCheck, goToNextRound, restart, onDragEnd, handleSlotClick,
  };
}
