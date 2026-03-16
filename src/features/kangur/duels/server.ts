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
  KangurDuelJoinInput,
  KangurDuelLobbyEntry,
  KangurDuelLobbyResponse,
  KangurDuelLeaveInput,
  KangurDuelOpponentEntry,
  KangurDuelOpponentsResponse,
  KangurDuelSearchEntry,
  KangurDuelSearchResponse,
  KangurDuelPlayer,
  KangurDuelQuestion,
  KangurDuelSession,
  KangurDuelStateResponse,
  KangurDuelStatus,
  KangurDuelVisibility,
} from '@/features/kangur/shared/contracts/kangur-duels';
import { generateQuestions } from '@/features/kangur/shared/math-questions';
import type { KangurDifficulty, KangurOperation } from '@/features/kangur/shared/math-types';
import {
  badRequestError,
  conflictError,
  forbiddenError,
  notFoundError,
} from '@/features/kangur/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { getRedisConnection } from '@/shared/lib/queue';
import { logClientError } from '@/features/kangur/shared/utils/observability/client-error-logger';
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

type MongoDuelPlayer = Omit<KangurDuelPlayer, 'joinedAt' | 'lastAnswerAt'> & {
  joinedAt: Date;
  lastAnswerAt?: Date | null;
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
  visibility?: KangurDuelVisibility;
  invitedLearnerId?: string | null;
  invitedLearnerName?: string | null;
};

const DUELS_COLLECTION = 'kangur_duels';
const QUICK_MATCH_QUEUE_KEY = 'kangur:duels:quick-match:v1';
const QUICK_MATCH_SCAN_LIMIT = 8;
const LOBBY_LIST_LIMIT = KANGUR_DUELS_DEFAULT_LOBBY_LIMIT;
const OPPONENTS_LIST_LIMIT = KANGUR_DUELS_DEFAULT_OPPONENTS_LIMIT;
const SEARCH_LIST_LIMIT = KANGUR_DUELS_DEFAULT_SEARCH_LIMIT;
const SEARCH_MIN_CHARS = KANGUR_DUELS_SEARCH_MIN_CHARS;
const DUEL_WAITING_TTL_MS = 30 * 60_000;
const DUEL_ACTIVE_TTL_MS = 2 * 60 * 60_000;
const DUEL_FINISHED_TTL_MS = 30 * 60_000;

const DEFAULT_QUESTION_COUNT = 8;
const DEFAULT_TIME_PER_QUESTION_SEC = 20;
const DEFAULT_DUEL_OPERATION: KangurOperation = 'addition';
const DEFAULT_DUEL_DIFFICULTY: KangurDifficulty = 'easy';

const now = (): Date => new Date();
const nowIso = (): string => new Date().toISOString();

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

const resolveLearnerDisplayName = (learner: KangurLearnerProfile): string =>
  learner.displayName?.trim() || learner.loginName?.trim() || 'Uczen';

const buildQuestions = (count: number): InternalDuelQuestion[] =>
  generateQuestions(DEFAULT_DUEL_OPERATION, DEFAULT_DUEL_DIFFICULTY, count).map(
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
  joinedAt,
});

const toPublicPlayer = (player: MongoDuelPlayer): KangurDuelPlayer => ({
  learnerId: player.learnerId,
  displayName: player.displayName,
  status: player.status,
  score: player.score,
  joinedAt: toIsoString(player.joinedAt) ?? nowIso(),
  lastAnswerAt: toIsoString(player.lastAnswerAt) ?? null,
  lastAnswerQuestionId: player.lastAnswerQuestionId,
  lastAnswerCorrect: player.lastAnswerCorrect,
  isConnected: player.isConnected,
});

