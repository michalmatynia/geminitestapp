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

import { useGraphState } from '../../context/GraphContext';
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
};

/**
 * SimulationDialogMigrated - Context-based wrapper.
 */
export function SimulationDialogMigrated({
  setNodes,
  onRunSimulation,
}: SimulationDialogMigratedProps): React.JSX.Element | null {
  // Read state from GraphContext
  const { nodes, isPathLocked } = useGraphState();

  // Read state from SelectionContext
  const { simulationOpenNodeId } = useSelectionState();
  const { setSimulationOpenNodeId } = useSelectionActions();

  return (
    <SimulationDialog
      openNodeId={simulationOpenNodeId}
      onClose={() => setSimulationOpenNodeId(null)}
      nodes={nodes}
      setNodes={setNodes}
      isPathLocked={isPathLocked}
      onRunSimulation={onRunSimulation}
    />
  );
}
