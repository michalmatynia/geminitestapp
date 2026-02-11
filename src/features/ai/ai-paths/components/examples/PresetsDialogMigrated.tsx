'use client';

import { useAiPathsSettingsOrchestrator } from '../ai-paths-settings/AiPathsSettingsOrchestratorContext';
import { PresetsDialogWithContext } from '../presets-dialog';

export type PresetsDialogMigratedProps = Record<string, never>;

export function PresetsDialogMigrated(
  _props: PresetsDialogMigratedProps = {}
): React.JSX.Element {
  const { handleImportPresets, toast, reportAiPathsError } =
    useAiPathsSettingsOrchestrator();

  return (
    <PresetsDialogWithContext
      onImportPresets={(mode: 'merge' | 'replace'): void => {
        void handleImportPresets(mode).catch(() => {});
      }}
      toast={toast}
      reportAiPathsError={reportAiPathsError}
    />
  );
}
