import { CLIENT_LOGGING_KEYS } from '@/features/observability/constants/client-logging';
import { PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY } from '@/features/products/constants';
import { APP_FONT_SET_SETTING_KEY } from '@/shared/constants/typography';
import { FOLDER_TREE_PROFILES_V2_SETTING_KEY } from '@/shared/utils/folder-tree-profiles-v2';

export const LITE_SETTINGS_KEYS = [
  APP_FONT_SET_SETTING_KEY,
  'background_sync_enabled',
  'background_sync_interval_seconds',
  'query_status_panel_enabled',
  'query_status_panel_open',
  'noteSettings:selectedFolderId',
  'noteSettings:selectedNotebookId',
  'noteSettings:autoformatOnPaste',
  'noteSettings:editorMode',
  'case_resolver_default_document_format_v1',
  'case_resolver_settings_v1',
  PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY,
  FOLDER_TREE_PROFILES_V2_SETTING_KEY,
  CLIENT_LOGGING_KEYS.featureFlags,
  CLIENT_LOGGING_KEYS.tags,
] as const;

const LITE_SETTINGS_KEY_SET = new Set<string>(LITE_SETTINGS_KEYS);

export const isLiteSettingsKey = (key: string): boolean =>
  LITE_SETTINGS_KEY_SET.has(key);
