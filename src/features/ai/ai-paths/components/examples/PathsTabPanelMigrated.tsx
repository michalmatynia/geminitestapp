'use client';

import { useMemo } from 'react';

import type { PathMeta } from '@/shared/types/domain/ai-paths';

import { useGraphState } from '../../context';
import { useAiPathsSettingsOrchestrator } from '../ai-paths-settings/AiPathsSettingsOrchestratorContext';
import { PathsTabPanel } from '../ui-panels';

export type PathsTabPanelMigratedProps = {
  onTabChange?: ((tab: 'canvas' | 'paths' | 'docs') => void) | undefined;
};

export function PathsTabPanelMigrated({
  onTabChange,
}: PathsTabPanelMigratedProps): React.JSX.Element {
  const { paths, pathConfigs } = useGraphState();
  const { handleCreatePath, savePathIndex, handleSwitchPath, handleDeletePath } =
    useAiPathsSettingsOrchestrator();

  const pathFlagsById = useMemo(
    (): Record<string, { isLocked: boolean; isActive: boolean }> => {
      const next: Record<string, { isLocked: boolean; isActive: boolean }> = {};
      paths.forEach((meta: PathMeta) => {
        const config = pathConfigs[meta.id];
        next[meta.id] = {
          isLocked: config?.isLocked ?? false,
          isActive: config?.isActive ?? true,
        };
      });
      return next;
    },
    [pathConfigs, paths]
  );

  return (
    <PathsTabPanel
      paths={paths}
      pathFlagsById={pathFlagsById}
      onCreatePath={handleCreatePath}
      onSaveList={() => {
        void savePathIndex(paths).catch(() => {});
      }}
      onEditPath={(pathId: string): void => {
        handleSwitchPath(pathId);
        onTabChange?.('canvas');
      }}
      onDeletePath={(pathId: string): void => {
        void handleDeletePath(pathId).catch(() => {});
      }}
    />
  );
}
