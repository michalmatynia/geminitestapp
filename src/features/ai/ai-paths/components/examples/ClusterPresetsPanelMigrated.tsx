'use client';

/**
 * ClusterPresetsPanelMigrated - Thin wrapper for ClusterPresetsPanel.
 *
 * NOW FULLY MIGRATED: All state and interactions come from context.
 */

import type { ClusterPreset } from '@/features/ai/ai-paths/lib';

import { ClusterPresetsPanel, type ClusterPresetDraft } from '../cluster-presets-panel';

export type ClusterPresetsPanelMigratedProps = {
  /** Callback to create preset from current selection */
  onPresetFromSelection: () => void;
  /** Callback to save preset (involves API) */
  onSavePreset: () => void;
  /** Callback to apply preset to canvas */
  onApplyPreset: (preset: ClusterPreset) => void;
  /** Callback to delete preset (involves API) */
  onDeletePreset: (presetId: string) => void;
  /** Callback to open export modal */
  onExportPresets: () => void;

  presetDraft?: ClusterPresetDraft;
  setPresetDraft?: (draft: ClusterPresetDraft | ((prev: ClusterPresetDraft) => ClusterPresetDraft)) => void;
};

/**
 * ClusterPresetsPanelMigrated - Context-based wrapper.
 */
export function ClusterPresetsPanelMigrated(props: ClusterPresetsPanelMigratedProps): React.JSX.Element {
  return <ClusterPresetsPanel {...props} />;
}