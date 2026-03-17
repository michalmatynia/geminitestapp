import 'server-only';

import { randomUUID } from 'crypto';
import type { Collection } from 'mongodb';

import type { KangurLearnerProfile } from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurDuelAnswerInput,
  KangurDuelChoice,
  KangurDuelCreateInput,
  KangurDuelDifficulty,
  KangurDuelHeartbeatInput,
  KangurDuelJoinInput,
  KangurDuelLobbyEntry,
  KangurDuelLobbyResponse,
  KangurDuelLeaderboardResponse,
  KangurDuelLeaveInput,
  KangurDuelOpponentEntry,
  KangurDuelOpponentsResponse,
  KangurDuelOperation,
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
  notFoundError,
} from '@/features/kangur/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logClientError } from '@/features/kangur/shared/utils/observability/client-error-logger';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import {
  searchKangurLearners,
} from '@/features/kangur/services/kangur-learner-repository';
import { publishKangurDuelLobbyUpdate } from '@/features/kangur/services/duel-lobby-stream-publisher';

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
const DUEL_WAITING_TTL_MS = 30 * 60_000;
const DUEL_ACTIVE_TTL_MS = 2 * 60 * 60_000;
const DUEL_FINISHED_TTL_MS = 30 * 60_000;
const DUEL_SPECTATOR_TTL_MS = 2 * 60_000;
const DEFAULT_DUEL_MAX_PLAYERS = 4;
const DEFAULT_DUEL_MIN_PLAYERS_TO_START = 2;

const DEFAULT_QUESTION_COUNT = 8;
const DEFAULT_TIME_PER_QUESTION_SEC = 20;
const DEFAULT_DUEL_OPERATION: KangurDuelOperation = 'addition';
const DEFAULT_DUEL_DIFFICULTY: KangurDuelDifficulty = 'easy';

const now = (): Date => new Date();
const nowIso = (): string => new Date().toISOString();

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

const getDuelCollection = async (): Promise<Collection<MongoDuelSessionDocument>> => {
  await ensureDuelIndexes();
  const db = await getMongoDb();
  return db.collection<MongoDuelSessionDocument>(DUELS_COLLECTION);
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
    void ErrorSystem.captureException(error);
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

const resolveSessionMaxPlayers = (session: MongoDuelSessionDocument): number => {
  const value = session.maxPlayers;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DUEL_MAX_PLAYERS;
  }
  return Math.max(2, Math.min(DUEL_MAX_PLAYERS, Math.floor(value)));
};

const resolveSessionMinPlayersToStart = (session: MongoDuelSessionDocument): number => {
  const value = session.minPlayersToStart;
  const maxPlayers = resolveSessionMaxPlayers(session);
  const base = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : DUEL_MIN_PLAYERS_TO_START;
  return Math.max(2, Math.min(maxPlayers, base));
};

const resolveLearnerDisplayName = (learner: KangurLearnerProfile): string =>
  learner.loginName?.trim() || learner.displayName?.trim() || 'Uczeń';

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

