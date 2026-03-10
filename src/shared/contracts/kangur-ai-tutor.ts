import { z } from 'zod';

import { agentTeachingChatSourceSchema } from './agent-teaching';
import { agentPersonaMoodIdSchema } from './agents';
import { contextRegistryConsumerEnvelopeSchema } from './ai-context-registry';
import { kangurRouteActionQuerySchema, kangurRoutePageSchema } from './kangur';
import { kangurAiTutorLearnerMoodSchema } from './kangur-ai-tutor-mood';

const nonEmptyTrimmedString = z.string().trim().min(1);

export const KANGUR_AI_TUTOR_APP_SETTINGS_KEY = 'kangur_ai_tutor_app_settings_v1';

export const kangurAiTutorChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: nonEmptyTrimmedString.max(8_000),
});
export type KangurAiTutorChatMessage = z.infer<typeof kangurAiTutorChatMessageSchema>;

export const kangurAiTutorPromptModeSchema = z.enum([
  'chat',
  'hint',
  'explain',
  'selected_text',
]);
export type KangurAiTutorPromptMode = z.infer<typeof kangurAiTutorPromptModeSchema>;

export const kangurAiTutorFocusKindSchema = z.enum([
  'selection',
  'lesson_header',
  'assignment',
  'document',
  'home_actions',
  'home_quest',
  'priority_assignments',
  'leaderboard',
  'progress',
  'question',
  'review',
  'summary',
]);
export type KangurAiTutorFocusKind = z.infer<typeof kangurAiTutorFocusKindSchema>;

export const kangurAiTutorInteractionIntentSchema = z.enum([
  'hint',
  'explain',
  'review',
  'next_step',
]);
export type KangurAiTutorInteractionIntent = z.infer<
  typeof kangurAiTutorInteractionIntentSchema
>;

export const kangurAiTutorSurfaceSchema = z.enum(['lesson', 'test', 'game']);
export type KangurAiTutorSurface = z.infer<typeof kangurAiTutorSurfaceSchema>;

export const kangurAiTutorCoachingModeSchema = z.enum([
  'hint_ladder',
  'misconception_check',
  'review_reflection',
  'next_best_action',
]);
export type KangurAiTutorCoachingMode = z.infer<typeof kangurAiTutorCoachingModeSchema>;

export const kangurAiTutorRecoverySignalSchema = z.enum([
  'answer_revealed',
  'focus_advanced',
]);
export type KangurAiTutorRecoverySignal = z.infer<
  typeof kangurAiTutorRecoverySignalSchema
>;

export const kangurAiTutorMotionPresetKindSchema = z.enum([
  'default',
  'desktop',
  'tablet',
  'mobile',
]);
export type KangurAiTutorMotionPresetKind = z.infer<
  typeof kangurAiTutorMotionPresetKindSchema
>;

export const kangurAiTutorConversationContextSchema = z.object({
  surface: kangurAiTutorSurfaceSchema,
  contentId: z.string().trim().max(120).optional(),
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(600).optional(),
  masterySummary: z.string().trim().max(240).optional(),
  assignmentSummary: z.string().trim().max(500).optional(),
  questionId: z.string().trim().max(120).optional(),
  selectedText: z.string().trim().max(1_000).optional(),
  currentQuestion: z.string().trim().max(2_000).optional(),
  questionProgressLabel: z.string().trim().max(60).optional(),
  answerRevealed: z.boolean().optional(),
  promptMode: kangurAiTutorPromptModeSchema.optional(),
  focusKind: kangurAiTutorFocusKindSchema.optional(),
  focusId: z.string().trim().max(120).optional(),
  focusLabel: z.string().trim().max(240).optional(),
  assignmentId: z.string().trim().max(120).optional(),
  interactionIntent: kangurAiTutorInteractionIntentSchema.optional(),
  repeatedQuestionCount: z.number().int().nonnegative().max(20).optional(),
  recentHintRecoverySignal: kangurAiTutorRecoverySignalSchema.optional(),
  previousCoachingMode: kangurAiTutorCoachingModeSchema.optional(),
});
export type KangurAiTutorConversationContext = z.infer<
  typeof kangurAiTutorConversationContextSchema
>;

export const kangurAiTutorLearnerMemorySchema = z.object({
  lastSurface: kangurAiTutorSurfaceSchema.optional(),
  lastFocusLabel: z.string().trim().max(160).optional(),
  lastUnresolvedBlocker: z.string().trim().max(200).optional(),
  lastRecommendedAction: z.string().trim().max(160).optional(),
  lastSuccessfulIntervention: z.string().trim().max(200).optional(),
  lastCoachingMode: kangurAiTutorCoachingModeSchema.optional(),
});
export type KangurAiTutorLearnerMemory = z.infer<typeof kangurAiTutorLearnerMemorySchema>;

export const kangurAiTutorChatRequestSchema = z.object({
  messages: z.array(kangurAiTutorChatMessageSchema).min(1),
  context: kangurAiTutorConversationContextSchema.optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
  memory: kangurAiTutorLearnerMemorySchema.optional(),
});
export type KangurAiTutorChatRequest = z.infer<typeof kangurAiTutorChatRequestSchema>;

export const kangurAiTutorUsageSummarySchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  messageCount: z.number().int().nonnegative(),
  dailyMessageLimit: z.number().int().positive().nullable(),
  remainingMessages: z.number().int().nonnegative().nullable(),
});
export type KangurAiTutorUsageSummary = z.infer<typeof kangurAiTutorUsageSummarySchema>;

export const kangurAiTutorFollowUpActionSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  label: nonEmptyTrimmedString.max(80),
  page: kangurRoutePageSchema,
  query: kangurRouteActionQuerySchema.optional(),
  reason: z.string().trim().max(240).optional(),
});
export type KangurAiTutorFollowUpAction = z.infer<typeof kangurAiTutorFollowUpActionSchema>;

export const kangurAiTutorCoachingFrameSchema = z.object({
  mode: kangurAiTutorCoachingModeSchema,
  label: nonEmptyTrimmedString.max(80),
  description: nonEmptyTrimmedString.max(240),
  rationale: z.string().trim().max(240).optional(),
});
export type KangurAiTutorCoachingFrame = z.infer<typeof kangurAiTutorCoachingFrameSchema>;

export const kangurAiTutorChatResponseSchema = z.object({
  message: z.string(),
  sources: z.array(agentTeachingChatSourceSchema).default([]),
  followUpActions: z.array(kangurAiTutorFollowUpActionSchema).default([]),
  coachingFrame: kangurAiTutorCoachingFrameSchema.optional(),
  suggestedMoodId: agentPersonaMoodIdSchema.nullable().optional(),
  tutorMood: kangurAiTutorLearnerMoodSchema.optional(),
  usage: kangurAiTutorUsageSummarySchema.optional(),
});
export type KangurAiTutorChatResponse = z.infer<typeof kangurAiTutorChatResponseSchema>;

export const kangurAiTutorUsageResponseSchema = z.object({
  usage: kangurAiTutorUsageSummarySchema,
});
export type KangurAiTutorUsageResponse = z.infer<typeof kangurAiTutorUsageResponseSchema>;
