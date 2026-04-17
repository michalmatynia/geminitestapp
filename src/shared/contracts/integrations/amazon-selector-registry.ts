import { z } from 'zod';

export const amazonSelectorRegistryValueTypeSchema = z.enum(['string', 'string_array']);
export type AmazonSelectorRegistryValueType = z.infer<typeof amazonSelectorRegistryValueTypeSchema>;

export const amazonSelectorRegistryKindSchema = z.enum(['selector', 'text_hint', 'pattern']);
export type AmazonSelectorRegistryKind = z.infer<typeof amazonSelectorRegistryKindSchema>;

export const amazonSelectorRegistrySourceSchema = z.enum(['code', 'mongo']);
export type AmazonSelectorRegistrySource = z.infer<typeof amazonSelectorRegistrySourceSchema>;

export const amazonSelectorRegistryEntrySchema = z.object({
  id: z.string().trim().min(1),
  profile: z.string().trim().min(1).default('amazon'),
  key: z.string().trim().min(1),
  group: z.string().trim().min(1),
  kind: amazonSelectorRegistryKindSchema,
  description: z.string().trim().nullable(),
  valueType: amazonSelectorRegistryValueTypeSchema,
  valueJson: z.string().trim().min(1),
  itemCount: z.number().int().min(0),
  preview: z.array(z.string().trim().min(1)).default([]),
  source: amazonSelectorRegistrySourceSchema.default('code'),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export type AmazonSelectorRegistryEntry = z.infer<typeof amazonSelectorRegistryEntrySchema>;

export const amazonSelectorRegistryListResponseSchema = z.object({
  entries: z.array(amazonSelectorRegistryEntrySchema).default([]),
  profiles: z.array(z.string().trim().min(1)).default([]),
  total: z.number().int().min(0),
  syncedAt: z.string().trim().min(1).nullable(),
});

export type AmazonSelectorRegistryListResponse = z.infer<
  typeof amazonSelectorRegistryListResponseSchema
>;

export const amazonSelectorRegistrySyncRequestSchema = z.object({
  profile: z.string().trim().min(1).nullable().optional(),
});

export type AmazonSelectorRegistrySyncRequest = z.infer<
  typeof amazonSelectorRegistrySyncRequestSchema
>;

export const amazonSelectorRegistrySyncResponseSchema = z.object({
  insertedCount: z.number().int().min(0),
  updatedCount: z.number().int().min(0),
  deletedCount: z.number().int().min(0),
  total: z.number().int().min(0),
  syncedAt: z.string().trim().min(1),
  message: z.string().trim().min(1),
});

export type AmazonSelectorRegistrySyncResponse = z.infer<
  typeof amazonSelectorRegistrySyncResponseSchema
>;

export const amazonSelectorRegistrySaveRequestSchema = z.object({
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
  valueJson: z.string().trim().min(1),
});

export type AmazonSelectorRegistrySaveRequest = z.infer<
  typeof amazonSelectorRegistrySaveRequestSchema
>;

export const amazonSelectorRegistrySaveResponseSchema = z.object({
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
  itemCount: z.number().int().min(0),
  preview: z.array(z.string().trim().min(1)).default([]),
  message: z.string().trim().min(1),
});

export type AmazonSelectorRegistrySaveResponse = z.infer<
  typeof amazonSelectorRegistrySaveResponseSchema
>;

export const amazonSelectorRegistryDeleteRequestSchema = z.object({
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
});

export type AmazonSelectorRegistryDeleteRequest = z.infer<
  typeof amazonSelectorRegistryDeleteRequestSchema
>;

export const amazonSelectorRegistryDeleteResponseSchema = z.object({
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
  deleted: z.boolean(),
  message: z.string().trim().min(1),
});

export type AmazonSelectorRegistryDeleteResponse = z.infer<
  typeof amazonSelectorRegistryDeleteResponseSchema
>;

export const amazonSelectorRegistryProfileActionRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('clone_profile'),
    sourceProfile: z.string().trim().min(1),
    targetProfile: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal('rename_profile'),
    profile: z.string().trim().min(1),
    targetProfile: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal('delete_profile'),
    profile: z.string().trim().min(1),
  }),
]);

export type AmazonSelectorRegistryProfileActionRequest = z.infer<
  typeof amazonSelectorRegistryProfileActionRequestSchema
>;

export const amazonSelectorRegistryProfileActionResponseSchema = z.object({
  action: z.enum(['clone_profile', 'rename_profile', 'delete_profile']),
  profile: z.string().trim().min(1),
  targetProfile: z.string().trim().min(1).nullable().optional(),
  affectedEntries: z.number().int().min(0),
  message: z.string().trim().min(1),
});

export type AmazonSelectorRegistryProfileActionResponse = z.infer<
  typeof amazonSelectorRegistryProfileActionResponseSchema
>;
