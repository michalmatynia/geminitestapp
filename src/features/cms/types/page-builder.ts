import type {
  ClipboardDataDto,
  PageBuilderSnapshotDto,
  PageBuilderHistoryDto,
  CmsInspectorSettingsDto,
  PageBuilderStateDto,
  PageBuilderActionDto,
  CmsPageSummaryDto as PageSummary,
  CmsPageDto as Page,
  CmsPageStatusDto as PageStatus,
  CmsPageSeoDto as PageSeoData,
  SettingsFieldOptionDto as SettingsFieldOption,
  SettingsFieldDto as SettingsField,
  SectionDefinitionDto as SectionDefinition,
  BlockDefinitionDto as BlockDefinition,
  PageZoneDto as PageZone,
  CmsBlockInstanceDto as BlockInstance,
  CmsSectionInstanceDto as SectionInstance
} from '@/shared/contracts/cms';

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
