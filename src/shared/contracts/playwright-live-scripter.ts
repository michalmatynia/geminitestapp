import { z } from 'zod';

import { selectorRegistryRoleSchema } from '@/shared/contracts/integrations/selector-registry';

export const PLAYWRIGHT_LIVE_SCRIPTER_DEFAULT_VIEWPORT = {
  width: 1280,
  height: 800,
} as const;

export const LIVE_SCRIPTER_FRAME_QUALITY = 70;
export const PLAYWRIGHT_LIVE_SCRIPTER_WS_PATH = '/api/playwright/live-scripter/ws';

const liveScripterViewportSchema = z.object({
  width: z.number().int().positive().max(3840),
  height: z.number().int().positive().max(2160),
});

export type LiveScripterViewport = z.infer<typeof liveScripterViewportSchema>;

export const liveScripterStartRequestSchema = z.object({
  url: z.string().trim().min(1).max(2_000),
  viewport: liveScripterViewportSchema.optional(),
  websiteId: z.string().trim().min(1).max(200).nullable().optional(),
  flowId: z.string().trim().min(1).max(200).nullable().optional(),
  personaId: z.string().trim().min(1).max(200).nullable().optional(),
  selectorProfile: z.string().trim().min(1).max(200).nullable().optional(),
});

export type LiveScripterStartRequest = z.infer<typeof liveScripterStartRequestSchema>;

export const liveScripterStartResponseSchema = z.object({
  sessionId: z.string().trim().min(1),
  socketPath: z.string().trim().min(1),
});

export type LiveScripterStartResponse = z.infer<typeof liveScripterStartResponseSchema>;

export const liveScripterSelectorCandidatesSchema = z.object({
  css: z.string().nullable(),
  xpath: z.string().nullable(),
  role: z.string().nullable(),
  text: z.string().nullable(),
  testId: z.string().nullable(),
});

export type LiveScripterSelectorCandidates = z.infer<
  typeof liveScripterSelectorCandidatesSchema
>;

export const liveScripterPickedElementSchema = z.object({
  tag: z.string(),
  id: z.string().nullable(),
  classes: z.array(z.string()),
  textPreview: z.string().nullable(),
  role: z.string().nullable(),
  attrs: z.record(z.string(), z.string()),
  boundingBox: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  candidates: liveScripterSelectorCandidatesSchema,
});

export type LiveScripterPickedElement = z.infer<typeof liveScripterPickedElementSchema>;

const liveScripterSessionIdSchema = z.string().trim().min(1);

export const liveScripterProbeScopeSchema = z.enum(['main_content', 'whole_page']);
export type LiveScripterProbeScope = z.infer<typeof liveScripterProbeScopeSchema>;

export const liveScripterProbeSuggestionSchema = liveScripterPickedElementSchema.extend({
  suggestionId: z.string().trim().min(1),
  pageUrl: z.string().trim().min(1),
  pageTitle: z.string().trim().nullable(),
  repeatedSiblingCount: z.number().int().min(0).default(0),
  childLinkCount: z.number().int().min(0).default(0),
  childImageCount: z.number().int().min(0).default(0),
  classificationRole: selectorRegistryRoleSchema,
  draftTargetHints: z.array(z.string().trim().min(1)).default([]),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string().trim().min(1)).default([]),
});

export type LiveScripterProbeSuggestion = z.infer<typeof liveScripterProbeSuggestionSchema>;

export const liveScripterProbePageSummarySchema = z.object({
  url: z.string().trim().min(1),
  title: z.string().trim().nullable(),
  suggestionCount: z.number().int().min(0),
});

export type LiveScripterProbePageSummary = z.infer<typeof liveScripterProbePageSummarySchema>;

export const liveScripterDriveClickMessageSchema = z.object({
  type: z.literal('drive_click'),
  x: z.number().finite(),
  y: z.number().finite(),
});

export const liveScripterDriveTypeMessageSchema = z.object({
  type: z.literal('drive_type'),
  value: z.string(),
});

export const liveScripterDriveScrollMessageSchema = z.object({
  type: z.literal('drive_scroll'),
  deltaX: z.number().finite().default(0),
  deltaY: z.number().finite().default(0),
});

