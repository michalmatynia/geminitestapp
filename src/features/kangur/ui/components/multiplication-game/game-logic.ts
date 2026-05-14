import { type KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import { TOTAL_ROUNDS } from './constants';

export const resetMultiplicationArrayGame = ({
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
}: {
  sessionStartedAtRef: React.MutableRefObject<number | null>;
  setCelebrating: React.Dispatch<React.SetStateAction<boolean>>;
  setCollected: React.Dispatch<React.SetStateAction<Set<number>>>;
  setDone: React.Dispatch<React.SetStateAction<boolean>>;
  setProblem: React.Dispatch<React.SetStateAction<[number, number]>>;
  setRoundIndex: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setXpBreakdown: React.Dispatch<React.SetStateAction<KangurRewardBreakdownEntry[]>>;
  setXpEarned: React.Dispatch<React.SetStateAction<number>>;
  pickProblem: () => [number, number];
}): void => {
  setRoundIndex(0);
  setScore(0);
  setDone(false);
  setXpEarned(0);
  setXpBreakdown([]);
  setCelebrating(false);
  setProblem(pickProblem());
  setCollected(new Set());
  const ref = sessionStartedAtRef;
  ref.current = Date.now();
};

export const finishMultiplicationArrayGame = ({
  newScore,
  ownerKey,
  sessionStartedAtRef,
  setCelebrating,
  setDone,
  setScore,
  setXpBreakdown,
  setXpEarned,
}: {
  newScore: number;
  ownerKey: string | null;
  sessionStartedAtRef: React.MutableRefObject<number | null>;
  setCelebrating: React.Dispatch<React.SetStateAction<boolean>>;
  setDone: React.Dispatch<React.SetStateAction<boolean>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setXpBreakdown: React.Dispatch<React.SetStateAction<KangurRewardBreakdownEntry[]>>;
  setXpEarned: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  const progress = loadProgress({ ownerKey });
  const reward = createLessonPracticeReward(progress, 'multiplication', newScore, TOTAL_ROUNDS);
  addXp(reward.xp, reward.progressUpdates, { ownerKey });
  const startedAt = sessionStartedAtRef.current ?? Date.now();
  const timeTakenSeconds = Math.round((Date.now() - startedAt) / 1000);
  void persistKangurSessionScore({
    operation: 'multiplication',
    score: newScore,
    totalQuestions: TOTAL_ROUNDS,
    correctAnswers: newScore,
    timeTakenSeconds,
    xpEarned: reward.xp,
  });
  setXpEarned(reward.xp);
  setXpBreakdown(reward.breakdown ?? []);
  setScore(newScore);
  setCelebrating(false);
  setDone(true);
};

export const advanceMultiplicationArrayGameRound = ({
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
}: {
  a: number;
  b: number;
  newScore: number;
  ownerKey: string | null;
  roundIndex: number;
  sessionStartedAtRef: React.MutableRefObject<number | null>;
  setCelebrating: React.Dispatch<React.SetStateAction<boolean>>;
  setCollected: React.Dispatch<React.SetStateAction<Set<number>>>;
  setDone: React.Dispatch<React.SetStateAction<boolean>>;
  setProblem: React.Dispatch<React.SetStateAction<[number, number]>>;
  setRoundIndex: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setXpBreakdown: React.Dispatch<React.SetStateAction<KangurRewardBreakdownEntry[]>>;
  setXpEarned: React.Dispatch<React.SetStateAction<number>>;
  pickProblem: (excludePrev: [number, number]) => [number, number];
}): void => {
  if (roundIndex + 1 >= TOTAL_ROUNDS) {
    finishMultiplicationArrayGame({
      newScore,
      ownerKey,
      sessionStartedAtRef,
      setCelebrating,
      setDone,
      setScore,
      setXpBreakdown,
      setXpEarned,
    });
    return;
  }

  setScore(newScore);
  setRoundIndex((current) => current + 1);
  setProblem(pickProblem([a, b]));
  setCollected(new Set());
  setCelebrating(false);
};
