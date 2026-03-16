import 'server-only';

import { randomUUID } from 'crypto';

import type { KangurLearnerProfile } from '@/features/kangur/shared/contracts/kangur';
import {
  KANGUR_DUELS_DEFAULT_LOBBY_LIMIT,
  KANGUR_DUELS_DEFAULT_OPPONENTS_LIMIT,
  KANGUR_DUELS_DEFAULT_SEARCH_LIMIT,
  KANGUR_DUELS_SEARCH_MIN_CHARS,
} from '@/features/kangur/shared/duels-config';
import type {
  KangurDuelAnswerInput,
  KangurDuelChoice,
  KangurDuelCreateInput,
  KangurDuelDifficulty,
  KangurDuelHeartbeatInput,
  KangurDuelJoinInput,
  KangurDuelLobbyEntry,
  KangurDuelLobbyResponse,
  KangurDuelLeaderboardEntry,
  KangurDuelLeaderboardResponse,
  KangurDuelLeaveInput,
  KangurDuelOpponentEntry,
  KangurDuelOpponentsResponse,
  KangurDuelOperation,
  KangurDuelSearchEntry,
  KangurDuelSearchResponse,
  KangurDuelPlayer,
  KangurDuelQuestion,
  KangurDuelReaction,
  KangurDuelReactionInput,
  KangurDuelReactionResponse,
  KangurDuelSeries,
  KangurDuelSession,
  KangurDuelSpectatorStateResponse,
  KangurDuelStateResponse,
  KangurDuelStatus,
  KangurDuelVisibility,
} from '@/features/kangur/shared/contracts/kangur-duels';
import { generateQuestions } from '@/features/kangur/shared/math-questions';
import {
  badRequestError,
  conflictError,
  forbiddenError,
  notFoundError,
} from '@/features/kangur/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { getRedisConnection } from '@/shared/lib/queue';
import { logClientError } from '@/features/kangur/shared/utils/observability/client-error-logger';
import { publishKangurDuelLobbyUpdate } from '@/features/kangur/services/duel-lobby-stream-publisher';
import {
  getKangurLearnerById,
  getKangurStoredLearnerByLoginName,
  searchKangurLearners,
} from '@/features/kangur/services/kangur-learner-repository';

import type { Collection } from 'mongodb';


type InternalDuelQuestion = {
  id: string;
  prompt: string;
  choices: KangurDuelChoice[];
  answer: KangurDuelChoice;
};

type DuelAnswerRecord = {
  questionId: string;
  choice: KangurDuelChoice;
  correct: boolean;
  answeredAt: Date;
};

type DuelReactionRecord = {
  id: string;
  learnerId: string;
  displayName: string;
  type: KangurDuelReaction['type'];
  createdAt: Date;
};

type MongoDuelPlayer = Omit<KangurDuelPlayer, 'joinedAt' | 'lastAnswerAt' | 'completedAt'> & {
  joinedAt: Date;
  lastAnswerAt?: Date | null;
  completedAt?: Date | null;
};

type MongoDuelSessionDocument = Omit<
  KangurDuelSession,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'startedAt'
  | 'endedAt'
  | 'questions'
  | 'players'
  | 'operation'
  | 'difficulty'
  | 'visibility'
  | 'invitedLearnerId'
  | 'invitedLearnerName'
> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  startedAt?: Date | null;
  endedAt?: Date | null;
  questions: InternalDuelQuestion[];
  players: MongoDuelPlayer[];
  playerCount: number;
  answersByPlayer?: Record<string, Record<string, DuelAnswerRecord>>;
  reactions?: DuelReactionRecord[];
  spectators?: Record<string, Date>;
  seriesId?: string | null;
  seriesBestOf?: number | null;
  seriesGameIndex?: number | null;
  seriesWinsByPlayer?: Record<string, number>;
  seriesCompletedGames?: number;
  operation?: KangurDuelOperation;
  difficulty?: KangurDuelDifficulty;
  maxPlayers?: number;
  minPlayersToStart?: number;
  visibility?: KangurDuelVisibility;
  invitedLearnerId?: string | null;
  invitedLearnerName?: string | null;
};

const DUELS_COLLECTION = 'kangur_duels';
const QUICK_MATCH_QUEUE_PREFIX = 'kangur:duels:quick-match:v2';
const LEGACY_QUICK_MATCH_QUEUE_KEY = 'kangur:duels:quick-match:v1';
const QUICK_MATCH_SCAN_LIMIT = 8;
const LOBBY_LIST_LIMIT = KANGUR_DUELS_DEFAULT_LOBBY_LIMIT;
const OPPONENTS_LIST_LIMIT = KANGUR_DUELS_DEFAULT_OPPONENTS_LIMIT;
const SEARCH_LIST_LIMIT = KANGUR_DUELS_DEFAULT_SEARCH_LIMIT;
const SEARCH_MIN_CHARS = KANGUR_DUELS_SEARCH_MIN_CHARS;
const DUEL_WAITING_TTL_MS = 30 * 60_000;
const DUEL_ACTIVE_TTL_MS = 2 * 60 * 60_000;
const DUEL_FINISHED_TTL_MS = 30 * 60_000;
const DUEL_REACTIONS_MAX = 24;
const DUEL_SPECTATOR_TTL_MS = 2 * 60_000;
const DUEL_SPECTATOR_MAX = 50;
const DUEL_SERIES_MAX_BEST_OF = 9;
const DUEL_LEADERBOARD_LIMIT = 10;
const DUEL_LEADERBOARD_LOOKBACK_DAYS = 30;
const DUEL_LEADERBOARD_SESSION_LIMIT = 200;
const DEFAULT_DUEL_MAX_PLAYERS = 4;
const DEFAULT_DUEL_MIN_PLAYERS_TO_START = 2;

const DEFAULT_QUESTION_COUNT = 8;
const DEFAULT_TIME_PER_QUESTION_SEC = 20;
const DEFAULT_DUEL_OPERATION: KangurDuelOperation = 'addition';
const DEFAULT_DUEL_DIFFICULTY: KangurDuelDifficulty = 'easy';

const now = (): Date => new Date();
const nowIso = (): string => new Date().toISOString();
const dayMs = 24 * 60 * 60_000;

const parseEnvInt = (value: string | undefined | null): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const clampInt = (value: number | null, min: number, max: number, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
};

const DUEL_MAX_PLAYERS = clampInt(
  parseEnvInt(process.env['KANGUR_DUELS_MAX_PLAYERS']),
  2,
  4,
  DEFAULT_DUEL_MAX_PLAYERS
);
const DUEL_MIN_PLAYERS_TO_START = clampInt(
  parseEnvInt(process.env['KANGUR_DUELS_MIN_PLAYERS_TO_START']),
  2,
  DUEL_MAX_PLAYERS,
  Math.min(DEFAULT_DUEL_MIN_PLAYERS_TO_START, DUEL_MAX_PLAYERS)
);

let indexesEnsured: Promise<void> | null = null;

