import { useMemo } from 'react';

import type { AiNode, PathConfig, PathMeta } from '@/shared/lib/ai-paths';

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type UseAiPathsSettingsDerivedStateArgs = {
  nodes: AiNode[];
  selectedNodeId: string | null;
  paths: PathMeta[];
  pathConfigs: Record<string, PathConfig>;
  autoSaveStatus: AutoSaveStatus;
};

export function useAiPathsSettingsDerivedState({
  nodes,
  selectedNodeId,
  paths,
  pathConfigs,
  autoSaveStatus,
}: UseAiPathsSettingsDerivedStateArgs) {
  const selectedNode = useMemo(
    (): AiNode | null => nodes.find((node: AiNode): boolean => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const pathFlagsById = useMemo(
    () =>
      paths.reduce(
        (acc, path) => {
          const config = pathConfigs[path.id];
          acc[path.id] = {
            isLocked: config?.isLocked ?? false,
            isActive: config?.isActive ?? true,
          };
          return acc;
        },
        {} as Record<string, { isLocked: boolean; isActive: boolean }>
      ),
    [paths, pathConfigs]
  );

  const autoSaveLabel = useMemo((): string => {
    switch (autoSaveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Save error';
      default:
        return '';
    }
  }, [autoSaveStatus]);

  const autoSaveClasses = useMemo((): string => {
    switch (autoSaveStatus) {
      case 'saving':
        return 'text-yellow-500';
      case 'saved':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return '';
    }
  }, [autoSaveStatus]);

  return {
    selectedNode,
    pathFlagsById,
    autoSaveLabel,
    autoSaveClasses,
  };
}
