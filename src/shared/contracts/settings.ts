import { z } from 'zod';

/**
 * Setting Record Contract
 */
export const settingRecordSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export type SettingRecord = z.infer<typeof settingRecordSchema>;
export type { SettingRecord as SystemSetting };

/**
 * Settings Scope Contract
 */
export const settingsScopeSchema = z.enum(['all', 'light', 'heavy']);
export type SettingsScope = z.infer<typeof settingsScopeSchema>;

export const upsertSettingSchema = z.object({
  key: z.string().trim().min(1),
  value: z.string(),
  expectedRevision: z.number().int().min(0).optional(),
  mutationId: z.string().trim().min(1).max(200).optional(),
});

export type UpsertSetting = z.infer<typeof upsertSettingSchema>;

export { adminSettingsSchema, createAdminSettingsSchema } from './admin';
export type { AdminSettings, CreateAdminSettings, UpdateAdminSettings } from './admin';
