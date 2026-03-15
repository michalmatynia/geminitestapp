import type {
  BlockDefinition,
  BlockInstance,
  InspectorSettings,
  PageBuilderAction,
  PageBuilderSnapshot,
  PageBuilderState,
  PageZone,
  SectionDefinition,
  SectionInstance,
  SettingsField as CmsSettingsField,
  SettingsFieldOption,
} from '@/shared/contracts/cms';
import { DEFAULT_INSPECTOR_SETTINGS as CMS_DEFAULT_INSPECTOR_SETTINGS } from '@/shared/contracts/cms';

export type {
  BlockDefinition,
  BlockInstance,
  InspectorSettings,
  PageBuilderAction,
  PageBuilderSnapshot,
  PageBuilderState,
  PageZone,
  SectionDefinition,
  SectionInstance,
  SettingsFieldOption,
};

// Keep the previous generic call sites valid while relying on shared CMS contracts.
export type SettingsField<_T = Record<string, unknown>> = CmsSettingsField;

export const DEFAULT_INSPECTOR_SETTINGS: InspectorSettings = CMS_DEFAULT_INSPECTOR_SETTINGS;
