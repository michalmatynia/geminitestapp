import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useGraphActions, useGraphState } from '@/features/ai/ai-paths/context/GraphContext';

export function useCoreSettingsState() {
  const graphState = useGraphState();
  const graphActions = useGraphActions();

  const setActivePathId = useCallback<Dispatch<SetStateAction<string | null>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(graphState.activePathId) : next;
      graphActions.setActivePathId(resolved ?? null);
    },
    [graphActions, graphState.activePathId]
  );

  const setIsPathLocked = useCallback<Dispatch<SetStateAction<boolean>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(graphState.isPathLocked) : next;
      graphActions.setIsPathLocked(Boolean(resolved));
    },
    [graphActions, graphState.isPathLocked]
  );

  const setIsPathActive = useCallback<Dispatch<SetStateAction<boolean>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(graphState.isPathActive) : next;
      graphActions.setIsPathActive(Boolean(resolved));
    },
    [graphActions, graphState.isPathActive]
  );

  const setPathName = useCallback<Dispatch<SetStateAction<string>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(graphState.pathName) : next;
      graphActions.setPathName(resolved);
    },
    [graphActions, graphState.pathName]
  );

  const setPathDescription = useCallback<Dispatch<SetStateAction<string>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(graphState.pathDescription) : next;
      graphActions.setPathDescription(resolved);
    },
    [graphActions, graphState.pathDescription]
  );

  const setActiveTrigger = useCallback<Dispatch<SetStateAction<string>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(graphState.activeTrigger) : next;
      graphActions.setActiveTrigger(resolved);
    },
    [graphActions, graphState.activeTrigger]
  );

  return {
    nodes: graphState.nodes,
    setNodes: graphActions.setNodes,
    edges: graphState.edges,
    setEdges: graphActions.setEdges,
    paths: graphState.paths,
    setPaths: graphActions.setPaths,
    pathConfigs: graphState.pathConfigs,
    setPathConfigs: graphActions.setPathConfigs,
    activePathId: graphState.activePathId,
    setActivePathId,
    isPathLocked: graphState.isPathLocked,
    setIsPathLocked,
    isPathActive: graphState.isPathActive,
    setIsPathActive,
    pathName: graphState.pathName,
    setPathName,
    pathDescription: graphState.pathDescription,
    setPathDescription,
    activeTrigger: graphState.activeTrigger,
    setActiveTrigger,
  };
}
