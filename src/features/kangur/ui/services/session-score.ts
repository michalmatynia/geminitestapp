import {
  withKangurClientError,
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';
import { createGuestKangurScore } from '@/features/kangur/services/guest-kangur-scores';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurUser } from '@kangur/platform';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { clearKangurScopedScoresCache } from '@/features/kangur/ui/services/learner-profile-scores';
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

type PersistedKangurSessionScorePayload = {
  player_name: string;
  score: number;
  operation: string;
  subject: ReturnType<typeof resolveKangurScoreSubject>;
  total_questions: number;
  correct_answers: number;
  time_taken: number;
  xp_earned?: number | undefined;
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

const pickFirstNonEmptyString = (...values: Array<string | null | undefined>): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const resolveSessionPlayerName = (user: KangurUser | null): string =>
  pickFirstNonEmptyString(
    user?.full_name,
    user?.activeLearner?.displayName,
    readStoredGuestPlayerName()
  ) ?? 'Gracz';

const isParentWithoutActiveLearner = (user: KangurUser | null): boolean =>
  user?.actorType === 'parent' && !user.activeLearner?.id;

const buildPersistedKangurSessionScorePayload = ({
  correctAnswers,
  operation,
  score,
  subject,
  timeTakenSeconds,
  totalQuestions,
  user,
  xpEarned,
}: PersistKangurSessionScoreInput & { user: KangurUser | null }): PersistedKangurSessionScorePayload => ({
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
});

const resolvePersistKangurSessionUser = async (
  operation: string
): Promise<{ user: KangurUser | null; isGuestSession: boolean }> => {
  let isGuestSession = false;
  const user = await withKangurClientError(
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

  return { user, isGuestSession };
};

const persistPlatformKangurSessionScore = async ({
  operation,
  payload,
}: {
  operation: string;
  payload: PersistedKangurSessionScorePayload;
}): Promise<boolean> => {
  let shouldStoreGuestScore = false;
  await withKangurClientError(
    {
      source: 'persistKangurSessionScore',
      action: 'createScore',
      description: 'Persist a session score to the Kangur platform.',
      context: {
        operation,
        totalQuestions: payload.total_questions,
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
  return shouldStoreGuestScore;
};

export async function persistKangurSessionScore({
  operation,
  score,
  totalQuestions,
  correctAnswers,
  timeTakenSeconds,
  xpEarned,
  subject,
}: PersistKangurSessionScoreInput): Promise<void> {
  const { user, isGuestSession } = await resolvePersistKangurSessionUser(operation);
  if (isParentWithoutActiveLearner(user)) {
    return;
  }

  const payload = buildPersistedKangurSessionScorePayload({
    correctAnswers,
    operation,
    score,
    subject,
    timeTakenSeconds,
    totalQuestions,
    user,
    xpEarned,
  });

  if (isGuestSession) {
    createGuestKangurScore(payload);
    return;
  }

  const shouldStoreGuestScore = await persistPlatformKangurSessionScore({ operation, payload });
  if (shouldStoreGuestScore) {
    createGuestKangurScore(payload);
    return;
  }

  clearKangurScopedScoresCache();
}
