'use client';
import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import React, { useCallback, useMemo, useState } from 'react';

import type {
  AiNode,
  Edge,
  NodeConfig,
  NodeDefinition,
  ParserSampleState,
  PathConfig,
  PathExecutionMode,
  PathFlowIntensity,
  PathRunMode,
  PathDebugSnapshot,
  PathMeta,
  RuntimeState,
  UpdaterSampleState,
  AiPathRunRecord,
  AiPathRunNodeRecord,
  AiPathRunEventRecord,
  AiPathRuntimeEvent,
  AiPathRuntimeNodeStatusMap,
  RuntimeHistoryEntry,
  ClusterPreset,
  DbQueryPreset,
  DbNodePreset,
} from '@/features/ai/ai-paths/lib';
import {
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_DEFAULT,
  AI_PATHS_LAST_ERROR_KEY,
  DEFAULT_MODELS,
  createDefaultPathConfig,
  initialEdges,
  initialNodes,
  palette,
  safeStringify,
  sanitizeEdges,
  TRIGGER_INPUT_PORTS,
  TRIGGER_OUTPUT_PORTS,
  triggers,
  triggerButtonsApi,
} from '@/features/ai/ai-paths/lib';
import {
  updateAiPathsSetting,
} from '@/features/ai/ai-paths/lib/settings-store-client';
import { logClientError } from '@/features/observability';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { AiTriggerButtonRecord } from '@/shared/types/domain/ai-trigger-buttons';
import { useToast } from '@/shared/ui';

import {
  DOCS_DESCRIPTION_SNIPPET,
  DOCS_JOBS_SNIPPET,
  DOCS_OVERVIEW_SNIPPET,
  DOCS_WIRING_SNIPPET,
} from './docs-snippets';
import { useAiPathsCanvasInteractions } from './useAiPathsCanvasInteractions';
import { useAiPathsNodeSwitchConfirm } from './useAiPathsNodeSwitchConfirm';
import { useAiPathsPersistence } from './useAiPathsPersistence';
import { useAiPathsPresets } from './useAiPathsPresets';
import { useAiPathsRunHistory } from './useAiPathsRunHistory';
import { useAiPathsRuntime } from './useAiPathsRuntime';
import { useAiPathsSettingsCleanupActions } from './useAiPathsSettingsCleanupActions';
import { useAiPathsSettingsDocsActions } from './useAiPathsSettingsDocsActions';
import { useAiPathsSettingsModeActions } from './useAiPathsSettingsModeActions';
import { useAiPathsSettingsPathActions } from './useAiPathsSettingsPathActions';
import { useAiPathsSettingsSamples } from './useAiPathsSettingsSamples';
import {
  buildPersistedRuntimeState,
} from '../AiPathsSettingsUtils';

import type { ClusterPresetDraft } from '../cluster-presets-panel';
import type { RunHistoryFilter } from '../run-history-panel';
import type { HistoryNodeOption } from '../run-history-utils';

type AiPathsSettingsStateOptions = {
  activeTab: 'canvas' | 'paths' | 'docs';
};

