import 'server-only';

import { randomUUID } from 'crypto';

import type { Collection, UpdateFilter } from 'mongodb';

import type { KangurLearnerProfile } from '@/features/kangur/shared/contracts/kangur';
import {
  type NumberBalanceMatchCreateInput,
  type NumberBalanceMatchJoinInput,
  type NumberBalanceMatchPlayerState,
  type NumberBalanceMatchState,
  type NumberBalanceMatchStateResponse,
  type NumberBalanceMatchStateInput,
  type NumberBalanceMatchStateSnapshotResponse,
  type NumberBalancePlayerScore,
  type NumberBalanceSolveAttempt,
  type NumberBalanceSolveResponse,
  numberBalanceMatchStatusSchema,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';
import { badRequestError, conflictError, notFoundError } from '@/features/kangur/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  createNumberBalancePuzzle,
  evaluateNumberBalancePlacement,
} from '@/features/kangur/games/number-balance/number-balance-generator';

type MongoNumberBalanceMatchDocument = Omit<NumberBalanceMatchState, 'matchId'> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  players: NumberBalanceMatchPlayerState[];
  playerCount: number;
};

const NUMBER_BALANCE_COLLECTION = 'kangur_number_balance_matches';

const DEFAULT_ROUND_DURATION_MS = 15_000;
const DEFAULT_BALANCED_PROBABILITY = 0.8;
const START_COUNTDOWN_MS = 3_000;
const SPEED_BONUS_WINDOW_MS = 4_000;
const MATCH_TTL_MS = 5 * 60_000;

let indexesEnsured: Promise<void> | null = null;

const ensureNumberBalanceIndexes = async (): Promise<void> => {
  if (indexesEnsured) {
    return indexesEnsured;
  }

  indexesEnsured = (async (): Promise<void> => {
    const db = await getMongoDb();
    const collection = db.collection<MongoNumberBalanceMatchDocument>(NUMBER_BALANCE_COLLECTION);
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await collection.createIndex({ updatedAt: -1 });
  })();

  return indexesEnsured;
};

const getNumberBalanceCollection = async (): Promise<
  Collection<MongoNumberBalanceMatchDocument>
> => {
  await ensureNumberBalanceIndexes();
  const db = await getMongoDb();
  return db.collection<MongoNumberBalanceMatchDocument>(NUMBER_BALANCE_COLLECTION);
};

const normalizeDuration = (value?: number): number => {
  if (!value || !Number.isFinite(value)) return DEFAULT_ROUND_DURATION_MS;
  return Math.max(5_000, Math.min(60_000, Math.trunc(value)));
};

const normalizeBalancedProbability = (value?: number): number | undefined => {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(0, Math.min(1, value));
};

const computeExpiresAt = (nowMs: number): Date => new Date(nowMs + MATCH_TTL_MS);

const toMatchState = (match: MongoNumberBalanceMatchDocument): NumberBalanceMatchState => ({
  matchId: match._id,
  status: match.status,
  seed: match.seed,
  startTimeMs: match.startTimeMs,
  roundDurationMs: match.roundDurationMs,
  tier: match.tier,
  balancedProbability: match.balancedProbability,
});

const buildScores = (
  players: NumberBalanceMatchPlayerState[]
): NumberBalancePlayerScore[] =>
  players.map((entry) => ({
    playerId: entry.playerId,
    score: entry.score,
  }));

const buildPlayerState = (
  playerId: string,
  puzzleStartedAtMs: number
): NumberBalanceMatchPlayerState => ({
  playerId,
  score: 0,
  puzzleIndex: 0,
  puzzleStartedAtMs,
});

const buildMatchStateResponse = (
  match: MongoNumberBalanceMatchDocument,
  player: NumberBalanceMatchPlayerState,
  nowMs: number
): NumberBalanceMatchStateResponse => ({
  match: toMatchState(match),
  player,
  serverTimeMs: nowMs,
});

const buildMatchStateSnapshotResponse = (
  match: MongoNumberBalanceMatchDocument,
  player: NumberBalanceMatchPlayerState,
  nowMs: number
): NumberBalanceMatchStateSnapshotResponse => ({
  match: toMatchState(match),
  player,
  scores: buildScores(match.players),
  playerCount: match.playerCount,
  serverTimeMs: nowMs,
});

const resolvePlayer = (
  match: MongoNumberBalanceMatchDocument,
  learnerId: string
): NumberBalanceMatchPlayerState => {
  const player = match.players.find((entry) => entry.playerId === learnerId);
  if (!player) {
    throw badRequestError('Learner is not part of this match.');
  }
  return player;
};

