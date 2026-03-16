import { z } from 'zod';

const nonEmptyTrimmedString = z.string().trim().min(1);
const kangurDuelChoiceSchema = z.union([z.number(), z.string()]);
export type KangurDuelChoice = z.infer<typeof kangurDuelChoiceSchema>;

export const KANGUR_DUELS_SETTINGS_KEY = 'kangur_duels_v1';
export const KANGUR_DUELS_LOBBY_PRESENCE_DEFAULT_LIMIT = 24;
export const KANGUR_DUELS_LOBBY_PRESENCE_MAX_LIMIT = 120;

export const kangurDuelModeSchema = z.enum(['challenge', 'quick_match']);
export type KangurDuelMode = z.infer<typeof kangurDuelModeSchema>;

export const kangurDuelVisibilitySchema = z.enum(['public', 'private']);
export type KangurDuelVisibility = z.infer<typeof kangurDuelVisibilitySchema>;

export const kangurDuelOperationSchema = z.enum([
  'addition',
  'subtraction',
  'multiplication',
  'division',
]);
export type KangurDuelOperation = z.infer<typeof kangurDuelOperationSchema>;

export const kangurDuelDifficultySchema = z.enum(['easy', 'medium', 'hard']);
export type KangurDuelDifficulty = z.infer<typeof kangurDuelDifficultySchema>;

export const kangurDuelReactionTypeSchema = z.enum([
  'cheer',
  'wow',
  'gg',
  'fire',
  'clap',
  'rocket',
  'thumbs_up',
]);
export type KangurDuelReactionType = z.infer<typeof kangurDuelReactionTypeSchema>;

export const kangurDuelStatusSchema = z.enum([
  'created',
  'waiting',
  'ready',
  'in_progress',
  'completed',
  'aborted',
]);
export type KangurDuelStatus = z.infer<typeof kangurDuelStatusSchema>;

export const kangurDuelPlayerStatusSchema = z.enum([
  'invited',
  'ready',
  'playing',
  'completed',
  'left',
]);
export type KangurDuelPlayerStatus = z.infer<typeof kangurDuelPlayerStatusSchema>;

export const kangurDuelPlayerSchema = z.object({
  learnerId: nonEmptyTrimmedString.max(120),
  displayName: nonEmptyTrimmedString.max(120),
  status: kangurDuelPlayerStatusSchema,
  score: z.number().int().min(0),
  bonusPoints: z.number().int().min(0).optional(),
  currentQuestionIndex: z.number().int().min(0).optional(),
  joinedAt: z.string().datetime({ offset: true }),
  lastAnswerAt: z.string().datetime({ offset: true }).nullable().optional(),
  lastAnswerQuestionId: nonEmptyTrimmedString.max(120).optional(),
  lastAnswerCorrect: z.boolean().optional(),
  completedAt: z.string().datetime({ offset: true }).nullable().optional(),
  isConnected: z.boolean().optional(),
});
export type KangurDuelPlayer = z.infer<typeof kangurDuelPlayerSchema>;

export const kangurDuelQuestionSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  prompt: z.string().trim().min(1).max(400),
  choices: z.array(kangurDuelChoiceSchema).min(2).max(6),
});
export type KangurDuelQuestion = z.infer<typeof kangurDuelQuestionSchema>;

export const kangurDuelReactionSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  learnerId: nonEmptyTrimmedString.max(120),
  displayName: nonEmptyTrimmedString.max(120),
  type: kangurDuelReactionTypeSchema,
  createdAt: z.string().datetime({ offset: true }),
});
export type KangurDuelReaction = z.infer<typeof kangurDuelReactionSchema>;

export const kangurDuelSeriesSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  bestOf: z.number().int().min(1).max(9),
  gameIndex: z.number().int().min(1),
  completedGames: z.number().int().min(0),
  winsByPlayer: z.record(z.string(), z.number().int().min(0)),
  leaderLearnerId: nonEmptyTrimmedString.max(120).nullable().optional(),
  isComplete: z.boolean(),
});
export type KangurDuelSeries = z.infer<typeof kangurDuelSeriesSchema>;

