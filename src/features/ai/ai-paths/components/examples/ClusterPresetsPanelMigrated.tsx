"use client";

/**
 * ClusterPresetsPanelMigrated - Context-based wrapper for ClusterPresetsPanel.
 *
 * BEFORE: 11 props
 * ```tsx
 * <ClusterPresetsPanel
 *   presetDraft={presetDraft}
 *   setPresetDraft={setPresetDraft}
 *   editingPresetId={editingPresetId}
 *   onResetPresetDraft={...}
 *   clusterPresets={clusterPresets}
 *   onLoadPreset={...}
 *   ... 5 more callback props
 * />
 * ```
 *
 * AFTER: 5 props (only callbacks for orchestration)
 * ```tsx
 * <ClusterPresetsPanelMigrated
 *   onPresetFromSelection={...}
 *   onSavePreset={...}
 *   onApplyPreset={...}
 *   onDeletePreset={...}
 *   onExportPresets={...}
 * />
 * ```
 *
 * State props eliminated (6 props removed, 55% reduction):
 * - presetDraft, setPresetDraft → PresetsContext
 * - editingPresetId → PresetsContext
 * - clusterPresets → PresetsContext
 * - onResetPresetDraft → PresetsContext action (resetPresetDraft)
 * - onLoadPreset → PresetsContext action (loadPresetIntoDraft)
 */

import { ClusterPresetsPanel } from "../cluster-presets-panel";
import { usePresetsState, usePresetsActions } from "../../context/PresetsContext";
import type { ClusterPreset } from "@/features/ai/ai-paths/lib";

/**
 * Props for ClusterPresetsPanelMigrated.
 * Only callbacks that involve external orchestration remain.
 */
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
}: ClusterPresetsPanelMigratedProps): React.JSX.Element {
  // Read state from PresetsContext
  const { presetDraft, editingPresetId, clusterPresets } = usePresetsState();
  const { setPresetDraft, resetPresetDraft, loadPresetIntoDraft } = usePresetsActions();

  return (
    <ClusterPresetsPanel
      // State from PresetsContext
      presetDraft={presetDraft}
      setPresetDraft={setPresetDraft}
      editingPresetId={editingPresetId}
      clusterPresets={clusterPresets}
      // Actions from PresetsContext
      onResetPresetDraft={resetPresetDraft}
      onLoadPreset={loadPresetIntoDraft}
      // Callback props passed through
      onPresetFromSelection={onPresetFromSelection}
      onSavePreset={onSavePreset}
      onApplyPreset={onApplyPreset}
      onDeletePreset={onDeletePreset}
      onExportPresets={onExportPresets}
    />
  );
}