export interface UseAiPathsSettingsStateReturn {
  loading: boolean;
  docsOverviewSnippet: string;
  docsWiringSnippet: string;
  docsDescriptionSnippet: string;
  docsJobsSnippet: string;
  handleCopyDocsWiring: () => void;
  handleCopyDocsDescription: () => void;
  handleCopyDocsJobs: () => void;
  autoSaveLabel: string;
  autoSaveClasses: string;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  autoSaveAt: string | null;
  saving: boolean;
  handleCreatePath: () => void;
  handleCreateAiDescriptionPath: () => void;
  handleDuplicatePath: (pathId?: string) => void;
  handleSave: (options?: {
    silent?: boolean | undefined;
    includeNodeConfig?: boolean | undefined;
    force?: boolean | undefined;
    pathNameOverride?: string | undefined;
    nodesOverride?: AiNode[] | undefined;
    nodeOverride?: AiNode | undefined;
    edgesOverride?: Edge[] | undefined;
  }) => Promise<boolean>;
  handleReset: () => void;
  handleDeletePath: (pathId?: string) => Promise<void>;
  activePathId: string | null;
  activeTrigger: string;
  executionMode: PathExecutionMode;
  flowIntensity: PathFlowIntensity;
  runMode: PathRunMode;
  historyRetentionPasses: number;
  historyRetentionOptionsMax: number;
  handleExecutionModeChange: (mode: PathExecutionMode) => void;
  handleFlowIntensityChange: (intensity: PathFlowIntensity) => void;
  handleRunModeChange: (mode: PathRunMode) => void;
  handleHistoryRetentionChange: (passes: number) => Promise<void>;
  triggers: string[];
  isPathLocked: boolean;
  isPathActive: boolean;
  handleTogglePathLock: () => void;
  handleTogglePathActive: () => void;
  lastError: {
    message: string;
    time: string;
    pathId?: string | null;
  } | null;
  setLastError: React.Dispatch<
    React.SetStateAction<{
      message: string;
      time: string;
      pathId?: string | null;
    } | null>
  >;
  persistLastError: (
    payload: { message: string; time: string; pathId?: string | null } | null,
  ) => Promise<void>;
  setLoadNonce: React.Dispatch<React.SetStateAction<number>>;
  lastRunAt: string | null;
  pathName: string;
  setPathName: React.Dispatch<React.SetStateAction<string>>;
  updateActivePathMeta: (name: string) => void;
  paths: PathMeta[];
  pathConfigs: Record<string, PathConfig>;
  pathFlagsById: Record<string, { isLocked: boolean; isActive: boolean }>;
  handleSwitchPath: (pathId: string) => void;
  savePathIndex: (nextPaths: PathMeta[]) => Promise<void>;
  nodes: AiNode[];
  setNodes: React.Dispatch<React.SetStateAction<AiNode[]>>;
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  runtimeState: RuntimeState;
  edgePaths: {
    id: string;
    path: string;
    label?: string | undefined;
    arrow?: { x: number; y: number; angle: number } | undefined;
  }[];
  view: { x: number; y: number; scale: number };
  panState: {
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null;
  lastDrop: { x: number; y: number } | null;
  connecting: {
    fromNodeId: string;
    fromPort: string;
    start: { x: number; y: number };
  } | null;
  connectingPos: { x: number; y: number } | null;
  connectingFromNode: AiNode | null;
  selectedNodeId: string | null;
  dragState: {
    nodeId: string;
    offsetX: number;
    offsetY: number;
  } | null;
  selectedEdgeId: string | null;
  palette: NodeDefinition[];
  paletteCollapsed: boolean;
  setPaletteCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  expandedPaletteGroups: Set<string>;
  togglePaletteGroup: (group: string) => void;
  handleDragStart: (
    e: React.DragEvent<HTMLDivElement>,
    node: NodeDefinition,
  ) => void;
  selectedNode: AiNode | null;
  handleSelectEdge: (edgeId: string | null) => void;
  handleFireTrigger: (triggerNode: AiNode, event?: React.MouseEvent) => void;
  handleFireTriggerPersistent: (
    triggerNode: AiNode,
    event?: React.MouseEvent,
  ) => Promise<void>;
  setSimulationOpenNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  updateSelectedNode: (
    update: Partial<AiNode>,
    options?: { nodeId?: string },
  ) => void;
  setConfigOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleDeleteSelectedNode: () => void;
  handleRemoveEdge: (edgeId: string) => void;
  handleClearWires: () => Promise<void>;
  handleClearConnectorData: () => Promise<void>;
  handleClearHistory: () => Promise<void>;
  handleClearNodeHistory: (nodeId: string) => Promise<void>;
  handleDisconnectPort: (
    direction: 'input' | 'output',
    nodeId: string,
    port: string,
  ) => void;
  handleReconnectInput: (
    event: React.PointerEvent<HTMLButtonElement>,
    nodeId: string,
    port: string,
  ) => void;
  handleSelectNode: (nodeId: string) => void;
  handlePointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string,
  ) => void;
  handlePointerMove: (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string,
  ) => void;
  handlePointerUp: (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string,
  ) => void;
  handleStartConnection: (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string,
  ) => void;
  handleCompleteConnection: (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string,
  ) => void;
  handleDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  handlePanStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  handlePanMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  handlePanEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
  zoomTo: (factor: number) => void;
  fitToNodes: () => void;
  resetView: () => void;
  presetDraft: ClusterPresetDraft;
  setPresetDraft: React.Dispatch<React.SetStateAction<ClusterPresetDraft>>;
  editingPresetId: string | null;
  handleResetPresetDraft: () => void;
  handlePresetFromSelection: () => void;
  handleSavePreset: () => Promise<void>;
  clusterPresets: ClusterPreset[];
  handleLoadPreset: (preset: ClusterPreset) => void;
  handleApplyPreset: (preset: ClusterPreset) => void;
  handleDeletePreset: (presetId: string) => Promise<void>;
  handleExportPresets: () => void;
  lastGraphModelPayload: unknown;
  runList: AiPathRunRecord[];
  runsQuery: UseQueryResult<{ ok: boolean; data: { runs: AiPathRunRecord[] } }>;
  runFilter: RunHistoryFilter;
  setRunFilter: React.Dispatch<React.SetStateAction<RunHistoryFilter>>;
  expandedRunHistory: Record<string, boolean>;
  setExpandedRunHistory: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  runHistorySelection: Record<string, string>;
  setRunHistorySelection: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  handleOpenRunDetail: (runId: string) => Promise<void>;
  handleResumeRun: (runId: string, mode: 'resume' | 'replay') => Promise<void>;
  handleCancelRun: (runId: string) => Promise<void>;
  handleRequeueDeadLetter: (runId: string) => Promise<void>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  configOpen: boolean;
  nodeConfigDirty: boolean;
  setNodeConfigDirty: React.Dispatch<React.SetStateAction<boolean>>;
  modelOptions: string[];
  parserSamples: Record<string, ParserSampleState>;
  setParserSamples: React.Dispatch<
    React.SetStateAction<Record<string, ParserSampleState>>
  >;
  parserSampleLoading: boolean;
  updaterSamples: Record<string, UpdaterSampleState>;
  setUpdaterSamples: React.Dispatch<
    React.SetStateAction<Record<string, UpdaterSampleState>>
  >;
  updaterSampleLoading: boolean;
  pathDebugSnapshots: Record<string, PathDebugSnapshot>;
  updateSelectedNodeConfig: (config: NodeConfig) => void;
  handleFetchParserSample: (
    nodeId: string,
    entityType: string,
    entityId: string,
  ) => Promise<void>;
  handleFetchUpdaterSample: (
    nodeId: string,
    entityType: string,
    entityId: string,
    options?: { notify?: boolean },
  ) => Promise<void>;
  handleRunSimulation: (node: AiNode, triggerEvent?: string) => void;
  handlePauseActiveRun: () => void;
  handleResumeActiveRun: () => void;
  handleStepActiveRun: (triggerNode?: AiNode) => void;
  handleCancelActiveRun: () => void;
  runtimeRunStatus: 'idle' | 'running' | 'paused' | 'stepping';
  runtimeNodeStatuses: AiPathRuntimeNodeStatusMap;
  runtimeEvents: AiPathRuntimeEvent[];
  nodeDurations: Record<string, number>;
  clearRuntimeForNode: (nodeId: string) => void;
  clearNodeCache: (nodeId: string) => void;
  handleSendToAi: (nodeId: string, prompt: string) => Promise<void>;
  sendingToAi: boolean;
  dbQueryPresets: DbQueryPreset[];
  setDbQueryPresets: React.Dispatch<React.SetStateAction<DbQueryPreset[]>>;
  saveDbQueryPresets: (nextPresets: DbQueryPreset[]) => Promise<void>;
  dbNodePresets: DbNodePreset[];
  setDbNodePresets: React.Dispatch<React.SetStateAction<DbNodePreset[]>>;
  saveDbNodePresets: (nextPresets: DbNodePreset[]) => Promise<void>;
  runDetailOpen: boolean;
  setRunDetailOpen: React.Dispatch<React.SetStateAction<boolean>>;
  runDetailLoading: boolean;
  runDetail: {
    run: AiPathRunRecord;
    nodes: AiPathRunNodeRecord[];
    events: AiPathRunEventRecord[];
  } | null;
  setRunDetail: React.Dispatch<
    React.SetStateAction<{
      run: AiPathRunRecord;
      nodes: AiPathRunNodeRecord[];
      events: AiPathRunEventRecord[];
    } | null>
  >;
  runStreamStatus: 'connecting' | 'live' | 'stopped' | 'paused';
  runStreamPaused: boolean;
  setRunStreamPaused: React.Dispatch<React.SetStateAction<boolean>>;
  runNodeSummary: {
    counts: Record<string, number>;
    total: number;
    completed: number;
    progress: number;
  } | null;
  runEventsOverflow: boolean;
  runEventsBatchLimit: number | null;
  runDetailHistoryOptions: HistoryNodeOption[];
  runDetailSelectedHistoryNodeId: string | null;
  setRunHistoryNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  runDetailSelectedHistoryEntries: RuntimeHistoryEntry[];
  presetsModalOpen: boolean;
  setPresetsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  presetsJson: string;
  setPresetsJson: React.Dispatch<React.SetStateAction<string>>;
  handleImportPresets: (mode: 'merge' | 'replace') => Promise<void>;
  simulationOpenNodeId: string | null;
  ConfirmationModal: React.ComponentType;
  confirmNodeSwitch: (nodeId: string) => boolean | Promise<boolean>;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string,
  ) => void;
  toast: (
    message: string,
    options?: {
      variant?: 'info' | 'success' | 'warning' | 'error';
    },
  ) => void;
}

