import type { SettingRecordDto } from '@/shared/dtos/settings';

import { Entity } from '../core/base-types';

import type { AdminSettingsDto, UpdateAdminSettingsDto } from '../dtos';

export type { AdminSettingsDto, UpdateAdminSettingsDto };

export type SystemSetting = SettingRecordDto;

export type ChatbotSettingsRecord = Entity & {
  key: string;
  settings: Record<string, unknown>;
};
