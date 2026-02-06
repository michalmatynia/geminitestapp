"use client";

/**
 * CanvasSidebarWrapper - Context-based wrapper for CanvasSidebar.
 *
 * BEFORE: 17 props
 * ```tsx
 * <CanvasSidebar
 *   palette={palette}
 *   paletteCollapsed={paletteCollapsed}
 *   onTogglePaletteCollapsed={...}
 *   expandedPaletteGroups={expandedPaletteGroups}
 *   onTogglePaletteGroup={togglePaletteGroup}
 *   selectedNode={selectedNode}
 *   nodes={nodes}
 *   edges={edges}
 *   selectedEdgeId={selectedEdgeId}
 *   onSelectEdge={handleSelectEdge}
 *   ... 7 more callback props
 * />
 * ```
 *
 * AFTER: 8 props (only callbacks that involve orchestration)
 * ```tsx
 * <CanvasSidebarWrapper
 *   onDragStart={...}
 *   onFireTrigger={...}
 *   onFireTriggerPersistent={...}
 *   onOpenSimulation={...}
 *   onUpdateSelectedNode={...}
 *   onOpenNodeConfig={...}
 *   onDeleteSelectedNode={...}
 *   onClearWires={...}
 * />
 * ```
 *
 * State props eliminated (9 props removed, 53% reduction):
 * - palette, paletteCollapsed, expandedPaletteGroups → PresetsContext
 * - onTogglePaletteCollapsed, onTogglePaletteGroup → PresetsContext actions
 * - selectedNode → derived from SelectionContext + GraphContext
 * - nodes, edges → GraphContext
 * - selectedEdgeId, onSelectEdge → SelectionContext
 * - onRemoveEdge → can be handled internally
 */

import { useMemo } from "react";
import { CanvasSidebar } from "../canvas-sidebar";
import { useGraphState } from "../../context/GraphContext";
import { useSelectionState, useSelectionActions } from "../../context/SelectionContext";
import { usePresetsState, usePresetsActions } from "../../context/PresetsContext";
import type { AiNode, NodeDefinition } from "@/features/ai/ai-paths/lib";

/**
 * Props for CanvasSidebarWrapper.
 * Only callbacks that involve external orchestration remain.
 *
 * Props eliminated by using context actions directly:
 * - onOpenSimulation → SelectionContext.setSimulationOpenNodeId
 * - onOpenNodeConfig → SelectionContext.setConfigOpen
 */
export type CanvasSidebarWrapperProps = {
  /** Palette node definitions - not in context, passed from parent */
  palette: NodeDefinition[];
  /** Callback when dragging a node from palette */
  onDragStart: (event: React.DragEvent<HTMLDivElement>, node: NodeDefinition) => void;
  /** Callback to fire a trigger */
  onFireTrigger: (node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void;
  /** Callback to fire a persistent trigger */
  onFireTriggerPersistent?: ((node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void) | undefined;
  /** Callback to update selected node */
  onUpdateSelectedNode: (patch: Partial<AiNode>, options?: { nodeId?: string }) => void;
  /** Callback to delete selected node */
  onDeleteSelectedNode: () => void;
  /** Callback to remove an edge */
  onRemoveEdge: (edgeId: string) => void;
  /** Callback to clear all wires */
  onClearWires: () => void;
};

/**
 * CanvasSidebarWrapper - Context-based wrapper.
 */
export function CanvasSidebarWrapper({
  palette,
  onDragStart,
  onFireTrigger,
  onFireTriggerPersistent,
  onUpdateSelectedNode,
  onDeleteSelectedNode,
  onRemoveEdge,
  onClearWires,
}: CanvasSidebarWrapperProps): React.JSX.Element {
  // Read state from GraphContext
  const { nodes, edges } = useGraphState();

  // Read state from SelectionContext
  const { selectedNodeId, selectedEdgeId } = useSelectionState();
  const { selectEdge, setSimulationOpenNodeId, setConfigOpen } = useSelectionActions();

  // Read state from PresetsContext
  const { paletteCollapsed, expandedPaletteGroups } = usePresetsState();
  const { setPaletteCollapsed, togglePaletteGroup } = usePresetsActions();

  // Derive selectedNode from context state
  const selectedNode = useMemo<AiNode | null>(() => {
    if (!selectedNodeId) return null;
    return nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  // Build optional props
  const optionalProps = {
    ...(onFireTriggerPersistent !== undefined && { onFireTriggerPersistent }),
  };

  return (
    <CanvasSidebar
      // State from PresetsContext
      palette={palette}
      paletteCollapsed={paletteCollapsed}
      onTogglePaletteCollapsed={() => setPaletteCollapsed(!paletteCollapsed)}
      expandedPaletteGroups={expandedPaletteGroups}
      onTogglePaletteGroup={togglePaletteGroup}
      // State from GraphContext
      nodes={nodes}
      edges={edges}
      // State from SelectionContext
      selectedNode={selectedNode}
      selectedEdgeId={selectedEdgeId}
      onSelectEdge={selectEdge}
      // Callback props passed through
      onDragStart={onDragStart}
      onFireTrigger={onFireTrigger}
      onOpenSimulation={setSimulationOpenNodeId}
      onUpdateSelectedNode={onUpdateSelectedNode}
      onOpenNodeConfig={() => setConfigOpen(true)}
      onDeleteSelectedNode={onDeleteSelectedNode}
      onRemoveEdge={onRemoveEdge}
      onClearWires={onClearWires}
      // Optional props
      {...optionalProps}
    />
  );
}
