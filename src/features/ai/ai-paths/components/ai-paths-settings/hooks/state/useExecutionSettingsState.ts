'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

import {
  useGraphActions,
  usePathMetadataState,
} from '@/features/ai/ai-paths/context/GraphContext';
import type { AiPathsValidationConfig, PathBlockedRunPolicy, PathExecutionMode, PathFlowIntensity, PathRunMode } from '@/shared/lib/ai-paths';
import { normalizeAiPathsValidationConfig } from '@/shared/lib/ai-paths';

const resolveStateAction = <T,>(next: SetStateAction<T>, currentValue: T): T =>
  typeof next === 'function' ? (next as (previous: T) => T)(currentValue) : next;

const normalizeBoolean = (value: boolean): boolean => Boolean(value);
const normalizeNumber = (value: number): number => Number(value);

const useResolvedGraphSettingSetter = <T,>(
  currentValue: T,
  commit: (value: T) => void,
  normalize?: (value: T) => T
): Dispatch<SetStateAction<T>> =>
  useCallback<Dispatch<SetStateAction<T>>>(
    (next): void => {
      const resolved = resolveStateAction(next, currentValue);
      commit(normalize ? normalize(resolved) : resolved);
    },
    [commit, currentValue, normalize]
  );

export function useExecutionSettingsState() {
  const graphState = usePathMetadataState();
  const graphActions = useGraphActions();

  const setExecutionMode = useResolvedGraphSettingSetter<PathExecutionMode>(
    graphState.executionMode,
    graphActions.setExecutionMode
  );

  const setFlowIntensity = useResolvedGraphSettingSetter<PathFlowIntensity>(
    graphState.flowIntensity,
    graphActions.setFlowIntensity
  );

  const setRunMode = useResolvedGraphSettingSetter<PathRunMode>(
    graphState.runMode,
    graphActions.setRunMode
  );

  const setStrictFlowMode = useResolvedGraphSettingSetter<boolean>(
    graphState.strictFlowMode,
    graphActions.setStrictFlowMode,
    normalizeBoolean
  );

  const setBlockedRunPolicy = useResolvedGraphSettingSetter<PathBlockedRunPolicy>(
    graphState.blockedRunPolicy,
    graphActions.setBlockedRunPolicy
  );

  const setAiPathsValidationState = useResolvedGraphSettingSetter<AiPathsValidationConfig>(
    graphState.aiPathsValidation,
    graphActions.setAiPathsValidation,
    normalizeAiPathsValidationConfig
  );

  const setHistoryRetentionPasses = useResolvedGraphSettingSetter<number>(
    graphState.historyRetentionPasses,
    graphActions.setHistoryRetentionPasses,
    normalizeNumber
  );

  const setHistoryRetentionOptionsMax = useResolvedGraphSettingSetter<number>(
    graphState.historyRetentionOptionsMax,
    graphActions.setHistoryRetentionOptionsMax,
    normalizeNumber
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
