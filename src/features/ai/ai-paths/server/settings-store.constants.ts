import type { MongoSettingDoc as MongoAiPathsSettingDoc } from '@/shared/lib/db/services/database-sync-types';
export {
  AI_PATHS_MAINTENANCE_ACTION_IDS,
  type AiPathsMaintenanceActionId,
  type AiPathsMaintenanceActionReport,
  type AiPathsMaintenanceReport,
  type AiPathsMaintenanceApplyResult,
} from '@/shared/contracts/ai-paths';
export type { AiPathsSettingRecordDto as AiPathsSettingRecord } from '@/shared/contracts/ai-paths';
export type { MongoAiPathsSettingDoc };

export const AI_PATHS_SETTINGS_COLLECTION = 'ai_paths_settings';
export const AI_PATHS_KEY_PREFIX = 'ai_paths_';
export const AI_PATHS_INDEX_KEY = 'ai_paths_index';
export const AI_PATHS_CONFIG_KEY_PREFIX = 'ai_paths_config_';
export const AI_PATHS_TRIGGER_BUTTONS_KEY = 'ai_paths_trigger_buttons';
export const MONGO_INDEX_NAME = 'ai_paths_settings_key';
export const AI_PATHS_CONFIG_COMPACTION_THRESHOLD = 120_000;
export const INFER_FIELDS_TRIGGER_BUTTON_ID = 'c5288f60-3a78-4415-891c-8953c3187b5a';

export type ParsedPathMeta = {
  id: string;
  name: string;
  folderPath?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
};

export type ParsedPathConfig = {
  id?: string;
  name?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  isActive?: boolean;
  isLocked?: boolean;
};