const ensureDuelIndexes = async (): Promise<void> => {
  if (indexesEnsured) {
    return indexesEnsured;
  }

  indexesEnsured = (async (): Promise<void> => {
    const db = await getMongoDb();
    const collection = db.collection<MongoDuelSessionDocument>(DUELS_COLLECTION);
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await collection.createIndex({ updatedAt: -1 });
    await collection.createIndex({ seriesId: 1, createdAt: -1 });
    await collection.createIndex({ status: 1, endedAt: -1 });
  })();

  return indexesEnsured;
};

const toIsoString = (value: Date | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  try {
    return new Date(value).toISOString();
  } catch (error) {
    logClientError(error);
    return null;
  }
};

const resolveVisibility = (session: MongoDuelSessionDocument): KangurDuelVisibility =>
  session.visibility ?? 'public';

const resolveDuelOperation = (input?: { operation?: KangurDuelOperation | null }): KangurDuelOperation =>
  input?.operation ?? DEFAULT_DUEL_OPERATION;

const resolveDuelDifficulty = (
  input?: { difficulty?: KangurDuelDifficulty | null }
): KangurDuelDifficulty => input?.difficulty ?? DEFAULT_DUEL_DIFFICULTY;

const resolveSessionOperation = (session: MongoDuelSessionDocument): KangurDuelOperation =>
  session.operation ?? DEFAULT_DUEL_OPERATION;

const resolveSessionDifficulty = (session: MongoDuelSessionDocument): KangurDuelDifficulty =>
  session.difficulty ?? DEFAULT_DUEL_DIFFICULTY;

const normalizeQuestionCount = (value: number | undefined): number => {
  if (!value || !Number.isFinite(value)) {
    return DEFAULT_QUESTION_COUNT;
  }
  return Math.max(3, Math.min(20, Math.floor(value)));
};

const normalizeTimePerQuestionSec = (value: number | undefined): number => {
  if (!value || !Number.isFinite(value)) {
    return DEFAULT_TIME_PER_QUESTION_SEC;
  }
  return Math.max(5, Math.min(60, Math.floor(value)));
};

const normalizeMaxPlayers = (value?: number | null, fallback = DUEL_MAX_PLAYERS): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(2, Math.min(DUEL_MAX_PLAYERS, Math.floor(value)));
};

const normalizeMinPlayersToStart = (
  value: number | undefined | null,
  maxPlayers: number,
  fallback = DUEL_MIN_PLAYERS_TO_START
): number => {
  const base =
    typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.max(2, Math.min(maxPlayers, base));
};

const resolveSessionMaxPlayers = (session: MongoDuelSessionDocument): number =>
  normalizeMaxPlayers(session.maxPlayers ?? null);

const resolveSessionMinPlayersToStart = (session: MongoDuelSessionDocument): number =>
  normalizeMinPlayersToStart(session.minPlayersToStart ?? null, resolveSessionMaxPlayers(session));

const resolveLearnerDisplayName = (learner: KangurLearnerProfile): string =>
  learner.loginName?.trim() || learner.displayName?.trim() || 'Uczen';

const normalizeSeriesBestOf = (value?: number | null): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  let bestOf = Math.max(1, Math.min(DUEL_SERIES_MAX_BEST_OF, Math.floor(value)));
  if (bestOf % 2 === 0) {
    bestOf = bestOf + 1 <= DUEL_SERIES_MAX_BEST_OF ? bestOf + 1 : bestOf - 1;
  }
  return bestOf > 1 ? bestOf : null;
};

const getSeriesWinTarget = (bestOf: number): number => Math.floor(bestOf / 2) + 1;

const buildSeriesSummary = (session: MongoDuelSessionDocument): KangurDuelSeries | null => {
  if (!session.seriesId || !session.seriesBestOf || !session.seriesGameIndex) {
    return null;
  }
  const winsByPlayer = { ...(session.seriesWinsByPlayer ?? {}) };
  session.players.forEach((player) => {
    if (winsByPlayer[player.learnerId] === undefined) {
      winsByPlayer[player.learnerId] = 0;
    }
  });
  const bestOf = session.seriesBestOf;
  const winTarget = getSeriesWinTarget(bestOf);
  const leaderEntry = Object.entries(winsByPlayer).sort((left, right) => right[1] - left[1])[0];
  const leaderLearnerId = leaderEntry && leaderEntry[1] > 0 ? leaderEntry[0] : null;
  const isComplete = Object.values(winsByPlayer).some((wins) => wins >= winTarget);
  return {
    id: session.seriesId,
    bestOf,
    gameIndex: session.seriesGameIndex,
    completedGames: session.seriesCompletedGames ?? 0,
    winsByPlayer,
    leaderLearnerId,
    isComplete,
  };
};

const toPublicReaction = (reaction: DuelReactionRecord): KangurDuelReaction => ({
  id: reaction.id,
  learnerId: reaction.learnerId,
  displayName: reaction.displayName,
  type: reaction.type,
  createdAt: toIsoString(reaction.createdAt) ?? nowIso(),
});

const resolveSpectatorCount = (session: MongoDuelSessionDocument): number => {
  if (!session.spectators) {
    return 0;
  }
  const nowMs = Date.now();
  return Object.values(session.spectators).filter((value) => {
    if (value instanceof Date) {
      return nowMs - value.getTime() < DUEL_SPECTATOR_TTL_MS;
    }
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) && nowMs - parsed < DUEL_SPECTATOR_TTL_MS;
  }).length;
};

const resolveWinnerLearnerIds = (players: MongoDuelPlayer[]): string[] => {
  if (!players.length) {
    return [];
  }
  const topScore = Math.max(...players.map((player) => player.score));
  const topPlayers = players.filter((player) => player.score === topScore);
  if (topPlayers.length <= 1) {
    return topPlayers.map((player) => player.learnerId);
  }
  const fastest = resolveFastestPlayer(topPlayers);
  if (!fastest) {
    return topPlayers.map((player) => player.learnerId);
  }
  return [fastest.learnerId];
};

const resolveFastestPlayer = (
  players: MongoDuelPlayer[]
): MongoDuelPlayer | null => {
  if (players.length <= 1) {
    return players[0] ?? null;
  }
  const ranked = players
    .map((player) => ({
      player,
      completedAtMs:
        player.completedAt instanceof Date ? player.completedAt.getTime() : null,
    }))
    .filter((entry) => typeof entry.completedAtMs === 'number' && Number.isFinite(entry.completedAtMs));
  if (!ranked.length) {
    return null;
  }
  ranked.sort((left, right) => (left.completedAtMs ?? 0) - (right.completedAtMs ?? 0));
  if (ranked.length >= 2 && ranked[0]?.completedAtMs === ranked[1]?.completedAtMs) {
    return null;
  }
  return ranked[0]?.player ?? null;
};

const resolvePlayerQuestionIndex = (
  session: MongoDuelSessionDocument,
  player: MongoDuelPlayer
): number => {
  const answers = session.answersByPlayer?.[player.learnerId];
  const answersCount = answers ? Object.keys(answers).length : 0;
  const explicitIndex =
    typeof player.currentQuestionIndex === 'number' && Number.isFinite(player.currentQuestionIndex)
      ? player.currentQuestionIndex
      : 0;
  const normalized = Math.max(explicitIndex, answersCount);
  const clamped = Math.min(Math.max(0, normalized), session.questionCount);
  return clamped;
};

