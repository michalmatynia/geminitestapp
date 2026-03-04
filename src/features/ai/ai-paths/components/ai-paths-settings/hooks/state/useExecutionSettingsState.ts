import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type {
  AiPathsValidationConfig,
  PathBlockedRunPolicy,
  PathExecutionMode,
  PathFlowIntensity,
  PathRunMode,
} from '@/shared/lib/ai-paths';
import {
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_DEFAULT,
  DEFAULT_AI_PATHS_VALIDATION_CONFIG,
} from '@/shared/lib/ai-paths';
import { useGraphActions, useGraphState } from '@/features/ai/ai-paths/context/GraphContext';

export function useExecutionSettingsState() {
  const graphState = useGraphState();
  const graphActions = useGraphActions();

  const [blockedRunPolicy, setBlockedRunPolicy] = useState<PathBlockedRunPolicy>('fail_run');
  const [aiPathsValidationState, setAiPathsValidationState] = useState<AiPathsValidationConfig>(
    DEFAULT_AI_PATHS_VALIDATION_CONFIG
  );
  const [historyRetentionPasses, setHistoryRetentionPasses] = useState<number>(
    AI_PATHS_HISTORY_RETENTION_DEFAULT
  );
  const [historyRetentionOptionsMax, setHistoryRetentionOptionsMax] = useState<number>(
    AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_DEFAULT
  );

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

  return {
    executionMode: graphState.executionMode,
    setExecutionMode,
    flowIntensity: graphState.flowIntensity,
    setFlowIntensity,
    runMode: graphState.runMode,
    setRunMode,
    strictFlowMode: graphState.strictFlowMode,
    setStrictFlowMode,
    blockedRunPolicy,
    setBlockedRunPolicy,
    aiPathsValidationState,
    setAiPathsValidationState,
    historyRetentionPasses,
    setHistoryRetentionPasses,
    historyRetentionOptionsMax,
    setHistoryRetentionOptionsMax,
  };
}
