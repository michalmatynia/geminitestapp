'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

import {
  useGraphActions,
  useGraphDataState,
  usePathMetadataState,
} from '@/features/ai/ai-paths/context/GraphContext';

export function useCoreSettingsState() {
  const graphDataState = useGraphDataState();
  const pathMetadataState = usePathMetadataState();
  const graphActions = useGraphActions();

  const setActivePathId = useCallback<Dispatch<SetStateAction<string | null>>>(
    (next): void => {
      const resolved =
        typeof next === 'function' ? next(pathMetadataState.activePathId) : next;
      graphActions.setActivePathId(resolved ?? null);
    },
    [graphActions, pathMetadataState.activePathId]
  );

  const setIsPathLocked = useCallback<Dispatch<SetStateAction<boolean>>>(
    (next): void => {
      const resolved =
        typeof next === 'function' ? next(pathMetadataState.isPathLocked) : next;
      graphActions.setIsPathLocked(Boolean(resolved));
    },
    [graphActions, pathMetadataState.isPathLocked]
  );

  const setIsPathActive = useCallback<Dispatch<SetStateAction<boolean>>>(
    (next): void => {
      const resolved =
        typeof next === 'function' ? next(pathMetadataState.isPathActive) : next;
      graphActions.setIsPathActive(Boolean(resolved));
    },
    [graphActions, pathMetadataState.isPathActive]
  );

  const setPathName = useCallback<Dispatch<SetStateAction<string>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(pathMetadataState.pathName) : next;
      graphActions.setPathName(resolved);
    },
    [graphActions, pathMetadataState.pathName]
  );

  const setPathDescription = useCallback<Dispatch<SetStateAction<string>>>(
    (next): void => {
      const resolved =
        typeof next === 'function' ? next(pathMetadataState.pathDescription) : next;
      graphActions.setPathDescription(resolved);
    },
    [graphActions, pathMetadataState.pathDescription]
  );

  const setActiveTrigger = useCallback<Dispatch<SetStateAction<string>>>(
    (next): void => {
      const resolved =
        typeof next === 'function' ? next(pathMetadataState.activeTrigger) : next;
      graphActions.setActiveTrigger(resolved);
    },
    [graphActions, pathMetadataState.activeTrigger]
  );

  return {
    nodes: graphDataState.nodes,
    setNodes: graphActions.setNodes,
    edges: graphDataState.edges,
    setEdges: graphActions.setEdges,
    paths: pathMetadataState.paths,
    setPaths: graphActions.setPaths,
    pathConfigs: pathMetadataState.pathConfigs,
    setPathConfigs: graphActions.setPathConfigs,
    activePathId: pathMetadataState.activePathId,
    setActivePathId,
    isPathLocked: pathMetadataState.isPathLocked,
    setIsPathLocked,
    isPathActive: pathMetadataState.isPathActive,
    setIsPathActive,
    pathName: pathMetadataState.pathName,
    setPathName,
    pathDescription: pathMetadataState.pathDescription,
    setPathDescription,
    activeTrigger: pathMetadataState.activeTrigger,
    setActiveTrigger,
  };
}
