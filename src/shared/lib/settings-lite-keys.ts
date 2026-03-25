import { APP_FONT_SET_SETTING_KEY } from '@/shared/constants/typography';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_LAUNCH_ROUTE_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
} from '@/shared/contracts/kangur';
import {
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  KANGUR_TEST_SUITES_SETTING_KEY,
} from '@/shared/contracts/kangur-tests';
import { KANGUR_AI_TUTOR_APP_SETTINGS_KEY } from '@/shared/contracts/kangur-ai-tutor';
import {
  FOLDER_TREE_PROFILE_V2_KEY_PREFIX,
  FOLDER_TREE_UI_STATE_V2_KEY_PREFIX,
} from '@/shared/contracts/master-folder-tree';
import { CLIENT_LOGGING_KEYS, OBSERVABILITY_LOGGING_KEYS } from '@/shared/contracts/observability';
import { PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY } from '@/shared/contracts/products';
import { folderTreeInstanceValues } from '@/shared/utils/folder-tree-profiles-v2';

const FOLDER_TREE_UI_STATE_V2_LITE_KEYS = folderTreeInstanceValues.map(
  (instance) => `${FOLDER_TREE_UI_STATE_V2_KEY_PREFIX}${instance}`
);
const FOLDER_TREE_PROFILE_V2_LITE_KEYS = folderTreeInstanceValues.map(
  (instance) => `${FOLDER_TREE_PROFILE_V2_KEY_PREFIX}${instance}`
);

export const LITE_SETTINGS_KEYS: readonly string[] = [
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
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_LAUNCH_ROUTE_SETTINGS_KEY,
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
  KANGUR_TEST_SUITES_SETTING_KEY,
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  ...FOLDER_TREE_UI_STATE_V2_LITE_KEYS,
  ...FOLDER_TREE_PROFILE_V2_LITE_KEYS,
  PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY,
  CLIENT_LOGGING_KEYS.featureFlags,
  CLIENT_LOGGING_KEYS.tags,
  OBSERVABILITY_LOGGING_KEYS.infoEnabled,
  OBSERVABILITY_LOGGING_KEYS.activityEnabled,
  OBSERVABILITY_LOGGING_KEYS.errorEnabled,
];

const LITE_SETTINGS_KEY_SET = new Set<string>(LITE_SETTINGS_KEYS);

export const isLiteSettingsKey = (key: string): boolean => LITE_SETTINGS_KEY_SET.has(key);
