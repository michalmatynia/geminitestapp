import { CLIENT_LOGGING_KEYS } from '@/shared/contracts/observability';
import {
  FOLDER_TREE_PROFILE_V2_KEY_PREFIX,
  FOLDER_TREE_V2_MIGRATION_MARKER_KEY,
  FOLDER_TREE_UI_STATE_V2_KEY_PREFIX,
} from '@/shared/contracts/master-folder-tree';
import { PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY } from '@/shared/contracts/products';
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
  `${FOLDER_TREE_UI_STATE_V2_KEY_PREFIX}notes`,
  `${FOLDER_TREE_UI_STATE_V2_KEY_PREFIX}image_studio`,
  `${FOLDER_TREE_UI_STATE_V2_KEY_PREFIX}product_categories`,
  `${FOLDER_TREE_UI_STATE_V2_KEY_PREFIX}cms_page_builder`,
  `${FOLDER_TREE_UI_STATE_V2_KEY_PREFIX}case_resolver`,
  `${FOLDER_TREE_UI_STATE_V2_KEY_PREFIX}case_resolver_cases`,
  `${FOLDER_TREE_PROFILE_V2_KEY_PREFIX}notes`,
  `${FOLDER_TREE_PROFILE_V2_KEY_PREFIX}image_studio`,
  `${FOLDER_TREE_PROFILE_V2_KEY_PREFIX}product_categories`,
  `${FOLDER_TREE_PROFILE_V2_KEY_PREFIX}cms_page_builder`,
  `${FOLDER_TREE_PROFILE_V2_KEY_PREFIX}case_resolver`,
  `${FOLDER_TREE_PROFILE_V2_KEY_PREFIX}case_resolver_cases`,
  FOLDER_TREE_V2_MIGRATION_MARKER_KEY,
  PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY,
  FOLDER_TREE_PROFILES_V2_SETTING_KEY,
  CLIENT_LOGGING_KEYS.featureFlags,
  CLIENT_LOGGING_KEYS.tags,
] as const;

const LITE_SETTINGS_KEY_SET = new Set<string>(LITE_SETTINGS_KEYS);

export const isLiteSettingsKey = (key: string): boolean => LITE_SETTINGS_KEY_SET.has(key);
