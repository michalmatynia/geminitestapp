import { APP_FONT_SET_SETTING_KEY } from '@/shared/constants/typography';
import { CMS_DOMAIN_SETTINGS_KEY } from '@/shared/contracts/cms';
import { CMS_THEME_SETTINGS_KEY } from '@/shared/contracts/cms-theme';
import {
  FOLDER_TREE_PROFILE_V2_KEY_PREFIX,
  FOLDER_TREE_UI_STATE_V2_KEY_PREFIX,
} from '@/shared/contracts/master-folder-tree';
import { CLIENT_LOGGING_KEYS, OBSERVABILITY_LOGGING_KEYS } from '@/shared/contracts/observability';
import { PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY } from '@/shared/contracts/products/base';
import {
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
  PRODUCT_IMAGES_EXTERNAL_ROUTES_SETTING_KEY,
  PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY,
} from '@/shared/lib/products/constants';
import { FILE_STORAGE_SOURCE_SETTING_KEY } from '@/shared/lib/files/constants';
import {
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_CONTENT_GROUPS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY,
} from '@/features/filemaker/settings-constants';
import { FILEMAKER_INVOICE_PDF_SETTINGS_KEY } from '@/features/filemaker/filemaker-invoice-pdf-settings';
import { FILEMAKER_JOB_APPLICATION_SETTINGS_KEY } from '@/features/filemaker/filemaker-job-application-settings';
import { folderTreeInstanceValues } from '@/shared/utils/folder-tree-profiles-v2';

const FOLDER_TREE_UI_STATE_V2_LITE_KEYS = folderTreeInstanceValues.map(
  (instance) => `${FOLDER_TREE_UI_STATE_V2_KEY_PREFIX}${instance}`
);
const FOLDER_TREE_PROFILE_V2_LITE_KEYS = folderTreeInstanceValues.map(
  (instance) => `${FOLDER_TREE_PROFILE_V2_KEY_PREFIX}${instance}`
);

export const LITE_SETTINGS_KEYS: readonly string[] = [
  APP_FONT_SET_SETTING_KEY,
  'admin_menu_favorites',
  'admin_menu_section_colors',
  'admin_menu_custom_enabled',
  'admin_menu_custom_nav',
  'front_page_app',
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
  CMS_DOMAIN_SETTINGS_KEY,
  CMS_THEME_SETTINGS_KEY,
  'social_publishing_settings_v1',
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_CONTENT_GROUPS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY,
  FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY,
  FILEMAKER_INVOICE_PDF_SETTINGS_KEY,
  FILEMAKER_JOB_APPLICATION_SETTINGS_KEY,
  ...FOLDER_TREE_UI_STATE_V2_LITE_KEYS,
  ...FOLDER_TREE_PROFILE_V2_LITE_KEYS,
  FILE_STORAGE_SOURCE_SETTING_KEY,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
  PRODUCT_IMAGES_EXTERNAL_ROUTES_SETTING_KEY,
  PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY,
  PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY,
  CLIENT_LOGGING_KEYS.featureFlags,
  CLIENT_LOGGING_KEYS.tags,
  OBSERVABILITY_LOGGING_KEYS.infoEnabled,
  OBSERVABILITY_LOGGING_KEYS.activityEnabled,
  OBSERVABILITY_LOGGING_KEYS.errorEnabled,
];

const LITE_SETTINGS_KEY_SET = new Set<string>(LITE_SETTINGS_KEYS);

export const isLiteSettingsKey = (key: string): boolean => LITE_SETTINGS_KEY_SET.has(key);