const resolveSessionQuestionIndex = (session: MongoDuelSessionDocument): number => {
  if (!session.questionCount || session.questionCount < 1) {
    return 0;
  }
  const activePlayers = session.players.filter(
    (player) => player.status !== 'completed' && player.status !== 'left'
  );
  const pool = activePlayers.length ? activePlayers : session.players;
  if (!pool.length) {
    return 0;
  }
  const maxIndex = Math.max(
    ...pool.map((player) => resolvePlayerQuestionIndex(session, player))
  );
  const maxQuestionIndex = Math.max(0, session.questionCount - 1);
  return Math.min(Math.max(0, maxIndex), maxQuestionIndex);
};

const pruneSpectators = (
  spectators: Record<string, Date>,
  nowTime: Date
): Record<string, Date> => {
  const nowMs = nowTime.getTime();
  return Object.entries(spectators).reduce<Record<string, Date>>((acc, [id, value]) => {
    const parsed = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
      return acc;
    }
    if (nowMs - parsed.getTime() < DUEL_SPECTATOR_TTL_MS) {
      acc[id] = parsed;
    }
    return acc;
  }, {});
};

const updateSpectatorPresence = async (
  session: MongoDuelSessionDocument,
  spectatorId: string,
  nowTime: Date
): Promise<MongoDuelSessionDocument> => {
  const cleaned = pruneSpectators(session.spectators ?? {}, nowTime);
  cleaned[spectatorId] = nowTime;
  const trimmedEntries = Object.entries(cleaned)
    .sort((left, right) => right[1].getTime() - left[1].getTime())
    .slice(0, DUEL_SPECTATOR_MAX);
  const trimmed = trimmedEntries.reduce<Record<string, Date>>((acc, [id, value]) => {
    acc[id] = value;
    return acc;
  }, {});
  const collection = await getDuelCollection();
  await collection.updateOne({ _id: session._id }, { $set: { spectators: trimmed } });
  return { ...session, spectators: trimmed };
};

const buildQuestions = (
  operation: KangurDuelOperation,
  difficulty: KangurDuelDifficulty,
  count: number
): InternalDuelQuestion[] =>
  generateQuestions(operation, difficulty, count).map(
    (question, index) => ({
      id: `q-${index + 1}`,
      prompt: question.question,
      choices: question.choices,
      answer: question.answer,
    })
  );

const toPublicQuestion = (question: InternalDuelQuestion): KangurDuelQuestion => ({
  id: question.id,
  prompt: question.prompt,
  choices: question.choices,
});

const buildPlayer = (learner: KangurLearnerProfile, joinedAt: Date = now()): MongoDuelPlayer => ({
  learnerId: learner.id,
  displayName: resolveLearnerDisplayName(learner),
  status: 'ready',
  score: 0,
  bonusPoints: 0,
  currentQuestionIndex: 0,
  joinedAt,
  completedAt: null,
});

const toPublicPlayer = (
  session: MongoDuelSessionDocument,
  player: MongoDuelPlayer
): KangurDuelPlayer => ({
  learnerId: player.learnerId,
  displayName: player.displayName,
  status: player.status,
  score: player.score,
  bonusPoints: player.bonusPoints ?? 0,
  currentQuestionIndex: resolvePlayerQuestionIndex(session, player),
  joinedAt: toIsoString(player.joinedAt) ?? nowIso(),
  lastAnswerAt: toIsoString(player.lastAnswerAt) ?? null,
  lastAnswerQuestionId: player.lastAnswerQuestionId,
  lastAnswerCorrect: player.lastAnswerCorrect,
  completedAt: toIsoString(player.completedAt) ?? null,
  isConnected: player.isConnected,
});

const toPublicSession = (session: MongoDuelSessionDocument): KangurDuelSession => ({
  id: session._id,
  mode: session.mode,
  visibility: resolveVisibility(session),
  operation: resolveSessionOperation(session),
  difficulty: resolveSessionDifficulty(session),
  status: session.status,
  createdAt: toIsoString(session.createdAt) ?? nowIso(),
  updatedAt: toIsoString(session.updatedAt) ?? nowIso(),
  startedAt: toIsoString(session.startedAt) ?? null,
  endedAt: toIsoString(session.endedAt) ?? null,
  invitedLearnerId: session.invitedLearnerId ?? null,
  invitedLearnerName: session.invitedLearnerName ?? null,
  questionCount: session.questionCount,
  timePerQuestionSec: session.timePerQuestionSec,
  maxPlayers: resolveSessionMaxPlayers(session),
  minPlayersToStart: resolveSessionMinPlayersToStart(session),
  currentQuestionIndex: resolveSessionQuestionIndex(session),
  questions: session.questions.map(toPublicQuestion),
  players: session.players.map((player) => toPublicPlayer(session, player)),
  series: buildSeriesSummary(session),
  spectatorCount: resolveSpectatorCount(session),
  recentReactions: session.reactions?.map(toPublicReaction),
});

const toLobbyEntry = (session: MongoDuelSessionDocument): KangurDuelLobbyEntry | null => {
  const host = session.players[0];
  if (!host) {
    return null;
  }
  return {
    sessionId: session._id,
    mode: session.mode,
    visibility: resolveVisibility(session),
    operation: resolveSessionOperation(session),
    difficulty: resolveSessionDifficulty(session),
    status: session.status,
    createdAt: toIsoString(session.createdAt) ?? nowIso(),
    updatedAt: toIsoString(session.updatedAt) ?? nowIso(),
    questionCount: session.questionCount,
    timePerQuestionSec: session.timePerQuestionSec,
    host: toPublicPlayer(session, host),
    series: buildSeriesSummary(session),
  };
};

const toOpponentEntry = (
  opponent: MongoDuelPlayer,
  lastPlayedAt: Date
): KangurDuelOpponentEntry => ({
  learnerId: opponent.learnerId,
  displayName: opponent.displayName,
  lastPlayedAt: toIsoString(lastPlayedAt) ?? nowIso(),
});

const toSearchEntry = (profile: KangurLearnerProfile): KangurDuelSearchEntry => ({
  learnerId: profile.id,
  displayName: profile.loginName,
  loginName: profile.loginName,
});

const getDuelCollection = async (): Promise<Collection<MongoDuelSessionDocument>> => {
  await ensureDuelIndexes();
  const db = await getMongoDb();
  return db.collection<MongoDuelSessionDocument>(DUELS_COLLECTION);
};

const resolveStatusTtlMs = (status: KangurDuelStatus): number => {
  switch (status) {
    case 'waiting':
    case 'created':
      return DUEL_WAITING_TTL_MS;
    case 'ready':
    case 'in_progress':
      return DUEL_ACTIVE_TTL_MS;
    case 'completed':
    case 'aborted':
    default:
      return DUEL_FINISHED_TTL_MS;
  }
};

const computeExpiresAt = (baseTime: Date, status: KangurDuelStatus): Date =>
  new Date(baseTime.getTime() + resolveStatusTtlMs(status));

