// Context Providers
export { SelectionProvider } from './SelectionContext';
export { CanvasProvider } from './CanvasContext';
export { PresetsProvider } from './PresetsContext';
export { RunHistoryProvider } from './RunHistoryContext';
export { GraphProvider } from './GraphContext';
export { RuntimeProvider } from './RuntimeContext';
export { PersistenceProvider } from './PersistenceContext';
export { AiPathsProvider } from './AiPathsProvider';

// Consumer Hooks - Selection
export {
  useSelection,
  useSelectionState,
  useSelectionActions,
} from './SelectionContext';

// Consumer Hooks - Canvas
export {
  useCanvas,
  useCanvasState,
  useCanvasActions,
  useCanvasRefs,
} from './CanvasContext';

// Consumer Hooks - Presets
export {
  usePresets,
  usePresetsState,
  usePresetsActions,
} from './PresetsContext';

// Consumer Hooks - Run History
export {
  useRunHistory,
  useRunHistoryState,
  useRunHistoryActions,
} from './RunHistoryContext';

// Consumer Hooks - Graph
export {
  useGraph,
  useGraphState,
  useGraphActions,
  useNodes,
  useEdges,
  useNode,
  useActivePathConfig,
} from './GraphContext';

// Consumer Hooks - Runtime
export {
  useRuntime,
  useRuntimeState,
  useRuntimeActions,
  useNodeRuntime,
} from './RuntimeContext';

// Consumer Hooks - Persistence
export {
  usePersistence,
  usePersistenceState,
  usePersistenceActions,
} from './PersistenceContext';

// Types - Selection
export type {
  SelectionState,
  SelectionActions,
} from './SelectionContext';

// Types - Canvas
export type {
  CanvasState,
  CanvasActions,
  CanvasRefs,
  ViewState,
  PanState,
  DragState,
  ConnectingState,
} from './CanvasContext';

// Types - Presets
export type {
  PresetsState,
  PresetsActions,
  ClusterPresetDraft,
  PresetPersistenceHandlers,
} from './PresetsContext';

// Types - Run History
export type {
  RunHistoryState,
  RunHistoryActions,
  RunHistoryFilter,
  RunStreamStatus,
  RunDetailData,
} from './RunHistoryContext';

// Types - Graph
export type {
  GraphState,
  GraphActions,
} from './GraphContext';

// Types - Runtime
export type {
  RuntimeStateData,
  RuntimeActions,
  LastErrorInfo,
  RuntimeRunStatus,
  RuntimeControlHandlers,
  RuntimeNodeConfigHandlers,
} from './RuntimeContext';

// Types - Persistence
export type {
  PersistenceState,
  PersistenceActions,
  AutoSaveStatus,
  SavePathConfigOptions,
  PersistenceOperationHandlers,
} from './PersistenceContext';

// Legacy Sync Hooks (for gradual migration)
export {
  useLegacySyncSelection,
  useLegacySyncCanvas,
  useLegacySyncGraph,
  useLegacySyncRuntime,
  useLegacySyncPersistence,
  useLegacySyncAll,
} from './hooks/useLegacySync';

// Derived hooks
export { useCanvasInteractions } from './hooks/useCanvasInteractions';

export type {
  LegacySyncSelectionProps,
  LegacySyncCanvasProps,
  LegacySyncGraphProps,
  LegacySyncRuntimeProps,
  LegacySyncPersistenceProps,
  LegacySyncAllProps,
} from './hooks/useLegacySync';