const toPublicSession = (session: MongoDuelSessionDocument): KangurDuelSession => ({
  id: session._id,
  mode: session.mode,
  visibility: resolveVisibility(session),
  status: session.status,
  createdAt: toIsoString(session.createdAt) ?? nowIso(),
  updatedAt: toIsoString(session.updatedAt) ?? nowIso(),
  startedAt: toIsoString(session.startedAt) ?? null,
  endedAt: toIsoString(session.endedAt) ?? null,
  invitedLearnerId: session.invitedLearnerId ?? null,
  invitedLearnerName: session.invitedLearnerName ?? null,
  questionCount: session.questionCount,
  timePerQuestionSec: session.timePerQuestionSec,
  currentQuestionIndex: session.currentQuestionIndex,
  questions: session.questions.map(toPublicQuestion),
  players: session.players.map(toPublicPlayer),
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
    status: session.status,
    createdAt: toIsoString(session.createdAt) ?? nowIso(),
    updatedAt: toIsoString(session.updatedAt) ?? nowIso(),
    questionCount: session.questionCount,
    timePerQuestionSec: session.timePerQuestionSec,
    host: toPublicPlayer(host),
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
  displayName: profile.displayName,
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

const enqueueQuickMatchSession = async (sessionId: string): Promise<void> => {
  const redis = getRedisConnection();
  if (!redis) {
    return;
  }
  try {
    await redis.lpush(QUICK_MATCH_QUEUE_KEY, sessionId);
  } catch (error) {
    logClientError(error);
  }
};

const dequeueQuickMatchSession = async (): Promise<string | null> => {
  const redis = getRedisConnection();
  if (!redis) {
    return null;
  }
  try {
    const result = await redis.rpop(QUICK_MATCH_QUEUE_KEY);
    return result ?? null;
  } catch (error) {
    logClientError(error);
    return null;
  }
};

const removeQuickMatchSession = async (sessionId: string): Promise<void> => {
  const redis = getRedisConnection();
  if (!redis) {
    return;
  }
  try {
    await redis.lrem(QUICK_MATCH_QUEUE_KEY, 0, sessionId);
  } catch (error) {
    logClientError(error);
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
        startedAt: nowTime,
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
    await removeQuickMatchSession(sessionId);
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
  if (session.playerCount >= 2) {
    throw conflictError('Duel session already has two players.');
  }

  const joinedAt = now();
  const expiresAt = computeExpiresAt(joinedAt, 'ready');
  const updateResult = await collection.updateOne(
    {
      _id: sessionId,
      status: { $nin: ['completed', 'aborted'] },
      playerCount: { $lt: 2 },
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
    if (refreshed.playerCount >= 2) {
      throw conflictError('Duel session already has two players.');
    }
    return refreshed;
  }

  const updated = await ensureSession(sessionId);
  if (updated.playerCount >= 2) {
    await updateSessionStatusForReady(updated._id, updated.status);
  }
  return ensureSession(sessionId);
};

const resolveInvitedLearner = async (
  hostLearnerId: string,
  input: KangurDuelCreateInput
): Promise<{ id: string; displayName: string }> => {
  if (input.opponentLearnerId) {
    const match = await getKangurLearnerById(input.opponentLearnerId);
    if (!match) {
      throw notFoundError('Invited learner not found.');
    }
    if (match.id === hostLearnerId) {
      throw badRequestError('Cannot invite yourself to a duel.');
    }
    return { id: match.id, displayName: match.displayName };
  }

  if (input.opponentLoginName) {
    const match = await getKangurStoredLearnerByLoginName(input.opponentLoginName);
    if (!match) {
      throw notFoundError('Invited learner not found.');
    }
    if (match.id === hostLearnerId) {
      throw badRequestError('Cannot invite yourself to a duel.');
    }
    return { id: match.id, displayName: match.displayName };
  }

  throw badRequestError('Opponent learner is required for private duels.');
};

const advanceSessionIfReady = async (
  session: MongoDuelSessionDocument,
  questionId: string,
  answeredAt: Date
): Promise<MongoDuelSessionDocument> => {
  if (session.status === 'completed' || session.status === 'aborted') {
    return session;
  }
  const questionIndex = session.questions.findIndex((entry) => entry.id === questionId);
  if (questionIndex < 0) {
    return session;
  }
  const answersByPlayer = session.answersByPlayer ?? {};
  const allAnswered = session.players.every((player) =>
    Boolean(answersByPlayer[player.learnerId]?.[questionId])
  );
  if (!allAnswered) {
    return session;
  }

  if (session.currentQuestionIndex !== questionIndex) {
    return session;
  }

  const collection = await getDuelCollection();

  if (questionIndex + 1 >= session.questionCount) {
    const completedPlayers: MongoDuelPlayer[] = session.players.map((player) => ({
      ...player,
      status: 'completed' as const,
    }));
    await collection.updateOne(
      { _id: session._id, currentQuestionIndex: questionIndex },
      {
        $set: {
          status: 'completed',
          endedAt: answeredAt,
          updatedAt: answeredAt,
          players: completedPlayers,
          expiresAt: computeExpiresAt(answeredAt, 'completed'),
        },
      }
    );
  } else {
    await collection.updateOne(
      { _id: session._id, currentQuestionIndex: questionIndex },
      {
        $set: {
          currentQuestionIndex: questionIndex + 1,
          updatedAt: answeredAt,
          expiresAt: computeExpiresAt(answeredAt, 'in_progress'),
        },
      }
    );
  }

  return ensureSession(session._id);
};

export const createKangurDuelSession = async (
  learner: KangurLearnerProfile,
  input: KangurDuelCreateInput
): Promise<KangurDuelStateResponse> => {
  const questionCount = normalizeQuestionCount(input.questionCount);
  const timePerQuestionSec = normalizeTimePerQuestionSec(input.timePerQuestionSec);
  const questions = buildQuestions(questionCount);
  const sessionId = `duel_${randomUUID()}`;
  const createdAt = now();
  const visibility: KangurDuelVisibility = input.visibility ?? 'public';
  if (input.mode === 'quick_match' && visibility === 'private') {
    throw badRequestError('Quick match duels must be public.');
  }
  const invitedLearner =
    visibility === 'private' ? await resolveInvitedLearner(learner.id, input) : null;

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
    invitedLearnerName: invitedLearner?.displayName ?? null,
    questionCount,
    timePerQuestionSec,
    currentQuestionIndex: 0,
    questions,
    players: [buildPlayer(learner, createdAt)],
    playerCount: 1,
    answersByPlayer: {},
  };

  const collection = await getDuelCollection();
  await collection.insertOne(session);

  if (input.mode === 'quick_match') {
    await enqueueQuickMatchSession(sessionId);
  }

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
    for (let attempt = 0; attempt < QUICK_MATCH_SCAN_LIMIT; attempt += 1) {
      const queuedSessionId = await dequeueQuickMatchSession();
      if (!queuedSessionId) {
        break;
      }
      try {
        const joinedSession = await attachPlayerToSession(queuedSessionId, learner);
        if (joinedSession.playerCount >= 2) {
          await removeQuickMatchSession(queuedSessionId);
        }
        return buildStateResponse(joinedSession, learner.id);
      } catch (error) {
        logClientError(error);
      }
    }

    return createKangurDuelSession(learner, {
      mode: 'quick_match',
      questionCount: DEFAULT_QUESTION_COUNT,
      timePerQuestionSec: DEFAULT_TIME_PER_QUESTION_SEC,
    });
  }

  const sessionId = input.sessionId!.trim();
  const joinedSession = await attachPlayerToSession(sessionId, learner);
  if (joinedSession.mode === 'quick_match' && joinedSession.playerCount >= 2) {
    await removeQuickMatchSession(sessionId);
  }
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

  const player = resolvePlayer(session, learner.id);
  const question = session.questions.find((entry) => entry.id === input.questionId);
  if (!question) {
    throw notFoundError('Question not found in this duel session.');
  }

  const answerPath = `answersByPlayer.${player.learnerId}.${question.id}`;
  const answeredAt = now();
  const correct = String(question.answer) === String(input.choice);
  const nextStatus: KangurDuelStatus =
    session.status === 'ready' ? 'in_progress' : session.status;
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
        'players.$[target].status': 'playing',
        updatedAt: answeredAt,
        status: nextStatus,
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

  const refreshed = await ensureSession(input.sessionId);
  const advanced = await advanceSessionIfReady(refreshed, question.id, answeredAt);
  return buildStateResponse(advanced, learner.id);
};

export const getKangurDuelState = async (
  learner: KangurLearnerProfile,
  sessionId: string
): Promise<KangurDuelStateResponse> => {
  const session = await ensureSession(sessionId);
  resolvePlayer(session, learner.id);
  return buildStateResponse(session, learner.id);
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
  const privateInvites = await collection
    .find({
      status: 'waiting',
      playerCount: 1,
      visibility: 'private',
      invitedLearnerId: learner.id,
      'players.learnerId': { $ne: learner.id },
    })
    .sort({ createdAt: -1 })
    .toArray();

  const publicLimit = Math.max(0, limit - privateInvites.length);
  const publicSessions =
    publicLimit > 0
      ? await collection
          .find({
            status: 'waiting',
            playerCount: 1,
            visibility: { $ne: 'private' },
            'players.learnerId': { $ne: learner.id },
          })
          .sort({ createdAt: -1 })
          .limit(publicLimit)
          .toArray()
      : [];

  const sessions = [...privateInvites, ...publicSessions];

  const entries = sessions
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
  const sessions = await collection
    .find({
      status: 'waiting',
      playerCount: 1,
      visibility: { $ne: 'private' },
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const entries = sessions
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
    const opponent = session.players.find((player) => player.learnerId !== learner.id);
    if (!opponent) {
      return;
    }
    const lastPlayedAt = session.endedAt ?? session.updatedAt ?? session.createdAt;
    const existing = byOpponent.get(opponent.learnerId);
    if (existing && existing.lastPlayedAt >= lastPlayedAt) {
      return;
    }
    byOpponent.set(opponent.learnerId, {
      entry: toOpponentEntry(opponent, lastPlayedAt),
      lastPlayedAt,
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

  await removeQuickMatchSession(session._id);

  const refreshed = await ensureSession(session._id);
  return buildStateResponse(refreshed, learner.id);
};
