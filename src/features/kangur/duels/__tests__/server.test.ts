import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getMongoDbMock,
  getRedisConnectionMock,
  publishKangurDuelLobbyUpdateMock,
} = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  getRedisConnectionMock: vi.fn(),
  publishKangurDuelLobbyUpdateMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/lib/queue', () => ({
  getRedisConnection: getRedisConnectionMock,
}));

vi.mock('@/features/kangur/services/duel-lobby-stream-publisher', () => ({
  publishKangurDuelLobbyUpdate: publishKangurDuelLobbyUpdateMock,
}));

import type {
  KangurDuelDifficulty,
  KangurDuelOperation,
} from '@/features/kangur/shared/contracts/kangur-duels';
import type { KangurLearnerProfile } from '@/features/kangur/shared/contracts/kangur';
import { createDefaultKangurAiTutorLearnerMood } from '@/features/kangur/shared/contracts/kangur-ai-tutor-mood';

import {
  createKangurDuelSession,
  getKangurDuelSpectatorState,
  heartbeatKangurDuelSession,
  joinKangurDuelSession,
  leaveKangurDuelSession,
  listKangurDuelLobby,
  listKangurDuelLeaderboard,
  listKangurPublicDuelLobby,
  sendKangurDuelReaction,
} from '../server';

type DuelSessionDoc = Record<string, unknown> & {
  _id: string;
  mode: 'challenge' | 'quick_match';
  visibility: 'public' | 'private';
  operation: KangurDuelOperation;
  difficulty: KangurDuelDifficulty;
  status: 'created' | 'waiting' | 'ready' | 'in_progress' | 'completed' | 'aborted';
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  startedAt?: Date | null;
  endedAt?: Date | null;
  invitedLearnerId?: string | null;
  invitedLearnerName?: string | null;
  questionCount: number;
  timePerQuestionSec: number;
  currentQuestionIndex: number;
  questions: Array<{
    id: string;
    prompt: string;
    choices: number[];
    answer: number;
  }>;
  players: Array<{
    learnerId: string;
    displayName: string;
    status: 'ready' | 'playing' | 'completed' | 'left' | 'invited';
    score: number;
    bonusPoints?: number;
    currentQuestionIndex?: number;
    joinedAt: Date;
    lastAnswerAt?: Date | null;
    lastAnswerQuestionId?: string;
    lastAnswerCorrect?: boolean;
    completedAt?: Date | null;
    isConnected?: boolean;
  }>;
  playerCount: number;
  answersByPlayer?: Record<string, Record<string, unknown>>;
};

const buildLearner = (overrides: Partial<KangurLearnerProfile> = {}): KangurLearnerProfile => ({
  id: overrides.id ?? 'learner-1',
  ownerUserId: overrides.ownerUserId ?? 'owner-1',
  displayName: overrides.displayName ?? 'Ada',
  loginName: overrides.loginName ?? 'ada',
  status: overrides.status ?? 'active',
  legacyUserKey: overrides.legacyUserKey ?? null,
  aiTutor: overrides.aiTutor ?? createDefaultKangurAiTutorLearnerMood(),
  createdAt: overrides.createdAt ?? '2026-03-16T10:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-03-16T10:00:00.000Z',
});

const buildSession = (overrides: Partial<DuelSessionDoc> = {}): DuelSessionDoc => {
  const now = new Date('2026-03-16T12:00:00.000Z');
  return {
    _id: overrides._id ?? 'duel-1',
    mode: overrides.mode ?? 'challenge',
    visibility: overrides.visibility ?? 'public',
    status: overrides.status ?? 'waiting',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    expiresAt: overrides.expiresAt,
    startedAt: overrides.startedAt ?? null,
    endedAt: overrides.endedAt ?? null,
    invitedLearnerId: overrides.invitedLearnerId ?? null,
    invitedLearnerName: overrides.invitedLearnerName ?? null,
    operation: overrides.operation ?? 'addition',
    difficulty: overrides.difficulty ?? 'easy',
    questionCount: overrides.questionCount ?? 3,
    timePerQuestionSec: overrides.timePerQuestionSec ?? 20,
    currentQuestionIndex: overrides.currentQuestionIndex ?? 0,
    questions: overrides.questions ?? [
      { id: 'q-1', prompt: '1+1', choices: [2, 3], answer: 2 },
      { id: 'q-2', prompt: '2+2', choices: [3, 4], answer: 4 },
      { id: 'q-3', prompt: '3+3', choices: [5, 6], answer: 6 },
    ],
    players: overrides.players ?? [
      {
        learnerId: 'learner-1',
        displayName: 'Ada',
        status: 'ready',
        score: 0,
        joinedAt: now,
        lastAnswerAt: null,
      },
    ],
    playerCount: overrides.playerCount ?? 1,
    answersByPlayer: overrides.answersByPlayer ?? {},
  };
};

