import type { KangurScorePort, KangurScoreRecord } from '@kangur/platform';
import { resolveKangurScoreSubject, type KangurLessonSubject } from '@/shared/contracts/kangur';

export const LEARNER_PROFILE_SCORE_FETCH_LIMIT = 120;
const KANGUR_SCOPED_SCORES_CACHE_TTL_MS = 30_000;

type LoadScopedKangurScoresInput = {
  learnerId?: string | null;
  playerName?: string | null;
  createdBy?: string | null;
  subject?: KangurLessonSubject;
  limit?: number;
  fallbackToAll?: boolean;
};

type LoadLearnerProfileScoresInput = {
  learnerId?: string | null;
  userName: string;
  userEmail: string;
  subject?: KangurLessonSubject;
  limit?: number;
};

type LoadKangurLeaderboardScoresInput = {
  subject?: KangurLessonSubject;
  limit?: number;
};

type ScopedScoresCacheEntry = {
  data: KangurScoreRecord[];
  fetchedAt: number;
};

const sortScoresByCreatedDateDesc = (left: KangurScoreRecord, right: KangurScoreRecord): number =>
  new Date(right.created_date).getTime() - new Date(left.created_date).getTime();

const dedupeScoresById = (scores: KangurScoreRecord[]): KangurScoreRecord[] => {
  const uniqueRows = new Map<string, KangurScoreRecord>();
  scores.forEach((score) => uniqueRows.set(score.id, score));
  return Array.from(uniqueRows.values()).sort(sortScoresByCreatedDateDesc);
};

const scopedScoresCache = new Map<KangurScorePort, Map<string, ScopedScoresCacheEntry>>();
const scopedScoresInflight = new Map<KangurScorePort, Map<string, Promise<KangurScoreRecord[]>>>();
const leaderboardScoresCache = new Map<KangurScorePort, Map<string, ScopedScoresCacheEntry>>();
const leaderboardScoresInflight = new Map<
  KangurScorePort,
  Map<string, Promise<KangurScoreRecord[]>>
>();

const cloneScopedScores = (scores: KangurScoreRecord[]): KangurScoreRecord[] =>
  structuredClone(scores);

const getScopedScoresCacheStore = (
  scorePort: KangurScorePort
): Map<string, ScopedScoresCacheEntry> => {
  const existing = scopedScoresCache.get(scorePort);
  if (existing) {
    return existing;
  }
  const next = new Map<string, ScopedScoresCacheEntry>();
  scopedScoresCache.set(scorePort, next);
  return next;
};

const getScopedScoresInflightStore = (
  scorePort: KangurScorePort
): Map<string, Promise<KangurScoreRecord[]>> => {
  const existing = scopedScoresInflight.get(scorePort);
  if (existing) {
    return existing;
  }
  const next = new Map<string, Promise<KangurScoreRecord[]>>();
  scopedScoresInflight.set(scorePort, next);
  return next;
};

const getLeaderboardScoresCacheStore = (
  scorePort: KangurScorePort
): Map<string, ScopedScoresCacheEntry> => {
  const existing = leaderboardScoresCache.get(scorePort);
  if (existing) {
    return existing;
  }
  const next = new Map<string, ScopedScoresCacheEntry>();
  leaderboardScoresCache.set(scorePort, next);
  return next;
};

const getLeaderboardScoresInflightStore = (
  scorePort: KangurScorePort
): Map<string, Promise<KangurScoreRecord[]>> => {
  const existing = leaderboardScoresInflight.get(scorePort);
  if (existing) {
    return existing;
  }
  const next = new Map<string, Promise<KangurScoreRecord[]>>();
  leaderboardScoresInflight.set(scorePort, next);
  return next;
};

const buildScopedScoresCacheKey = (input: {
  learnerId?: string | null;
  playerName?: string | null;
  createdBy?: string | null;
  subject?: KangurLessonSubject;
  limit: number;
  fallbackToAll?: boolean;
}): string =>
  JSON.stringify({
    learnerId: input.learnerId?.trim() ?? '',
    playerName: input.playerName?.trim() ?? '',
    createdBy: input.createdBy?.trim() ?? '',
    subject: input.subject ?? null,
    limit: input.limit,
    fallbackToAll: input.fallbackToAll === true,
  });

const buildLeaderboardScoresCacheKey = (input: {
  subject?: KangurLessonSubject;
  limit: number;
}): string =>
  JSON.stringify({
    subject: input.subject ?? null,
    limit: input.limit,
  });

export const clearKangurScopedScoresCache = (): void => {
  scopedScoresCache.clear();
  scopedScoresInflight.clear();
  leaderboardScoresCache.clear();
  leaderboardScoresInflight.clear();
};

export const peekCachedScopedKangurScores = (
  scorePort: KangurScorePort,
  input: LoadScopedKangurScoresInput
): KangurScoreRecord[] | null => {
  const learnerId = input.learnerId?.trim() ?? '';
  const playerName = input.playerName?.trim() ?? '';
  const createdBy = input.createdBy?.trim() ?? '';
  const limit = input.limit ?? LEARNER_PROFILE_SCORE_FETCH_LIMIT;
  const cacheKey = buildScopedScoresCacheKey({
    learnerId,
    playerName,
    createdBy,
    subject: input.subject,
    limit,
    fallbackToAll: input.fallbackToAll,
  });
  const cacheStore = getScopedScoresCacheStore(scorePort);
  const cached = cacheStore.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.fetchedAt >= KANGUR_SCOPED_SCORES_CACHE_TTL_MS) {
    cacheStore.delete(cacheKey);
    return null;
  }

  return cloneScopedScores(cached.data);
};

