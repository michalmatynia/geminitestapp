import { z } from 'zod';

import { selectorRegistryRoleSchema } from './selector-registry';

export const supplier1688SelectorRegistryValueTypeSchema = z.enum([
  'string',
  'string_array',
]);

export type Supplier1688SelectorRegistryValueType = z.infer<
  typeof supplier1688SelectorRegistryValueTypeSchema
>;

export const supplier1688SelectorRegistryKindSchema = z.enum([
  'selector',
  'text_hint',
  'pattern',
]);

export type Supplier1688SelectorRegistryKind = z.infer<
  typeof supplier1688SelectorRegistryKindSchema
>;

export const supplier1688SelectorRegistrySourceSchema = z.enum(['code', 'mongo']);

export type Supplier1688SelectorRegistrySource = z.infer<
  typeof supplier1688SelectorRegistrySourceSchema
>;

export const supplier1688SelectorRegistryEntrySchema = z.object({
  id: z.string().trim().min(1),
  profile: z.string().trim().min(1).default('1688'),
  key: z.string().trim().min(1),
  group: z.string().trim().min(1),
  kind: supplier1688SelectorRegistryKindSchema,
  role: selectorRegistryRoleSchema,
  description: z.string().trim().nullable(),
  valueType: supplier1688SelectorRegistryValueTypeSchema,
  valueJson: z.string().trim().min(1),
  itemCount: z.number().int().min(0),
  preview: z.array(z.string().trim().min(1)).default([]),
  source: supplier1688SelectorRegistrySourceSchema.default('code'),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export type Supplier1688SelectorRegistryEntry = z.infer<
  typeof supplier1688SelectorRegistryEntrySchema
>;

export const supplier1688SelectorRegistryListResponseSchema = z.object({
  entries: z.array(supplier1688SelectorRegistryEntrySchema).default([]),
  total: z.number().int().min(0),
  syncedAt: z.string().trim().min(1).nullable(),
});

export type Supplier1688SelectorRegistryListResponse = z.infer<
  typeof supplier1688SelectorRegistryListResponseSchema
>;

export const supplier1688SelectorRegistrySyncRequestSchema = z.object({
  profile: z.string().trim().min(1).nullable().optional(),
});

export type Supplier1688SelectorRegistrySyncRequest = z.infer<
  typeof supplier1688SelectorRegistrySyncRequestSchema
>;

export const supplier1688SelectorRegistrySyncResponseSchema = z.object({
  insertedCount: z.number().int().min(0),
  updatedCount: z.number().int().min(0),
  deletedCount: z.number().int().min(0),
  total: z.number().int().min(0),
  syncedAt: z.string().trim().min(1),
  message: z.string().trim().min(1),
});

export type Supplier1688SelectorRegistrySyncResponse = z.infer<
  typeof supplier1688SelectorRegistrySyncResponseSchema
>;

export const supplier1688SelectorRegistrySaveRequestSchema = z.object({
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
  valueJson: z.string().trim().min(1),
});

export type Supplier1688SelectorRegistrySaveRequest = z.infer<
  typeof supplier1688SelectorRegistrySaveRequestSchema
>;

export const supplier1688SelectorRegistrySaveResponseSchema = z.object({
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
  itemCount: z.number().int().min(0),
  preview: z.array(z.string().trim().min(1)).default([]),
  message: z.string().trim().min(1),
});

export type Supplier1688SelectorRegistrySaveResponse = z.infer<
  typeof supplier1688SelectorRegistrySaveResponseSchema
>;

export const supplier1688SelectorRegistryDeleteRequestSchema = z.object({
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
});

export type Supplier1688SelectorRegistryDeleteRequest = z.infer<
  typeof supplier1688SelectorRegistryDeleteRequestSchema
>;

export const supplier1688SelectorRegistryDeleteResponseSchema = z.object({
  profile: z.string().trim().min(1),
  key: z.string().trim().min(1),
  deleted: z.boolean(),
  message: z.string().trim().min(1),
});

export type Supplier1688SelectorRegistryDeleteResponse = z.infer<
  typeof supplier1688SelectorRegistryDeleteResponseSchema
>;

export const supplier1688SelectorRegistryProfileActionRequestSchema = z.discriminatedUnion(
  'action',
  [
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
  ]
);

export type Supplier1688SelectorRegistryProfileActionRequest = z.infer<
  typeof supplier1688SelectorRegistryProfileActionRequestSchema
>;

export const supplier1688SelectorRegistryProfileActionResponseSchema = z.object({
  action: z.enum(['clone_profile', 'rename_profile', 'delete_profile']),
  profile: z.string().trim().min(1),
  targetProfile: z.string().trim().min(1).nullable().optional(),
  affectedEntries: z.number().int().min(0),
  message: z.string().trim().min(1),
});

export type Supplier1688SelectorRegistryProfileActionResponse = z.infer<
  typeof supplier1688SelectorRegistryProfileActionResponseSchema
>;
