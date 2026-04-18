import { z } from 'zod';

export const selectorRegistryNamespaceSchema = z.enum(['tradera', 'amazon', '1688', 'vinted']);
export type SelectorRegistryNamespace = z.infer<typeof selectorRegistryNamespaceSchema>;

export const selectorRegistryValueTypeSchema = z.enum([
  'string',
  'string_array',
  'nested_string_array',
  'object_array',
]);
export type SelectorRegistryValueType = z.infer<typeof selectorRegistryValueTypeSchema>;

export const selectorRegistryKindSchema = z.enum([
  'selector',
  'selectors',
  'text_hint',
  'hints',
  'pattern',
  'paths',
  'labels',
]);
export type SelectorRegistryKind = z.infer<typeof selectorRegistryKindSchema>;

export const selectorRegistryRoleSchema = z.enum([
  'generic',
  'input',
  'upload_input',
  'trigger',
  'option',
  'submit',
  'ready_signal',
  'result_hint',
  'result_shell',
  'candidate_hint',
  'overlay_accept',
  'overlay_dismiss',
  'navigation',
  'content',
  'content_title',
  'content_price',
  'content_description',
  'content_image',
  'feedback',
  'barrier',
  'barrier_title',
  'text_hint',
  'negative_text_hint',
  'pattern',
  'path',
  'label',
]);
export type SelectorRegistryRole = z.infer<typeof selectorRegistryRoleSchema>;

export const selectorRegistrySourceSchema = z.enum(['code', 'mongo']);
export type SelectorRegistrySource = z.infer<typeof selectorRegistrySourceSchema>;

export const selectorRegistryProbeSelectorCandidatesSchema = z.object({
  css: z.string().nullable(),
  xpath: z.string().nullable(),
  role: z.string().nullable(),
  text: z.string().nullable(),
  testId: z.string().nullable(),
});

export type SelectorRegistryProbeSelectorCandidates = z.infer<
  typeof selectorRegistryProbeSelectorCandidatesSchema
>;

export const selectorRegistryProbeSuggestionSchema = z.object({
  suggestionId: z.string().trim().min(1),
  pageUrl: z.string().trim().min(1),
  pageTitle: z.string().trim().nullable(),
  tag: z.string().trim().min(1),
  id: z.string().trim().nullable(),
  classes: z.array(z.string().trim().min(1)).default([]),
  textPreview: z.string().trim().nullable(),
  role: z.string().trim().nullable(),
  attrs: z.record(z.string(), z.string()).default({}),
  boundingBox: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  candidates: selectorRegistryProbeSelectorCandidatesSchema,
  repeatedSiblingCount: z.number().int().min(0).default(0),
  childLinkCount: z.number().int().min(0).default(0),
  childImageCount: z.number().int().min(0).default(0),
  classificationRole: selectorRegistryRoleSchema,
  draftTargetHints: z.array(z.string().trim().min(1)).default([]),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string().trim().min(1)).default([]),
});

export type SelectorRegistryProbeSuggestion = z.infer<
  typeof selectorRegistryProbeSuggestionSchema
>;

export const selectorRegistryProbePageSummarySchema = z.object({
  url: z.string().trim().min(1),
  title: z.string().trim().nullable(),
  suggestionCount: z.number().int().min(0),
});

export type SelectorRegistryProbePageSummary = z.infer<
  typeof selectorRegistryProbePageSummarySchema
>;

export const selectorRegistryProbeTemplateFingerprintSchema = z.object({
  clusterKey: z.string().trim().min(1),
  host: z.string().trim().min(1),
  normalizedPath: z.string().trim().min(1),
  roleSignature: z.array(selectorRegistryRoleSchema).default([]),
});

export type SelectorRegistryProbeTemplateFingerprint = z.infer<
  typeof selectorRegistryProbeTemplateFingerprintSchema
>;

