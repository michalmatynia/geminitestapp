import { randomUUID } from 'crypto';
import type { UpdateFilter } from 'mongodb';

import type { KangurLearnerProfile } from '@/features/kangur/shared/contracts/kangur';
import {
  type NumberBalanceMatchCreateInput,
  type NumberBalanceMatchJoinInput,
  type NumberBalanceMatchStateResponse,
  type NumberBalanceMatchStateInput,
  type NumberBalanceMatchStateSnapshotResponse,
  type NumberBalanceSolveAttempt,
  type NumberBalanceSolveResponse,
  numberBalanceMatchStatusSchema,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';
import { badRequestError, conflictError } from '@/features/kangur/shared/errors/app-error';
import {
  createNumberBalancePuzzle,
  evaluateNumberBalancePlacement,
} from '@/features/kangur/games/number-balance/number-balance-generator';

import {
  DEFAULT_BALANCED_PROBABILITY,
  SPEED_BONUS_WINDOW_MS,
  START_COUNTDOWN_MS,
} from './constants';
import { getNumberBalanceCollection, type MongoNumberBalanceMatchDocument } from './database';
import { computeExpiresAt, normalizeBalancedProbability, normalizeDuration } from './helpers';
import { resolveMatch } from './match';
import {
  buildMatchStateResponse,
  buildMatchStateSnapshotResponse,
  buildPlayerState,
  buildScores,
  resolvePlayer,
} from './state';

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
