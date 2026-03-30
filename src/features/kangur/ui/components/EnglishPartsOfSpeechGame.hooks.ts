'use client';

import { useRef, useState } from 'react';
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
import type {
  KangurMiniGameInformationalFeedback,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import type { PartOfSpeech, Round, RoundState, SpeechToken } from './EnglishPartsOfSpeechGame.types';
import { ROUNDS, TOTAL_ROUNDS } from './EnglishPartsOfSpeechGame.constants';
import {
  getBinIdFromDroppable,
  moveBetweenLists,
  moveWithinList,
  removeTokenById,
  shuffle,
} from './EnglishPartsOfSpeechGame.utils';

const buildRoundState = (round: Round): RoundState => ({
  pool: shuffle(round.tokens),
  bins: round.parts.reduce<Partial<Record<PartOfSpeech, SpeechToken[]>>>((acc, part) => {
    acc[part] = [];
    return acc;
  }, {}),
});

export function useEnglishPartsOfSpeechGameState() {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();

  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>(() => buildRoundState(ROUNDS[0]!));
  const [checked, setChecked] = useState(false);
  const [feedback, setFeedback] = useState<KangurMiniGameInformationalFeedback | null>(null);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const sessionStartedAtRef = useRef(Date.now());

  const round = ROUNDS[roundIndex]!;
  const isLocked = checked && feedback?.kind === 'success';

  const handleDragEnd = (result: DropResult): void => {
    if (isLocked) return;
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    setRoundState((prev) => {
      const sourceId = source.droppableId;
      const destId = destination.droppableId;

      const getList = (id: string): SpeechToken[] => {
        if (id === 'pool') return prev.pool;
        const binId = getBinIdFromDroppable(id);
        return prev.bins[binId] ?? [];
      };

      if (sourceId === destId) {
        const list = getList(sourceId);
        const next = moveWithinList(list, source.index, destination.index);
        if (sourceId === 'pool') return { ...prev, pool: next };
        return { ...prev, bins: { ...prev.bins, [getBinIdFromDroppable(sourceId)]: next } };
      }

      const sourceList = getList(sourceId);
      const destList = getList(destId);
      const { source: nextSource, destination: nextDest } = moveBetweenLists(
        sourceList,
        destList,
        source.index,
        destination.index
      );

      const nextBins = { ...prev.bins };
      let nextPool = prev.pool;

      if (sourceId === 'pool') nextPool = nextSource;
      else nextBins[getBinIdFromDroppable(sourceId)] = nextSource;

      if (destId === 'pool') nextPool = nextDest;
      else nextBins[getBinIdFromDroppable(destId)] = nextDest;

      return { pool: nextPool, bins: nextBins };
    });
    setFeedback(null);
    setSelectedTokenId(null);
  };

  const moveSelectedTokenTo = (destinationId: string): void => {
    if (isLocked || !selectedTokenId) return;

    setRoundState((prev) => {
      let movedToken: SpeechToken | undefined;
      const nextBins = { ...prev.bins };
      
      const { updated: poolUpdated, token: poolToken } = removeTokenById(prev.pool, selectedTokenId);
      let nextPool = poolUpdated;
      if (poolToken) movedToken = poolToken;

      if (!movedToken) {
        for (const binId of Object.keys(prev.bins) as PartOfSpeech[]) {
          const { updated, token } = removeTokenById(prev.bins[binId] ?? [], selectedTokenId);
          nextBins[binId] = updated;
          if (token) {
            movedToken = token;
            break;
          }
        }
      }

      if (!movedToken) return prev;

      if (destinationId === 'pool') {
        nextPool = [...nextPool, movedToken];
      } else {
        const binId = getBinIdFromDroppable(destinationId);
        nextBins[binId] = [...(nextBins[binId] ?? []), movedToken];
      }

      return { pool: nextPool, bins: nextBins };
    });

    setSelectedTokenId(null);
    setFeedback(null);
  };

  const handleCheck = (): void => {
    if (isLocked) return;
    const allPlaced = roundState.pool.length === 0;
    if (!allPlaced) {
      setFeedback({
        kind: 'info',
        text: translations('englishPartsOfSpeech.inRound.feedback.info'),
      });
      return;
    }

    const allCorrect = (Object.entries(roundState.bins) as [PartOfSpeech, SpeechToken[]][]).every(
      ([part, tokens]) => tokens.every((t) => t.part === part)
    );

    if (allCorrect) {
      setChecked(true);
      setFeedback({
        kind: 'success',
        text: translations('englishPartsOfSpeech.inRound.feedback.success'),
      });
      setScore((s) => s + 1);
    } else {
      setFeedback({
        kind: 'error',
        text: translations('englishPartsOfSpeech.inRound.feedback.error'),
      });
    }
  };

  const handleNext = (): void => {
    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      const finalScore = score;
      const progress = loadProgress({ ownerKey });
      const reward = createLessonPracticeReward(progress, 'english', finalScore, TOTAL_ROUNDS);
      addXp(reward.xp, reward.progressUpdates, { ownerKey });
      void persistKangurSessionScore({
        operation: 'english',
        score: finalScore,
        totalQuestions: TOTAL_ROUNDS,
        correctAnswers: finalScore,
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
    setRoundState(buildRoundState(ROUNDS[nextIdx]!));
    setChecked(false);
    setFeedback(null);
    setSelectedTokenId(null);
  };

  const handleRestart = (): void => {
    setRoundIndex(0);
    setScore(0);
    setRoundState(buildRoundState(ROUNDS[0]!));
    setChecked(false);
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
    score,
    roundState,
    checked,
    feedback,
    done,
    xpEarned,
    xpBreakdown,
    selectedTokenId,
    setSelectedTokenId,
    round,
    isLocked,
    handleDragEnd,
    moveSelectedTokenTo,
    handleCheck,
    handleNext,
    handleRestart,
  };
}
