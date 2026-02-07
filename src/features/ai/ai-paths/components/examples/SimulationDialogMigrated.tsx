'use client';

/**
 * SimulationDialogMigrated - Context-based wrapper for SimulationDialog.
 *
 * BEFORE: 6 props
 * ```tsx
 * <SimulationDialog
 *   openNodeId={simulationOpenNodeId}
 *   onClose={() => setSimulationOpenNodeId(null)}
 *   nodes={nodes}
 *   setNodes={setNodes}
 *   isPathLocked={isPathLocked}
 *   onRunSimulation={...}
 * />
 * ```
 *
 * AFTER: 2 props (only callbacks)
 * ```tsx
 * <SimulationDialogMigrated
 *   setNodes={setNodes}
 *   onRunSimulation={...}
 * />
 * ```
 *
 * State props eliminated (4 props removed, 67% reduction):
 * - openNodeId → SelectionContext (simulationOpenNodeId)
 * - onClose → SelectionContext action (setSimulationOpenNodeId)
 * - nodes → GraphContext
 * - isPathLocked → GraphContext
 */

import type { AiNode } from '@/features/ai/ai-paths/lib';

import { useGraphState, useGraphActions } from '../../context/GraphContext';
import { useSelectionState, useSelectionActions } from '../../context/SelectionContext';
import { SimulationDialog } from '../simulation-dialog';


/**
 * Props for SimulationDialogMigrated.
 * Only callbacks that involve external state management remain.
 */
export type SimulationDialogMigratedProps = {
  /** Setter for nodes - involves persistence logic */
  setNodes: React.Dispatch<React.SetStateAction<AiNode[]>>;
  /** Callback to run simulation */
  onRunSimulation: (node: AiNode) => void | Promise<void>;

  openNodeId?: string | null;
  onClose?: () => void;
  nodes?: AiNode[];
  isPathLocked?: boolean;
  savePathConfig?: ((options?: {
    silent?: boolean | undefined;
    includeNodeConfig?: boolean | undefined;
    force?: boolean | undefined;
    nodesOverride?: AiNode[] | undefined;
    nodeOverride?: AiNode | undefined;
  }) => Promise<void>) | undefined;
};

/**
 * SimulationDialogMigrated - Context-based wrapper.
 */
export function SimulationDialogMigrated({
  setNodes: setNodesProp,
  onRunSimulation,
  openNodeId: openNodeIdProp,
  onClose: onCloseProp,
  nodes: nodesProp,
  isPathLocked: isPathLockedProp,
  savePathConfig,
}: SimulationDialogMigratedProps): React.JSX.Element | null {
  // Read state from GraphContext
  const { nodes: nodesContext, isPathLocked: isPathLockedContext } = useGraphState();
  const { setNodes: setNodesContext } = useGraphActions();

  // Read state from SelectionContext
  const { simulationOpenNodeId } = useSelectionState();
  const { setSimulationOpenNodeId } = useSelectionActions();

  return (
    <SimulationDialog
      openNodeId={openNodeIdProp ?? simulationOpenNodeId}
      onClose={onCloseProp ?? (() => setSimulationOpenNodeId(null))}
      nodes={nodesProp ?? nodesContext}
      setNodes={setNodesProp ?? setNodesContext}
      isPathLocked={isPathLockedProp ?? isPathLockedContext}
      onRunSimulation={onRunSimulation}
      savePathConfig={savePathConfig}
    />
  );
}