const ensureSessionExpiry = async (
  collection: Collection<MongoDuelSessionDocument>,
  session: MongoDuelSessionDocument
): Promise<MongoDuelSessionDocument> => {
  if (session.expiresAt instanceof Date) {
    return session;
  }
  const baseTime = session.updatedAt ?? session.createdAt ?? now();
  const expiresAt = computeExpiresAt(baseTime, session.status);
  const updated = await collection.findOneAndUpdate(
    { _id: session._id, expiresAt: { $exists: false } },
    { $set: { expiresAt } },
    { returnDocument: 'after', includeResultMetadata: false }
  );
  return updated ?? { ...session, expiresAt };
};

const isSessionExpired = (session: MongoDuelSessionDocument, nowMs: number): boolean => {
  if (!(session.expiresAt instanceof Date)) {
    return false;
  }
  return session.expiresAt.getTime() <= nowMs;
};

const buildQuickMatchQueueKey = (
  operation: KangurDuelOperation,
  difficulty: KangurDuelDifficulty,
  settingsKey?: string | null
): string =>
  settingsKey
    ? `${QUICK_MATCH_QUEUE_PREFIX}:${operation}:${difficulty}:${settingsKey}`
    : `${QUICK_MATCH_QUEUE_PREFIX}:${operation}:${difficulty}`;

const resolveQuickMatchSettingsKey = (maxPlayers: number, minPlayersToStart: number): string | null =>
  maxPlayers === DUEL_MAX_PLAYERS && minPlayersToStart === DUEL_MIN_PLAYERS_TO_START
    ? null
    : `p${maxPlayers}-s${minPlayersToStart}`;

const resolveQuickMatchQueueKeys = (
  operation: KangurDuelOperation,
  difficulty: KangurDuelDifficulty,
  options?: { maxPlayers?: number | null; minPlayersToStart?: number | null }
): string[] => {
  const normalizedMaxPlayers = normalizeMaxPlayers(options?.maxPlayers ?? null);
  const normalizedMinPlayersToStart = normalizeMinPlayersToStart(
    options?.minPlayersToStart ?? null,
    normalizedMaxPlayers
  );
  const settingsKey = resolveQuickMatchSettingsKey(
    normalizedMaxPlayers,
    normalizedMinPlayersToStart
  );
  const primaryKey = buildQuickMatchQueueKey(operation, difficulty, settingsKey);
  if (
    !settingsKey &&
    operation === DEFAULT_DUEL_OPERATION &&
    difficulty === DEFAULT_DUEL_DIFFICULTY
  ) {
    return [primaryKey, LEGACY_QUICK_MATCH_QUEUE_KEY];
  }
  return [primaryKey];
};

const resolveQuickMatchQueueKeysForSession = (session: MongoDuelSessionDocument): string[] =>
  resolveQuickMatchQueueKeys(resolveSessionOperation(session), resolveSessionDifficulty(session), {
    maxPlayers: resolveSessionMaxPlayers(session),
    minPlayersToStart: resolveSessionMinPlayersToStart(session),
  });

const enqueueQuickMatchSession = async (sessionId: string, queueKey: string): Promise<void> => {
  const redis = getRedisConnection();
  if (!redis) {
    return;
  }
  try {
    await redis.lpush(queueKey, sessionId);
  } catch (error) {
    logClientError(error);
  }
};

const dequeueQuickMatchSession = async (
  queueKeys: string[]
): Promise<{ sessionId: string; queueKey: string } | null> => {
  const redis = getRedisConnection();
  if (!redis) {
    return null;
  }
  for (const queueKey of queueKeys) {
    try {
      const result = await redis.rpop(queueKey);
      if (result) {
        return { sessionId: result, queueKey };
      }
    } catch (error) {
      logClientError(error);
    }
  }
  return null;
};

const removeQuickMatchSession = async (sessionId: string, queueKeys: string[]): Promise<void> => {
  const redis = getRedisConnection();
  if (!redis) {
    return;
  }
  for (const queueKey of queueKeys) {
    try {
      await redis.lrem(queueKey, 0, sessionId);
    } catch (error) {
      logClientError(error);
    }
  }
};

const ensureSession = async (sessionId: string): Promise<MongoDuelSessionDocument> => {
  const collection = await getDuelCollection();
  const session = await collection.findOne({ _id: sessionId });
  if (!session) {
    throw notFoundError('Duel session not found.');
  }
  return ensureSessionExpiry(collection, session);
};

const resolvePlayer = (
  session: MongoDuelSessionDocument,
  learnerId: string
): MongoDuelPlayer => {
  const player = session.players.find((entry) => entry.learnerId === learnerId);
  if (!player) {
    throw badRequestError('Learner is not part of this duel session.');
  }
  return player;
};

const buildStateResponse = (
  session: MongoDuelSessionDocument,
  learnerId: string
): KangurDuelStateResponse => {
  const publicSession = toPublicSession(session);
  const player = publicSession.players.find((entry) => entry.learnerId === learnerId);
  if (!player) {
    throw badRequestError('Learner is not part of this duel session.');
  }
  return {
    session: publicSession,
    player,
    serverTime: nowIso(),
  };
};

const updateSessionStatusForReady = async (
  sessionId: string,
  status: KangurDuelStatus
): Promise<void> => {
  if (status !== 'waiting') {
    return;
  }
  const collection = await getDuelCollection();
  const nowTime = now();
  await collection.updateOne(
    { _id: sessionId, status: 'waiting' },
    {
      $set: {
        status: 'ready',
        updatedAt: nowTime,
        expiresAt: computeExpiresAt(nowTime, 'ready'),
      },
    }
  );
};

const attachPlayerToSession = async (
  sessionId: string,
  learner: KangurLearnerProfile
): Promise<MongoDuelSessionDocument> => {
  const collection = await getDuelCollection();
  const existing = await collection.findOne({ _id: sessionId, 'players.learnerId': learner.id });
  if (existing) {
    return ensureSessionExpiry(collection, existing);
  }
  const session = await ensureSession(sessionId);
  const nowMs = Date.now();
  if (isSessionExpired(session, nowMs)) {
    await removeQuickMatchSession(sessionId, resolveQuickMatchQueueKeysForSession(session));
    throw notFoundError('Duel session expired.');
  }
  if (resolveVisibility(session) === 'private') {
    if (!session.invitedLearnerId || session.invitedLearnerId !== learner.id) {
      throw forbiddenError('This duel is private.');
    }
  }
  if (session.status === 'completed' || session.status === 'aborted') {
    throw badRequestError('Duel session is no longer joinable.');
  }
  if (session.status === 'in_progress') {
    throw conflictError('Duel session already started.');
  }
  const maxPlayers = resolveSessionMaxPlayers(session);
  if (session.playerCount >= maxPlayers) {
    throw conflictError('Duel session already has the maximum number of players.');
  }

  const joinedAt = now();
  const expiresAt = computeExpiresAt(joinedAt, 'ready');
  const updateResult = await collection.updateOne(
    {
      _id: sessionId,
      status: { $in: ['waiting', 'ready'] },
      playerCount: { $lt: maxPlayers },
      'players.learnerId': { $ne: learner.id },
    },
    {
      $push: { players: buildPlayer(learner, joinedAt) },
      $inc: { playerCount: 1 },
      $set: { updatedAt: joinedAt, expiresAt },
    }
  );

  if (updateResult.matchedCount === 0) {
    const refreshed = await ensureSession(sessionId);
    if (refreshed.playerCount >= resolveSessionMaxPlayers(refreshed)) {
      throw conflictError('Duel session already has the maximum number of players.');
    }
    return refreshed;
  }

  const updated = await ensureSession(sessionId);
  if (updated.playerCount >= resolveSessionMinPlayersToStart(updated)) {
    await updateSessionStatusForReady(updated._id, updated.status);
  }
  return ensureSession(sessionId);
};

