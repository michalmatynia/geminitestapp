import { z } from 'zod';

export const traderaSelectorRegistryValueTypeSchema = z.enum([
  'string',
  'string_array',
  'nested_string_array',
  'object_array',
]);

export type TraderaSelectorRegistryValueType = z.infer<
  typeof traderaSelectorRegistryValueTypeSchema
>;

export const traderaSelectorRegistryKindSchema = z.enum([
  'selectors',
  'labels',
  'hints',
  'paths',
]);

export type TraderaSelectorRegistryKind = z.infer<
  typeof traderaSelectorRegistryKindSchema
>;

export const traderaSelectorRegistrySourceSchema = z.enum(['code', 'mongo']);

export type TraderaSelectorRegistrySource = z.infer<
  typeof traderaSelectorRegistrySourceSchema
>;

export const traderaSelectorRegistryEntrySchema = z.object({
  id: z.string().trim().min(1),
  profile: z.string().trim().min(1).default('default'),
  key: z.string().trim().min(1),
  group: z.string().trim().min(1),
  kind: traderaSelectorRegistryKindSchema,
  description: z.string().trim().nullable(),
  valueType: traderaSelectorRegistryValueTypeSchema,
  valueJson: z.string().trim().min(1),
  itemCount: z.number().int().min(0),
  preview: z.array(z.string().trim().min(1)).default([]),
  source: traderaSelectorRegistrySourceSchema.default('code'),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export type TraderaSelectorRegistryEntry = z.infer<
  typeof traderaSelectorRegistryEntrySchema
>;

export const traderaSelectorRegistryListResponseSchema = z.object({
  entries: z.array(traderaSelectorRegistryEntrySchema).default([]),
  total: z.number().int().min(0),
  syncedAt: z.string().trim().min(1).nullable(),
});

export type TraderaSelectorRegistryListResponse = z.infer<
  typeof traderaSelectorRegistryListResponseSchema
>;

export const traderaSelectorRegistrySyncResponseSchema = z.object({
  insertedCount: z.number().int().min(0),
  updatedCount: z.number().int().min(0),
  deletedCount: z.number().int().min(0),
  total: z.number().int().min(0),
  syncedAt: z.string().trim().min(1),
  message: z.string().trim().min(1),
});

export type TraderaSelectorRegistrySyncResponse = z.infer<
  typeof traderaSelectorRegistrySyncResponseSchema
>;

export const traderaSelectorRegistrySyncRequestSchema = z.object({
  profile: z.string().trim().min(1).nullable().optional(),
});

export type TraderaSelectorRegistrySyncRequest = z.infer<
  typeof traderaSelectorRegistrySyncRequestSchema
>;

export const traderaSelectorRegistrySaveRequestSchema = z.object({
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
  valueJson: z.string().trim().min(1),
});

export type TraderaSelectorRegistrySaveRequest = z.infer<
  typeof traderaSelectorRegistrySaveRequestSchema
>;

export const traderaSelectorRegistrySaveResponseSchema = z.object({
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
  itemCount: z.number().int().min(0),
  preview: z.array(z.string().trim().min(1)).default([]),
  message: z.string().trim().min(1),
});

export type TraderaSelectorRegistrySaveResponse = z.infer<
  typeof traderaSelectorRegistrySaveResponseSchema
>;

export const traderaSelectorRegistryDeleteRequestSchema = z.object({
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
});

export type TraderaSelectorRegistryDeleteRequest = z.infer<
  typeof traderaSelectorRegistryDeleteRequestSchema
>;

export const traderaSelectorRegistryDeleteResponseSchema = z.object({
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
  deleted: z.boolean(),
  message: z.string().trim().min(1),
});

export type TraderaSelectorRegistryDeleteResponse = z.infer<
  typeof traderaSelectorRegistryDeleteResponseSchema
>;

export const traderaSelectorRegistryProfileActionRequestSchema = z.discriminatedUnion('action', [
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

export type TraderaSelectorRegistryProfileActionRequest = z.infer<
  typeof traderaSelectorRegistryProfileActionRequestSchema
>;

export const traderaSelectorRegistryProfileActionResponseSchema = z.object({
  action: z.enum(['clone_profile', 'rename_profile', 'delete_profile']),
  profile: z.string().trim().min(1),
  targetProfile: z.string().trim().min(1).nullable().optional(),
  affectedEntries: z.number().int().min(0),
  message: z.string().trim().min(1),
});

export type TraderaSelectorRegistryProfileActionResponse = z.infer<
  typeof traderaSelectorRegistryProfileActionResponseSchema
>;
