import { z } from 'zod';

/**
 * Setting Record Contract
 */
export const settingRecordSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export type SettingRecordDto = z.infer<typeof settingRecordSchema>;
export type SystemSetting = SettingRecordDto;
export type SettingRecord = SettingRecordDto;

/**
 * Settings Scope Contract
 */
export const settingsScopeSchema = z.enum(['all', 'light', 'heavy']);
export type SettingsScopeDto = z.infer<typeof settingsScopeSchema>;
export type SettingsScope = SettingsScopeDto;

export const upsertSettingSchema = z.object({
  key: z.string().trim().min(1),
  value: z.string(),
  expectedRevision: z.number().int().min(0).optional(),
  mutationId: z.string().trim().min(1).max(200).optional(),
});

export type UpsertSettingDto = z.infer<typeof upsertSettingSchema>;

export { adminSettingsSchema, createAdminSettingsSchema } from './admin';
export type { AdminSettings, CreateAdminSettings, UpdateAdminSettings } from './admin';
