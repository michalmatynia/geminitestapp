import { Entity } from '../core/base-types';

import type { AdminSettingsDto, UpdateAdminSettingsDto } from '../dtos';

export type { AdminSettingsDto, UpdateAdminSettingsDto };

export type SystemSetting = {
  key: string;
  value: string;
};

export type ChatbotSettingsRecord = Entity & {
  key: string;
  settings: Record<string, unknown>;
};