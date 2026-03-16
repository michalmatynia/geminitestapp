import { z } from 'zod';

import { agentTeachingChatSourceSchema } from './agent-teaching';
import { agentPersonaMoodIdSchema } from './agents';
import { contextRegistryConsumerEnvelopeSchema } from './ai-context-registry';
import { kangurRouteActionQuerySchema, kangurRoutePageSchema } from './kangur';
import { kangurAiTutorLearnerMoodSchema } from './kangur-ai-tutor-mood';
import { KANGUR_KNOWLEDGE_CANONICAL_SOURCE_COLLECTIONS } from './kangur-knowledge-graph';

const nonEmptyTrimmedString = z.string().trim().min(1);
const kangurAiTutorDrawingImageDataSchema = z.string().max(500_000);
const kangurAiTutorDrawingSvgSchema = z.string().max(100_000);

export const KANGUR_AI_TUTOR_APP_SETTINGS_KEY = 'kangur_ai_tutor_app_settings_v1';

export const kangurAiTutorMessageArtifactSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('user_drawing'),
    imageDataUrl: kangurAiTutorDrawingImageDataSchema,
    alt: z.string().trim().max(160).optional(),
    caption: z.string().trim().max(240).optional(),
  }),
  z.object({
    type: z.literal('assistant_drawing'),
    svgContent: kangurAiTutorDrawingSvgSchema,
    alt: z.string().trim().max(160).optional(),
    title: z.string().trim().max(120).optional(),
    caption: z.string().trim().max(240).optional(),
  }),
]);
export type KangurAiTutorMessageArtifact = z.infer<typeof kangurAiTutorMessageArtifactSchema>;

export const kangurAiTutorChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: nonEmptyTrimmedString.max(8_000),
  artifacts: z.array(kangurAiTutorMessageArtifactSchema).max(4).optional(),
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
  'hero',
  'screen',
  'library',
  'empty_state',
  'navigation',
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
  'login_action',
  'create_account_action',
  'login_identifier_field',
  'login_form',
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

export const kangurAiTutorSurfaceSchema = z.enum([
  'lesson',
  'test',
  'game',
  'profile',
  'parent_dashboard',
  'auth',
]);
export type KangurAiTutorSurface = z.infer<typeof kangurAiTutorSurfaceSchema>;

export const kangurAiTutorKnowledgeSourceCollectionSchema = z.enum(
  KANGUR_KNOWLEDGE_CANONICAL_SOURCE_COLLECTIONS
);
export type KangurAiTutorKnowledgeSourceCollection = z.infer<
  typeof kangurAiTutorKnowledgeSourceCollectionSchema
>;

export const kangurAiTutorKnowledgeReferenceSchema = z.object({
  sourceCollection: kangurAiTutorKnowledgeSourceCollectionSchema,
  sourceRecordId: z.string().trim().max(160),
  sourcePath: z.string().trim().max(240),
});
export type KangurAiTutorKnowledgeReference = z.infer<
  typeof kangurAiTutorKnowledgeReferenceSchema
>;

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
  selectedChoiceLabel: z.string().trim().max(16).optional(),
  selectedChoiceText: z.string().trim().max(240).optional(),
  selectedText: z.string().trim().max(1_000).optional(),
  drawingImageData: kangurAiTutorDrawingImageDataSchema.optional(),
  currentQuestion: z.string().trim().max(2_000).optional(),
  questionProgressLabel: z.string().trim().max(60).optional(),
  answerRevealed: z.boolean().optional(),
  promptMode: kangurAiTutorPromptModeSchema.optional(),
  focusKind: kangurAiTutorFocusKindSchema.optional(),
  focusId: z.string().trim().max(120).optional(),
  focusLabel: z.string().trim().max(240).optional(),
  assignmentId: z.string().trim().max(120).optional(),
  knowledgeReference: kangurAiTutorKnowledgeReferenceSchema.optional(),
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
  // Last 3 assistant hints/responses (compact). Used to prevent verbatim repetition.
  lastGivenHints: z.array(z.string().trim().max(160)).max(3).optional(),
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

export type KangurAiTutorTelemetryContextDto = {
  surface: KangurAiTutorSurface | null;
  contentId: string | null;
  title: string | null;
};
export type KangurAiTutorTelemetryContext = KangurAiTutorTelemetryContextDto;

export type KangurAiTutorSessionContextTelemetryDto = {
  surface?: KangurAiTutorSurface | null;
  contentId?: string | null;
  title?: string | null;
};
export type KangurAiTutorSessionContextTelemetry =
  KangurAiTutorSessionContextTelemetryDto;

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