const isMatchExpired = (match: MongoNumberBalanceMatchDocument, nowMs: number): boolean => {
  if (match.status === numberBalanceMatchStatusSchema.enum.waiting) {
    return false;
  }
  return nowMs > match.startTimeMs + match.roundDurationMs;
};

const refreshMatchStatus = async (
  collection: Collection<MongoNumberBalanceMatchDocument>,
  match: MongoNumberBalanceMatchDocument,
  nowMs: number
): Promise<MongoNumberBalanceMatchDocument> => {
  if (!isMatchExpired(match, nowMs) || match.status === 'completed') {
    return match;
  }

  const updatedMatch = await collection.findOneAndUpdate(
    { _id: match._id, status: { $ne: numberBalanceMatchStatusSchema.enum.completed } },
    {
      $set: {
        status: numberBalanceMatchStatusSchema.enum.completed,
        updatedAt: new Date(nowMs),
        expiresAt: computeExpiresAt(nowMs),
      },
    },
    { returnDocument: 'after', includeResultMetadata: false }
  );

  return updatedMatch ?? { ...match, status: numberBalanceMatchStatusSchema.enum.completed };
};

const resolveMatch = async (
  collection: Collection<MongoNumberBalanceMatchDocument>,
  matchId: string,
  nowMs: number
): Promise<MongoNumberBalanceMatchDocument> => {
  const match = await collection.findOne({ _id: matchId });
  if (!match) {
    throw notFoundError('Number balance match not found.');
  }
  return refreshMatchStatus(collection, match, nowMs);
};

export const createNumberBalanceMatch = async (
  learner: KangurLearnerProfile,
  input: NumberBalanceMatchCreateInput
): Promise<NumberBalanceMatchStateResponse> => {
  const nowMs = Date.now();
  const matchId = `nb_${randomUUID()}`;
  const roundDurationMs = normalizeDuration(input.roundDurationMs);
  const balancedProbability = normalizeBalancedProbability(input.balancedProbability);
  const startTimeMs = nowMs + START_COUNTDOWN_MS;

  const player = buildPlayerState(learner.id, startTimeMs);

  const match: MongoNumberBalanceMatchDocument = {
    _id: matchId,
    status: numberBalanceMatchStatusSchema.enum.waiting,
    seed: Math.floor(Math.random() * 1_000_000_000),
    startTimeMs,
    roundDurationMs,
    tier: input.tier ?? 'tier1',
    balancedProbability: balancedProbability ?? DEFAULT_BALANCED_PROBABILITY,
    createdAt: new Date(nowMs),
    updatedAt: new Date(nowMs),
    expiresAt: computeExpiresAt(nowMs),
    players: [player],
    playerCount: 1,
  };

  const collection = await getNumberBalanceCollection();
  await collection.insertOne(match);

  return buildMatchStateResponse(match, player, nowMs);
};

export const joinNumberBalanceMatch = async (
  learner: KangurLearnerProfile,
  input: NumberBalanceMatchJoinInput
): Promise<NumberBalanceMatchStateResponse> => {
  const nowMs = Date.now();
  const collection = await getNumberBalanceCollection();
  let match = await resolveMatch(collection, input.matchId, nowMs);

  if (match.status === numberBalanceMatchStatusSchema.enum.completed) {
    throw badRequestError('Match already completed.');
  }

  const existing = match.players.find((entry) => entry.playerId === learner.id);
  if (existing) {
    return buildMatchStateResponse(match, existing, nowMs);
  }

  if (match.playerCount >= 2) {
    throw conflictError('Match already has two players.');
  }

  if (
    match.status === numberBalanceMatchStatusSchema.enum.in_progress &&
    nowMs >= match.startTimeMs
  ) {
    throw badRequestError('Match already started.');
  }

  const shouldStart = match.status === numberBalanceMatchStatusSchema.enum.waiting;
  const startTimeMs = shouldStart ? nowMs + START_COUNTDOWN_MS : match.startTimeMs;
  const player = buildPlayerState(learner.id, startTimeMs);

  const update: UpdateFilter<MongoNumberBalanceMatchDocument> = {
    $set: {
      updatedAt: new Date(nowMs),
      expiresAt: computeExpiresAt(nowMs),
    },
    $push: {
      players: player,
    },
    $inc: {
      playerCount: 1,
    },
  };

  if (shouldStart) {
    const setUpdates = { ...(update['$set'] ?? {}) } as Record<string, unknown>;
    setUpdates['status'] = numberBalanceMatchStatusSchema.enum.in_progress;
    setUpdates['startTimeMs'] = startTimeMs;
    setUpdates['players.$[].puzzleStartedAtMs'] = startTimeMs;
    update['$set'] = setUpdates;
  }

  const updatedMatch = await collection.findOneAndUpdate(
    {
      _id: match._id,
      playerCount: { $lt: 2 },
      status: { $ne: numberBalanceMatchStatusSchema.enum.completed },
    },
    update,
    { returnDocument: 'after', includeResultMetadata: false }
  );

  if (!updatedMatch) {
    match = await resolveMatch(collection, input.matchId, nowMs);
    if (match.playerCount >= 2) {
      throw conflictError('Match already has two players.');
    }
    throw badRequestError('Unable to join match.');
  }

  const joinedPlayer = resolvePlayer(updatedMatch, learner.id);

  return buildMatchStateResponse(updatedMatch, joinedPlayer, nowMs);
};