export const selectorRegistryProbeSessionSchema = z.object({
  id: z.string().trim().min(1),
  namespace: selectorRegistryNamespaceSchema,
  profile: z.string().trim().min(1),
  sourceUrl: z.string().trim().min(1),
  sourceTitle: z.string().trim().nullable(),
  scope: z.enum(['main_content', 'whole_page']),
  sameOriginOnly: z.boolean().default(true),
  linkDepth: z.number().int().min(0).default(0),
  maxPages: z.number().int().min(1).default(1),
  scannedPages: z.number().int().min(0).default(0),
  visitedUrls: z.array(z.string().trim().min(1)).default([]),
  pages: z.array(selectorRegistryProbePageSummarySchema).default([]),
  suggestionCount: z.number().int().min(0),
  suggestions: z.array(selectorRegistryProbeSuggestionSchema).default([]),
  templateFingerprint: selectorRegistryProbeTemplateFingerprintSchema,
  archivedAt: z.string().trim().min(1).nullable().default(null),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export type SelectorRegistryProbeSession = z.infer<
  typeof selectorRegistryProbeSessionSchema
>;

export const selectorRegistryProbeSessionClusterSchema = z.object({
  clusterKey: z.string().trim().min(1),
  label: z.string().trim().min(1),
  host: z.string().trim().min(1),
  normalizedPath: z.string().trim().min(1),
  roleSignature: z.array(selectorRegistryRoleSchema).default([]),
  sessionCount: z.number().int().min(0),
  suggestionCount: z.number().int().min(0),
  latestUpdatedAt: z.string().trim().min(1),
  sessions: z.array(selectorRegistryProbeSessionSchema).default([]),
});

export type SelectorRegistryProbeSessionCluster = z.infer<
  typeof selectorRegistryProbeSessionClusterSchema
>;

export const selectorRegistryEntrySchema = z.object({
  id: z.string().trim().min(1),
  namespace: selectorRegistryNamespaceSchema,
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
  group: z.string().trim().min(1),
  kind: selectorRegistryKindSchema,
  role: selectorRegistryRoleSchema,
  description: z.string().trim().nullable(),
  valueType: selectorRegistryValueTypeSchema,
  valueJson: z.string().trim().min(1),
  itemCount: z.number().int().min(0),
  preview: z.array(z.string().trim().min(1)).default([]),
  source: selectorRegistrySourceSchema.default('code'),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
  resolvedFromProfile: z.string().trim().min(1).nullable().optional(),
  hasOverride: z.boolean().optional(),
  readOnly: z.boolean().optional(),
});

export type SelectorRegistryEntry = z.infer<typeof selectorRegistryEntrySchema>;

export const selectorRegistryListResponseSchema = z.object({
  entries: z.array(selectorRegistryEntrySchema).default([]),
  probeSessions: z.array(selectorRegistryProbeSessionSchema).default([]),
  probeSessionClusters: z.array(selectorRegistryProbeSessionClusterSchema).default([]),
  namespaces: z.array(selectorRegistryNamespaceSchema).default([]),
  profiles: z.array(z.string().trim().min(1)).default([]),
  namespace: selectorRegistryNamespaceSchema.nullable().optional(),
  profile: z.string().trim().min(1).nullable().optional(),
  defaultProfile: z.string().trim().min(1).nullable().optional(),
  total: z.number().int().min(0),
  syncedAt: z.string().trim().min(1).nullable(),
});

export type SelectorRegistryListResponse = z.infer<
  typeof selectorRegistryListResponseSchema
>;

export const selectorRegistryListRequestSchema = z.object({
  namespace: selectorRegistryNamespaceSchema.nullable().optional(),
  profile: z.string().trim().min(1).nullable().optional(),
  effective: z.boolean().optional(),
});

export type SelectorRegistryListRequest = z.infer<
  typeof selectorRegistryListRequestSchema
>;

export const selectorRegistrySyncRequestSchema = z.object({
  namespace: selectorRegistryNamespaceSchema,
  profile: z.string().trim().min(1).nullable().optional(),
});

export type SelectorRegistrySyncRequest = z.infer<
  typeof selectorRegistrySyncRequestSchema
>;

export const selectorRegistrySyncResponseSchema = z.object({
  namespace: selectorRegistryNamespaceSchema,
  insertedCount: z.number().int().min(0),
  updatedCount: z.number().int().min(0),
  deletedCount: z.number().int().min(0),
  total: z.number().int().min(0),
  syncedAt: z.string().trim().min(1),
  message: z.string().trim().min(1),
});

export type SelectorRegistrySyncResponse = z.infer<
  typeof selectorRegistrySyncResponseSchema
>;

export const selectorRegistrySaveRequestSchema = z.object({
  namespace: selectorRegistryNamespaceSchema,
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
  valueJson: z.string().trim().min(1),
  role: selectorRegistryRoleSchema.optional(),
});

export type SelectorRegistrySaveRequest = z.infer<
  typeof selectorRegistrySaveRequestSchema
>;

export const selectorRegistrySaveResponseSchema = z.object({
  namespace: selectorRegistryNamespaceSchema,
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
  itemCount: z.number().int().min(0),
  preview: z.array(z.string().trim().min(1)).default([]),
  message: z.string().trim().min(1),
});

export type SelectorRegistrySaveResponse = z.infer<
  typeof selectorRegistrySaveResponseSchema
>;

export const selectorRegistryDeleteRequestSchema = z.object({
  namespace: selectorRegistryNamespaceSchema,
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
});

export type SelectorRegistryDeleteRequest = z.infer<
  typeof selectorRegistryDeleteRequestSchema
>;

export const selectorRegistryDeleteResponseSchema = z.object({
  namespace: selectorRegistryNamespaceSchema,
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
  deleted: z.boolean(),
  message: z.string().trim().min(1),
});

export type SelectorRegistryDeleteResponse = z.infer<
  typeof selectorRegistryDeleteResponseSchema
>;

export const selectorRegistryProbeSessionSaveRequestSchema = z.object({
  namespace: selectorRegistryNamespaceSchema,
  profile: z.string().trim().min(1),
  probeResult: z.object({
    url: z.string().trim().min(1),
    title: z.string().trim().nullable(),
    scope: z.enum(['main_content', 'whole_page']),
    sameOriginOnly: z.boolean().default(true),
    linkDepth: z.number().int().min(0).default(0),
    maxPages: z.number().int().min(1).default(1),
    scannedPages: z.number().int().min(0).default(0),
    visitedUrls: z.array(z.string().trim().min(1)).default([]),
    pages: z.array(selectorRegistryProbePageSummarySchema).default([]),
    suggestionCount: z.number().int().min(0),
    suggestions: z.array(selectorRegistryProbeSuggestionSchema).default([]),
  }),
});

export type SelectorRegistryProbeSessionSaveRequest = z.infer<
  typeof selectorRegistryProbeSessionSaveRequestSchema
>;

export const selectorRegistryProbeSessionSaveResponseSchema = z.object({
  session: selectorRegistryProbeSessionSchema,
  message: z.string().trim().min(1),
});

export type SelectorRegistryProbeSessionSaveResponse = z.infer<
  typeof selectorRegistryProbeSessionSaveResponseSchema
>;

export const selectorRegistryProbeSessionDeleteRequestSchema = z.object({
  id: z.string().trim().min(1),
});

export type SelectorRegistryProbeSessionDeleteRequest = z.infer<
  typeof selectorRegistryProbeSessionDeleteRequestSchema
>;

export const selectorRegistryProbeSessionDeleteResponseSchema = z.object({
  id: z.string().trim().min(1),
  deleted: z.boolean(),
  message: z.string().trim().min(1),
});

export type SelectorRegistryProbeSessionDeleteResponse = z.infer<
  typeof selectorRegistryProbeSessionDeleteResponseSchema
>;

export const selectorRegistryProbeSessionArchiveRequestSchema = z.object({
  id: z.string().trim().min(1),
});

export type SelectorRegistryProbeSessionArchiveRequest = z.infer<
  typeof selectorRegistryProbeSessionArchiveRequestSchema
>;

export const selectorRegistryProbeSessionArchiveResponseSchema = z.object({
  id: z.string().trim().min(1),
  archived: z.boolean(),
  archivedAt: z.string().trim().min(1).nullable(),
  message: z.string().trim().min(1),
});

export type SelectorRegistryProbeSessionArchiveResponse = z.infer<
  typeof selectorRegistryProbeSessionArchiveResponseSchema
>;

export const selectorRegistryProfileActionRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('clone_profile'),
    namespace: selectorRegistryNamespaceSchema,
    sourceProfile: z.string().trim().min(1),
    targetProfile: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal('rename_profile'),
    namespace: selectorRegistryNamespaceSchema,
    profile: z.string().trim().min(1),
    targetProfile: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal('delete_profile'),
    namespace: selectorRegistryNamespaceSchema,
    profile: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal('classify_role'),
    namespace: selectorRegistryNamespaceSchema,
    profile: z.string().trim().min(1),
    key: z.string().trim().min(1),
  }),
]);