export const kangurAiTutorWebsiteHelpTargetSchema = z.object({
  nodeId: nonEmptyTrimmedString.max(160),
  label: nonEmptyTrimmedString.max(160),
  route: z.string().trim().max(240).nullable().optional(),
  anchorId: z.string().trim().max(160).nullable().optional(),
});
export type KangurAiTutorWebsiteHelpTarget = z.infer<
  typeof kangurAiTutorWebsiteHelpTargetSchema
>;

export const kangurAiTutorAnswerResolutionModeSchema = z.enum([
  'page_content',
  'native_guide',
  'brain',
]);
export type KangurAiTutorAnswerResolutionMode = z.infer<
  typeof kangurAiTutorAnswerResolutionModeSchema
>;

export const kangurAiTutorRuntimeMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(8_000),
  coachingFrame: kangurAiTutorCoachingFrameSchema.nullable().optional(),
  drawingImageData: kangurAiTutorDrawingImageDataSchema.nullable().optional(),
  artifacts: z.array(kangurAiTutorMessageArtifactSchema).max(4).optional(),
  followUpActions: z.array(kangurAiTutorFollowUpActionSchema).optional(),
  sources: z.array(agentTeachingChatSourceSchema).optional(),
  websiteHelpTarget: kangurAiTutorWebsiteHelpTargetSchema.optional(),
  answerResolutionMode: kangurAiTutorAnswerResolutionModeSchema.optional(),
});
export type KangurAiTutorRuntimeMessage = z.infer<typeof kangurAiTutorRuntimeMessageSchema>;

export const kangurAiTutorGuestIntroStatusSchema = z.enum([
  'shown',
  'accepted',
  'dismissed',
]);
export type KangurAiTutorGuestIntroStatus = z.infer<
  typeof kangurAiTutorGuestIntroStatusSchema
>;

export const kangurAiTutorHomeOnboardingStatusSchema = z.enum([
  'shown',
  'completed',
  'dismissed',
]);
export type KangurAiTutorHomeOnboardingStatus = z.infer<
  typeof kangurAiTutorHomeOnboardingStatusSchema
>;

export type KangurAiTutorOnboardingRecord<Status extends string> = {
  status: Status;
  version: 1;
  updatedAt: string;
};

export const kangurAiTutorKnowledgeGraphQueryModeSchema = z.enum([
  'website_help',
  'semantic',
]);
export type KangurAiTutorKnowledgeGraphQueryMode = z.infer<
  typeof kangurAiTutorKnowledgeGraphQueryModeSchema
>;

export const kangurAiTutorKnowledgeGraphRecallStrategySchema = z.enum([
  'metadata_only',
  'vector_only',
  'hybrid_vector',
]);
export type KangurAiTutorKnowledgeGraphRecallStrategy = z.infer<
  typeof kangurAiTutorKnowledgeGraphRecallStrategySchema
>;

export const kangurAiTutorKnowledgeGraphQueryStatusSchema = z.enum([
  'hit',      // KG was queried and returned relevant results
  'miss',     // KG was queried but found no matching content
  'skipped',  // KG was not queried (no eligible context or query)
  'disabled', // KG is not configured / Neo4j unavailable
]);
export type KangurAiTutorKnowledgeGraphQueryStatus = z.infer<
  typeof kangurAiTutorKnowledgeGraphQueryStatusSchema
>;

export const kangurAiTutorKnowledgeGraphSummarySchema = z.object({
  applied: z.boolean(),
  queryStatus: kangurAiTutorKnowledgeGraphQueryStatusSchema,
  queryMode: kangurAiTutorKnowledgeGraphQueryModeSchema.nullable(),
  recallStrategy: kangurAiTutorKnowledgeGraphRecallStrategySchema.nullable(),
  lexicalHitCount: z.number().int().nonnegative(),
  vectorHitCount: z.number().int().nonnegative(),
  vectorRecallAttempted: z.boolean(),
  websiteHelpApplied: z.boolean(),
  websiteHelpTargetNodeId: z.string().trim().max(160).nullable(),
});
export type KangurAiTutorKnowledgeGraphSummary = z.infer<
  typeof kangurAiTutorKnowledgeGraphSummarySchema
>;

export const kangurAiTutorChatResponseSchema = z.object({
  message: z.string(),
  sources: z.array(agentTeachingChatSourceSchema).default([]),
  followUpActions: z.array(kangurAiTutorFollowUpActionSchema).default([]),
  artifacts: z.array(kangurAiTutorMessageArtifactSchema).max(4).default([]),
  websiteHelpTarget: kangurAiTutorWebsiteHelpTargetSchema.optional(),
  answerResolutionMode: kangurAiTutorAnswerResolutionModeSchema.optional(),
  knowledgeGraph: kangurAiTutorKnowledgeGraphSummarySchema.optional(),
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
