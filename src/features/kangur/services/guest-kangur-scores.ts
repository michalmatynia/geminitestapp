import { z } from 'zod';

import { sortScores } from '@/features/kangur/services/kangur-score-repository/shared';
import { kangurScoreSchema, resolveKangurScoreSubject } from '@kangur/contracts/kangur';
import {
  type KangurScore,
  type KangurScoreCreateInput,
  type KangurScoreFilters,
  type KangurScoreLimit,
  type KangurScoreSort,
} from '@kangur/contracts/kangur';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';


const KANGUR_GUEST_SCORES_STORAGE_KEY = 'kangur_guest_scores_v1';
export const KANGUR_GUEST_SCORES_SESSION_STORAGE_KEY = 'kangur_guest_scores_session_v1';
const KANGUR_GUEST_SCORES_OWNER_STORAGE_KEY = 'kangur_guest_scores_owner_v1';
const guestScoreListSchema = z.array(kangurScoreSchema);

let guestScoreSyncInFlight: Promise<GuestKangurScoreSyncResult> | null = null;

export type GuestKangurScoreSyncResult = {
  remainingCount: number;
  syncedCount: number;
};

const canUseStorage = (): boolean => typeof window !== 'undefined' && Boolean(window.localStorage);

const generateGuestScoreMutationId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `guest-score:${crypto.randomUUID()}`;
  }

  return `guest-score:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
};

const generateGuestScoreSessionKey = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `guest-session:${crypto.randomUUID()}`;
  }

  return `guest-session:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
};

const readGuestScoreSessionKey = (): string | null => {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage
    .getItem(KANGUR_GUEST_SCORES_SESSION_STORAGE_KEY)
    ?.trim();
  return raw && raw.length > 0 ? raw : null;
};

export const getGuestKangurScoreSessionKey = (): string | null => {
  if (!canUseStorage()) {
    return null;
  }

  const existing = readGuestScoreSessionKey();
  if (existing) {
    return existing;
  }

  const nextKey = generateGuestScoreSessionKey();
  window.localStorage.setItem(KANGUR_GUEST_SCORES_SESSION_STORAGE_KEY, nextKey);
  return nextKey;
};

export const resetGuestKangurScoreSession = (): string | null => {
  if (!canUseStorage()) {
    return null;
  }

  window.localStorage.removeItem(KANGUR_GUEST_SCORES_STORAGE_KEY);
  window.localStorage.removeItem(KANGUR_GUEST_SCORES_OWNER_STORAGE_KEY);

  const nextKey = generateGuestScoreSessionKey();
  window.localStorage.setItem(KANGUR_GUEST_SCORES_SESSION_STORAGE_KEY, nextKey);
  return nextKey;
};

const dedupeScores = (scores: KangurScore[]): KangurScore[] => {
  const unique = new Map<string, KangurScore>();
  scores.forEach((score) => {
    const key = score.client_mutation_id?.trim() || score.id;
    unique.set(key, score);
  });
  return Array.from(unique.values());
};

