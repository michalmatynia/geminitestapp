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
export { useSelectionState, useSelectionActions } from './SelectionContext';

// Consumer Hooks - Canvas
export { useCanvasState, useCanvasActions, useCanvasRefs } from './CanvasContext';

// Consumer Hooks - Presets
export { usePresetsState, usePresetsActions } from './PresetsContext';

// Consumer Hooks - Run History
export { useRunHistoryState, useRunHistoryActions } from './RunHistoryContext';

// Consumer Hooks - Graph
export {
  useGraphState,
  useGraphActions,
} from './GraphContext';
export {
  useNodes,
  useEdges,
  useNode,
  useActivePathConfig,
} from './GraphContext.selectors';

// Consumer Hooks - Runtime
export { useRuntimeState, useRuntimeActions, useNodeRuntime } from './RuntimeContext';

// Consumer Hooks - Persistence
export { usePersistenceState, usePersistenceActions } from './PersistenceContext';

// Types - Selection
export type { SelectionState, SelectionActions } from './SelectionContext';

// Types - Canvas
export type {
  CanvasState,
  CanvasActions,
  CanvasRefs,
  ViewState,
  PanState,
  CanvasDragState,
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
  RunHistoryOperationHandlers,
  RunHistoryFilter,
  RunStreamStatus,
  RunDetailData,
} from './RunHistoryContext';

// Types - Graph
export type {
  GraphActions,
  GraphMutationMeta,
  GraphMutationReason,
  GraphMutationRecord,
  GraphState,
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

// Derived hooks
export { useCanvasInteractions } from './hooks/useCanvasInteractions';