export type SelectorRegistryProfileActionRequest = z.infer<
  typeof selectorRegistryProfileActionRequestSchema
>;

export const selectorRegistryProfileActionResponseSchema = z.object({
  namespace: selectorRegistryNamespaceSchema,
  action: z.enum(['clone_profile', 'rename_profile', 'delete_profile', 'classify_role']),
  profile: z.string().trim().min(1),
  targetProfile: z.string().trim().min(1).nullable().optional(),
  key: z.string().trim().min(1).nullable().optional(),
  role: selectorRegistryRoleSchema.nullable().optional(),
  affectedEntries: z.number().int().min(0),
  message: z.string().trim().min(1),
});

export type SelectorRegistryProfileActionResponse = z.infer<
  typeof selectorRegistryProfileActionResponseSchema
>;

export const selectorRegistryProbeRequestSchema = z.object({
  namespace: selectorRegistryNamespaceSchema,
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
  probeUrl: z.string().trim().min(1).optional(),
});

export type SelectorRegistryProbeRequest = z.infer<typeof selectorRegistryProbeRequestSchema>;

export const selectorRegistryProbeResponseSchema = z.object({
  namespace: selectorRegistryNamespaceSchema,
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
  probeUrl: z.string().trim().min(1),
  matchCount: z.number().int().min(0),
  screenshotBase64: z.string().nullable(),
  domSnippet: z.string().nullable(),
  matchedSelector: z.string().nullable(),
  probedAt: z.string().trim().min(1),
  message: z.string().trim().min(1),
});

