import type {
  ClipboardDataDto,
  PageBuilderSnapshotDto,
  PageBuilderHistoryDto,
  CmsInspectorSettingsDto,
  PageBuilderStateDto,
  PageBuilderActionDto,
} from '@/shared/contracts/cms';
import type {
  PageSummary,
  Page,
  PageStatus,
  PageSeoData,
  SettingsFieldOption,
  SettingsField,
  SectionDefinition,
  BlockDefinition,
  PageZone,
  BlockInstance,
  SectionInstance
} from '@/shared/types/domain/cms';

export type {
  PageSummary,
  Page,
  PageStatus,
  PageSeoData,
  SettingsFieldOption,
  SettingsField,
  SectionDefinition,
  BlockDefinition,
  PageZone,
  BlockInstance,
  SectionInstance
};

// ---------------------------------------------------------------------------
// Page builder state & actions
// ---------------------------------------------------------------------------

export type ClipboardData = ClipboardDataDto;

export type PageBuilderSnapshot = PageBuilderSnapshotDto;

export type PageBuilderHistory = PageBuilderHistoryDto;

export type InspectorSettings = CmsInspectorSettingsDto;

export const DEFAULT_INSPECTOR_SETTINGS: InspectorSettings = {
  showTooltip: true,
  showStyleSettings: true,
  showStructureInfo: true,
  showIdentifiers: false,
  showVisibilityInfo: true,
  showConnectionInfo: true,
  showEditorChrome: false,
};

export type PageBuilderState = PageBuilderStateDto;

export type PageBuilderAction = PageBuilderActionDto;