describe('kangur duels server', () => {
  let collection: {
    findOne: ReturnType<typeof vi.fn>;
    updateOne: ReturnType<typeof vi.fn>;
    findOneAndUpdate: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    createIndex: ReturnType<typeof vi.fn>;
    insertOne: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-16T12:00:00.000Z'));

    collection = {
      findOne: vi.fn(),
      updateOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      find: vi.fn(),
      createIndex: vi.fn(),
      insertOne: vi.fn(),
    };

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => collection),
    });
    getRedisConnectionMock.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('extends expiry on heartbeat for active sessions', async () => {
    const nowMs = Date.now();
    const session = buildSession({
      status: 'in_progress',
      expiresAt: new Date(nowMs + 60_000),
      players: [
        {
          learnerId: 'learner-1',
          displayName: 'Ada',
          status: 'playing',
          score: 1,
          joinedAt: new Date(nowMs - 5_000),
          lastAnswerAt: new Date(nowMs - 1_000),
          lastAnswerQuestionId: 'q-1',
          lastAnswerCorrect: true,
        },
      ],
    });

    collection.findOne.mockResolvedValue(session);
    collection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

    const response = await heartbeatKangurDuelSession(buildLearner(), {
      sessionId: session._id,
    });

    expect(response.session.id).toBe(session._id);
    expect(collection.updateOne).toHaveBeenCalledTimes(1);

    const updatePayload = collection.updateOne.mock.calls[0]?.[1] as {
      $set?: Record<string, unknown>;
    };
    const expiresAt = updatePayload?.$set?.['expiresAt'] as Date;

    expect(expiresAt).toBeInstanceOf(Date);
    expect(expiresAt.getTime()).toBeGreaterThan(nowMs);
    expect(updatePayload?.$set?.['players.$[target].isConnected']).toBe(true);
  });

  it('does not update expiry for completed sessions', async () => {
    const session = buildSession({ status: 'completed', expiresAt: new Date(Date.now() + 60_000) });
    collection.findOne.mockResolvedValue(session);

    const response = await heartbeatKangurDuelSession(buildLearner(), {
      sessionId: session._id,
    });

    expect(response.session.status).toBe('completed');
    expect(collection.updateOne).not.toHaveBeenCalled();
  });

  it('filters expired sessions and backfills missing expiry in public lobby', async () => {
    const nowMs = Date.now();
    const expired = buildSession({
      _id: 'duel-expired',
      expiresAt: new Date(nowMs - 1_000),
    });
    const missing = buildSession({
      _id: 'duel-missing',
      expiresAt: undefined,
    });
    delete missing.expiresAt;
    const future = buildSession({
      _id: 'duel-future',
      expiresAt: new Date(nowMs + 60_000),
    });

    const cursor = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([expired, missing, future]),
    };

    collection.find.mockReturnValue(cursor);
    collection.findOneAndUpdate.mockResolvedValue({
      ...missing,
      expiresAt: new Date(nowMs + 30_000),
    });

    const response = await listKangurPublicDuelLobby({ limit: 5 });
    const sessionIds = response.entries.map((entry) => entry.sessionId);

    expect(sessionIds).toEqual(expect.arrayContaining(['duel-missing', 'duel-future']));
    expect(sessionIds).not.toContain('duel-expired');
    expect(collection.findOneAndUpdate).toHaveBeenCalled();
  });

  it('passes the duel visibility filter through the authenticated lobby query', async () => {
    const privateInvite = buildSession({
      _id: 'duel-private',
      visibility: 'private',
    });
    const cursor = {
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([privateInvite]),
    };

    collection.find.mockReturnValue(cursor);

    const response = await listKangurDuelLobby(buildLearner(), {
      limit: 4,
      visibility: 'private',
    });

    expect(collection.find).toHaveBeenCalledWith({
      status: 'waiting',
      visibility: 'private',
    });
    expect(cursor.limit).toHaveBeenCalledWith(4);
    expect(response.entries.map((entry) => entry.sessionId)).toEqual(['duel-private']);
  });

  it('records reactions for active sessions', async () => {
    const now = new Date('2026-03-16T12:00:00.000Z');
    const session = buildSession({
      status: 'in_progress',
      updatedAt: now,
      players: [
        {
          learnerId: 'learner-1',
          displayName: 'Ada',
          status: 'playing',
          score: 2,
          joinedAt: now,
        },
      ],
    });

    collection.findOne.mockResolvedValue(session);
    collection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

    const response = await sendKangurDuelReaction(buildLearner(), {
      sessionId: session._id,
      type: 'gg',
    });

    expect(response.reaction.type).toBe('gg');
    expect(response.reaction.learnerId).toBe('learner-1');
    expect(response.reaction.displayName).toBe('ada');
    expect(collection.updateOne).toHaveBeenCalledTimes(1);
    const update = collection.updateOne.mock.calls[0]?.[1] as {
      $push?: Record<string, unknown>;
      $set?: Record<string, unknown>;
    };
    expect(update.$push).toBeDefined();
    expect(update.$set?.['updatedAt']).toBeInstanceOf(Date);
  });

  it('tracks spectator presence and returns spectator count', async () => {
    const now = new Date('2026-03-16T12:00:00.000Z');
    const session = buildSession({
      status: 'in_progress',
      visibility: 'public',
      updatedAt: now,
      players: [
        {
          learnerId: 'learner-1',
          displayName: 'Ada',
          status: 'playing',
          score: 2,
          joinedAt: now,
        },
      ],
      spectators: {},
    });

    collection.findOne.mockResolvedValue(session);
    collection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

    const response = await getKangurDuelSpectatorState(session._id, {
      spectatorId: 'spectator-1',
    });

    expect(response.session.id).toBe(session._id);
    expect(response.session.spectatorCount).toBe(1);
    expect(collection.updateOne).toHaveBeenCalledTimes(1);
  });

  it('aggregates duel leaderboard stats with wins and ties', async () => {
    const now = new Date('2026-03-16T12:00:00.000Z');
    const sessionA = buildSession({
      _id: 'duel-win',
      status: 'completed',
      endedAt: now,
      players: [
        {
          learnerId: 'learner-1',
          displayName: 'Ada',
          status: 'completed',
          score: 5,
          joinedAt: now,
        },
        {
          learnerId: 'learner-2',
          displayName: 'Olek',
          status: 'completed',
          score: 3,
          joinedAt: now,
        },
      ],
      playerCount: 2,
    });
    const sessionB = buildSession({
      _id: 'duel-tie',
      status: 'completed',
      endedAt: now,
      players: [
        {
          learnerId: 'learner-1',
          displayName: 'Ada',
          status: 'completed',
          score: 4,
          joinedAt: now,
        },
        {
          learnerId: 'learner-2',
          displayName: 'Olek',
          status: 'completed',
          score: 4,
          joinedAt: now,
        },
      ],
      playerCount: 2,
    });

    const cursor = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([sessionA, sessionB]),
    };
    collection.find.mockReturnValue(cursor);

    const response = await listKangurDuelLeaderboard({ limit: 5, lookbackDays: 7 });
    const ada = response.entries.find((entry) => entry.learnerId === 'learner-1');
    const olek = response.entries.find((entry) => entry.learnerId === 'learner-2');

    expect(ada).toMatchObject({ wins: 1, ties: 1, losses: 0, matches: 2 });
    expect(olek).toMatchObject({ wins: 0, ties: 1, losses: 1, matches: 2 });
  });

  it('publishes lobby update when creating a duel session', async () => {
    collection.insertOne.mockResolvedValue({ acknowledged: true });

    const response = await createKangurDuelSession(buildLearner(), {
      mode: 'challenge',
      visibility: 'public',
    });

    expect(publishKangurDuelLobbyUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'created',
        sessionId: response.session.id,
        visibility: 'public',
        mode: 'challenge',
      })
    );
  });

  it('stores operation and difficulty on created sessions', async () => {
    collection.insertOne.mockResolvedValue({ acknowledged: true });

    const response = await createKangurDuelSession(buildLearner(), {
      mode: 'challenge',
      visibility: 'public',
      operation: 'multiplication',
      difficulty: 'hard',
    });

    expect(response.session.operation).toBe('multiplication');
    expect(response.session.difficulty).toBe('hard');

    const inserted = collection.insertOne.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(inserted).toMatchObject({
      operation: 'multiplication',
      difficulty: 'hard',
    });
  });

  it('publishes lobby update when joining a duel session', async () => {
    const now = new Date('2026-03-16T12:00:00.000Z');
    const session = buildSession({
      _id: 'duel-join',
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 60_000),
      players: [
        {
          learnerId: 'learner-1',
          displayName: 'Ada',
          status: 'ready',
          score: 0,
          joinedAt: now,
          lastAnswerAt: null,
        },
      ],
      playerCount: 1,
      status: 'waiting',
    });

    const updatedSession = {
      ...session,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 60_000),
      players: [
        ...session.players,
        {
          learnerId: 'learner-2',
          displayName: 'Bob',
          status: 'ready',
          score: 0,
          joinedAt: now,
          lastAnswerAt: null,
        },
      ],
      playerCount: 2,
    };

    let updateApplied = false;

    collection.findOne.mockImplementation((query: Record<string, unknown>) => {
      if (query && typeof query === 'object' && 'players.learnerId' in query) {
        return null;
      }
      return updateApplied ? updatedSession : session;
    });
    collection.updateOne.mockImplementation(() => {
      updateApplied = true;
      return { matchedCount: 1, modifiedCount: 1 };
    });

    await joinKangurDuelSession(buildLearner({ id: 'learner-2', displayName: 'Bob' }), {
      sessionId: session._id,
    });

    expect(publishKangurDuelLobbyUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'joined',
        sessionId: session._id,
        visibility: 'public',
        mode: 'challenge',
      })
    );
  });

  it('publishes lobby update when leaving a duel session', async () => {
    const now = new Date('2026-03-16T12:00:00.000Z');
    const session = buildSession({
      _id: 'duel-leave',
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 60_000),
    });

    collection.findOne.mockResolvedValue(session);
    collection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

    await leaveKangurDuelSession(buildLearner(), { sessionId: session._id });

    expect(publishKangurDuelLobbyUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'left',
        sessionId: session._id,
        visibility: 'public',
        mode: 'challenge',
      })
    );
  });
});