const resolveInvitedLearner = async (
  hostLearnerId: string,
  input: KangurDuelCreateInput
): Promise<{ id: string; displayName: string; loginName: string }> => {
  if (input.opponentLearnerId) {
    const match = await getKangurLearnerById(input.opponentLearnerId);
    if (!match) {
      throw notFoundError('Invited learner not found.');
    }
    if (match.id === hostLearnerId) {
      throw badRequestError('Cannot invite yourself to a duel.');
    }
    return { id: match.id, displayName: match.displayName, loginName: match.loginName };
  }

  if (input.opponentLoginName) {
    const match = await getKangurStoredLearnerByLoginName(input.opponentLoginName);
    if (!match) {
      throw notFoundError('Invited learner not found.');
    }
    if (match.id === hostLearnerId) {
      throw badRequestError('Cannot invite yourself to a duel.');
    }
    return { id: match.id, displayName: match.displayName, loginName: match.loginName };
  }

  throw badRequestError('Opponent learner is required for private duels.');
};

const resolveSeriesMeta = async (
  input: KangurDuelCreateInput
): Promise<{
  seriesId?: string | null;
  seriesBestOf?: number | null;
  seriesGameIndex?: number | null;
  seriesWinsByPlayer?: Record<string, number>;
  seriesCompletedGames?: number;
}> => {
  const requestedBestOf = normalizeSeriesBestOf(input.seriesBestOf);
  if (!input.seriesId && !requestedBestOf) {
    return {};
  }

  const collection = await getDuelCollection();
  let seriesId = input.seriesId?.trim() || null;
  let seriesBestOf = requestedBestOf ?? null;
  let seriesGameIndex = 1;
  let seriesWinsByPlayer: Record<string, number> = {};
  let seriesCompletedGames = 0;

  if (seriesId) {
    const latest = await collection
      .find({ seriesId })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();
    if (latest) {
      seriesBestOf = seriesBestOf ?? latest.seriesBestOf ?? null;
      seriesGameIndex = (latest.seriesGameIndex ?? 1) + 1;
      seriesWinsByPlayer = latest.seriesWinsByPlayer ?? {};
      seriesCompletedGames = latest.seriesCompletedGames ?? 0;
    } else if (!seriesBestOf) {
      return {};
    }
  } else {
    seriesId = `series_${randomUUID()}`;
  }

  if (!seriesBestOf) {
    return {};
  }

  return {
    seriesId,
    seriesBestOf,
    seriesGameIndex,
    seriesWinsByPlayer,
    seriesCompletedGames,
  };
};

const applySpeedBonusIfNeeded = (players: MongoDuelPlayer[]): MongoDuelPlayer[] => {
  if (!players.length) {
    return [];
  }
  const basePlayers = players.map((player) => ({ ...player, bonusPoints: 0 }));
  const topScore = Math.max(...basePlayers.map((player) => player.score));
  const topPlayers = basePlayers.filter((player) => player.score === topScore);
  if (topPlayers.length <= 1) {
    return basePlayers;
  }
  const fastest = resolveFastestPlayer(topPlayers);
  if (!fastest) {
    return basePlayers;
  }
  return basePlayers.map((player) =>
    player.learnerId === fastest.learnerId ? { ...player, bonusPoints: 1 } : player
  );
};

const resolveSessionEndedAt = (players: MongoDuelPlayer[], fallback: Date): Date => {
  const completedTimes = players
    .map((player) => (player.completedAt instanceof Date ? player.completedAt.getTime() : null))
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!completedTimes.length) {
    return fallback;
  }
  return new Date(Math.max(...completedTimes));
};

const finalizeSessionIfComplete = async (
  session: MongoDuelSessionDocument,
  answeredAt: Date
): Promise<MongoDuelSessionDocument> => {
  if (session.status === 'completed' || session.status === 'aborted') {
    return session;
  }
  const allCompleted = session.players.every((player) => player.status === 'completed');
  if (!allCompleted) {
    return session;
  }

  const completedPlayers = applySpeedBonusIfNeeded(session.players);
  const endedAt = resolveSessionEndedAt(completedPlayers, answeredAt);
  const seriesUpdate: Partial<MongoDuelSessionDocument> = {};
  if (session.seriesId) {
    const winners = resolveWinnerLearnerIds(completedPlayers);
    const nextWins = { ...(session.seriesWinsByPlayer ?? {}) };
    if (winners.length === 1) {
      const winnerId = winners[0]!;
      nextWins[winnerId] = (nextWins[winnerId] ?? 0) + 1;
    }
    seriesUpdate.seriesWinsByPlayer = nextWins;
    seriesUpdate.seriesCompletedGames = (session.seriesCompletedGames ?? 0) + 1;
  }

  const collection = await getDuelCollection();
  await collection.updateOne(
    { _id: session._id, status: { $nin: ['completed', 'aborted'] } },
    {
      $set: {
        status: 'completed',
        endedAt,
        updatedAt: endedAt,
        players: completedPlayers,
        expiresAt: computeExpiresAt(endedAt, 'completed'),
        ...seriesUpdate,
      },
    }
  );

  if (session.mode === 'quick_match') {
    await removeQuickMatchSession(session._id, resolveQuickMatchQueueKeysForSession(session));
  }

  return ensureSession(session._id);
};