export const liveScripterPickAtMessageSchema = z.object({
  type: z.literal('pick_at'),
  x: z.number().finite(),
  y: z.number().finite(),
});

export const liveScripterNavigateMessageSchema = z.object({
  type: z.literal('navigate'),
  url: z.string().trim().min(1).max(2_000),
});

export const liveScripterBackMessageSchema = z.object({
  type: z.literal('back'),
});

export const liveScripterForwardMessageSchema = z.object({
  type: z.literal('forward'),
});

export const liveScripterReloadMessageSchema = z.object({
  type: z.literal('reload'),
});

export const liveScripterProbeDomMessageSchema = z.object({
  type: z.literal('probe_dom'),
  scope: liveScripterProbeScopeSchema.default('main_content'),
  maxNodes: z.number().int().min(12).max(240).default(48),
  sameOriginOnly: z.boolean().default(true),
  linkDepth: z.number().int().min(0).max(2).default(0),
  maxPages: z.number().int().min(1).max(8).default(1),
});

export const liveScripterDisposeMessageSchema = z.object({
  type: z.literal('dispose'),
});

export const liveScripterClientMessageSchema = z.discriminatedUnion('type', [
  liveScripterDriveClickMessageSchema,
  liveScripterDriveTypeMessageSchema,
  liveScripterDriveScrollMessageSchema,
  liveScripterPickAtMessageSchema,
  liveScripterNavigateMessageSchema,
  liveScripterBackMessageSchema,
  liveScripterForwardMessageSchema,
  liveScripterReloadMessageSchema,
  liveScripterProbeDomMessageSchema,
  liveScripterDisposeMessageSchema,
]);

export type LiveScripterClientMessage = z.infer<typeof liveScripterClientMessageSchema>;

export const liveScripterSocketQuerySchema = z.object({
  sessionId: liveScripterSessionIdSchema,
});

export type LiveScripterSocketQuery = z.infer<typeof liveScripterSocketQuerySchema>;

export const liveScripterDisposeRequestSchema = z.object({
  sessionId: liveScripterSessionIdSchema,
});

export type LiveScripterDisposeRequest = z.infer<typeof liveScripterDisposeRequestSchema>;

export const liveScripterFrameMessageSchema = z.object({
  type: z.literal('frame'),
  dataUrl: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export type LiveScripterFrame = z.infer<typeof liveScripterFrameMessageSchema>;

export const liveScripterNavigatedMessageSchema = z.object({
  type: z.literal('navigated'),
  url: z.string(),
  title: z.string().nullable(),
});

export const liveScripterPickedMessageSchema = z.object({
  type: z.literal('picked'),
  element: liveScripterPickedElementSchema,
});

export const liveScripterProbeResultMessageSchema = z.object({
  type: z.literal('probe_result'),
  url: z.string().trim().min(1),
  title: z.string().trim().nullable(),
  scope: liveScripterProbeScopeSchema,
  sameOriginOnly: z.boolean().default(true),
  linkDepth: z.number().int().min(0).default(0),
  maxPages: z.number().int().min(1).default(1),
  scannedPages: z.number().int().min(0).default(0),
  visitedUrls: z.array(z.string().trim().min(1)).default([]),
  pages: z.array(liveScripterProbePageSummarySchema).default([]),
  suggestionCount: z.number().int().min(0),
  suggestions: z.array(liveScripterProbeSuggestionSchema).default([]),
});

export type LiveScripterProbeResult = z.infer<typeof liveScripterProbeResultMessageSchema>;

export const liveScripterErrorMessageSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
});

export const liveScripterClosedMessageSchema = z.object({
  type: z.literal('closed'),
});

export const liveScripterReadyMessageSchema = z.object({
  type: z.literal('ready'),
  sessionId: liveScripterSessionIdSchema,
});

export const liveScripterServerMessageSchema = z.discriminatedUnion('type', [
  liveScripterFrameMessageSchema,
  liveScripterNavigatedMessageSchema,
  liveScripterPickedMessageSchema,
  liveScripterProbeResultMessageSchema,
  liveScripterErrorMessageSchema,
  liveScripterClosedMessageSchema,
  liveScripterReadyMessageSchema,
]);

export type LiveScripterServerMessage = z.infer<typeof liveScripterServerMessageSchema>;
