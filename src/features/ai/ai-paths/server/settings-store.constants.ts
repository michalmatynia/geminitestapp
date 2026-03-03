import { type ObjectId } from 'mongodb';

export const AI_PATHS_SETTINGS_COLLECTION = 'ai_paths_settings';
export const AI_PATHS_KEY_PREFIX = 'ai_paths_';
export const AI_PATHS_INDEX_KEY = 'ai_paths_index';
export const AI_PATHS_CONFIG_KEY_PREFIX = 'ai_paths_config_';
export const AI_PATHS_TRIGGER_BUTTONS_KEY = 'ai_paths_trigger_buttons';
export const MONGO_INDEX_NAME = 'ai_paths_settings_key';
export const AI_PATHS_CONFIG_COMPACTION_THRESHOLD = 120_000;
export const INFER_FIELDS_TRIGGER_BUTTON_ID = 'c5288f60-3a78-4415-891c-8953c3187b5a';

export type AiPathsSettingRecord = {
  key: string;
  value: string;
};

export type MongoAiPathsSettingDoc = {
  _id?: string | ObjectId;
  key?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ParsedPathMeta = {
  id: string;
  name: string;
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

export const AI_PATHS_MAINTENANCE_ACTION_IDS = [
  'compact_oversized_configs',
  'repair_path_index',
  'ensure_starter_workflow_defaults',
  'upgrade_runtime_input_contracts',
  'upgrade_server_execution_mode',
] as const;

export type AiPathsMaintenanceActionId = (typeof AI_PATHS_MAINTENANCE_ACTION_IDS)[number];

export type AiPathsMaintenanceActionReport = {
  id: AiPathsMaintenanceActionId;
  title: string;
  description: string;
  blocking: boolean;
  status: 'pending' | 'ready';
  affectedRecords: number;
};

export type AiPathsMaintenanceReport = {
  scannedAt: string;
  pendingActions: number;
  blockingActions: number;
  actions: AiPathsMaintenanceActionReport[];
};

export type AiPathsMaintenanceApplyResult = {
  appliedActionIds: AiPathsMaintenanceActionId[];
  report: AiPathsMaintenanceReport;
};
