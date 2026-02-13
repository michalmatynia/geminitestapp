import type { AdminSettingsDto, UpdateAdminSettingsDto } from '@/shared/contracts/admin';
import type { SettingRecordDto } from '@/shared/contracts/settings';

import { Entity } from '../core/base-types';

export type { AdminSettingsDto, UpdateAdminSettingsDto };

export type SystemSetting = SettingRecordDto;

export type ChatbotSettingsRecord = Entity & {
  key: string;
  settings: Record<string, unknown>;
};