export function useAiPathsSettingsState({
  activeTab,
}: AiPathsSettingsStateOptions): UseAiPathsSettingsStateReturn {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const normalizeTriggerLabel = (value?: string | null): string =>
    value === 'Product Modal - Context Grabber'
      ? 'Product Modal - Context Filter'
      : (value ?? triggers[0] ?? 'Product Modal - Context Filter');
  const [nodes, setNodes] = useState<AiNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [paths, setPaths] = useState<PathMeta[]>([]);
  const [pathConfigs, setPathConfigs] = useState<Record<string, PathConfig>>(
    {},
  );
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [isPathLocked, setIsPathLocked] = useState(false);
  const [isPathActive, setIsPathActive] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialNodes[0]?.id ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [nodeConfigDirty, setNodeConfigDirty] = useState(false);
  const [simulationOpenNodeId, setSimulationOpenNodeId] = useState<
    string | null
  >(null);
  const [pathName, setPathName] = useState('AI Description Path');
  const [pathDescription, setPathDescription] = useState(
    'Visual analysis + description generation with structured updates.',
  );
  const [activeTrigger, setActiveTrigger] = useState(triggers[0] ?? '');
  const [executionMode, setExecutionMode] =
    useState<PathExecutionMode>('server');
  const [flowIntensity, setFlowIntensity] =
    useState<PathFlowIntensity>('medium');
  const [runMode, setRunMode] = useState<PathRunMode>('block');
  const [historyRetentionPasses, setHistoryRetentionPasses] = useState<number>(
    AI_PATHS_HISTORY_RETENTION_DEFAULT,
  );
  const [historyRetentionOptionsMax, setHistoryRetentionOptionsMax] =
    useState<number>(AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_DEFAULT);
  const [parserSamples, setParserSamples] = useState<
    Record<string, ParserSampleState>
  >({});
  const [updaterSamples, setUpdaterSamples] = useState<
    Record<string, UpdaterSampleState>
  >({});
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(
    { inputs: {}, outputs: {} } as unknown as RuntimeState
  );
  const [pathDebugSnapshots, setPathDebugSnapshots] = useState<
    Record<string, PathDebugSnapshot>
  >({});
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<{
    message: string;
    time: string;
    pathId?: string | null;
  } | null>(null);
  const runtimePersistenceKeyRef = React.useRef<string>('');

  const lastGraphModelPayload = useMemo(() => {
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index];
      if (node?.type !== 'model') continue;
      const output = runtimeState.outputs[node.id] as
        | { debugPayload?: unknown }
        | undefined;
      if (output?.debugPayload) {
        return output.debugPayload;
      }
    }
    return null;
  }, [nodes, runtimeState.outputs]);

  const { confirmNodeSwitch } = useAiPathsNodeSwitchConfirm({
    configOpen,
    nodeConfigDirty,
    selectedNodeId,
    setNodeConfigDirty,
    confirm,
    toast,
  });
  const [loadNonce, setLoadNonce] = useState(0);
  const queryClient = useQueryClient();

  const triggerButtonsQuery = createListQueryV2<
    AiTriggerButtonRecord[],
    AiTriggerButtonRecord[]
  >({
    queryKey: QUERY_KEYS.ai.aiPaths.triggerButtons(),
    queryFn: async (): Promise<AiTriggerButtonRecord[]> => {
      const result = await triggerButtonsApi.list();
      if (!result.ok) return [];
      return Array.isArray(result.data) ? result.data : [];
    },
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'ai.ai-paths.settings.trigger-buttons',
      operation: 'list',
      resource: 'ai-paths.trigger-buttons',
      domain: 'global',
      tags: ['ai-paths', 'settings', 'trigger-buttons'],
    },
  });

  const paletteWithTriggerButtons = useMemo<NodeDefinition[]>(() => {
    const buttons = triggerButtonsQuery.data ?? [];
    if (buttons.length === 0) return palette;

    const usedTitles = new Set<string>(
      palette.map((node: NodeDefinition) => node.title),
    );
    const derived: NodeDefinition[] = [];
    buttons.forEach((button: AiTriggerButtonRecord) => {
      const baseTitle = `Trigger: ${button.name}`;
      const title = usedTitles.has(baseTitle)
        ? `${baseTitle} (${button.id.slice(0, 6)})`
        : baseTitle;
      usedTitles.add(title);
      derived.push({
        type: 'trigger',
        title,
        description: `User trigger button (${button.id}).`,
        inputs: TRIGGER_INPUT_PORTS,
        outputs: TRIGGER_OUTPUT_PORTS,
        config: { trigger: { event: button.id } },
      });
    });

    return [...palette, ...derived];
  }, [triggerButtonsQuery.data]);

  const {
    parserSampleLoading,
    updaterSampleLoading,
    handleFetchParserSample,
    handleFetchUpdaterSample,
  } = useAiPathsSettingsSamples({
    queryClient,
    setParserSamples,
    setUpdaterSamples,
    toast,
  });

  const persistLastError = useCallback(
    async (
      payload: { message: string; time: string; pathId?: string | null } | null,
    ): Promise<void> => {
      try {
        await updateAiPathsSetting(
          AI_PATHS_LAST_ERROR_KEY,
          payload ? JSON.stringify(payload) : '',
        );
      } catch (error: unknown) {
        logClientError(error, {
          context: {
            source: 'useAiPathsSettingsState',
            action: 'persistLastError',
          },
        });
      }
    },
    [],
  );

  const reportAiPathsError = useCallback(
    (
      error: unknown,
      context: Record<string, unknown>,
      fallbackMessage?: string,
    ): void => {
      const rawMessage =
        error instanceof Error ? error.message : safeStringify(error);
      const summary = (fallbackMessage ?? rawMessage).replace(/:$/, '');
      const logMessage = `[AI Paths] ${summary}`;
      const logError = new Error(logMessage);
      if (error instanceof Error && error.stack) {
        logError.stack = error.stack;
        logError.name = error.name;
      }
      const payload = {
        message: summary,
        time: new Date().toISOString(),
        pathId: activePathId,
      };
      setLastError(payload);
      void persistLastError(payload);
      logClientError(logError, {
        context: {
          feature: 'ai-paths',
          pathId: activePathId,
          pathName,
          tab: activeTab,
          nodeCount: nodes.length,
          edgeCount: edges.length,
          errorSummary: summary,
          rawMessage,
          ...context,
        },
      });
    },
    [
      activePathId,
      activeTab,
      edges.length,
      nodes.length,
      pathName,
      persistLastError,
    ],
  );

  const modelsQuery = createListQueryV2<
    { models?: string[] },
    { models?: string[] }
  >({
    queryKey: QUERY_KEYS.ai.chatbot.models(),
    queryFn: async (): Promise<{ models?: string[] }> => {
      try {
        return await api.get<{ models?: string[] }>('/api/chatbot', {
          logError: false,
        });
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'useAiPathsSettingsState',
            action: 'modelsQueryFn',
          },
        });
        return { models: [] };
      }
    },
    staleTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'ai.ai-paths.settings.models',
      operation: 'list',
      resource: 'ai.chatbot.models',
      domain: 'global',
      tags: ['ai-paths', 'settings', 'models'],
    },
  });

  const modelOptions = useMemo((): string[] => {
    const apiModels = modelsQuery.data?.models;
    const savedModels = nodes
      .filter((node: AiNode): boolean => node.type === 'model')
      .map((node: AiNode): string | undefined => node.config?.model?.modelId)
      .filter((modelId: string | undefined): modelId is string =>
        Boolean(modelId?.trim()),
      );
    return Array.from(
      new Set([
        ...DEFAULT_MODELS,
        ...(Array.isArray(apiModels) ? apiModels : []),
        ...savedModels,
      ]),
    );
  }, [modelsQuery.data, nodes]);

  const pruneRuntimeInputs = useCallback(
    (
      state: RuntimeState,
      removedEdges: Edge[],
      remainingEdges: Edge[],
    ): RuntimeState => {
      if (removedEdges.length === 0) return state;
      const remainingTargets = new Set<string>();
      remainingEdges.forEach((edge: Edge) => {
        if (!edge.to || !edge.toPort) return;
        remainingTargets.add(`${edge.to}:${edge.toPort}`);
      });

      const existingInputs = state.inputs ?? {};
      let nextInputs = existingInputs;
      let changed = false;

      removedEdges.forEach((edge: Edge) => {
        if (!edge.to || !edge.toPort) return;
        const targetKey = `${edge.to}:${edge.toPort}`;
        if (remainingTargets.has(targetKey)) return;
        const nodeInputs = (nextInputs?.[edge.to] ?? {}) as Record<
          string,
          unknown
        >;
        if (!(edge.toPort in nodeInputs)) return;
        if (!changed) {
          nextInputs = { ...existingInputs };
          changed = true;
        }
        const nextNodeInputs = { ...nodeInputs };
        delete nextNodeInputs[edge.toPort];
        if (Object.keys(nextNodeInputs).length === 0) {
          delete (nextInputs as Record<string, Record<string, unknown>>)[
            edge.to
          ];
        } else {
          (nextInputs as Record<string, Record<string, unknown>>)[edge.to] =
            nextNodeInputs;
        }
      });

      if (!changed) return state;
      return { ...state, inputs: nextInputs };
    },
    [],
  );

  const clearRuntimeInputsForEdges = useCallback(
    (removedEdges: Edge[], remainingEdges: Edge[]): void => {
      if (removedEdges.length === 0) return;
      setRuntimeState(
        (prev: RuntimeState): RuntimeState =>
          pruneRuntimeInputs(prev, removedEdges, remainingEdges),
      );
    },
    [pruneRuntimeInputs],
  );

  const clearRuntimeForNode = React.useCallback((nodeId: string): void => {
    setRuntimeState((prev: RuntimeState): RuntimeState => {
      const nextInputs = { ...prev.inputs };
      const nextOutputs = { ...prev.outputs };
      const nextHashes = prev.hashes ? { ...prev.hashes } : undefined;
      const nextHistory = prev.history ? { ...prev.history } : undefined;
      delete nextInputs[nodeId];
      delete nextOutputs[nodeId];
      if (nextHashes) {
        delete nextHashes[nodeId];
      }
      if (nextHistory) {
        delete nextHistory[nodeId];
      }
      const result: RuntimeState = {
        ...prev,
        inputs: nextInputs,
        outputs: nextOutputs,
      };
      if (nextHashes !== undefined) result.hashes = nextHashes;
      if (nextHistory !== undefined) result.history = nextHistory;
      return result;
    });
  }, []);

  const {
    viewportRef,
    canvasRef,
    view,
    panState,
    dragState,
    connecting,
    connectingPos,
    lastDrop,
    selectedEdgeId,
    edgePaths,
    connectingFromNode,
    ensureNodeVisible,
    getCanvasCenterPosition,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDragStart,
    handleDrop,
    handleDragOver,
    handleStartConnection,
    handleCompleteConnection,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleReconnectInput,
    handleRemoveEdge,
    handleDisconnectPort,
    handleDeleteSelectedNode,
    handleSelectEdge,
    handleSelectNode,
    zoomTo,
    fitToNodes,
    resetView,
  } = useAiPathsCanvasInteractions({
    nodes,
    setNodes,
    edges,
    setEdges,
    selectedNodeId,
    setSelectedNodeId,
    confirmNodeSwitch,
    confirm,
    clearRuntimeInputsForEdges,
    reportAiPathsError,
    toast,
    isPathLocked,
  });

  const selectedNode = useMemo(
    (): AiNode | null =>
      nodes.find((node: AiNode): boolean => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const {
    clusterPresets,
    setClusterPresets,
    dbQueryPresets,
    setDbQueryPresets,
    saveDbQueryPresets,
    dbNodePresets,
    setDbNodePresets,
    saveDbNodePresets,
    editingPresetId,
    presetDraft,
    setPresetDraft,
    handleSavePreset,
    handleLoadPreset,
    handleDeletePreset,
    handleApplyPreset,
    handleExportPresets,
    handleImportPresets,
    handlePresetFromSelection,
    handleResetPresetDraft,
    presetsModalOpen,
    setPresetsModalOpen,
    presetsJson,
    setPresetsJson,
    expandedPaletteGroups,
    setExpandedPaletteGroups,
    paletteCollapsed,
    setPaletteCollapsed,
    togglePaletteGroup,
    normalizeDbQueryPreset,
    normalizeDbNodePreset,
  } = useAiPathsPresets({
    nodes,
    edges,
    selectedNode,
    isPathLocked,
    setNodes,
    setEdges,
    setSelectedNodeId,
    ensureNodeVisible,
    getCanvasCenterPosition,
    toast,
    confirm,
    reportAiPathsError,
  });

  const {
    saving,
    autoSaveStatus,
    autoSaveAt,
    handleSave,
    persistActivePathPreference,
    persistPathSettings,
    persistRuntimePathState,
    persistSettingsBulk,
    savePathIndex,
  } = useAiPathsPersistence({
    activePathId,
    activeTrigger,
    edges,
    expandedPaletteGroups,
    isPathActive,
    isPathLocked,
    lastRunAt,
    loadNonce,
    loading,
    nodes,
    paletteCollapsed,
    parserSamples,
    pathConfigs,
    pathDescription,
    pathName,
    paths,
    runMode,
    selectedNodeId,
    runtimeState,
    updaterSamples,
    executionMode,
    flowIntensity,
    normalizeDbNodePreset,
    normalizeDbQueryPreset,
    normalizeTriggerLabel,
    persistLastError,
    reportAiPathsError,
    setActivePathId,
    setActiveTrigger,
    setClusterPresets,
    setDbNodePresets,
    setDbQueryPresets,
    setEdges,
    setExpandedPaletteGroups,
    setLastError,
    setLastRunAt,
    setLoading,
    setIsPathActive,
    setIsPathLocked,
    setNodes,
    setPaletteCollapsed,
    setParserSamples,
    setPathConfigs,
    setPathDebugSnapshots,
    setPathDescription,
    setExecutionMode,
    setFlowIntensity,
    setRunMode,
    setHistoryRetentionPasses,
    setHistoryRetentionOptionsMax,
    setPathName,
    setPaths,
    setRuntimeState,
    setConfigOpen,
    setSelectedNodeId,
    setUpdaterSamples,
    toast,
  });

  const {
    runsQuery,
    runList,
    runFilter,
    setRunFilter,
    expandedRunHistory,
    setExpandedRunHistory,
    runHistorySelection,
    setRunHistorySelection,
    runDetailOpen,
    setRunDetailOpen,
    runDetailLoading,
    runDetail,
    setRunDetail,
    runStreamStatus,
    runStreamPaused,
    setRunStreamPaused,
    runNodeSummary,
    runEventsOverflow,
    runEventsBatchLimit,
    runDetailHistoryOptions,
    runDetailSelectedHistoryNodeId,
    runDetailSelectedHistoryEntries,
    setRunHistoryNodeId,
    handleOpenRunDetail,
    handleResumeRun,
    handleCancelRun,
    handleRequeueDeadLetter,
  } = useAiPathsRunHistory({ activePathId, toast });

  const {
    handleRunSimulation,
    handleFireTrigger,
    handleFireTriggerPersistent,
    handlePauseRun: handlePauseActiveRun,
    handleResumeRun: handleResumeActiveRun,
    handleStepRun: handleStepActiveRun,
    handleCancelRun: handleCancelActiveRun,
    runStatus: runtimeRunStatus,
    runtimeNodeStatuses,
    runtimeEvents,
    nodeDurations,
    clearNodeCache,
    handleSendToAi,
    sendingToAi,
  } = useAiPathsRuntime({
    activePathId,
    activeTab,
    activeTrigger,
    executionMode,
    runMode,
    historyRetentionPasses,
    isPathActive,
    edges,
    nodes,
    pathDescription,
    pathName,
    parserSamples,
    updaterSamples,
    runtimeState,
    lastRunAt,
    setLastRunAt,
    setPathConfigs,
    setPathDebugSnapshots,
    setRuntimeState,
    toast,
    reportAiPathsError,
  });

  const {
    handleClearWires,
    handleClearConnectorData,
    handleClearHistory,
    handleClearNodeHistory,
  } = useAiPathsSettingsCleanupActions({
    activePathId,
    isPathLocked,
    toast,
    confirm,
    runtimeState,
    setRuntimeState,
    edges,
    setEdges,
    nodes,
    pathName,
    pathDescription,
    activeTrigger,
    executionMode,
    flowIntensity,
    runMode,
    isPathActive,
    parserSamples,
    updaterSamples,
    lastRunAt,
    selectedNodeId,
    configOpen,
    pathConfigs,
    setPathConfigs,
    paths,
    persistPathSettings: async (...args) => { await persistPathSettings(...args); },
    reportAiPathsError,
    pruneRuntimeInputs,
  });

  const updateSelectedNode = (
    patch: Partial<AiNode>,
    options?: { nodeId?: string },
  ): void => {
    const targetNodeId = options?.nodeId ?? selectedNodeId;
    if (!targetNodeId) return;
    if (isPathLocked) {
      toast('This path is locked. Unlock it to edit nodes or connections.', {
        variant: 'info',
      });
      return;
    }
    const shouldSanitizeEdges = Boolean(patch.inputs || patch.outputs);
    setNodes((prev: AiNode[]): AiNode[] => {
      let foundTarget = false;
      const next = prev.map((node: AiNode): AiNode => {
        if (node.id !== targetNodeId) return node;
        foundTarget = true;
        const nextNode: AiNode = { ...node, ...patch };
        if (patch.config) {
          const currentConfig = node.config ?? {};
          const mergedConfig = { ...currentConfig };
          for (const key of Object.keys(patch.config) as Array<
            keyof NodeConfig
          >) {
            const patchValue = patch.config[key];
            const currentValue = currentConfig[key];
            if (
              patchValue &&
              typeof patchValue === 'object' &&
              !Array.isArray(patchValue) &&
              currentValue &&
              typeof currentValue === 'object' &&
              !Array.isArray(currentValue)
            ) {
              (mergedConfig as Record<string, unknown>)[key] = {
                ...currentValue,
                ...patchValue,
              };
            } else {
              (mergedConfig as Record<string, unknown>)[key] =
                patchValue as unknown;
            }
          }
          nextNode.config = mergedConfig;
        }
        return nextNode;
      });
      if (!foundTarget) {
        const isFullNodePatch =
          patch.id === targetNodeId &&
          typeof patch.type === 'string' &&
          typeof patch.title === 'string' &&
          typeof patch.description === 'string' &&
          Array.isArray(patch.inputs) &&
          Array.isArray(patch.outputs) &&
          typeof patch.position?.x === 'number' &&
          typeof patch.position?.y === 'number';
        if (isFullNodePatch) {
          next.push(patch as AiNode);
        }
      }
      if (shouldSanitizeEdges) {
        setEdges((current: Edge[]): Edge[] => sanitizeEdges(next, current));
      }
      return next;
    });
  };

  const updateSelectedNodeConfig = (patch: NodeConfig): void => {
    if (!selectedNodeId) return;
    if (isPathLocked) {
      toast('This path is locked. Unlock it to edit nodes or connections.', {
        variant: 'info',
      });
      return;
    }
    setNodes((prev: AiNode[]): AiNode[] => {
      const currentNode = prev.find(
        (node: AiNode): boolean => node.id === selectedNodeId,
      );
      if (!currentNode) return prev;
      const next = prev.map((node: AiNode): AiNode => {
        if (node.id !== selectedNodeId) return node;
        // Deep merge for nested config objects to prevent stale closure issues
        const currentConfig = node.config ?? {};
        const mergedConfig = { ...currentConfig };
        for (const key of Object.keys(patch) as Array<keyof NodeConfig>) {
          const patchValue = patch[key];
          const currentValue = currentConfig[key];
          // Deep merge objects (but not arrays)
          if (
            patchValue &&
            typeof patchValue === 'object' &&
            !Array.isArray(patchValue) &&
            currentValue &&
            typeof currentValue === 'object' &&
            !Array.isArray(currentValue)
          ) {
            (mergedConfig as Record<string, unknown>)[key] = {
              ...currentValue,
              ...patchValue,
            };
          } else {
            (mergedConfig as Record<string, unknown>)[key] = patchValue;
          }
        }
        return { ...node, config: mergedConfig };
      });
      return next;
    });
  };

  const updateActivePathMeta = (name: string): void => {
    if (!activePathId) return;
    const updatedAt = new Date().toISOString();
    setPaths((prev: PathMeta[]): PathMeta[] =>
      prev.map(
        (path: PathMeta): PathMeta =>
          path.id === activePathId ? { ...path, name, updatedAt } : path,
      ),
    );
  };

  const {
    handleExecutionModeChange,
    handleFlowIntensityChange,
    handleRunModeChange,
    handleHistoryRetentionChange,
    handleTogglePathLock,
    handleTogglePathActive,
  } = useAiPathsSettingsModeActions({
    activePathId,
    isPathLocked,
    isPathActive,
    setIsPathLocked,
    setIsPathActive,
    activeTrigger,
    executionMode,
    setExecutionMode,
    flowIntensity,
    setFlowIntensity,
    runMode,
    setRunMode,
    historyRetentionPasses,
    setHistoryRetentionPasses,
    nodes,
    edges,
    pathName,
    pathDescription,
    parserSamples,
    updaterSamples,
    runtimeState,
    lastRunAt,
    selectedNodeId,
    pathConfigs,
    paths,
    setPaths,
    setPathConfigs,
    persistPathSettings: async (...args) => { await persistPathSettings(...args); },
    persistSettingsBulk,
    reportAiPathsError,
    toast,
  });

  const {
    handleReset,
    handleCreatePath,
    handleCreateAiDescriptionPath,
    handleDuplicatePath,
    handleDeletePath,
    handleSwitchPath,
  } = useAiPathsSettingsPathActions({
    activePathId,
    setActivePathId,
    isPathLocked,
    pathConfigs,
    setPathConfigs,
    paths,
    setPaths,
    setNodes,
    setEdges,
    setPathName,
    setPathDescription,
    setActiveTrigger,
    setExecutionMode,
    setFlowIntensity,
    setRunMode,
    setParserSamples,
    setUpdaterSamples,
    setRuntimeState,
    setLastRunAt,
    setIsPathLocked,
    setIsPathActive,
    setSelectedNodeId,
    setConfigOpen,
    normalizeTriggerLabel,
    updateActivePathMeta,
    persistPathSettings: async (...args) => { await persistPathSettings(...args); },
    persistSettingsBulk,
    persistActivePathPreference,
    reportAiPathsError,
    confirm,
    toast,
  });

  const { handleCopyDocsWiring, handleCopyDocsDescription, handleCopyDocsJobs } =
    useAiPathsSettingsDocsActions({
      toast,
      reportAiPathsError,
    });

  React.useEffect((): void | (() => void) => {
    if (loading || !activePathId) return;

    const persistedNodes = pathConfigs[activePathId]?.nodes ?? nodes;
    const runtimeSnapshot = buildPersistedRuntimeState(
      runtimeState,
      persistedNodes,
    );
    const snapshotKey = `${activePathId}:${lastRunAt ?? ''}:${runtimeSnapshot}`;
    if (snapshotKey === runtimePersistenceKeyRef.current) return;

    const timeout = setTimeout((): void => {
      runtimePersistenceKeyRef.current = snapshotKey;
      const updatedAt = new Date().toISOString();
      const baseConfig =
        pathConfigs[activePathId] ?? createDefaultPathConfig(activePathId);
      const nextConfig: PathConfig = {
        ...baseConfig,
        id: activePathId,
        updatedAt,
        runtimeState,
        lastRunAt,
      };
      setPathConfigs(
        (prev: Record<string, PathConfig>): Record<string, PathConfig> => {
          return {
            ...prev,
            [activePathId]: nextConfig,
          };
        },
      );
      void persistRuntimePathState(activePathId, nextConfig).catch(
        (error: unknown): void => {
          logClientError(error, {
            context: {
              source: 'useAiPathsSettingsState',
              action: 'autoPersistRuntimeState',
              pathId: activePathId,
            },
          });
        },
      );
    }, 750);

    return (): void => clearTimeout(timeout);
  }, [
    activePathId,
    lastRunAt,
    loading,
    nodes,
    pathConfigs,
    persistRuntimePathState,
    runtimeState,
  ]);

  const autoSaveLabel = loading
    ? 'Loading AI Paths...'
    : saving
      ? 'Saving...'
      : autoSaveStatus === 'saved'
        ? `Saved${autoSaveAt ? ` at ${new Date(autoSaveAt).toLocaleTimeString()}` : ''}`
        : autoSaveStatus === 'error'
          ? 'Save failed'
          : 'Manual save only';
  const autoSaveClasses =
    autoSaveStatus === 'saved'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
      : autoSaveStatus === 'error'
        ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
        : autoSaveStatus === 'saving'
          ? 'border-sky-500/40 bg-sky-500/10 text-sky-200'
          : 'border bg-card/60 text-gray-300';

  const pathFlagsById = useMemo((): Record<
    string,
    { isLocked: boolean; isActive: boolean }
  > => {
    const next: Record<string, { isLocked: boolean; isActive: boolean }> = {};
    paths.forEach((meta: PathMeta) => {
      const config = pathConfigs[meta.id];
      next[meta.id] = {
        isLocked: config?.isLocked ?? false,
        isActive: config?.isActive ?? true,
      };
    });
    return next;
  }, [pathConfigs, paths]);

  return {
    loading,
    docsOverviewSnippet: DOCS_OVERVIEW_SNIPPET,
    docsWiringSnippet: DOCS_WIRING_SNIPPET,
    docsDescriptionSnippet: DOCS_DESCRIPTION_SNIPPET,
    docsJobsSnippet: DOCS_JOBS_SNIPPET,
    handleCopyDocsWiring: (): void => {
      void handleCopyDocsWiring();
    },
    handleCopyDocsDescription: (): void => {
      void handleCopyDocsDescription();
    },
    handleCopyDocsJobs: (): void => {
      void handleCopyDocsJobs();
    },
    autoSaveLabel,
    autoSaveClasses,
    autoSaveStatus,
    autoSaveAt: autoSaveAt ?? null,
    saving,
    handleCreatePath,
    handleCreateAiDescriptionPath,
    handleDuplicatePath,
    handleSave,
    handleReset,
    handleDeletePath,
    activePathId,
    activeTrigger,
    executionMode,
    flowIntensity,
    runMode,
    historyRetentionPasses,
    historyRetentionOptionsMax,
    handleExecutionModeChange,
    handleFlowIntensityChange,
    handleRunModeChange,
    handleHistoryRetentionChange,
    triggers,
    isPathLocked,
    isPathActive,
    handleTogglePathLock,
    handleTogglePathActive,
    lastError,
    setLastError,
    persistLastError,
    setLoadNonce,
    lastRunAt,
    pathName,
    setPathName,
    updateActivePathMeta,
    paths,
    pathConfigs,
    pathFlagsById,
    handleSwitchPath,
    savePathIndex,
    nodes,
    setNodes,
    edges,
    setEdges,
    runtimeState,
    edgePaths,
    view,
    panState,
    lastDrop,
    connecting,
    connectingPos,
    connectingFromNode,
    selectedNodeId,
    dragState,
    selectedEdgeId,
    palette: paletteWithTriggerButtons,
    paletteCollapsed,
    setPaletteCollapsed,
    expandedPaletteGroups,
    togglePaletteGroup,
    handleDragStart,
    selectedNode,
    handleSelectEdge,
    handleFireTrigger,
    handleFireTriggerPersistent,
    setSimulationOpenNodeId,
    updateSelectedNode,
    setConfigOpen,
    handleDeleteSelectedNode: () => {
      handleDeleteSelectedNode();
    },
    handleRemoveEdge,
    handleClearWires,
    handleClearConnectorData,
    handleClearHistory,
    handleClearNodeHistory,
    handleDisconnectPort,
    handleReconnectInput,
    handleSelectNode,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleStartConnection,
    handleCompleteConnection,
    handleDrop,
    handleDragOver,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    zoomTo,
    fitToNodes,
    resetView,
    presetDraft,
    setPresetDraft,
    editingPresetId,
    handleResetPresetDraft,
    handlePresetFromSelection,
    handleSavePreset,
    clusterPresets,
    handleLoadPreset,
    handleApplyPreset,
    handleDeletePreset,
    handleExportPresets,
    lastGraphModelPayload,
    runList,
    runsQuery,
    runFilter,
    setRunFilter,
    expandedRunHistory,
    setExpandedRunHistory,
    runHistorySelection,
    setRunHistorySelection,
    handleOpenRunDetail,
    handleResumeRun,
    handleCancelRun,
    handleRequeueDeadLetter,
    viewportRef,
    canvasRef,
    configOpen,
    nodeConfigDirty,
    setNodeConfigDirty,
    modelOptions,
    parserSamples,
    setParserSamples,
    parserSampleLoading,
    updaterSamples,
    setUpdaterSamples,
    updaterSampleLoading,
    pathDebugSnapshots,
    updateSelectedNodeConfig,
    handleFetchParserSample,
    handleFetchUpdaterSample,
    handleRunSimulation: (node: AiNode, triggerEvent?: string): void => {
      void handleRunSimulation(node, triggerEvent);
    },
    clearRuntimeForNode,
    clearNodeCache,
    handleSendToAi,
    sendingToAi,
    handlePauseActiveRun,
    handleResumeActiveRun,
    handleStepActiveRun,
    handleCancelActiveRun,
    runtimeRunStatus,
    runtimeNodeStatuses,
    runtimeEvents,
    nodeDurations,
    dbQueryPresets,
    setDbQueryPresets,
    saveDbQueryPresets,
    dbNodePresets,
    setDbNodePresets,
    saveDbNodePresets,
    runDetailOpen,
    setRunDetailOpen,
    runDetailLoading,
    runDetail,
    setRunDetail,
    runStreamStatus,
    runStreamPaused,
    setRunStreamPaused,
    runNodeSummary,
    runEventsOverflow,
    runEventsBatchLimit,
    runDetailHistoryOptions,
    runDetailSelectedHistoryNodeId,
    setRunHistoryNodeId,
    runDetailSelectedHistoryEntries,
    presetsModalOpen,
    setPresetsModalOpen,
    presetsJson,
    setPresetsJson,
    handleImportPresets,
    simulationOpenNodeId,
    reportAiPathsError,
    toast,
    confirmNodeSwitch,
    ConfirmationModal,
  };
}

export type AiPathsSettingsState = UseAiPathsSettingsStateReturn;
