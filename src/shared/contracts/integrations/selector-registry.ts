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
]);

export type SelectorRegistryProfileActionRequest = z.infer<
  typeof selectorRegistryProfileActionRequestSchema
>;

export const selectorRegistryProfileActionResponseSchema = z.object({
  namespace: selectorRegistryNamespaceSchema,
  action: z.enum(['clone_profile', 'rename_profile', 'delete_profile']),
  profile: z.string().trim().min(1),
  targetProfile: z.string().trim().min(1).nullable().optional(),
  affectedEntries: z.number().int().min(0),
  message: z.string().trim().min(1),
});

export type SelectorRegistryProfileActionResponse = z.infer<
  typeof selectorRegistryProfileActionResponseSchema
>;
