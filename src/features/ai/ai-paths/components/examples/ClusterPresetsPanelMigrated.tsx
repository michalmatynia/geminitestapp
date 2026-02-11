'use client';

/**
 * ClusterPresetsPanelMigrated - Thin wrapper for ClusterPresetsPanel.
 *
 * NOW FULLY MIGRATED: All state and interactions come from context.
 */

import type { ClusterPreset } from '@/features/ai/ai-paths/lib';

import { useAiPathsSettingsOrchestrator } from '../ai-paths-settings/AiPathsSettingsOrchestratorContext';
import { ClusterPresetsPanel, type ClusterPresetDraft } from '../cluster-presets-panel';

export type ClusterPresetsPanelMigratedProps = {
  /** Callback to create preset from current selection */
  onPresetFromSelection?: (() => void) | undefined;
  /** Callback to save preset (involves API) */
  onSavePreset?: (() => void) | undefined;
  /** Callback to apply preset to canvas */
  onApplyPreset?: ((preset: ClusterPreset) => void) | undefined;
  /** Callback to delete preset (involves API) */
  onDeletePreset?: ((presetId: string) => void) | undefined;
  /** Callback to open export modal */
  onExportPresets?: (() => void) | undefined;

  presetDraft?: ClusterPresetDraft;
  setPresetDraft?: (draft: ClusterPresetDraft | ((prev: ClusterPresetDraft) => ClusterPresetDraft)) => void;
};

/**
 * ClusterPresetsPanelMigrated - Context-based wrapper.
 */
export function ClusterPresetsPanelMigrated({
  onPresetFromSelection,
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
  onExportPresets,
  presetDraft,
  setPresetDraft,
}: ClusterPresetsPanelMigratedProps): React.JSX.Element {
  const {
    handlePresetFromSelection,
    handleSavePreset,
    handleApplyPreset,
    handleDeletePreset,
    handleExportPresets,
  } = useAiPathsSettingsOrchestrator();

  return (
    <ClusterPresetsPanel
      onPresetFromSelection={onPresetFromSelection ?? handlePresetFromSelection}
      onSavePreset={onSavePreset ?? (() => { handleSavePreset().catch(() => {}); })}
      onApplyPreset={onApplyPreset ?? handleApplyPreset}
      onDeletePreset={onDeletePreset ?? ((presetId: string) => { handleDeletePreset(presetId).catch(() => {}); })}
      onExportPresets={onExportPresets ?? handleExportPresets}
      {...(presetDraft !== undefined ? { presetDraft } : {})}
      {...(setPresetDraft !== undefined ? { setPresetDraft } : {})}
    />
  );
}
