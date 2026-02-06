'use client';

import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SelectionState {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  configOpen: boolean;
  nodeConfigDirty: boolean;
  simulationOpenNodeId: string | null;
}

export interface SelectionActions {
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  setConfigOpen: (open: boolean) => void;
  setNodeConfigDirty: (dirty: boolean) => void;
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
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [configOpen, setConfigOpenState] = useState(false);
  const [nodeConfigDirty, setNodeConfigDirtyState] = useState(false);
  const [simulationOpenNodeId, setSimulationOpenNodeIdState] = useState<string | null>(null);

  // Actions are stable (useMemo with empty deps uses the state setters directly)
  const actions = useMemo<SelectionActions>(
    () => ({
      selectNode: (nodeId: string | null) => {
        setSelectedNodeId(nodeId);
        // When selecting a node, clear edge selection
        if (nodeId !== null) {
          setSelectedEdgeId(null);
        }
      },
      selectEdge: (edgeId: string | null) => {
        setSelectedEdgeId(edgeId);
        // When selecting an edge, clear node selection
        if (edgeId !== null) {
          setSelectedNodeId(null);
        }
      },
      setConfigOpen: setConfigOpenState,
      setNodeConfigDirty: setNodeConfigDirtyState,
      setSimulationOpenNodeId: setSimulationOpenNodeIdState,
      clearSelection: () => {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setConfigOpenState(false);
        setNodeConfigDirtyState(false);
      },
    }),
    []
  );

  const state = useMemo<SelectionState>(
    () => ({
      selectedNodeId,
      selectedEdgeId,
      configOpen,
      nodeConfigDirty,
      simulationOpenNodeId,
    }),
    [selectedNodeId, selectedEdgeId, configOpen, nodeConfigDirty, simulationOpenNodeId]
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
