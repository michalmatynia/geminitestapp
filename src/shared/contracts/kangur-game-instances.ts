import { z } from 'zod';

import {
  kangurGameEngineIdSchema,
  kangurGameIdSchema,
  kangurLaunchableGameScreenSchema,
} from './kangur-games';
import { kangurGameRuntimeRendererPropsSchema } from './kangur-game-runtime-renderer-props';

const nonEmptyTrimmedString = z.string().trim().min(1);

export const kangurGameContentSetIdSchema = nonEmptyTrimmedString.max(120);
export type KangurGameContentSetId = z.infer<typeof kangurGameContentSetIdSchema>;

export const kangurGameInstanceIdSchema = nonEmptyTrimmedString.max(120);
export type KangurGameInstanceId = z.infer<typeof kangurGameInstanceIdSchema>;

export const KANGUR_GAME_CONTENT_SET_KINDS = [
  'default_content',
  'calendar_section',
  'clock_section',
  'logical_pattern_set',
  'geometry_shape_pack',
] as const;

export const kangurGameContentSetKindSchema = z.enum(KANGUR_GAME_CONTENT_SET_KINDS);
export type KangurGameContentSetKind = z.infer<typeof kangurGameContentSetKindSchema>;

export const kangurGameContentSetSchema = z.object({
  id: kangurGameContentSetIdSchema,
  gameId: kangurGameIdSchema,
  engineId: kangurGameEngineIdSchema.optional(),
  launchableRuntimeId: kangurLaunchableGameScreenSchema,
  label: nonEmptyTrimmedString.max(120),
  description: z.string().trim().min(1).max(240),
  contentKind: kangurGameContentSetKindSchema,
  rendererProps: kangurGameRuntimeRendererPropsSchema.default({}),
  sortOrder: z.number().int().min(0).max(1_000_000).default(0),
});
export type KangurGameContentSet = z.infer<typeof kangurGameContentSetSchema>;

export const kangurGameContentSetsSchema = z.array(kangurGameContentSetSchema);
export type KangurGameContentSets = z.infer<typeof kangurGameContentSetsSchema>;

export const kangurGameInstanceSchema = z.object({
  id: kangurGameInstanceIdSchema,
  gameId: kangurGameIdSchema,
  launchableRuntimeId: kangurLaunchableGameScreenSchema,
  contentSetId: kangurGameContentSetIdSchema,
  title: nonEmptyTrimmedString.max(120),
  description: z.string().trim().max(240).default(''),
  emoji: z.string().trim().min(1).max(12),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1_000_000),
  engineOverrides: kangurGameRuntimeRendererPropsSchema.default({}),
});
export type KangurGameInstance = z.infer<typeof kangurGameInstanceSchema>;

export const kangurGameInstancesSchema = z.array(kangurGameInstanceSchema);
export type KangurGameInstances = z.infer<typeof kangurGameInstancesSchema>;

export const kangurGameInstancesReplacePayloadSchema = z.object({
  gameId: kangurGameIdSchema,
  instances: kangurGameInstancesSchema,
});
export type KangurGameInstancesReplacePayload = z.infer<
  typeof kangurGameInstancesReplacePayloadSchema
>;
