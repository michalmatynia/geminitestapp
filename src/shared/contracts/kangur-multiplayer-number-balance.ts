import { z } from 'zod';

export const numberBalanceTierSchema = z.enum(['tier1', 'tier2', 'tier3']);
export type NumberBalanceTier = z.infer<typeof numberBalanceTierSchema>;

export const numberBalanceSideSchema = z.enum(['left', 'right', 'tray']);
export type NumberBalanceSide = z.infer<typeof numberBalanceSideSchema>;

export const numberBalancePlacementSchema = z.record(z.string(), numberBalanceSideSchema);
export type NumberBalancePlacement = z.infer<typeof numberBalancePlacementSchema>;

export const numberBalancePlayerScoreSchema = z.object({
  playerId: z.string().min(1),
  score: z.number().int().nonnegative(),
});
export type NumberBalancePlayerScore = z.infer<typeof numberBalancePlayerScoreSchema>;

export const numberBalanceMatchStatusSchema = z.enum(['waiting', 'in_progress', 'completed']);
export type NumberBalanceMatchStatus = z.infer<typeof numberBalanceMatchStatusSchema>;

export const numberBalanceMatchCreateInputSchema = z.object({
  roundDurationMs: z.number().int().min(5_000).max(60_000).optional(),
  tier: numberBalanceTierSchema.optional(),
  balancedProbability: z.number().min(0).max(1).optional(),
});
export type NumberBalanceMatchCreateInput = z.infer<typeof numberBalanceMatchCreateInputSchema>;

export const numberBalanceMatchJoinInputSchema = z.object({
  matchId: z.string().min(1),
});
export type NumberBalanceMatchJoinInput = z.infer<typeof numberBalanceMatchJoinInputSchema>;

export const numberBalanceMatchStateInputSchema = z.object({
  matchId: z.string().min(1),
});
export type NumberBalanceMatchStateInput = z.infer<typeof numberBalanceMatchStateInputSchema>;

export const numberBalanceMatchPlayerStateSchema = z.object({
  playerId: z.string().min(1),
  score: z.number().int().nonnegative(),
  puzzleIndex: z.number().int().nonnegative(),
  puzzleStartedAtMs: z.number().int(),
});
export type NumberBalanceMatchPlayerState = z.infer<typeof numberBalanceMatchPlayerStateSchema>;

export const numberBalanceMatchStateSchema = z.object({
  matchId: z.string().min(1),
  status: numberBalanceMatchStatusSchema,
  seed: z.number().int(),
  startTimeMs: z.number().int(),
  roundDurationMs: z.number().int().positive(),
  tier: numberBalanceTierSchema,
  balancedProbability: z.number().min(0).max(1).optional(),
});
export type NumberBalanceMatchState = z.infer<typeof numberBalanceMatchStateSchema>;

export const numberBalanceMatchStateResponseSchema = z.object({
  match: numberBalanceMatchStateSchema,
  player: numberBalanceMatchPlayerStateSchema,
  serverTimeMs: z.number().int(),
});
export type NumberBalanceMatchStateResponse = z.infer<
  typeof numberBalanceMatchStateResponseSchema
>;

export const numberBalanceMatchStateSnapshotResponseSchema = z.object({
  match: numberBalanceMatchStateSchema,
  player: numberBalanceMatchPlayerStateSchema,
  scores: z.array(numberBalancePlayerScoreSchema).min(1),
  playerCount: z.number().int().min(1),
  serverTimeMs: z.number().int(),
});
export type NumberBalanceMatchStateSnapshotResponse = z.infer<
  typeof numberBalanceMatchStateSnapshotResponseSchema
>;

export const numberBalanceMatchStartSchema = z.object({
  type: z.literal('match_start'),
  matchId: z.string().min(1),
  seed: z.number().int(),
  startTimeMs: z.number().int(),
  roundDurationMs: z.number().int().positive(),
  tier: numberBalanceTierSchema,
  balancedProbability: z.number().min(0).max(1).optional(),
  puzzleIndex: z.number().int().nonnegative().default(0),
});
export type NumberBalanceMatchStart = z.infer<typeof numberBalanceMatchStartSchema>;

export const numberBalanceSolveAttemptSchema = z.object({
  type: z.literal('solve_attempt'),
  matchId: z.string().min(1),
  puzzleId: z.string().min(1),
  placement: numberBalancePlacementSchema,
  clientTimeMs: z.number().int(),
});
export type NumberBalanceSolveAttempt = z.infer<typeof numberBalanceSolveAttemptSchema>;

export const numberBalanceSolveResultSchema = z.object({
  type: z.literal('solve_result'),
  matchId: z.string().min(1),
  puzzleId: z.string().min(1),
  accepted: z.boolean(),
  pointsAwarded: z.number().int(),
  solveTimeMs: z.number().int().nonnegative().optional(),
  nextPuzzleId: z.string().min(1).optional(),
  nextPuzzleIndex: z.number().int().nonnegative().optional(),
});
export type NumberBalanceSolveResult = z.infer<typeof numberBalanceSolveResultSchema>;

export const numberBalanceScoreUpdateSchema = z.object({
  type: z.literal('score_update'),
  matchId: z.string().min(1),
  scores: z.array(numberBalancePlayerScoreSchema).min(1),
  serverTimeMs: z.number().int(),
});
export type NumberBalanceScoreUpdate = z.infer<typeof numberBalanceScoreUpdateSchema>;

export const numberBalanceMatchEndSchema = z.object({
  type: z.literal('match_end'),
  matchId: z.string().min(1),
  winnerPlayerId: z.string().min(1).nullable(),
  scores: z.array(numberBalancePlayerScoreSchema).min(1),
  serverTimeMs: z.number().int(),
  durationMs: z.number().int().positive(),
});
export type NumberBalanceMatchEnd = z.infer<typeof numberBalanceMatchEndSchema>;

export const numberBalanceClientEventSchema = z.union([numberBalanceSolveAttemptSchema]);
export type NumberBalanceClientEvent = z.infer<typeof numberBalanceClientEventSchema>;

export const numberBalanceServerEventSchema = z.union([
  numberBalanceMatchStartSchema,
  numberBalanceSolveResultSchema,
  numberBalanceScoreUpdateSchema,
  numberBalanceMatchEndSchema,
]);
export type NumberBalanceServerEvent = z.infer<typeof numberBalanceServerEventSchema>;

export const numberBalanceEventSchema = z.union([
  numberBalanceClientEventSchema,
  numberBalanceServerEventSchema,
]);
export type NumberBalanceEvent = z.infer<typeof numberBalanceEventSchema>;

export const numberBalanceSolveResponseSchema = z.object({
  events: z.array(numberBalanceServerEventSchema),
  player: numberBalanceMatchPlayerStateSchema,
  serverTimeMs: z.number().int(),
});
export type NumberBalanceSolveResponse = z.infer<typeof numberBalanceSolveResponseSchema>;

export const parseNumberBalanceClientEvent = (
  value: unknown
): NumberBalanceClientEvent | null => {
  const parsed = numberBalanceClientEventSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const parseNumberBalanceServerEvent = (
  value: unknown
): NumberBalanceServerEvent | null => {
  const parsed = numberBalanceServerEventSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const parseNumberBalanceEvent = (value: unknown): NumberBalanceEvent | null => {
  const parsed = numberBalanceEventSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};
