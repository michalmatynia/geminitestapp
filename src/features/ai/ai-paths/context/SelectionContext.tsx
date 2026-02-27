'use client';

import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from 'react';

import type { AiNode } from '@/shared/lib/ai-paths';

export type SelectionToolMode = 'pan' | 'select';
export type SelectionScopeMode = 'portion' | 'wiring';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SelectionState {
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  selectionToolMode: SelectionToolMode;
  selectionScopeMode: SelectionScopeMode;
  configOpen: boolean;
  nodeConfigDirty: boolean;
  nodeConfigDraft: AiNode | null;
  simulationOpenNodeId: string | null;
}

export interface SelectionActions {
  selectNode: (nodeId: string | null) => void;
  setNodeSelection: (nodeIds: string[]) => void;
  addNodeToSelection: (nodeId: string) => void;
  removeNodeFromSelection: (nodeId: string) => void;
  toggleNodeSelection: (nodeId: string) => void;
  clearNodeSelection: () => void;
  selectEdge: (edgeId: string | null) => void;
  setSelectionToolMode: (mode: SelectionToolMode) => void;
  setSelectionScopeMode: (mode: SelectionScopeMode) => void;
  setConfigOpen: (open: boolean) => void;
  setNodeConfigDirty: (dirty: boolean) => void;
  setNodeConfigDraft: (draft: AiNode | null) => void;
  setSimulationOpenNodeId: (nodeId: string | null) => void;
  clearSelection: () => void;
}

// ---------------------------------------------------------------------------
// Contexts (split for re-render optimization)
// ---------------------------------------------------------------------------

const SelectionStateContext = createContext<SelectionState | null>(null);
const SelectionActionsContext = createContext<SelectionActions | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface SelectionProviderProps {
  children: ReactNode;
  initialSelectedNodeId?: string | null | undefined;
}

