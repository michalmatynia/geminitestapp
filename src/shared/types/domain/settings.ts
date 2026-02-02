import { Entity } from './base-types';

export type SystemSetting = {
  key: string;
  value: string;
};

export type ChatbotSettingsRecord = Entity & {
  key: string;
  settings: Record<string, unknown>;
};
