"use client";

/**
 * Example component demonstrating context hook usage.
 *
 * This component shows the migration pattern from prop-based to context-based state.
 * Child components can use hooks like useGraphState() and useSelectionState() directly
 * instead of receiving props through deep prop drilling.
 *
 * BEFORE (prop drilling):
 * ```tsx
 * function Parent({ nodes, selectedNodeId }: Props) {
 *   const selectedNode = nodes.find(n => n.id === selectedNodeId);
 *   return <SelectedNodeInfo selectedNode={selectedNode} nodes={nodes} />;
 * }
 * ```
 *
 * AFTER (context hooks):
 * ```tsx
 * function Parent() {
 *   return <SelectedNodeInfo />;  // No props needed!
 * }
 * ```
 */

import { useMemo } from "react";
import { useGraphState, useSelectionState } from "../../context";
import type { AiNode } from "@/features/ai/ai-paths/lib";

export interface SelectedNodeInfoProps {
  /** Optional className for styling */
  className?: string | undefined;
}

/**
 * Displays information about the currently selected node.
 * Uses context hooks instead of props for state access.
 */
export function SelectedNodeInfo({
  className,
}: SelectedNodeInfoProps): React.JSX.Element | null {
  // Get state directly from contexts - no prop drilling!
  const { nodes, edges } = useGraphState();
  const { selectedNodeId } = useSelectionState();

  // Derive selected node from context state
  const selectedNode = useMemo<AiNode | null>(() => {
    if (!selectedNodeId) return null;
    return nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  // Derive connected edges
  const connectedEdges = useMemo(() => {
    if (!selectedNodeId) return { incoming: 0, outgoing: 0 };
    const incoming = edges.filter((edge) => edge.to === selectedNodeId).length;
    const outgoing = edges.filter((edge) => edge.from === selectedNodeId).length;
    return { incoming, outgoing };
  }, [edges, selectedNodeId]);

  if (!selectedNode) {
    return (
      <div className={className}>
        <p className="text-sm text-gray-500">No node selected</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        <div>
          <span className="text-xs uppercase text-gray-500">Title</span>
          <p className="text-sm font-medium text-white">{selectedNode.title}</p>
        </div>
        <div>
          <span className="text-xs uppercase text-gray-500">Type</span>
          <p className="text-sm text-gray-300">{selectedNode.type}</p>
        </div>
        <div>
          <span className="text-xs uppercase text-gray-500">Connections</span>
          <p className="text-sm text-gray-300">
            {connectedEdges.incoming} in, {connectedEdges.outgoing} out
          </p>
        </div>
        <div>
          <span className="text-xs uppercase text-gray-500">Inputs</span>
          <p className="text-sm text-gray-300">
            {selectedNode.inputs.join(", ") || "None"}
          </p>
        </div>
        <div>
          <span className="text-xs uppercase text-gray-500">Outputs</span>
          <p className="text-sm text-gray-300">
            {selectedNode.outputs.join(", ") || "None"}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Example of using actions from context.
 */
export function NodeActionButtons(): React.JSX.Element | null {
  const { selectedNodeId } = useSelectionState();
  // Import actions when needed (these are stable and won't cause re-renders)
  // const { selectNode, clearSelection } = useSelectionActions();
  // const { removeNode } = useGraphActions();

  if (!selectedNodeId) return null;

  return (
    <div className="flex gap-2">
      {/* Actions would use context action hooks */}
      <button
        type="button"
        className="rounded border px-2 py-1 text-xs text-gray-300"
        // onClick={() => clearSelection()}
      >
        Deselect
      </button>
    </div>
  );
}
