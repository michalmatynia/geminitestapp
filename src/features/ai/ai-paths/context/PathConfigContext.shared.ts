import type {
  AiPathsValidationConfig,
  PathBlockedRunPolicy,
  PathExecutionMode,
  PathFlowIntensity,
  PathRunMode,
} from '@/shared/contracts/ai-paths';
import {
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_DEFAULT,
} from '@/shared/lib/ai-paths/core/constants';
import { DEFAULT_AI_PATHS_VALIDATION_CONFIG } from '@/shared/lib/ai-paths/core/validation-engine';

import type { ReactNode } from 'react';

export interface PathConfigState {
  pathName: string;
  pathDescription: string;
  activeTrigger: string;
  executionMode: PathExecutionMode;
  flowIntensity: PathFlowIntensity;
  runMode: PathRunMode;
  strictFlowMode: boolean;
  blockedRunPolicy: PathBlockedRunPolicy;
  aiPathsValidation: AiPathsValidationConfig;
  historyRetentionPasses: number;
  historyRetentionOptionsMax: number;
  isPathLocked: boolean;
  isPathActive: boolean;
}

export type PathConfigPatch = Partial<PathConfigState>;

export interface PathConfigActions {
  setPathName: (name: string) => void;
  setPathDescription: (description: string) => void;
  setActiveTrigger: (trigger: string) => void;
  setExecutionMode: (mode: PathExecutionMode) => void;
  setFlowIntensity: (intensity: PathFlowIntensity) => void;
  setRunMode: (mode: PathRunMode) => void;
  setStrictFlowMode: (enabled: boolean) => void;
  setBlockedRunPolicy: (policy: PathBlockedRunPolicy) => void;
  setAiPathsValidation: (config: AiPathsValidationConfig) => void;
  setHistoryRetentionPasses: (passes: number) => void;
  setHistoryRetentionOptionsMax: (max: number) => void;
  setIsPathLocked: (locked: boolean) => void;
  togglePathLock: () => void;
  setIsPathActive: (active: boolean) => void;
  togglePathActive: () => void;
  /** Apply a partial merge — only provided fields update. Reduces re-renders for multi-field edits like preset apply. */
  applyPathConfig: (patch: PathConfigPatch) => void;
  resetPathConfig: () => void;
}

export interface PathConfigProviderProps {
  children: ReactNode;
}

export const DEFAULT_PATH_NAME = 'Description Inference Path';
export const DEFAULT_PATH_DESCRIPTION = 'Vision + text model workflow with structured updates.';
export const DEFAULT_TRIGGER = 'Product Modal - Context Filter';
export const DEFAULT_EXECUTION_MODE: PathExecutionMode = 'server';
export const DEFAULT_FLOW_INTENSITY: PathFlowIntensity = 'medium';
export const DEFAULT_RUN_MODE: PathRunMode = 'manual';
export const DEFAULT_STRICT_FLOW_MODE = true;
export const DEFAULT_BLOCKED_RUN_POLICY: PathBlockedRunPolicy = 'fail_run';
export const DEFAULT_AI_PATHS_VALIDATION: AiPathsValidationConfig =
  DEFAULT_AI_PATHS_VALIDATION_CONFIG;
export const DEFAULT_HISTORY_RETENTION_PASSES = AI_PATHS_HISTORY_RETENTION_DEFAULT;
export const DEFAULT_HISTORY_RETENTION_OPTIONS_MAX =
  AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_DEFAULT;

export const DEFAULT_PATH_CONFIG_STATE: PathConfigState = {
  pathName: DEFAULT_PATH_NAME,
  pathDescription: DEFAULT_PATH_DESCRIPTION,
  activeTrigger: DEFAULT_TRIGGER,
  executionMode: DEFAULT_EXECUTION_MODE,
  flowIntensity: DEFAULT_FLOW_INTENSITY,
  runMode: DEFAULT_RUN_MODE,
  strictFlowMode: DEFAULT_STRICT_FLOW_MODE,
  blockedRunPolicy: DEFAULT_BLOCKED_RUN_POLICY,
  aiPathsValidation: DEFAULT_AI_PATHS_VALIDATION,
  historyRetentionPasses: DEFAULT_HISTORY_RETENTION_PASSES,
  historyRetentionOptionsMax: DEFAULT_HISTORY_RETENTION_OPTIONS_MAX,
  isPathLocked: false,
  isPathActive: true,
};
