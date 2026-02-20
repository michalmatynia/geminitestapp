import type {
  BlockDefinition as CmsBlockDefinition,
  BlockInstance as CmsBlockInstance,
  InspectorSettings as CmsInspectorSettings,
  PageBuilderAction as CmsPageBuilderAction,
  PageBuilderSnapshot as CmsPageBuilderSnapshot,
  PageBuilderState as CmsPageBuilderState,
  PageZone as CmsPageZone,
  SectionDefinition as CmsSectionDefinition,
  SectionInstance as CmsSectionInstance,
  SettingsField as CmsSettingsField,
  SettingsFieldOption as CmsSettingsFieldOption,
} from '@/shared/contracts/cms';
import { DEFAULT_INSPECTOR_SETTINGS as CMS_DEFAULT_INSPECTOR_SETTINGS } from '@/shared/contracts/cms';

export type BlockInstance = CmsBlockInstance;
export type SectionInstance = CmsSectionInstance;
export type PageZone = CmsPageZone;
export type InspectorSettings = CmsInspectorSettings;
export type PageBuilderSnapshot = CmsPageBuilderSnapshot;
export type PageBuilderState = CmsPageBuilderState;
export type PageBuilderAction = CmsPageBuilderAction;
export type BlockDefinition = CmsBlockDefinition;
export type SectionDefinition = CmsSectionDefinition;
export type SettingsFieldOption = CmsSettingsFieldOption;

// Keep the previous generic call sites valid while relying on shared CMS contracts.
export type SettingsField<_T = Record<string, unknown>> = CmsSettingsField;

export const DEFAULT_INSPECTOR_SETTINGS: InspectorSettings = CMS_DEFAULT_INSPECTOR_SETTINGS;