export const createKangurDuelSession = async (
  learner: KangurLearnerProfile,
  input: KangurDuelCreateInput
): Promise<KangurDuelStateResponse> => {
  const questionCount = normalizeQuestionCount(input.questionCount);
  const timePerQuestionSec = normalizeTimePerQuestionSec(input.timePerQuestionSec);
  const operation = resolveDuelOperation(input);
  const difficulty = resolveDuelDifficulty(input);
  const questions = buildQuestions(operation, difficulty, questionCount);
  const sessionId = `duel_${randomUUID()}`;
  const createdAt = now();
  const visibility: KangurDuelVisibility = input.visibility ?? 'public';
  if (input.mode === 'quick_match' && visibility === 'private') {
    throw badRequestError('Quick match duels must be public.');
  }
  const invitedLearner =
    visibility === 'private' ? await resolveInvitedLearner(learner.id, input) : null;
  const seriesMeta = input.mode === 'quick_match' ? {} : await resolveSeriesMeta(input);
  const requestedMaxPlayers = normalizeMaxPlayers(input.maxPlayers ?? null);
  const maxPlayers = visibility === 'private' ? 2 : requestedMaxPlayers;
  const minPlayersToStart =
    visibility === 'private'
      ? 2
      : normalizeMinPlayersToStart(input.minPlayersToStart ?? null, maxPlayers);

  const session: MongoDuelSessionDocument = {
    _id: sessionId,
    mode: input.mode,
    visibility,
    status: 'waiting',
    createdAt,
    updatedAt: createdAt,
    expiresAt: computeExpiresAt(createdAt, 'waiting'),
    startedAt: null,
    endedAt: null,
    invitedLearnerId: invitedLearner?.id ?? null,
    invitedLearnerName: invitedLearner?.loginName ?? invitedLearner?.displayName ?? null,
    operation,
    difficulty,
    questionCount,
    timePerQuestionSec,
    maxPlayers,
    minPlayersToStart,
    currentQuestionIndex: 0,
    questions,
    players: [buildPlayer(learner, createdAt)],
    playerCount: 1,
    answersByPlayer: {},
    reactions: [],
    spectators: {},
    ...seriesMeta,
  };

  const collection = await getDuelCollection();
  await collection.insertOne(session);

  if (input.mode === 'quick_match') {
    const queueKeys = resolveQuickMatchQueueKeys(operation, difficulty, {
      maxPlayers,
      minPlayersToStart,
    });
    const primaryQueueKey = queueKeys[0];
    if (primaryQueueKey) {
      await enqueueQuickMatchSession(sessionId, primaryQueueKey);
    }
  }

  publishKangurDuelLobbyUpdate({
    reason: 'created',
    sessionId,
    visibility,
    mode: input.mode,
  });

  return buildStateResponse(session, learner.id);
};

export const joinKangurDuelSession = async (
  learner: KangurLearnerProfile,
  input: KangurDuelJoinInput
): Promise<KangurDuelStateResponse> => {
  if (!input.sessionId && input.mode !== 'quick_match') {
    throw badRequestError('sessionId is required unless quick_match mode is used.');
  }

  if (!input.sessionId && input.mode === 'quick_match') {
    const operation = resolveDuelOperation(input);
    const difficulty = resolveDuelDifficulty(input);
    const maxPlayers = normalizeMaxPlayers(input.maxPlayers ?? null);
    const minPlayersToStart = normalizeMinPlayersToStart(
      input.minPlayersToStart ?? null,
      maxPlayers
    );
    const queueKeys = resolveQuickMatchQueueKeys(operation, difficulty, {
      maxPlayers,
      minPlayersToStart,
    });
    for (let attempt = 0; attempt < QUICK_MATCH_SCAN_LIMIT; attempt += 1) {
      const queued = await dequeueQuickMatchSession(queueKeys);
      if (!queued) {
        break;
      }
      const { sessionId: queuedSessionId, queueKey } = queued;
      try {
        const queuedSession = await ensureSession(queuedSessionId);
        const sessionOperation = resolveSessionOperation(queuedSession);
        const sessionDifficulty = resolveSessionDifficulty(queuedSession);
        const sessionQueueKeys = resolveQuickMatchQueueKeysForSession(queuedSession);
        const isMatchingQueue =
          queuedSession.mode === 'quick_match' &&
          sessionOperation === operation &&
          sessionDifficulty === difficulty &&
          sessionQueueKeys.includes(queueKey);
        if (!isMatchingQueue) {
          const cleanupKeys = Array.from(new Set([queueKey, ...sessionQueueKeys]));
          await removeQuickMatchSession(queuedSessionId, cleanupKeys);
          if (
            queuedSession.mode === 'quick_match' &&
            queuedSession.status === 'waiting' &&
            queuedSession.playerCount === 1 &&
            sessionQueueKeys.length > 0
          ) {
            const primaryQueueKey = sessionQueueKeys[0];
            if (primaryQueueKey) {
              await enqueueQuickMatchSession(queuedSessionId, primaryQueueKey);
            }
          }
          logClientError(
            new Error(
              `Quick match queue mismatch for ${queuedSessionId}: expected ${operation}/${difficulty}, got ${sessionOperation}/${sessionDifficulty} (${queuedSession.mode}).`
            )
          );
          continue;
        }

        const joinedSession = await attachPlayerToSession(queuedSessionId, learner);
        if (
          joinedSession.playerCount < resolveSessionMaxPlayers(joinedSession) &&
          joinedSession.status !== 'in_progress'
        ) {
          await enqueueQuickMatchSession(queuedSessionId, queueKey);
        } else {
          await removeQuickMatchSession(
            queuedSessionId,
            resolveQuickMatchQueueKeysForSession(joinedSession)
          );
        }
        publishKangurDuelLobbyUpdate({
          reason: 'joined',
          sessionId: queuedSessionId,
          visibility: resolveVisibility(joinedSession),
          mode: joinedSession.mode,
        });
        return buildStateResponse(joinedSession, learner.id);
      } catch (error) {
        logClientError(error);
      }
    }

    return createKangurDuelSession(learner, {
      mode: 'quick_match',
      questionCount: DEFAULT_QUESTION_COUNT,
      timePerQuestionSec: DEFAULT_TIME_PER_QUESTION_SEC,
      operation,
      difficulty,
      maxPlayers: input.maxPlayers,
      minPlayersToStart: input.minPlayersToStart,
    });
  }

  const sessionId = input.sessionId!.trim();
  const joinedSession = await attachPlayerToSession(sessionId, learner);
  if (
    joinedSession.mode === 'quick_match' &&
    joinedSession.playerCount >= resolveSessionMaxPlayers(joinedSession)
  ) {
    await removeQuickMatchSession(sessionId, resolveQuickMatchQueueKeysForSession(joinedSession));
  }
  publishKangurDuelLobbyUpdate({
    reason: 'joined',
    sessionId,
    visibility: resolveVisibility(joinedSession),
    mode: joinedSession.mode,
  });
  return buildStateResponse(joinedSession, learner.id);
};

