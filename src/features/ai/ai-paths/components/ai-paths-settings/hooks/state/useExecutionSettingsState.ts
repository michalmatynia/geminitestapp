import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type {
  AiPathsValidationConfig,
  PathBlockedRunPolicy,
  PathExecutionMode,
  PathFlowIntensity,
  PathRunMode,
} from '@/shared/lib/ai-paths';
import {
  normalizeAiPathsValidationConfig,
} from '@/shared/lib/ai-paths';
import { useGraphActions, useGraphState } from '@/features/ai/ai-paths/context/GraphContext';

export function useExecutionSettingsState() {
  const graphState = useGraphState();
  const graphActions = useGraphActions();

  const setExecutionMode = useCallback<Dispatch<SetStateAction<PathExecutionMode>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(graphState.executionMode) : next;
      graphActions.setExecutionMode(resolved);
    },
    [graphActions, graphState.executionMode]
  );

  const setFlowIntensity = useCallback<Dispatch<SetStateAction<PathFlowIntensity>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(graphState.flowIntensity) : next;
      graphActions.setFlowIntensity(resolved);
    },
    [graphActions, graphState.flowIntensity]
  );

  const setRunMode = useCallback<Dispatch<SetStateAction<PathRunMode>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(graphState.runMode) : next;
      graphActions.setRunMode(resolved);
    },
    [graphActions, graphState.runMode]
  );

  const setStrictFlowMode = useCallback<Dispatch<SetStateAction<boolean>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(graphState.strictFlowMode) : next;
      graphActions.setStrictFlowMode(Boolean(resolved));
    },
    [graphActions, graphState.strictFlowMode]
  );

  const setBlockedRunPolicy = useCallback<Dispatch<SetStateAction<PathBlockedRunPolicy>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(graphState.blockedRunPolicy) : next;
      graphActions.setBlockedRunPolicy(resolved);
    },
    [graphActions, graphState.blockedRunPolicy]
  );

  const setAiPathsValidationState = useCallback<Dispatch<SetStateAction<AiPathsValidationConfig>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(graphState.aiPathsValidation) : next;
      graphActions.setAiPathsValidation(normalizeAiPathsValidationConfig(resolved));
    },
    [graphActions, graphState.aiPathsValidation]
  );

  const setHistoryRetentionPasses = useCallback<Dispatch<SetStateAction<number>>>(
    (next): void => {
      const resolved =
        typeof next === 'function' ? next(graphState.historyRetentionPasses) : Number(next);
      graphActions.setHistoryRetentionPasses(resolved);
    },
    [graphActions, graphState.historyRetentionPasses]
  );

  const setHistoryRetentionOptionsMax = useCallback<Dispatch<SetStateAction<number>>>(
    (next): void => {
      const resolved =
        typeof next === 'function' ? next(graphState.historyRetentionOptionsMax) : Number(next);
      graphActions.setHistoryRetentionOptionsMax(resolved);
    },
    [graphActions, graphState.historyRetentionOptionsMax]
  );

  return {
    executionMode: graphState.executionMode,
    setExecutionMode,
    flowIntensity: graphState.flowIntensity,
    setFlowIntensity,
    runMode: graphState.runMode,
    setRunMode,
    strictFlowMode: graphState.strictFlowMode,
    setStrictFlowMode,
    blockedRunPolicy: graphState.blockedRunPolicy,
    setBlockedRunPolicy,
    aiPathsValidationState: graphState.aiPathsValidation,
    setAiPathsValidationState,
    historyRetentionPasses: graphState.historyRetentionPasses,
    setHistoryRetentionPasses,
    historyRetentionOptionsMax: graphState.historyRetentionOptionsMax,
    setHistoryRetentionOptionsMax,
  };
}