const readStoredGuestScores = (): KangurScore[] => {
  if (!canUseStorage()) {
    return [];
  }

  const sessionKey = getGuestKangurScoreSessionKey();
  const ownerKey = window.localStorage
    .getItem(KANGUR_GUEST_SCORES_OWNER_STORAGE_KEY)
    ?.trim();
  if (ownerKey && ownerKey.length > 0 && ownerKey !== sessionKey) {
    return [];
  }

  return withKangurClientErrorSync(
    {
      source: 'kangur.guest-scores',
      action: 'read-storage',
      description: 'Reads guest Kangur scores from local storage.',
    },
    () => {
      const raw = window.localStorage.getItem(KANGUR_GUEST_SCORES_STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = guestScoreListSchema.safeParse(JSON.parse(raw) as unknown);
      if (!parsed.success) {
        return [];
      }

      return dedupeScores(parsed.data);
    },
    { fallback: [] }
  );
};

const writeStoredGuestScores = (scores: KangurScore[]): void => {
  if (!canUseStorage()) {
    return;
  }

  const normalized = dedupeScores(scores);
  if (normalized.length === 0) {
    window.localStorage.removeItem(KANGUR_GUEST_SCORES_STORAGE_KEY);
    window.localStorage.removeItem(KANGUR_GUEST_SCORES_OWNER_STORAGE_KEY);
    return;
  }

  const sessionKey = getGuestKangurScoreSessionKey();
  window.localStorage.setItem(KANGUR_GUEST_SCORES_STORAGE_KEY, JSON.stringify(normalized));
  if (sessionKey) {
    window.localStorage.setItem(KANGUR_GUEST_SCORES_OWNER_STORAGE_KEY, sessionKey);
  }
};

const matchesGuestScoreFilters = (
  score: KangurScore,
  filters: KangurScoreFilters | undefined
): boolean => {
  if (!filters) {
    return true;
  }

  if (filters.player_name && score.player_name !== filters.player_name) {
    return false;
  }
  if (filters.operation && score.operation !== filters.operation) {
    return false;
  }
  if (filters.subject && resolveKangurScoreSubject(score) !== filters.subject) {
    return false;
  }
  if (filters.created_by) {
    return false;
  }
  if (filters.learner_id) {
    return false;
  }

  return true;
};

export const loadGuestKangurScores = (): KangurScore[] => readStoredGuestScores();

export const hasGuestKangurScores = (): boolean => loadGuestKangurScores().length > 0;

export const createGuestKangurScore = (input: KangurScoreCreateInput): KangurScore => {
  const clientMutationId = input.client_mutation_id?.trim() || generateGuestScoreMutationId();
  const subject = resolveKangurScoreSubject({
    operation: input.operation,
    subject: input.subject,
  });
  const createdScore: KangurScore = {
    id: clientMutationId,
    player_name: input.player_name,
    score: input.score,
    operation: input.operation,
    subject,
    total_questions: input.total_questions,
    correct_answers: input.correct_answers,
    time_taken: input.time_taken,
    xp_earned: input.xp_earned ?? null,
    created_date: new Date().toISOString(),
    client_mutation_id: clientMutationId,
    created_by: null,
    learner_id: null,
    owner_user_id: null,
  };

  writeStoredGuestScores([createdScore, ...readStoredGuestScores()]);
  return createdScore;
};

export const removeGuestKangurScores = (clientMutationIds: string[]): void => {
  const targets = new Set(
    clientMutationIds.map((value) => value.trim()).filter((value) => value.length > 0)
  );
  if (targets.size === 0) {
    return;
  }

  const remaining = readStoredGuestScores().filter((score) => {
    const key = score.client_mutation_id?.trim() || score.id;
    return !targets.has(key);
  });
  writeStoredGuestScores(remaining);
};

export const listGuestKangurScores = (input?: {
  sort?: KangurScoreSort;
  limit?: KangurScoreLimit;
  filters?: KangurScoreFilters;
}): KangurScore[] => {
  const filtered = readStoredGuestScores().filter((score) =>
    matchesGuestScoreFilters(score, input?.filters)
  );
  const sorted = sortScores(filtered, input?.sort);
  const limit = input?.limit ?? 100;
  return sorted.slice(0, limit);
};

export const syncGuestKangurScores = async (input: {
  persistScore: (payload: KangurScoreCreateInput) => Promise<KangurScore>;
}): Promise<GuestKangurScoreSyncResult> => {
  if (guestScoreSyncInFlight) {
    return guestScoreSyncInFlight;
  }

  guestScoreSyncInFlight = (async (): Promise<GuestKangurScoreSyncResult> => {
    let syncedCount = 0;

    for (const score of readStoredGuestScores()) {
      const clientMutationId = score.client_mutation_id?.trim() || score.id;
      const subject = resolveKangurScoreSubject(score);
      await input.persistScore({
        player_name: score.player_name,
        score: score.score,
        operation: score.operation,
        subject,
        total_questions: score.total_questions,
        correct_answers: score.correct_answers,
        time_taken: score.time_taken,
        xp_earned: score.xp_earned ?? undefined,
        client_mutation_id: clientMutationId,
      });
      syncedCount += 1;
      removeGuestKangurScores([clientMutationId]);
    }

    return {
      syncedCount,
      remainingCount: readStoredGuestScores().length,
    };
  })();

  try {
    return await guestScoreSyncInFlight;
  } finally {
    guestScoreSyncInFlight = null;
  }
};
