import type {
  KangurDuelPlayer,
  KangurDuelQuestion,
  KangurDuelSession,
} from '@kangur/contracts/kangur-duels';

export const resolveCurrentQuestionIndex = (
  duelSession: KangurDuelSession | null,
  isSpectating: boolean,
  player: KangurDuelPlayer | null,
): number | null => {
  if (duelSession === null) {
    return null;
  }

  const currentQuestionIndex = isSpectating
    ? duelSession.currentQuestionIndex
    : (player?.currentQuestionIndex ?? 0);

  return currentQuestionIndex >= duelSession.questionCount
    ? null
    : currentQuestionIndex;
};

export const resolveCurrentQuestion = (
  duelSession: KangurDuelSession | null,
  isSpectating: boolean,
  player: KangurDuelPlayer | null,
): KangurDuelQuestion | null => {
  const currentQuestionIndex = resolveCurrentQuestionIndex(
    duelSession,
    isSpectating,
    player,
  );

  if (!duelSession || currentQuestionIndex === null) {
    return null;
  }

  return duelSession.questions[currentQuestionIndex] ?? null;
};

export const createMobileDuelSpectatorId = (): string =>
  `mobile_spectator_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