export const getNumberBalanceMatchState = async (
  learner: KangurLearnerProfile,
  input: NumberBalanceMatchStateInput
): Promise<NumberBalanceMatchStateSnapshotResponse> => {
  const nowMs = Date.now();
  const collection = await getNumberBalanceCollection();
  const match = await resolveMatch(collection, input.matchId, nowMs);
  const player = resolvePlayer(match, learner.id);

  return buildMatchStateSnapshotResponse(match, player, nowMs);
};

export const submitNumberBalanceSolveAttempt = async (
  learner: KangurLearnerProfile,
  input: NumberBalanceSolveAttempt
): Promise<NumberBalanceSolveResponse> => {
  const nowMs = Date.now();
  const collection = await getNumberBalanceCollection();
  let match = await resolveMatch(collection, input.matchId, nowMs);

  if (match.status === numberBalanceMatchStatusSchema.enum.completed) {
    throw badRequestError('Match already completed.');
  }
  if (match.status === numberBalanceMatchStatusSchema.enum.waiting) {
    throw badRequestError('Match has not started yet.');
  }
  if (nowMs < match.startTimeMs) {
    throw badRequestError('Match has not started yet.');
  }

  const player = resolvePlayer(match, learner.id);
  const puzzle = createNumberBalancePuzzle({
    tier: match.tier,
    puzzleIndex: player.puzzleIndex,
    seed: match.seed,
    balancedProbability: match.balancedProbability,
  });

  if (puzzle.id !== input.puzzleId) {
    throw badRequestError('Puzzle does not match the expected sequence.');
  }

  const evaluation = evaluateNumberBalancePlacement(puzzle, input.placement);
  if (!evaluation.isSolved) {
    return {
      events: [
        {
          type: 'solve_result',
          matchId: match._id,
          puzzleId: input.puzzleId,
          accepted: false,
          pointsAwarded: 0,
        },
      ],
      player,
      serverTimeMs: nowMs,
    };
  }

  const solveTimeMs = Math.max(0, nowMs - player.puzzleStartedAtMs);
  const speedBonus = solveTimeMs <= SPEED_BONUS_WINDOW_MS ? 1 : 0;
  const pointsAwarded = 2 + speedBonus;
  const nextScore = player.score + pointsAwarded;
  const nextPuzzleIndex = player.puzzleIndex + 1;

  const updateResult = await collection.updateOne(
    {
      _id: match._id,
      'players.playerId': learner.id,
      'players.puzzleIndex': player.puzzleIndex,
    },
    {
      $set: {
        'players.$.score': nextScore,
        'players.$.puzzleIndex': nextPuzzleIndex,
        'players.$.puzzleStartedAtMs': nowMs,
        updatedAt: new Date(nowMs),
        expiresAt: computeExpiresAt(nowMs),
      },
    }
  );

  if (updateResult.modifiedCount === 0) {
    match = await resolveMatch(collection, input.matchId, nowMs);
    const refreshedPlayer = resolvePlayer(match, learner.id);
    return {
      events: [
        {
          type: 'solve_result',
          matchId: match._id,
          puzzleId: input.puzzleId,
          accepted: false,
          pointsAwarded: 0,
        },
      ],
      player: refreshedPlayer,
      serverTimeMs: nowMs,
    };
  }

  match = await resolveMatch(collection, input.matchId, nowMs);
  const refreshedPlayer = resolvePlayer(match, learner.id);

  const nextPuzzle = createNumberBalancePuzzle({
    tier: match.tier,
    puzzleIndex: nextPuzzleIndex,
    seed: match.seed,
    balancedProbability: match.balancedProbability,
  });

  return {
    events: [
      {
        type: 'solve_result',
        matchId: match._id,
        puzzleId: input.puzzleId,
        accepted: true,
        pointsAwarded,
        solveTimeMs,
        nextPuzzleId: nextPuzzle.id,
        nextPuzzleIndex,
      },
      {
        type: 'score_update',
        matchId: match._id,
        scores: buildScores(match.players),
        serverTimeMs: nowMs,
      },
    ],
    player: refreshedPlayer,
    serverTimeMs: nowMs,
  };
};