const toPublicQuestion = (question: InternalDuelQuestion): KangurDuelQuestion => ({
  id: question.id,
  prompt: question.prompt,
  choices: question.choices,
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

export async function createKangurDuelSession(
  learner: KangurLearnerProfile,
  input: KangurDuelCreateInput
): Promise<KangurDuelStateResponse> {
  const questionCount = normalizeQuestionCount(input.questionCount);
  const timePerQuestionSec = normalizeTimePerQuestionSec(input.timePerQuestionSec);
  const operation = resolveDuelOperation(input);
  const difficulty = resolveDuelDifficulty(input);
  const questions = generateQuestions(operation, difficulty, questionCount).map((q, i) => ({
    id: `q-${i+1}`,
    prompt: q.question,
    choices: q.choices,
    answer: q.answer,
  }));
  const sessionId = `duel_${randomUUID()}`;
  const createdAt = now();
  const visibility: KangurDuelVisibility = input.visibility ?? 'public';

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
    invitedLearnerId: input.opponentLearnerId ?? null,
    invitedLearnerName: null,
    operation,
    difficulty,
    questionCount,
    timePerQuestionSec,
    maxPlayers: input.maxPlayers ?? DEFAULT_DUEL_MAX_PLAYERS,
    minPlayersToStart: input.minPlayersToStart ?? DEFAULT_DUEL_MIN_PLAYERS_TO_START,
    currentQuestionIndex: 0,
    questions,
    players: [{
      learnerId: learner.id,
      displayName: resolveLearnerDisplayName(learner),
      status: 'ready',
      score: 0,
      bonusPoints: 0,
      currentQuestionIndex: 0,
      joinedAt: createdAt,
      completedAt: null,
    }],
    playerCount: 1,
    answersByPlayer: {},
    reactions: [],
    spectators: {},
  };

  const collection = await getDuelCollection();
  await collection.insertOne(session);
  publishKangurDuelLobbyUpdate({
    reason: 'created',
    sessionId: session._id,
    visibility: resolveVisibility(session),
    mode: session.mode,
  });

  return buildStateResponse(session, learner.id);
}

export async function joinKangurDuelSession(
  learner: KangurLearnerProfile,
  input: KangurDuelJoinInput
): Promise<KangurDuelStateResponse> {
  const sessionId = input.sessionId!.trim();
  const collection = await getDuelCollection();
  
  const joinedAt = now();
  await collection.updateOne(
    { _id: sessionId },
    {
      $push: { players: {
        learnerId: learner.id,
        displayName: resolveLearnerDisplayName(learner),
        status: 'ready',
        score: 0,
        bonusPoints: 0,
        currentQuestionIndex: 0,
        joinedAt,
        completedAt: null,
      } as MongoDuelPlayer },
      $inc: { playerCount: 1 },
      $set: { updatedAt: joinedAt },
    }
  );

  const updated = await ensureSession(sessionId);
  publishKangurDuelLobbyUpdate({
    reason: 'joined',
    sessionId: updated._id,
    visibility: resolveVisibility(updated),
    mode: updated.mode,
  });
  return buildStateResponse(updated, learner.id);
}

export async function submitKangurDuelAnswer(
  learner: KangurLearnerProfile,
  input: KangurDuelAnswerInput
): Promise<KangurDuelStateResponse> {
  const session = await ensureSession(input.sessionId);
  const player = resolvePlayer(session, learner.id);
  const playerQuestionIndex = resolvePlayerQuestionIndex(session, player);
  
  const question = session.questions[playerQuestionIndex];
  const correct = String(question?.answer) === String(input.choice);
  const answeredAt = now();
  const nextPlayerStatus = playerQuestionIndex + 1 >= session.questionCount ? 'completed' : 'playing';

  const collection = await getDuelCollection();
  await collection.updateOne(
    { _id: session._id, 'players.learnerId': learner.id },
    {
      $set: {
        [`answersByPlayer.${learner.id}.${input.questionId}`]: {
          questionId: input.questionId,
          choice: input.choice,
          correct,
          answeredAt,
        },
        'players.$.lastAnswerAt': answeredAt,
        'players.$.lastAnswerCorrect': correct,
        'players.$.status': nextPlayerStatus,
        'players.$.currentQuestionIndex': playerQuestionIndex + 1,
        'players.$.completedAt': nextPlayerStatus === 'completed' ? answeredAt : null,
        updatedAt: answeredAt,
      },
      ...(correct ? { $inc: { 'players.$.score': 1 } } : {}),
    }
  );

  const refreshed = await ensureSession(input.sessionId);
  publishKangurDuelLobbyUpdate({
    reason: 'left',
    sessionId: refreshed._id,
    visibility: resolveVisibility(refreshed),
    mode: refreshed.mode,
  });
  return buildStateResponse(refreshed, learner.id);
}

export async function getKangurDuelState(
  learner: KangurLearnerProfile,
  sessionId: string
): Promise<KangurDuelStateResponse> {
  const session = await ensureSession(sessionId);
  return buildStateResponse(session, learner.id);
}

export async function heartbeatKangurDuelSession(
  learner: KangurLearnerProfile,
  input: KangurDuelHeartbeatInput
): Promise<KangurDuelStateResponse> {
  const session = await ensureSession(input.sessionId);
  if (session.status === 'completed' || session.status === 'aborted') {
    return buildStateResponse(session, learner.id);
  }

  const heartbeatAt = now();
  const expiresAt = computeExpiresAt(heartbeatAt, session.status);
  const collection = await getDuelCollection();
  await collection.updateOne(
    { _id: input.sessionId },
    {
      $set: {
        updatedAt: heartbeatAt,
        expiresAt,
        'players.$[target].isConnected': true,
      },
    },
    {
      arrayFilters: [{ 'target.learnerId': learner.id }],
    }
  );
  const refreshed = await ensureSession(input.sessionId);
  return buildStateResponse(refreshed, learner.id);
}

export async function listKangurDuelLobby(
  _learner: KangurLearnerProfile,
  options?: { limit?: number }
): Promise<KangurDuelLobbyResponse> {
  const collection = await getDuelCollection();
  const sessions = await collection.find({ status: 'waiting' }).limit(options?.limit ?? 10).toArray();
  return {
    entries: sessions.map(toLobbyEntry).filter((e): e is KangurDuelLobbyEntry => Boolean(e)),
    serverTime: nowIso(),
  };
}

export async function listKangurPublicDuelLobby(
  options?: { limit?: number }
): Promise<KangurDuelLobbyResponse> {
  const collection = await getDuelCollection();
  const sessions = await collection
    .find({ status: 'waiting', visibility: 'public' })
    .sort({ updatedAt: -1 })
    .limit(options?.limit ?? 10)
    .toArray();
  const nowMs = Date.now();
  const entries: KangurDuelLobbyEntry[] = [];
  for (const session of sessions) {
    const hydrated = session.expiresAt ? session : await ensureSessionExpiry(collection, session);
    const expiresAt = hydrated.expiresAt;
    if (expiresAt && expiresAt.getTime() <= nowMs) {
      continue;
    }
    const entry = toLobbyEntry(hydrated);
    if (entry) {
      entries.push(entry);
    }
  }
  return {
    entries,
    serverTime: nowIso(),
  };
}

export async function listKangurDuelOpponents(
  _learner: KangurLearnerProfile,
  _options?: { limit?: number }
): Promise<KangurDuelOpponentsResponse> {
  const entries: KangurDuelOpponentEntry[] = [];
  return { entries, serverTime: nowIso() };
}

export async function searchKangurDuelLearners(
  _learner: KangurLearnerProfile,
  query: string,
  _options?: { limit?: number }
): Promise<KangurDuelSearchResponse> {
  const matches = await searchKangurLearners(query);
  return {
    entries: matches.map(m => ({ learnerId: m.id, displayName: m.loginName, loginName: m.loginName })),
    serverTime: nowIso(),
  };
}

export async function leaveKangurDuelSession(
  learner: KangurLearnerProfile,
  input: KangurDuelLeaveInput
): Promise<KangurDuelStateResponse> {
  const collection = await getDuelCollection();
  await collection.updateOne(
    { _id: input.sessionId, 'players.learnerId': learner.id },
    { $set: { 'players.$.status': 'left', status: 'aborted', updatedAt: now() } }
  );
  const refreshed = await ensureSession(input.sessionId);
  publishKangurDuelLobbyUpdate({
    reason: 'left',
    sessionId: refreshed._id,
    visibility: resolveVisibility(refreshed),
    mode: refreshed.mode,
  });
  return buildStateResponse(refreshed, learner.id);
}

export async function sendKangurDuelReaction(
  learner: KangurLearnerProfile,
  input: KangurDuelReactionInput
): Promise<KangurDuelReactionResponse> {
  const session = await ensureSession(input.sessionId);
  const reactionRecord: DuelReactionRecord = {
    id: `reaction_${randomUUID()}`,
    learnerId: learner.id,
    displayName: resolveLearnerDisplayName(learner),
    type: input.type,
    createdAt: now(),
  };
  const collection = await getDuelCollection();
  await collection.updateOne(
    { _id: session._id },
    {
      $push: { reactions: reactionRecord },
      $set: { updatedAt: now() },
    }
  );
  return { reaction: toPublicReaction(reactionRecord), serverTime: nowIso() };
}

export async function getKangurDuelSpectatorState(
  sessionId: string,
  options?: { spectatorId?: string | null }
): Promise<KangurDuelSpectatorStateResponse> {
  const session = await ensureSession(sessionId);
  const spectatorId = options?.spectatorId?.trim();
  if (!spectatorId) {
    return { session: toPublicSession(session), serverTime: nowIso() };
  }

  const updatedAt = now();
  const nextSpectators = { ...(session.spectators ?? {}) };
  nextSpectators[spectatorId] = updatedAt;

  const collection = await getDuelCollection();
  await collection.updateOne(
    { _id: session._id },
    {
      $set: {
        [`spectators.${spectatorId}`]: updatedAt,
        updatedAt,
      },
    }
  );

  return {
    session: toPublicSession({ ...session, spectators: nextSpectators, updatedAt }),
    serverTime: nowIso(),
  };
}

export async function listKangurDuelLeaderboard(
  _options?: { limit?: number; lookbackDays?: number }
): Promise<KangurDuelLeaderboardResponse> {
  const limit = _options?.limit ?? 20;
  const lookbackDays = _options?.lookbackDays ?? 30;
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60_000);
  const collection = await getDuelCollection();
  const sessions = await collection
    .find({ status: 'completed', endedAt: { $gte: since } })
    .sort({ endedAt: -1 })
    .limit(Math.max(1, limit))
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
    const sessionPlayedAt = session.endedAt ?? session.updatedAt ?? session.createdAt ?? now();
    const players = session.players ?? [];
    if (!players.length) {
      return;
    }
    const scores = players.map((player) =>
      typeof player.score === 'number' && Number.isFinite(player.score) ? player.score : 0
    );
    const maxScore = Math.max(...scores);
    const winners = players.filter((player) => (player.score ?? 0) === maxScore);
    const isTie = winners.length === players.length;

    players.forEach((player) => {
      const existing = stats.get(player.learnerId);
      const base = existing ?? {
        learnerId: player.learnerId,
  displayName: player.displayName ?? 'Uczeń',
        wins: 0,
        losses: 0,
        ties: 0,
        matches: 0,
        lastPlayedAt: sessionPlayedAt,
      };
      base.displayName = player.displayName ?? base.displayName;
      base.matches += 1;
      if (sessionPlayedAt > base.lastPlayedAt) {
        base.lastPlayedAt = sessionPlayedAt;
      }
      if (isTie) {
        base.ties += 1;
      } else if (winners.some((winner) => winner.learnerId === player.learnerId)) {
        base.wins += 1;
      } else {
        base.losses += 1;
      }
      stats.set(player.learnerId, base);
    });
  });

  const entries = Array.from(stats.values())
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
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.matches !== a.matches) return b.matches - a.matches;
      return a.lastPlayedAt.localeCompare(b.lastPlayedAt) * -1;
    })
    .slice(0, Math.max(1, limit));

  return { entries, serverTime: nowIso() };
}