export function SelectionProvider({
  children,
  initialSelectedNodeId = null,
}: SelectionProviderProps): React.ReactNode {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialSelectedNodeId);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(
    initialSelectedNodeId ? [initialSelectedNodeId] : []
  );
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectionToolMode, setSelectionToolModeState] =
    useState<SelectionToolMode>('pan');
  const [selectionScopeMode, setSelectionScopeModeState] =
    useState<SelectionScopeMode>('portion');
  const [configOpen, setConfigOpenState] = useState(false);
  const [nodeConfigDirty, setNodeConfigDirtyState] = useState(false);
  const [nodeConfigDraft, setNodeConfigDraftState] = useState<AiNode | null>(null);
  const [simulationOpenNodeId, setSimulationOpenNodeIdState] = useState<string | null>(null);

  // Actions are stable (useMemo with empty deps uses the state setters directly)
  const actions = useMemo<SelectionActions>(
    () => ({
      selectNode: (nodeId: string | null) => {
        const normalized = nodeId?.trim() ?? '';
        if (normalized) {
          setSelectedNodeId(normalized);
          setSelectedNodeIds([normalized]);
          setSelectedEdgeId(null);
          return;
        }
        setSelectedNodeId(null);
        setSelectedNodeIds([]);
      },
      setNodeSelection: (nodeIds: string[]) => {
        const unique = Array.from(
          new Set(
            nodeIds
              .map((value: string) => value.trim())
              .filter((value: string): boolean => value.length > 0)
          )
        );
        setSelectedNodeIds(unique);
        setSelectedNodeId(unique[0] ?? null);
        if (unique.length > 0) {
          setSelectedEdgeId(null);
        }
      },
      addNodeToSelection: (nodeId: string) => {
        const normalized = nodeId.trim();
        if (!normalized) return;
        setSelectedNodeIds((prev: string[]) => {
          if (prev.includes(normalized)) return prev;
          return [...prev, normalized];
        });
        setSelectedNodeId((prev: string | null) => prev ?? normalized);
        setSelectedEdgeId(null);
      },
      removeNodeFromSelection: (nodeId: string) => {
        const normalized = nodeId.trim();
        if (!normalized) return;
        setSelectedNodeIds((prev: string[]) => {
          const next = prev.filter((value: string) => value !== normalized);
          setSelectedNodeId(
            (prevSelectedNodeId: string | null): string | null =>
              prevSelectedNodeId === normalized ? (next[0] ?? null) : prevSelectedNodeId
          );
          return next;
        });
      },
      toggleNodeSelection: (nodeId: string) => {
        const normalized = nodeId.trim();
        if (!normalized) return;
        setSelectedNodeIds((prev: string[]) => {
          const exists = prev.includes(normalized);
          const next = exists
            ? prev.filter((value: string) => value !== normalized)
            : [...prev, normalized];
          setSelectedNodeId(
            (prevSelectedNodeId: string | null): string | null => {
              if (!exists) return normalized;
              if (prevSelectedNodeId === normalized) return next[0] ?? null;
              return prevSelectedNodeId;
            }
          );
          if (next.length > 0) {
            setSelectedEdgeId(null);
          }
          return next;
        });
      },
      clearNodeSelection: () => {
        setSelectedNodeId(null);
        setSelectedNodeIds([]);
      },
      selectEdge: (edgeId: string | null) => {
        setSelectedEdgeId(edgeId);
        // When selecting an edge, clear node selection
        if (edgeId !== null) {
          setSelectedNodeId(null);
          setSelectedNodeIds([]);
        }
      },
      setSelectionToolMode: setSelectionToolModeState,
      setSelectionScopeMode: setSelectionScopeModeState,
      setConfigOpen: setConfigOpenState,
      setNodeConfigDirty: setNodeConfigDirtyState,
      setNodeConfigDraft: setNodeConfigDraftState,
      setSimulationOpenNodeId: setSimulationOpenNodeIdState,
      clearSelection: () => {
        setSelectedNodeId(null);
        setSelectedNodeIds([]);
        setSelectedEdgeId(null);
        setConfigOpenState(false);
        setNodeConfigDirtyState(false);
        setNodeConfigDraftState(null);
      },
    }),
    []
  );

  const state = useMemo<SelectionState>(
    () => ({
      selectedNodeId,
      selectedNodeIds,
      selectedEdgeId,
      selectionToolMode,
      selectionScopeMode,
      configOpen,
      nodeConfigDirty,
      nodeConfigDraft,
      simulationOpenNodeId,
    }),
    [
      selectedNodeId,
      selectedNodeIds,
      selectedEdgeId,
      selectionToolMode,
      selectionScopeMode,
      configOpen,
      nodeConfigDirty,
      nodeConfigDraft,
      simulationOpenNodeId,
    ]
  );

  return (
    <SelectionActionsContext.Provider value={actions}>
      <SelectionStateContext.Provider value={state}>
        {children}
      </SelectionStateContext.Provider>
    </SelectionActionsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Consumer Hooks
// ---------------------------------------------------------------------------

/**
 * Get the current selection state.
 * Components using this will re-render when any selection state changes.
 */
export function useSelectionState(): SelectionState {
  const context = useContext(SelectionStateContext);
  if (!context) {
    throw new Error('useSelectionState must be used within a SelectionProvider');
  }
  return context;
}

/**
 * Get selection actions.
 * Components using this will NOT re-render when state changes.
 */
export function useSelectionActions(): SelectionActions {
  const context = useContext(SelectionActionsContext);
  if (!context) {
    throw new Error('useSelectionActions must be used within a SelectionProvider');
  }
  return context;
}

/**
 * Combined hook for components that need both state and actions.
 * Prefer using useSelectionState or useSelectionActions separately when possible.
 */
export function useSelection(): SelectionState & SelectionActions {
  const state = useSelectionState();
  const actions = useSelectionActions();
  return { ...state, ...actions };
}
