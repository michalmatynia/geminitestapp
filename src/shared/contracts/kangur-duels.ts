import { z } from 'zod';

const nonEmptyTrimmedString = z.string().trim().min(1);
const kangurDuelChoiceSchema = z.union([z.number(), z.string()]);
export type KangurDuelChoice = z.infer<typeof kangurDuelChoiceSchema>;

export const KANGUR_DUELS_SETTINGS_KEY = 'kangur_duels_v1';

export const kangurDuelModeSchema = z.enum(['challenge', 'quick_match']);
export type KangurDuelMode = z.infer<typeof kangurDuelModeSchema>;

export const kangurDuelVisibilitySchema = z.enum(['public', 'private']);
export type KangurDuelVisibility = z.infer<typeof kangurDuelVisibilitySchema>;

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
  joinedAt: z.string().datetime({ offset: true }),
  lastAnswerAt: z.string().datetime({ offset: true }).nullable().optional(),
  lastAnswerQuestionId: nonEmptyTrimmedString.max(120).optional(),
  lastAnswerCorrect: z.boolean().optional(),
  isConnected: z.boolean().optional(),
});
export type KangurDuelPlayer = z.infer<typeof kangurDuelPlayerSchema>;

export const kangurDuelQuestionSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  prompt: z.string().trim().min(1).max(400),
  choices: z.array(kangurDuelChoiceSchema).min(2).max(6),
});
export type KangurDuelQuestion = z.infer<typeof kangurDuelQuestionSchema>;

export const kangurDuelSessionSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  mode: kangurDuelModeSchema,
  visibility: kangurDuelVisibilitySchema,
  status: kangurDuelStatusSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  startedAt: z.string().datetime({ offset: true }).nullable().optional(),
  endedAt: z.string().datetime({ offset: true }).nullable().optional(),
  invitedLearnerId: nonEmptyTrimmedString.max(120).nullable().optional(),
  invitedLearnerName: z.string().trim().max(120).nullable().optional(),
  questionCount: z.number().int().min(1).max(50),
  timePerQuestionSec: z.number().int().min(5).max(120),
  currentQuestionIndex: z.number().int().min(0),
  questions: z.array(kangurDuelQuestionSchema),
  players: z.array(kangurDuelPlayerSchema).min(1).max(2),
});
export type KangurDuelSession = z.infer<typeof kangurDuelSessionSchema>;

export const kangurDuelCreateInputSchema = z.object({
  mode: kangurDuelModeSchema,
  visibility: kangurDuelVisibilitySchema.optional(),
  opponentLearnerId: nonEmptyTrimmedString.max(120).optional(),
  opponentLoginName: nonEmptyTrimmedString.max(120).optional(),
  questionCount: z.number().int().min(3).max(20).optional(),
  timePerQuestionSec: z.number().int().min(5).max(60).optional(),
  matchmakingKey: z.string().trim().max(120).optional(),
});
export type KangurDuelCreateInput = z.infer<typeof kangurDuelCreateInputSchema>;

export const kangurDuelJoinInputSchema = z.object({
  sessionId: nonEmptyTrimmedString.max(120).optional(),
  mode: kangurDuelModeSchema.optional(),
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

export const kangurDuelLobbyEntrySchema = z.object({
  sessionId: nonEmptyTrimmedString.max(120),
  mode: kangurDuelModeSchema,
  visibility: kangurDuelVisibilitySchema,
  status: kangurDuelStatusSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  questionCount: z.number().int().min(1).max(50),
  timePerQuestionSec: z.number().int().min(5).max(120),
  host: kangurDuelPlayerSchema,
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