export const kangurDuelSessionSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  mode: kangurDuelModeSchema,
  visibility: kangurDuelVisibilitySchema,
  operation: kangurDuelOperationSchema,
  difficulty: kangurDuelDifficultySchema,
  status: kangurDuelStatusSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  startedAt: z.string().datetime({ offset: true }).nullable().optional(),
  endedAt: z.string().datetime({ offset: true }).nullable().optional(),
  invitedLearnerId: nonEmptyTrimmedString.max(120).nullable().optional(),
  invitedLearnerName: z.string().trim().max(120).nullable().optional(),
  questionCount: z.number().int().min(1).max(50),
  timePerQuestionSec: z.number().int().min(5).max(120),
  maxPlayers: z.number().int().min(2).max(4).optional(),
  minPlayersToStart: z.number().int().min(2).max(4).optional(),
  currentQuestionIndex: z.number().int().min(0),
  questions: z.array(kangurDuelQuestionSchema),
  players: z.array(kangurDuelPlayerSchema).min(1).max(4),
  series: kangurDuelSeriesSchema.nullable().optional(),
  spectatorCount: z.number().int().min(0).optional(),
  recentReactions: z.array(kangurDuelReactionSchema).max(25).optional(),
});
export type KangurDuelSession = z.infer<typeof kangurDuelSessionSchema>;

export const kangurDuelCreateInputSchema = z.object({
  mode: kangurDuelModeSchema,
  visibility: kangurDuelVisibilitySchema.optional(),
  operation: kangurDuelOperationSchema.optional(),
  difficulty: kangurDuelDifficultySchema.optional(),
  opponentLearnerId: nonEmptyTrimmedString.max(120).optional(),
  opponentLoginName: nonEmptyTrimmedString.max(120).optional(),
  questionCount: z.number().int().min(3).max(20).optional(),
  timePerQuestionSec: z.number().int().min(5).max(60).optional(),
  maxPlayers: z.number().int().min(2).max(4).optional(),
  minPlayersToStart: z.number().int().min(2).max(4).optional(),
  matchmakingKey: z.string().trim().max(120).optional(),
  seriesId: nonEmptyTrimmedString.max(120).optional(),
  seriesBestOf: z.number().int().min(1).max(9).optional(),
});
export type KangurDuelCreateInput = z.infer<typeof kangurDuelCreateInputSchema>;

export const kangurDuelJoinInputSchema = z.object({
  sessionId: nonEmptyTrimmedString.max(120).optional(),
  mode: kangurDuelModeSchema.optional(),
  operation: kangurDuelOperationSchema.optional(),
  difficulty: kangurDuelDifficultySchema.optional(),
  maxPlayers: z.number().int().min(2).max(4).optional(),
  minPlayersToStart: z.number().int().min(2).max(4).optional(),
  matchmakingKey: z.string().trim().max(120).optional(),
});
export type KangurDuelJoinInput = z.infer<typeof kangurDuelJoinInputSchema>;

export const kangurDuelHeartbeatInputSchema = z.object({
  sessionId: nonEmptyTrimmedString.max(120),
  clientTimestamp: z.string().datetime({ offset: true }).optional(),
});
export type KangurDuelHeartbeatInput = z.infer<typeof kangurDuelHeartbeatInputSchema>;

export const kangurDuelAnswerInputSchema = z.object({
  sessionId: nonEmptyTrimmedString.max(120),
  questionId: nonEmptyTrimmedString.max(120),
  choice: kangurDuelChoiceSchema,
  clientTimestamp: z.string().datetime({ offset: true }).optional(),
  latencyMs: z.number().int().min(0).max(60_000).optional(),
});
export type KangurDuelAnswerInput = z.infer<typeof kangurDuelAnswerInputSchema>;

export const kangurDuelLeaveInputSchema = z.object({
  sessionId: nonEmptyTrimmedString.max(120),
  reason: z.string().trim().max(240).optional(),
});
export type KangurDuelLeaveInput = z.infer<typeof kangurDuelLeaveInputSchema>;

export const kangurDuelStateResponseSchema = z.object({
  session: kangurDuelSessionSchema,
  player: kangurDuelPlayerSchema,
  serverTime: z.string().datetime({ offset: true }),
});
export type KangurDuelStateResponse = z.infer<typeof kangurDuelStateResponseSchema>;

export const kangurDuelSpectatorStateResponseSchema = z.object({
  session: kangurDuelSessionSchema,
  serverTime: z.string().datetime({ offset: true }),
});
export type KangurDuelSpectatorStateResponse = z.infer<
  typeof kangurDuelSpectatorStateResponseSchema
>;

