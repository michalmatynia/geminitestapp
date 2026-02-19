import type {
  AiNode,
  ClusterPreset,
  DbNodePreset,
  DbQueryPreset,
  Edge,
  ParserSampleState,
  PathConfig,
  PathExecutionMode,
  PathFlowIntensity,
  PathRunMode,
  PathDebugSnapshot,
  PathMeta,
  RuntimeState,
  UpdaterSampleState,
} from '@/features/ai/ai-paths/lib';

import type { Dispatch, SetStateAction } from 'react';

export type ToastFn = (
  message: string,
  options?: { variant?: 'success' | 'error' | 'info' | 'warning' }
) => void;

export type PathSaveOptions = {
  silent?: boolean | undefined;
  includeNodeConfig?: boolean | undefined;
  force?: boolean | undefined;
  pathNameOverride?: string | undefined;
  nodesOverride?: AiNode[] | undefined;
  nodeOverride?: AiNode | undefined;
  edgesOverride?: Edge[] | undefined;
};

export type UseAiPathsPersistenceArgs = {
  activePathId: string | null;
  activeTrigger: string;
  edges: Edge[];
  expandedPaletteGroups: Set<string>;
  isPathActive: boolean;
  isPathLocked: boolean;
  lastRunAt: string | null;
  loadNonce: number;
  loading: boolean;
  nodes: AiNode[];
  paletteCollapsed: boolean;
  parserSamples: Record<string, ParserSampleState>;
  pathConfigs: Record<string, PathConfig>;
  pathDescription: string;
  pathName: string;
  paths: PathMeta[];
  executionMode: PathExecutionMode;
  flowIntensity: PathFlowIntensity;
  runMode: PathRunMode;
  strictFlowMode: boolean;
  selectedNodeId: string | null;
  runtimeState: RuntimeState;
  updaterSamples: Record<string, UpdaterSampleState>;
  normalizeDbNodePreset: (raw: Partial<DbNodePreset>) => DbNodePreset;
  normalizeDbQueryPreset: (raw: Partial<DbQueryPreset>) => DbQueryPreset;
  normalizeTriggerLabel: (value?: string | null) => string;
  persistLastError: (
    payload: { message: string; time: string; pathId?: string | null } | null
  ) => Promise<void>;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
  setActivePathId: (value: string | null) => void;
  setActiveTrigger: (value: string) => void;
  setClusterPresets: Dispatch<SetStateAction<ClusterPreset[]>>;
  setDbNodePresets: Dispatch<SetStateAction<DbNodePreset[]>>;
  setDbQueryPresets: Dispatch<SetStateAction<DbQueryPreset[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setExpandedPaletteGroups: Dispatch<SetStateAction<Set<string>>>;
  setLastError: Dispatch<
    SetStateAction<{ message: string; time: string; pathId?: string | null } | null>
  >;
  setLastRunAt: (value: string | null) => void;
  setLoading: (value: boolean) => void;
  setIsPathActive: (value: boolean) => void;
  setIsPathLocked: (value: boolean) => void;
  setNodes: Dispatch<SetStateAction<AiNode[]>>;
  setPaletteCollapsed: (value: boolean) => void;
  setParserSamples: Dispatch<SetStateAction<Record<string, ParserSampleState>>>;
  setPathConfigs: Dispatch<SetStateAction<Record<string, PathConfig>>>;
  setPathDebugSnapshots: Dispatch<SetStateAction<Record<string, PathDebugSnapshot>>>;
  setPathDescription: (value: string) => void;
  setExecutionMode: (value: PathExecutionMode) => void;
  setFlowIntensity: (value: PathFlowIntensity) => void;
  setRunMode: (value: PathRunMode) => void;
  setStrictFlowMode: (value: boolean) => void;
  setHistoryRetentionPasses: (value: number) => void;
  setHistoryRetentionOptionsMax: (value: number) => void;
  setPathName: (value: string) => void;
  setPaths: Dispatch<SetStateAction<PathMeta[]>>;
  setRuntimeState: Dispatch<SetStateAction<RuntimeState>>;
  setConfigOpen: (value: boolean) => void;
  setSelectedNodeId: (value: string | null) => void;
  setUpdaterSamples: Dispatch<SetStateAction<Record<string, UpdaterSampleState>>>;
  toast: ToastFn;
};

export type PersistSettingsPayload = Array<{ key: string; value: string }>;

export type AiPathsUiState = {
  activePathId?: string | null;
  expandedGroups?: string[];
  paletteCollapsed?: boolean;
};

export type AiPathsUserPreferences = {
  aiPathsActivePathId?: string | null;
};

export const USER_PREFERENCES_STALE_MS = 5 * 60_000;

export const resolvePreferredActivePathId = (
  preferences: AiPathsUserPreferences | null | undefined
): string | null => {
  const value = preferences?.aiPathsActivePathId;
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

export type UseAiPathsPersistenceResult = {
  autoSaveAt: string | null;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  handleSave: (options?: PathSaveOptions) => Promise<boolean>;
  persistActivePathPreference: (pathId: string | null) => Promise<void>;
  persistPathSettings: (
    nextPaths: PathMeta[],
    configId: string,
    config: PathConfig
  ) => Promise<PathConfig | null>;
  persistRuntimePathState: (
    configId: string,
    config: PathConfig
  ) => Promise<void>;
  persistSettingsBulk: (payload: PersistSettingsPayload) => Promise<void>;
  savePathIndex: (nextPaths: PathMeta[]) => Promise<void>;
  saving: boolean;
};
