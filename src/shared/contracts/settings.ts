import { z } from 'zod';
import type { MongoSettingRecordDto } from './base';

/**
 * Setting Record Contract
 */
export const settingRecordSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export type SettingRecord = z.infer<typeof settingRecordSchema>;
export type { SettingRecord as SystemSetting };
export type MongoSettingLookupRecord<TId = string, TValue = string> = Partial<
  MongoSettingRecordDto<TId, TValue>
>;
export type MongoStringSettingRecord<TId = string> = MongoSettingLookupRecord<TId, string>;
export type MongoTimestampedSettingRecord<
  TId = string,
  TValue = string,
  TTimestamp = string | Date,
> = MongoSettingLookupRecord<TId, TValue> & {
  createdAt?: TTimestamp;
  updatedAt?: TTimestamp;
};
export type MongoTimestampedStringSettingRecord<
  TId = string,
  TTimestamp = string | Date,
> = MongoTimestampedSettingRecord<TId, string, TTimestamp>;
export type MongoPersistedSettingRecord<
  TId = string,
  TValue = string,
  TTimestamp = string | Date,
> = MongoSettingRecordDto<TId, TValue> & {
  createdAt: TTimestamp;
  updatedAt: TTimestamp;
};
export type MongoPersistedStringSettingRecord<
  TId = string,
  TTimestamp = string | Date,
> = MongoPersistedSettingRecord<TId, string, TTimestamp>;

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
