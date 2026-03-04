import type * as React from 'react';
import type {
  AiNode,
  Edge,
  NodeConfig,
  NodeDefinition,
  PathBlockedRunPolicy,
  ParserSampleState,
  PathConfig,
  PathExecutionMode,
  PathFlowIntensity,
  AiPathsValidationConfig,
  PathRunMode,
  PathDebugSnapshot,
  PathMeta,
  RuntimeState,
  UpdaterSampleState,
  AiPathRuntimeEvent,
  AiPathRuntimeNodeStatusMap,
  DbQueryPreset,
  DbNodePreset,
  ClusterPreset,
} from '@/shared/lib/ai-paths';
import type { Toast } from '@/shared/contracts/ui';
import type { ClusterPresetDraft } from '../cluster-presets-panel';

export interface UseAiPathsSettingsStateReturn {
  loading: boolean;
  isPathSwitching: boolean;
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
  handleCreateFromTemplate: (templateId: string) => void;
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
  strictFlowMode: boolean;
  blockedRunPolicy: PathBlockedRunPolicy;
  aiPathsValidation: AiPathsValidationConfig;
  historyRetentionPasses: number;
  historyRetentionOptionsMax: number;
  handleExecutionModeChange: (mode: PathExecutionMode) => void;
  handleFlowIntensityChange: (intensity: PathFlowIntensity) => void;
  handleRunModeChange: (mode: PathRunMode) => void;
  handleStrictFlowModeChange: (enabled: boolean) => void;
  handleBlockedRunPolicyChange: (policy: PathBlockedRunPolicy) => void;
  updateAiPathsValidation: (patch: Partial<AiPathsValidationConfig>) => void;
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
  persistLastError: (
    payload: { message: string; time: string; pathId?: string | null } | null
  ) => Promise<void>;
  incrementLoadNonce: () => void;
  lastRunAt: string | null;
  pathName: string;
  pathDescription: string;
  updateActivePathMeta: (name: string) => void;
  paths: PathMeta[];
  pathConfigs: Record<string, PathConfig>;
  pathFlagsById: Record<string, { isLocked: boolean; isActive: boolean }>;
  handleSwitchPath: (pathId: string) => void;
  savePathIndex: (nextPaths: PathMeta[]) => Promise<void>;
  nodes: AiNode[];
  edges: Edge[];
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
  nodeConfigDirty: boolean;
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
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, node: NodeDefinition) => void;
  selectedNode: AiNode | null;
  handleSelectEdge: (edgeId: string | null) => void;
  handleFireTrigger: (triggerNode: AiNode, event?: React.MouseEvent) => void;
  handleFireTriggerPersistent: (triggerNode: AiNode, event?: React.MouseEvent) => Promise<void>;
  updateSelectedNode: (update: Partial<AiNode>, options?: { nodeId?: string }) => void;
  handleDeleteSelectedNode: () => void;
  handleRemoveEdge: (edgeId: string) => void;
  handleClearWires: () => Promise<void>;
  handleClearConnectorData: () => Promise<void>;
  handleClearHistory: () => Promise<void>;
  handleClearNodeHistory: (nodeId: string) => Promise<void>;
  handleDisconnectPort: (direction: 'input' | 'output', nodeId: string, port: string) => void;
  handleReconnectInput: (
    event: React.PointerEvent<HTMLButtonElement>,
    nodeId: string,
    port: string
  ) => void;
  handleSelectNode: (nodeId: string) => void;
  handlePointerDown: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  handlePointerMove: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  handlePointerUp: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  handleStartConnection: (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ) => void;
  handleCompleteConnection: (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
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
  viewportRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  parserSamples: Record<string, ParserSampleState>;
  setParserSamples: React.Dispatch<React.SetStateAction<Record<string, ParserSampleState>>>;
  parserSampleLoading: boolean;
  updaterSamples: Record<string, UpdaterSampleState>;
  setUpdaterSamples: React.Dispatch<React.SetStateAction<Record<string, UpdaterSampleState>>>;
  updaterSampleLoading: boolean;
  pathDebugSnapshots: Record<string, PathDebugSnapshot>;
  updateSelectedNodeConfig: (config: NodeConfig) => void;
  handleFetchParserSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  handleFetchUpdaterSample: (
    nodeId: string,
    entityType: string,
    entityId: string,
    options?: { notify?: boolean }
  ) => Promise<void>;
  handleRunSimulation: (node: AiNode, triggerEvent?: string) => Promise<void>;
  handlePauseActiveRun: () => void;
  handleResumeActiveRun: () => void;
  handleStepActiveRun: (triggerNode?: AiNode) => void;
  handleCancelActiveRun: () => void;
  runtimeRunStatus: 'idle' | 'running' | 'paused' | 'stepping' | 'completed' | 'failed';
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
  presetsModalOpen: boolean;
  setPresetsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  presetsJson: string;
  setPresetsJson: React.Dispatch<React.SetStateAction<string>>;
  handleImportPresets: (mode: 'merge' | 'replace') => Promise<void>;
  ConfirmationModal: React.ComponentType;
  confirmNodeSwitch: (nextNodeId: string) => boolean | Promise<boolean>;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
  toast: Toast;
  ensureNodeVisible: (node: AiNode) => void;
  getCanvasCenterPosition: () => { x: number; y: number };
  persistActivePathPreference: (pathId: string | null) => Promise<void>;
  persistPathSettings: (
    nextPaths: PathMeta[],
    configId: string,
    config: PathConfig
  ) => Promise<void>;
  persistSettingsBulk: (items: Array<{ key: string; value: string }>) => Promise<void>;
}
