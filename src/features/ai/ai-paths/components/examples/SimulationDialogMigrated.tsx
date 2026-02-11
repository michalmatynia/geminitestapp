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
import { useToast } from '@/shared/ui';

import {
  useGraphActions,
  useGraphState,
  usePersistenceActions,
  useRuntimeActions,
  useSelectionActions,
  useSelectionState,
} from '../../context';
import { SimulationDialog } from '../simulation-dialog';


/**
 * Props for SimulationDialogMigrated.
 * Only callbacks that involve external state management remain.
 */
export type SimulationDialogMigratedProps = {
  /** Setter for nodes - involves persistence logic */
  setNodes?: React.Dispatch<React.SetStateAction<AiNode[]>> | undefined;
  /** Callback to run simulation */
  onRunSimulation?: ((node: AiNode) => void | Promise<void>) | undefined;

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
  }) => Promise<boolean>) | undefined;
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
  const { toast } = useToast();
  // Read state from GraphContext
  const { nodes: nodesContext, isPathLocked: isPathLockedContext } = useGraphState();
  const { setNodes: setNodesContext } = useGraphActions();
  const { runSimulation: runSimulationContext } = useRuntimeActions();
  const { savePathConfig: savePathConfigContext } = usePersistenceActions();

  // Read state from SelectionContext
  const { simulationOpenNodeId } = useSelectionState();
  const { setSimulationOpenNodeId } = useSelectionActions();
  const isPathLocked = isPathLockedProp ?? isPathLockedContext;
  const setNodes: React.Dispatch<React.SetStateAction<AiNode[]>> =
    setNodesProp ??
    ((next: React.SetStateAction<AiNode[]>): void => {
      if (isPathLocked) {
        toast('This path is locked. Unlock it to change simulation inputs.', { variant: 'info' });
        return;
      }
      setNodesContext(next);
    });
  const handleRunSimulation = onRunSimulation ?? runSimulationContext;
  const handleSavePathConfig = savePathConfig ?? savePathConfigContext;

  return (
    <SimulationDialog
      openNodeId={openNodeIdProp ?? simulationOpenNodeId}
      onClose={onCloseProp ?? (() => setSimulationOpenNodeId(null))}
      nodes={nodesProp ?? nodesContext}
      setNodes={setNodes}
      isPathLocked={isPathLocked}
      onRunSimulation={handleRunSimulation}
      savePathConfig={handleSavePathConfig}
    />
  );
}