export const submitKangurDuelAnswer = async (
  learner: KangurLearnerProfile,
  input: KangurDuelAnswerInput
): Promise<KangurDuelStateResponse> => {
  const session = await ensureSession(input.sessionId);
  if (session.status === 'completed' || session.status === 'aborted') {
    throw badRequestError('Duel session is no longer active.');
  }
  if (session.status === 'waiting' || session.status === 'created') {
    throw badRequestError('Duel session has not started yet.');
  }

  const player = resolvePlayer(session, learner.id);
  const playerQuestionIndex = resolvePlayerQuestionIndex(session, player);
  if (playerQuestionIndex >= session.questionCount) {
    return buildStateResponse(session, learner.id);
  }
  const question = session.questions[playerQuestionIndex];
  if (question?.id !== input.questionId) {
    const latest = await ensureSession(input.sessionId);
    return buildStateResponse(latest, learner.id);
  }

  const answerPath = `answersByPlayer.${player.learnerId}.${question.id}`;
  const answeredAt = now();
  const correct = String(question.answer) === String(input.choice);
  const nextStatus: KangurDuelStatus =
    session.status === 'ready' ? 'in_progress' : session.status;
  const nextQuestionIndex = playerQuestionIndex + 1;
  const didComplete = nextQuestionIndex >= session.questionCount;
  const nextPlayerStatus = didComplete ? 'completed' : 'playing';
  const startedAt = session.startedAt ?? answeredAt;
  const collection = await getDuelCollection();

  const updateResult = await collection.updateOne(
    {
      _id: session._id,
      status: { $nin: ['completed', 'aborted'] },
      [answerPath]: { $exists: false },
    },
    {
      $set: {
        [answerPath]: {
          questionId: question.id,
          choice: input.choice,
          correct,
          answeredAt,
        } as DuelAnswerRecord,
        'players.$[target].lastAnswerAt': answeredAt,
        'players.$[target].lastAnswerQuestionId': question.id,
        'players.$[target].lastAnswerCorrect': correct,
        'players.$[target].status': nextPlayerStatus,
        'players.$[target].currentQuestionIndex': nextQuestionIndex,
        'players.$[target].completedAt': didComplete ? answeredAt : null,
        updatedAt: answeredAt,
        status: nextStatus,
        startedAt,
        expiresAt: computeExpiresAt(answeredAt, nextStatus),
      },
      ...(correct ? { $inc: { 'players.$[target].score': 1 } } : {}),
    },
    {
      arrayFilters: [{ 'target.learnerId': player.learnerId }],
    }
  );

  if (updateResult.matchedCount === 0) {
    const latest = await ensureSession(input.sessionId);
    return buildStateResponse(latest, learner.id);
  }

  if (session.mode === 'quick_match' && nextStatus === 'in_progress') {
    await removeQuickMatchSession(session._id, resolveQuickMatchQueueKeysForSession(session));
  }

  const refreshed = await ensureSession(input.sessionId);
  const finalized = await finalizeSessionIfComplete(refreshed, answeredAt);
  return buildStateResponse(finalized, learner.id);
};

export const getKangurDuelState = async (
  learner: KangurLearnerProfile,
  sessionId: string
): Promise<KangurDuelStateResponse> => {
  const session = await ensureSession(sessionId);
  resolvePlayer(session, learner.id);
  return buildStateResponse(session, learner.id);
};

export const heartbeatKangurDuelSession = async (
  learner: KangurLearnerProfile,
  input: KangurDuelHeartbeatInput
): Promise<KangurDuelStateResponse> => {
  const collection = await getDuelCollection();
  const session = await ensureSession(input.sessionId);
  resolvePlayer(session, learner.id);

  const nowTime = now();
  const nowMs = nowTime.getTime();
  if (isSessionExpired(session, nowMs)) {
    await removeQuickMatchSession(session._id, resolveQuickMatchQueueKeysForSession(session));
    throw notFoundError('Duel session expired.');
  }

  if (session.status === 'completed' || session.status === 'aborted') {
    return buildStateResponse(session, learner.id);
  }

  const expiresAt = computeExpiresAt(nowTime, session.status);
  const updateResult = await collection.updateOne(
    {
      _id: session._id,
      status: { $nin: ['completed', 'aborted'] },
    },
    {
      $set: {
        expiresAt,
        'players.$[target].isConnected': true,
      },
    },
    {
      arrayFilters: [{ 'target.learnerId': learner.id }],
    }
  );

  if (updateResult.matchedCount === 0) {
    const refreshed = await ensureSession(session._id);
    return buildStateResponse(refreshed, learner.id);
  }

  const refreshed = await ensureSession(session._id);
  return buildStateResponse(refreshed, learner.id);
};

export const listKangurDuelLobby = async (
  learner: KangurLearnerProfile,
  options?: { limit?: number }
): Promise<KangurDuelLobbyResponse> => {
  const limit =
    typeof options?.limit === 'number' && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(50, Math.floor(options.limit)))
      : LOBBY_LIST_LIMIT;
  const collection = await getDuelCollection();
  const nowTime = now();
  const activeFilter = {
    $or: [{ expiresAt: { $gt: nowTime } }, { expiresAt: { $exists: false } }],
  };
  const privateInvites = await collection
    .find({
      status: 'waiting',
      playerCount: 1,
      visibility: 'private',
      invitedLearnerId: learner.id,
      'players.learnerId': { $ne: learner.id },
      ...activeFilter,
    })
    .sort({ createdAt: -1 })
    .toArray();

  const publicLimit = Math.max(0, limit - privateInvites.length);
  const publicSessions =
    publicLimit > 0
      ? await collection
          .find({
            status: { $in: ['waiting', 'ready'] },
            visibility: { $ne: 'private' },
            'players.learnerId': { $ne: learner.id },
            $expr: { $lt: ['$playerCount', { $ifNull: ['$maxPlayers', DUEL_MAX_PLAYERS] }] },
            ...activeFilter,
          })
          .sort({ createdAt: -1 })
          .limit(publicLimit)
          .toArray()
      : [];

  const sessions = [...privateInvites, ...publicSessions];
  const hydratedSessions = await Promise.all(
    sessions.map((session) => ensureSessionExpiry(collection, session))
  );
  const nowMs = nowTime.getTime();
  const freshSessions = hydratedSessions.filter((session) => !isSessionExpired(session, nowMs));

  const entries = freshSessions
    .map((session) => toLobbyEntry(session))
    .filter((entry): entry is KangurDuelLobbyEntry => Boolean(entry));

  return {
    entries,
    serverTime: nowIso(),
  };
};

export const listKangurPublicDuelLobby = async (
  options?: { limit?: number }
): Promise<KangurDuelLobbyResponse> => {
  const limit =
    typeof options?.limit === 'number' && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(50, Math.floor(options.limit)))
      : LOBBY_LIST_LIMIT;
  const collection = await getDuelCollection();
  const nowTime = now();
  const activeFilter = {
    $or: [{ expiresAt: { $gt: nowTime } }, { expiresAt: { $exists: false } }],
  };
  const sessions = await collection
    .find({
      status: { $in: ['waiting', 'ready'] },
      visibility: { $ne: 'private' },
      $expr: { $lt: ['$playerCount', { $ifNull: ['$maxPlayers', DUEL_MAX_PLAYERS] }] },
      ...activeFilter,
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const hydratedSessions = await Promise.all(
    sessions.map((session) => ensureSessionExpiry(collection, session))
  );
  const nowMs = nowTime.getTime();
  const entries = hydratedSessions
    .filter((session) => !isSessionExpired(session, nowMs))
    .map((session) => toLobbyEntry(session))
    .filter((entry): entry is KangurDuelLobbyEntry => Boolean(entry));

  return {
    entries,
    serverTime: nowIso(),
  };
};

export const listKangurDuelOpponents = async (
  learner: KangurLearnerProfile,
  options?: { limit?: number }
): Promise<KangurDuelOpponentsResponse> => {
  const limit =
    typeof options?.limit === 'number' && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(20, Math.floor(options.limit)))
      : OPPONENTS_LIST_LIMIT;
  const collection = await getDuelCollection();
  const sessions = await collection
    .find({
      playerCount: { $gte: 2 },
      status: { $ne: 'waiting' },
      'players.learnerId': learner.id,
    })
    .sort({ updatedAt: -1 })
    .limit(limit * 6)
    .toArray();

  const byOpponent = new Map<
    string,
    { entry: KangurDuelOpponentEntry; lastPlayedAt: Date }
  >();

  sessions.forEach((session) => {
    const lastPlayedAt = session.endedAt ?? session.updatedAt ?? session.createdAt;
    session.players
      .filter((player) => player.learnerId !== learner.id)
      .forEach((opponent) => {
        const existing = byOpponent.get(opponent.learnerId);
        if (existing && existing.lastPlayedAt >= lastPlayedAt) {
          return;
        }
        byOpponent.set(opponent.learnerId, {
          entry: toOpponentEntry(opponent, lastPlayedAt),
          lastPlayedAt,
        });
      });
  });

  const entries = [...byOpponent.values()]
    .sort((left, right) => right.lastPlayedAt.getTime() - left.lastPlayedAt.getTime())
    .map((item) => item.entry)
    .slice(0, limit);

  return {
    entries,
    serverTime: nowIso(),
  };
};

