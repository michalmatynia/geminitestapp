import { logKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurUser } from '@/features/kangur/services/ports';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { logClientError } from '@/features/kangur/shared/utils/observability/client-error-logger';


const KANGUR_GUEST_PLAYER_STORAGE_KEY = 'kangur.guest-player-name';

const kangurPlatform = getKangurPlatform();

type PersistKangurSessionScoreInput = {
  operation: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeTakenSeconds: number;
  xpEarned?: number | null;
};

const readStoredGuestPlayerName = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return window.sessionStorage.getItem(KANGUR_GUEST_PLAYER_STORAGE_KEY)?.trim() ?? '';
  } catch (error) {
    logClientError(error);
    return '';
  }
};

const resolveSessionPlayerName = (user: KangurUser | null): string =>
  user?.full_name?.trim() ||
  user?.activeLearner?.displayName?.trim() ||
  readStoredGuestPlayerName() ||
  'Gracz';

export async function persistKangurSessionScore({
  operation,
  score,
  totalQuestions,
  correctAnswers,
  timeTakenSeconds,
  xpEarned,
}: PersistKangurSessionScoreInput): Promise<void> {
  let user: KangurUser | null = null;

  try {
    user = await kangurPlatform.auth.me();
  } catch (error: unknown) {
    logClientError(error);
    if (!isKangurAuthStatusError(error)) {
      logKangurClientError(error, {
        source: 'persistKangurSessionScore',
        action: 'resolveSessionUser',
        operation,
      });
    }
  }

  if (user?.actorType === 'parent' && !user?.activeLearner?.id) {
    return;
  }

  try {
    await kangurPlatform.score.create({
      player_name: resolveSessionPlayerName(user),
      score: Math.max(0, Math.round(score)),
      operation,
      total_questions: Math.max(1, Math.round(totalQuestions)),
      correct_answers: Math.max(0, Math.round(correctAnswers)),
      time_taken: Math.max(0, Math.round(timeTakenSeconds)),
      xp_earned:
        typeof xpEarned === 'number' && Number.isFinite(xpEarned)
          ? Math.max(0, Math.round(xpEarned))
          : undefined,
    });
  } catch (error: unknown) {
    logClientError(error);
    logKangurClientError(error, {
      source: 'persistKangurSessionScore',
      action: 'createScore',
      operation,
      totalQuestions: Math.max(1, Math.round(totalQuestions)),
    });
  }
}