export type SelectorRegistryProbeResponse = z.infer<typeof selectorRegistryProbeResponseSchema>;

export const selectorRegistryClassifySuggestionItemSchema = z.object({
  suggestionId: z.string().trim().min(1),
  tag: z.string().trim().min(1),
  id: z.string().trim().nullable(),
  classes: z.array(z.string()).default([]),
  textPreview: z.string().trim().nullable(),
  role: z.string().trim().nullable(),
  attrs: z.record(z.string(), z.string()).default({}),
  candidates: selectorRegistryProbeSelectorCandidatesSchema,
  pageUrl: z.string().trim().min(1),
});

export type SelectorRegistryClassifySuggestionItem = z.infer<
  typeof selectorRegistryClassifySuggestionItemSchema
>;

export const selectorRegistryClassifySuggestionsRequestSchema = z.object({
  namespace: selectorRegistryNamespaceSchema,
  suggestions: z.array(selectorRegistryClassifySuggestionItemSchema).min(1),
});

export type SelectorRegistryClassifySuggestionsRequest = z.infer<
  typeof selectorRegistryClassifySuggestionsRequestSchema
>;

export const selectorRegistryClassifySuggestionsResponseSchema = z.object({
  namespace: selectorRegistryNamespaceSchema,
  results: z.array(
    z.object({
      suggestionId: z.string().trim().min(1),
      classificationRole: selectorRegistryRoleSchema,
    })
  ),
  classifiedCount: z.number().int().min(0),
  modelId: z.string().trim().min(1),
  message: z.string().trim().min(1),
});

export type SelectorRegistryClassifySuggestionsResponse = z.infer<
  typeof selectorRegistryClassifySuggestionsResponseSchema
>;