export const searchKangurDuelLearners = async (
  learner: KangurLearnerProfile,
  query: string,
  options?: { limit?: number }
): Promise<KangurDuelSearchResponse> => {
  const trimmed = query.trim();
  if (trimmed.length < SEARCH_MIN_CHARS) {
    return {
      entries: [],
      serverTime: nowIso(),
    };
  }

  const limit =
    typeof options?.limit === 'number' && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(20, Math.floor(options.limit)))
      : SEARCH_LIST_LIMIT;
  const matches = await searchKangurLearners(trimmed, {
    limit,
    excludeLearnerId: learner.id,
  });
  const entries = matches.map(toSearchEntry);

  return {
    entries,
    serverTime: nowIso(),
  };
};

export const leaveKangurDuelSession = async (
  learner: KangurLearnerProfile,
  input: KangurDuelLeaveInput
): Promise<KangurDuelStateResponse> => {
  const session = await ensureSession(input.sessionId);
  const player = resolvePlayer(session, learner.id);

  player.status = 'left';
  const endedAt = now();
  const updatedPlayers = session.players.map((entry) =>
    entry.learnerId === player.learnerId ? player : entry
  );

  const collection = await getDuelCollection();
  await collection.updateOne(
    { _id: session._id },
    {
      $set: {
        players: updatedPlayers,
        status: 'aborted',
        endedAt,
        updatedAt: endedAt,
        expiresAt: computeExpiresAt(endedAt, 'aborted'),
      },
    }
  );

  await removeQuickMatchSession(session._id, resolveQuickMatchQueueKeysForSession(session));
  publishKangurDuelLobbyUpdate({
    reason: 'left',
    sessionId: session._id,
    visibility: resolveVisibility(session),
    mode: session.mode,
  });

  const refreshed = await ensureSession(session._id);
  return buildStateResponse(refreshed, learner.id);
};

export const sendKangurDuelReaction = async (
  learner: KangurLearnerProfile,
  input: KangurDuelReactionInput
): Promise<KangurDuelReactionResponse> => {
  const session = await ensureSession(input.sessionId);
  resolvePlayer(session, learner.id);

  if (session.status === 'aborted') {
    throw badRequestError('Duel session is no longer active.');
  }

  const createdAt = now();
  const reaction: DuelReactionRecord = {
    id: `reaction_${randomUUID()}`,
    learnerId: learner.id,
    displayName: resolveLearnerDisplayName(learner),
    type: input.type,
    createdAt,
  };

  const collection = await getDuelCollection();
  await collection.updateOne(
    { _id: session._id },
    {
      $push: {
        reactions: {
          $each: [reaction],
          $slice: -DUEL_REACTIONS_MAX,
        },
      },
      $set: {
        updatedAt: createdAt,
        expiresAt: computeExpiresAt(createdAt, session.status),
      },
    }
  );

  return {
    reaction: toPublicReaction(reaction),
    serverTime: nowIso(),
  };
};

export const getKangurDuelSpectatorState = async (
  sessionId: string,
  options?: { spectatorId?: string | null }
): Promise<KangurDuelSpectatorStateResponse> => {
  const session = await ensureSession(sessionId);
  if (resolveVisibility(session) !== 'public') {
    throw forbiddenError('This duel is private.');
  }
  const nowTime = now();
  const updatedSession =
    options?.spectatorId && options.spectatorId.trim().length > 0
      ? await updateSpectatorPresence(session, options.spectatorId.trim(), nowTime)
      : session;

  return {
    session: toPublicSession(updatedSession),
    serverTime: nowIso(),
  };
};

export const listKangurDuelLeaderboard = async (options?: {
  limit?: number;
  lookbackDays?: number;
}): Promise<KangurDuelLeaderboardResponse> => {
  const limit =
    typeof options?.limit === 'number' && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(50, Math.floor(options.limit)))
      : DUEL_LEADERBOARD_LIMIT;
  const lookbackDays =
    typeof options?.lookbackDays === 'number' && Number.isFinite(options.lookbackDays)
      ? Math.max(1, Math.min(180, Math.floor(options.lookbackDays)))
      : DUEL_LEADERBOARD_LOOKBACK_DAYS;
  const since = new Date(Date.now() - lookbackDays * dayMs);

  const collection = await getDuelCollection();
  const sessions = await collection
    .find({
      status: 'completed',
      endedAt: { $gte: since },
    })
    .sort({ endedAt: -1 })
    .limit(DUEL_LEADERBOARD_SESSION_LIMIT)
    .toArray();

  const stats = new Map<
    string,
    {
      learnerId: string;
      displayName: string;
      wins: number;
      losses: number;
      ties: number;
      matches: number;
      lastPlayedAt: Date;
    }
  >();

  sessions.forEach((session) => {
    const players = session.players;
    if (!players.length) {
      return;
    }
    const winners = resolveWinnerLearnerIds(players);
    const isTie = winners.length > 1;
    const playedAt = session.endedAt ?? session.updatedAt ?? session.createdAt ?? now();

    players.forEach((player) => {
      const existing =
        stats.get(player.learnerId) ??
        {
          learnerId: player.learnerId,
          displayName: player.displayName,
          wins: 0,
          losses: 0,
          ties: 0,
          matches: 0,
          lastPlayedAt: playedAt,
        };
      existing.matches += 1;
      if (isTie) {
        existing.ties += 1;
      } else if (winners.includes(player.learnerId)) {
        existing.wins += 1;
      } else {
        existing.losses += 1;
      }
      if (playedAt > existing.lastPlayedAt) {
        existing.lastPlayedAt = playedAt;
      }
      stats.set(player.learnerId, existing);
    });
  });

  const entries: KangurDuelLeaderboardEntry[] = [...stats.values()]
    .map((entry) => ({
      learnerId: entry.learnerId,
      displayName: entry.displayName,
      wins: entry.wins,
      losses: entry.losses,
      ties: entry.ties,
      matches: entry.matches,
      winRate: entry.matches > 0 ? entry.wins / entry.matches : 0,
      lastPlayedAt: toIsoString(entry.lastPlayedAt) ?? nowIso(),
    }))
    .sort((left, right) => {
      if (right.wins !== left.wins) {
        return right.wins - left.wins;
      }
      if (right.winRate !== left.winRate) {
        return right.winRate - left.winRate;
      }
      return right.matches - left.matches;
    })
    .slice(0, limit);

  return {
    entries,
    serverTime: nowIso(),
  };
};
