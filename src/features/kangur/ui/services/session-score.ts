import {
  withKangurClientError,
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';
import { createGuestKangurScore } from '@/features/kangur/services/guest-kangur-scores';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurUser } from '@kangur/platform';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { resolveKangurScoreSubject, type KangurLessonSubject } from '@/shared/contracts/kangur';

const KANGUR_GUEST_PLAYER_STORAGE_KEY = 'kangur.guest-player-name';

const kangurPlatform = getKangurPlatform();

const isKangurAnonymousSessionError = (error: unknown): boolean => {
  if (isKangurAuthStatusError(error)) {
    return true;
  }

  const message =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : '';

  return /authentication required/i.test(message);
};

type PersistKangurSessionScoreInput = {
  operation: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeTakenSeconds: number;
  xpEarned?: number | null;
  subject?: KangurLessonSubject;
};

const readStoredGuestPlayerName = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  return withKangurClientErrorSync(
    {
      source: 'persistKangurSessionScore',
      action: 'readGuestPlayerName',
      description: 'Read stored guest player name from session storage.',
    },
    () => window.sessionStorage.getItem(KANGUR_GUEST_PLAYER_STORAGE_KEY)?.trim() ?? '',
    { fallback: '' }
  );
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
  subject,
}: PersistKangurSessionScoreInput): Promise<void> {
  let user: KangurUser | null = null;
  let isGuestSession = false;

  user = await withKangurClientError(
    {
      source: 'persistKangurSessionScore',
      action: 'resolveSessionUser',
      description: 'Resolve the current user before persisting a session score.',
      context: { operation },
    },
    () => kangurPlatform.auth.me(),
    {
      fallback: null,
      onError: (error) => {
        if (isKangurAnonymousSessionError(error)) {
          isGuestSession = true;
        }
      },
      shouldReport: (error) => !isKangurAnonymousSessionError(error),
    }
  );

  if (user?.actorType === 'parent' && !user?.activeLearner?.id) {
    return;
  }

  const payload = {
    player_name: resolveSessionPlayerName(user),
    score: Math.max(0, Math.round(score)),
    operation,
    subject: resolveKangurScoreSubject({ operation, subject }),
    total_questions: Math.max(1, Math.round(totalQuestions)),
    correct_answers: Math.max(0, Math.round(correctAnswers)),
    time_taken: Math.max(0, Math.round(timeTakenSeconds)),
    xp_earned:
      typeof xpEarned === 'number' && Number.isFinite(xpEarned)
        ? Math.max(0, Math.round(xpEarned))
        : undefined,
  };

  if (isGuestSession) {
    createGuestKangurScore(payload);
    return;
  }

  let shouldStoreGuestScore = false;
  await withKangurClientError(
    {
      source: 'persistKangurSessionScore',
      action: 'createScore',
      description: 'Persist a session score to the Kangur platform.',
      context: {
        operation,
        totalQuestions: Math.max(1, Math.round(totalQuestions)),
      },
    },
    () => kangurPlatform.score.create(payload),
    {
      fallback: undefined,
      onError: (error) => {
        if (isKangurAnonymousSessionError(error)) {
          shouldStoreGuestScore = true;
        }
      },
      shouldReport: (error) => !isKangurAnonymousSessionError(error),
    }
  );

  if (shouldStoreGuestScore) {
    createGuestKangurScore(payload);
  }
}