export const loadScopedKangurScores = async (
  scorePort: KangurScorePort,
  input: LoadScopedKangurScoresInput
): Promise<KangurScoreRecord[]> => {
  const learnerId = input.learnerId?.trim() ?? '';
  const playerName = input.playerName?.trim() ?? '';
  const createdBy = input.createdBy?.trim() ?? '';
  const subject = input.subject;
  const limit = input.limit ?? LEARNER_PROFILE_SCORE_FETCH_LIMIT;
  const cacheKey = buildScopedScoresCacheKey({
    learnerId,
    playerName,
    createdBy,
    subject,
    limit,
    fallbackToAll: input.fallbackToAll,
  });
  const cacheStore = getScopedScoresCacheStore(scorePort);
  const inflightStore = getScopedScoresInflightStore(scorePort);
  const cached = peekCachedScopedKangurScores(scorePort, {
    learnerId,
    playerName,
    createdBy,
    subject,
    limit,
    fallbackToAll: input.fallbackToAll,
  });
  if (cached !== null) {
    return cached;
  }

  const inflight = inflightStore.get(cacheKey);
  if (inflight) {
    return cloneScopedScores(await inflight);
  }

  if (learnerId.length === 0 && playerName.length === 0 && createdBy.length === 0) {
    if (!input.fallbackToAll) {
      return [];
    }

    const inflightPromise = scorePort
      .filter(subject ? { subject } : {}, '-created_date', limit)
      .then((rows) => {
        const resolvedRows = [...rows]
          .filter((score) =>
            subject ? resolveKangurScoreSubject(score) === subject : true
          )
          .sort(sortScoresByCreatedDateDesc);
        cacheStore.set(cacheKey, {
          data: cloneScopedScores(resolvedRows),
          fetchedAt: Date.now(),
        });
        return resolvedRows;
      })
      .finally(() => {
        inflightStore.delete(cacheKey);
      });

    inflightStore.set(cacheKey, inflightPromise);
    return cloneScopedScores(await inflightPromise);
  }

  const inflightPromise = Promise.all([
    learnerId.length > 0
      ? scorePort.filter(
          { learner_id: learnerId, ...(subject ? { subject } : {}) },
          '-created_date',
          limit
        )
      : Promise.resolve([]),
    createdBy.length > 0
      ? scorePort.filter(
          { created_by: createdBy, ...(subject ? { subject } : {}) },
          '-created_date',
          limit
        )
      : Promise.resolve([]),
    playerName.length > 0
      ? scorePort.filter(
          { player_name: playerName, ...(subject ? { subject } : {}) },
          '-created_date',
          limit
        )
      : Promise.resolve([]),
  ])
    .then(([rowsByLearner, rowsByEmail, rowsByName]) => {
      const filtered = subject
        ? [...rowsByLearner, ...rowsByEmail, ...rowsByName].filter(
            (score) => resolveKangurScoreSubject(score) === subject
          )
        : [...rowsByLearner, ...rowsByEmail, ...rowsByName];
      const resolvedRows = dedupeScoresById(filtered);
      cacheStore.set(cacheKey, {
        data: cloneScopedScores(resolvedRows),
        fetchedAt: Date.now(),
      });
      return resolvedRows;
    })
    .finally(() => {
      inflightStore.delete(cacheKey);
    });

  inflightStore.set(cacheKey, inflightPromise);
  return cloneScopedScores(await inflightPromise);
};

export const peekCachedKangurLeaderboardScores = (
  scorePort: KangurScorePort,
  input: LoadKangurLeaderboardScoresInput
): KangurScoreRecord[] | null => {
  const limit = input.limit ?? 20;
  const cacheKey = buildLeaderboardScoresCacheKey({
    subject: input.subject,
    limit,
  });
  const cacheStore = getLeaderboardScoresCacheStore(scorePort);
  const cached = cacheStore.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.fetchedAt >= KANGUR_SCOPED_SCORES_CACHE_TTL_MS) {
    cacheStore.delete(cacheKey);
    return null;
  }

  return cloneScopedScores(cached.data);
};

export const loadKangurLeaderboardScores = async (
  scorePort: KangurScorePort,
  input: LoadKangurLeaderboardScoresInput
): Promise<KangurScoreRecord[]> => {
  const limit = input.limit ?? 20;
  const cacheKey = buildLeaderboardScoresCacheKey({
    subject: input.subject,
    limit,
  });
  const cacheStore = getLeaderboardScoresCacheStore(scorePort);
  const inflightStore = getLeaderboardScoresInflightStore(scorePort);
  const cached = peekCachedKangurLeaderboardScores(scorePort, {
    subject: input.subject,
    limit,
  });
  if (cached !== null) {
    return cached;
  }

  const inflight = inflightStore.get(cacheKey);
  if (inflight) {
    return cloneScopedScores(await inflight);
  }

  const inflightPromise = scorePort
    .filter(input.subject ? { subject: input.subject } : {}, '-score', limit)
    .then((rows) => {
      const resolvedRows = input.subject
        ? rows.filter((score) => resolveKangurScoreSubject(score) === input.subject)
        : rows;
      cacheStore.set(cacheKey, {
        data: cloneScopedScores(resolvedRows),
        fetchedAt: Date.now(),
      });
      return resolvedRows;
    })
    .finally(() => {
      inflightStore.delete(cacheKey);
    });

  inflightStore.set(cacheKey, inflightPromise);
  return cloneScopedScores(await inflightPromise);
};

export const loadLearnerProfileScores = async (
  scorePort: KangurScorePort,
  input: LoadLearnerProfileScoresInput
): Promise<KangurScoreRecord[]> =>
  loadScopedKangurScores(scorePort, {
    learnerId: input.learnerId,
    playerName: input.userName,
    createdBy: input.userEmail,
    subject: input.subject,
    limit: input.limit,
  });
