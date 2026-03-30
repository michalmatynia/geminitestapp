import { describe, expect, it } from 'vitest';

import {
  numberBalanceEventSchema,
  numberBalanceMatchCreateInputSchema,
  numberBalanceMatchStateSnapshotResponseSchema,
  parseNumberBalanceClientEvent,
  parseNumberBalanceEvent,
  parseNumberBalanceServerEvent,
} from '@/shared/contracts/kangur-multiplayer-number-balance';

describe('kangur multiplayer number balance contracts', () => {
  it('parses match creation inputs within the supported bounds', () => {
    expect(
      numberBalanceMatchCreateInputSchema.parse({
        roundDurationMs: 15_000,
        tier: 'tier2',
        balancedProbability: 0.6,
      })
    ).toEqual({
      roundDurationMs: 15_000,
      tier: 'tier2',
      balancedProbability: 0.6,
    });
  });

  it('parses match state snapshots with player scores', () => {
    expect(
      numberBalanceMatchStateSnapshotResponseSchema.parse({
        match: {
          matchId: 'match-1',
          status: 'in_progress',
          seed: 42,
          startTimeMs: 1_700_000_000_000,
          roundDurationMs: 20_000,
          tier: 'tier1',
          balancedProbability: 0.5,
        },
        player: {
          playerId: 'player-1',
          score: 12,
          puzzleIndex: 3,
          puzzleStartedAtMs: 1_700_000_000_500,
        },
        scores: [
          { playerId: 'player-1', score: 12 },
          { playerId: 'player-2', score: 9 },
        ],
        playerCount: 2,
        serverTimeMs: 1_700_000_001_000,
      })
    ).toEqual(
      expect.objectContaining({
        playerCount: 2,
        scores: [
          { playerId: 'player-1', score: 12 },
          { playerId: 'player-2', score: 9 },
        ],
      })
    );
  });

  it('parses client, server, and generic number-balance events', () => {
    const clientEvent = {
      type: 'solve_attempt',
      matchId: 'match-1',
      puzzleId: 'puzzle-1',
      placement: {
        weightA: 'left',
        weightB: 'right',
      },
      clientTimeMs: 1_700_000_001_500,
    } as const;
    const serverEvent = {
      type: 'match_end',
      matchId: 'match-1',
      winnerPlayerId: 'player-1',
      scores: [{ playerId: 'player-1', score: 18 }],
      serverTimeMs: 1_700_000_002_000,
      durationMs: 18_000,
    } as const;

    expect(parseNumberBalanceClientEvent(clientEvent)).toEqual(clientEvent);
    expect(parseNumberBalanceServerEvent(serverEvent)).toEqual(serverEvent);
    expect(parseNumberBalanceEvent(clientEvent)).toEqual(clientEvent);
    expect(parseNumberBalanceEvent(serverEvent)).toEqual(serverEvent);
    expect(
      numberBalanceEventSchema.parse({
        type: 'score_update',
        matchId: 'match-1',
        scores: [{ playerId: 'player-1', score: 15 }],
        serverTimeMs: 1_700_000_001_750,
      })
    ).toEqual({
      type: 'score_update',
      matchId: 'match-1',
      scores: [{ playerId: 'player-1', score: 15 }],
      serverTimeMs: 1_700_000_001_750,
    });
  });

  it('returns null for invalid event payloads', () => {
    expect(
      parseNumberBalanceClientEvent({
        type: 'solve_attempt',
        matchId: '',
      })
    ).toBeNull();
    expect(
      parseNumberBalanceServerEvent({
        type: 'unknown',
        matchId: 'match-1',
      })
    ).toBeNull();
    expect(parseNumberBalanceEvent({ type: 'unknown' })).toBeNull();
  });
});
