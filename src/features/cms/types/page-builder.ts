/**
 * Page Builder Type Definitions
 * 
 * Core type definitions for the CMS page builder system.
 * Provides:
 * - Block and section type definitions
 * - Page builder state and action types
 * - Inspector settings interfaces
 * - Page zone configuration types
 * - Snapshot and history management types
 */

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
  SettingsField as CmsSettingsFieldBase,
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
export type CmsSettingsField<T = Record<string, unknown>> = CmsSettingsFieldBase & { phantom?: T };

export const DEFAULT_INSPECTOR_SETTINGS: InspectorSettings = CMS_DEFAULT_INSPECTOR_SETTINGS;
