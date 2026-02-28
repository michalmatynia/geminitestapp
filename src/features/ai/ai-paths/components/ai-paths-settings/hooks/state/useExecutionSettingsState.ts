import { useState } from 'react';
import type {
  AiPathsValidationConfig,
  ParserSampleState,
  PathBlockedRunPolicy,
  PathDebugSnapshot,
  PathExecutionMode,
  PathFlowIntensity,
  PathRunMode,
  RuntimeState,
  UpdaterSampleState,
} from '@/shared/lib/ai-paths';
import {
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_DEFAULT,
  DEFAULT_AI_PATHS_VALIDATION_CONFIG,
  EMPTY_RUNTIME_STATE,
} from '@/shared/lib/ai-paths';

export function useExecutionSettingsState() {
  const [executionMode, setExecutionMode] = useState<PathExecutionMode>('server');
  const [flowIntensity, setFlowIntensity] = useState<PathFlowIntensity>('medium');
  const [runMode, setRunMode] = useState<PathRunMode>('manual');
  const [strictFlowMode, setStrictFlowMode] = useState<boolean>(true);
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
  const [parserSamples, setParserSamples] = useState<Record<string, ParserSampleState>>({});
  const [updaterSamples, setUpdaterSamples] = useState<Record<string, UpdaterSampleState>>({});
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(EMPTY_RUNTIME_STATE);
  const [pathDebugSnapshots, setPathDebugSnapshots] = useState<Record<string, PathDebugSnapshot>>(
    {}
  );
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<{
    message: string;
    time: string;
    pathId?: string | null;
  } | null>(null);

  return {
    executionMode,
    setExecutionMode,
    flowIntensity,
    setFlowIntensity,
    runMode,
    setRunMode,
    strictFlowMode,
    setStrictFlowMode,
    blockedRunPolicy,
    setBlockedRunPolicy,
    aiPathsValidationState,
    setAiPathsValidationState,
    historyRetentionPasses,
    setHistoryRetentionPasses,
    historyRetentionOptionsMax,
    setHistoryRetentionOptionsMax,
    parserSamples,
    setParserSamples,
    updaterSamples,
    setUpdaterSamples,
    runtimeState,
    setRuntimeState,
    pathDebugSnapshots,
    setPathDebugSnapshots,
    lastRunAt,
    setLastRunAt,
    lastError,
    setLastError,
  };
}
