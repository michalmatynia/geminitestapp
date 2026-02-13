import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * Setting Record Contract
 */
export const settingRecordSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export type SettingRecordDto = z.infer<typeof settingRecordSchema>;

/**
 * Settings Scope Contract
 */
export const settingsScopeSchema = z.enum(['all', 'light', 'heavy']);
export type SettingsScopeDto = z.infer<typeof settingsScopeSchema>;

/**
 * Admin Settings Contract
 */
export const adminSettingsSchema = dtoBaseSchema.extend({
  siteName: z.string(),
  siteDescription: z.string(),
  maintenanceMode: z.boolean(),
  allowRegistration: z.boolean(),
  emailSettings: z.object({
    provider: z.string(),
    config: z.record(z.string(), z.unknown()),
  }),
  storageSettings: z.object({
    provider: z.string(),
    config: z.record(z.string(), z.unknown()),
  }),
});

export type AdminSettingsDto = z.infer<typeof adminSettingsSchema>;

export const createAdminSettingsSchema = adminSettingsSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAdminSettingsDto = z.infer<typeof createAdminSettingsSchema>;
export type UpdateAdminSettingsDto = Partial<CreateAdminSettingsDto>;