export const kangurDuelLobbyPresenceEntrySchema = z.object({
  learnerId: nonEmptyTrimmedString.max(120),
  displayName: nonEmptyTrimmedString.max(120),
  lastSeenAt: z.string().datetime({ offset: true }),
});
export type KangurDuelLobbyPresenceEntry = z.infer<
  typeof kangurDuelLobbyPresenceEntrySchema
>;

export const kangurDuelLobbyPresenceResponseSchema = z.object({
  entries: z.array(kangurDuelLobbyPresenceEntrySchema),
  serverTime: z.string().datetime({ offset: true }),
});
export type KangurDuelLobbyPresenceResponse = z.infer<
  typeof kangurDuelLobbyPresenceResponseSchema
>;

export const kangurDuelLobbyEntrySchema = z.object({
  sessionId: nonEmptyTrimmedString.max(120),
  mode: kangurDuelModeSchema,
  visibility: kangurDuelVisibilitySchema,
  operation: kangurDuelOperationSchema,
  difficulty: kangurDuelDifficultySchema,
  status: kangurDuelStatusSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  questionCount: z.number().int().min(1).max(50),
  timePerQuestionSec: z.number().int().min(5).max(120),
  host: kangurDuelPlayerSchema,
  series: kangurDuelSeriesSchema.nullable().optional(),
});
export type KangurDuelLobbyEntry = z.infer<typeof kangurDuelLobbyEntrySchema>;

export const kangurDuelLobbyResponseSchema = z.object({
  entries: z.array(kangurDuelLobbyEntrySchema),
  serverTime: z.string().datetime({ offset: true }),
});
export type KangurDuelLobbyResponse = z.infer<typeof kangurDuelLobbyResponseSchema>;

export const kangurDuelOpponentEntrySchema = z.object({
  learnerId: nonEmptyTrimmedString.max(120),
  displayName: nonEmptyTrimmedString.max(120),
  lastPlayedAt: z.string().datetime({ offset: true }),
});
export type KangurDuelOpponentEntry = z.infer<typeof kangurDuelOpponentEntrySchema>;

export const kangurDuelOpponentsResponseSchema = z.object({
  entries: z.array(kangurDuelOpponentEntrySchema),
  serverTime: z.string().datetime({ offset: true }),
});
export type KangurDuelOpponentsResponse = z.infer<typeof kangurDuelOpponentsResponseSchema>;

export const kangurDuelSearchEntrySchema = z.object({
  learnerId: nonEmptyTrimmedString.max(120),
  displayName: nonEmptyTrimmedString.max(120),
  loginName: nonEmptyTrimmedString.max(80),
});
export type KangurDuelSearchEntry = z.infer<typeof kangurDuelSearchEntrySchema>;

export const kangurDuelSearchResponseSchema = z.object({
  entries: z.array(kangurDuelSearchEntrySchema),
  serverTime: z.string().datetime({ offset: true }),
});
export type KangurDuelSearchResponse = z.infer<typeof kangurDuelSearchResponseSchema>;

export const kangurDuelReactionInputSchema = z.object({
  sessionId: nonEmptyTrimmedString.max(120),
  type: kangurDuelReactionTypeSchema,
});
export type KangurDuelReactionInput = z.infer<typeof kangurDuelReactionInputSchema>;

export const kangurDuelReactionResponseSchema = z.object({
  reaction: kangurDuelReactionSchema,
  serverTime: z.string().datetime({ offset: true }),
});
export type KangurDuelReactionResponse = z.infer<typeof kangurDuelReactionResponseSchema>;

export const kangurDuelLeaderboardEntrySchema = z.object({
  learnerId: nonEmptyTrimmedString.max(120),
  displayName: nonEmptyTrimmedString.max(120),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  ties: z.number().int().min(0),
  matches: z.number().int().min(0),
  winRate: z.number().min(0).max(1),
  lastPlayedAt: z.string().datetime({ offset: true }),
});
export type KangurDuelLeaderboardEntry = z.infer<typeof kangurDuelLeaderboardEntrySchema>;

export const kangurDuelLeaderboardResponseSchema = z.object({
  entries: z.array(kangurDuelLeaderboardEntrySchema),
  serverTime: z.string().datetime({ offset: true }),
});
export type KangurDuelLeaderboardResponse = z.infer<
  typeof kangurDuelLeaderboardResponseSchema
>;
