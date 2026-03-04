import type {
  AiNode,
  Edge,
  ParserSampleState,
  PathConfig,
  PathBlockedRunPolicy,
  PathExecutionMode,
  PathFlowIntensity,
  AiPathsValidationConfig,
  PathRunMode,
  PathMeta,
  RuntimeState,
  UpdaterSampleState,
} from '@/shared/lib/ai-paths';
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
  blockedRunPolicy: PathBlockedRunPolicy;
  aiPathsValidation: AiPathsValidationConfig;
  selectedNodeId: string | null;
  runtimeState: RuntimeState;
  updaterSamples: Record<string, UpdaterSampleState>;
  normalizeTriggerLabel: (value?: string | null) => string;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
  toast: ToastFn;
};

export type PersistSettingsPayload = Array<{ key: string; value: string }>;

export type AiPathsUiState = {
  activePathId?: string | null;
  expandedGroups?: string[];
  paletteCollapsed?: boolean;
};

export type AiPathsUserPreferences = {
  activePathId?: string | null;
  updatedAt?: string;
};

export const USER_PREFERENCES_STALE_MS = 5 * 60_000;

export const resolvePreferredActivePathId = (
  preferences: AiPathsUserPreferences | null | undefined
): string | null => {
  const value = preferences?.activePathId;
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
  persistRuntimePathState: (configId: string, config: PathConfig) => Promise<void>;
  persistSettingsBulk: (payload: PersistSettingsPayload) => Promise<void>;
  savePathIndex: (nextPaths: PathMeta[]) => Promise<void>;
  saving: boolean;
};
