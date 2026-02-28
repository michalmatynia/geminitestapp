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

/**
 * Settings Scope Contract
 */
export const settingsScopeSchema = z.enum(['all', 'light', 'heavy']);
export type SettingsScopeDto = z.infer<typeof settingsScopeSchema>;

export { adminSettingsSchema, createAdminSettingsSchema } from './admin';
export type { AdminSettings, CreateAdminSettings, UpdateAdminSettings } from './admin';
