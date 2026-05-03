import {
  type NumberBalanceMatchPlayerState,
  type NumberBalanceMatchState,
  type NumberBalanceMatchStateResponse,
  type NumberBalanceMatchStateSnapshotResponse,
  type NumberBalancePlayerScore,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';
import { badRequestError } from '@/features/kangur/shared/errors/app-error';
import type { MongoNumberBalanceMatchDocument } from './database';

export const toMatchState = (match: MongoNumberBalanceMatchDocument): NumberBalanceMatchState => ({
  matchId: match._id,
  status: match.status,
  seed: match.seed,
  startTimeMs: match.startTimeMs,
  roundDurationMs: match.roundDurationMs,
  tier: match.tier,
  balancedProbability: match.balancedProbability,
});

export const buildScores = (
  players: NumberBalanceMatchPlayerState[]
): NumberBalancePlayerScore[] =>
  players.map((entry) => ({
    playerId: entry.playerId,
    score: entry.score,
  }));

export const buildPlayerState = (
  playerId: string,
  puzzleStartedAtMs: number
): NumberBalanceMatchPlayerState => ({
  playerId,
  score: 0,
  puzzleIndex: 0,
  puzzleStartedAtMs,
});

export const buildMatchStateResponse = (
  match: MongoNumberBalanceMatchDocument,
  player: NumberBalanceMatchPlayerState,
  nowMs: number
): NumberBalanceMatchStateResponse => ({
  match: toMatchState(match),
  player,
  serverTimeMs: nowMs,
});

export const buildMatchStateSnapshotResponse = (
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

export const resolvePlayer = (
  match: MongoNumberBalanceMatchDocument,
  learnerId: string
): NumberBalanceMatchPlayerState => {
  const player = match.players.find((entry) => entry.playerId === learnerId);
  if (!player) {
    throw badRequestError('Learner is not part of this match.');
  }
  return player;
};
