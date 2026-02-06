"use client";

/**
 * CanvasBoardMigrated - Wrapper demonstrating context migration for CanvasBoard.
 *
 * This component reads state from contexts and passes to the original CanvasBoard.
 * It's a stepping stone for incremental migration.
 *
 * BEFORE: 35 props
 * ```tsx
 * <CanvasBoard
 *   viewportRef={viewportRef}
 *   canvasRef={canvasRef}
 *   nodes={nodes}
 *   edges={edges}
 *   runtimeState={runtimeState}
 *   edgePaths={edgePaths}
 *   view={view}
 *   panState={panState}
 *   lastDrop={lastDrop}
 *   connecting={connecting}
 *   connectingPos={connectingPos}
 *   connectingFromNode={connectingFromNode}
 *   selectedNodeId={selectedNodeId}
 *   draggingNodeId={draggingNodeId}
 *   selectedEdgeId={selectedEdgeId}
 *   ... 20 more callback props
 * />
 * ```
 *
 * AFTER: 21 props (only callbacks + edgePaths)
 * ```tsx
 * <CanvasBoardMigrated
 *   edgePaths={edgePaths}
 *   onSelectEdgeId={...}
 *   ... 19 more callback props
 * />
 * ```
 *
 * State props eliminated (14 props removed, 40% reduction):
 * - viewportRef, canvasRef → CanvasContext refs
 * - view, panState, lastDrop → CanvasContext state
 * - connecting, connectingPos → CanvasContext state
 * - nodes, edges → GraphContext
 * - selectedNodeId, selectedEdgeId → SelectionContext
 * - runtimeState → RuntimeContext
 * - connectingFromNode, draggingNodeId → derived from context
 */

import { useMemo } from "react";
import { CanvasBoard, type EdgePath } from "../canvas-board";
import { useCanvasState, useCanvasRefs } from "../../context/CanvasContext";
import { useGraphState } from "../../context/GraphContext";
import { useSelectionState } from "../../context/SelectionContext";
import { useRuntimeState } from "../../context/RuntimeContext";
import type { AiNode } from "@/features/ai/ai-paths/lib";

/**
 * Props for CanvasBoardMigrated - only callbacks and derived values.
 *
 * State props have been removed as they now come from contexts:
 * - viewportRef, canvasRef (CanvasContext refs)
 * - nodes, edges (GraphContext)
 * - runtimeState (RuntimeContext)
 * - view, panState, lastDrop, connecting, connectingPos (CanvasContext state)
 * - selectedNodeId, selectedEdgeId (SelectionContext)
 * - connectingFromNode, draggingNodeId (derived from context)
 */
export type CanvasBoardMigratedProps = {
  // Derived value - complex computation, kept as prop for now
  edgePaths: EdgePath[];

  // Callbacks - remain as props since they involve orchestration
  onSelectEdgeId: (edgeId: string | null) => void;
  onRemoveEdge: (edgeId: string) => void;
  onDisconnectPort: (direction: "input" | "output", nodeId: string, port: string) => void;
  onReconnectInput: (event: React.PointerEvent<HTMLButtonElement>, nodeId: string, port: string) => void;
  onSelectNode: (nodeId: string) => void;
  onOpenNodeConfig: (nodeId: string) => void;
  onFireTrigger: (node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void;
  onPointerDownNode: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  onPointerMoveNode: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  onPointerUpNode: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  onStartConnection: (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ) => void;
  onCompleteConnection: (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onPanStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPanMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPanEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
  onZoomTo: (scale: number) => void;
  onFitToNodes: () => void;
  onResetView: () => void;
};

/**
 * CanvasBoardMigrated - Context-based wrapper for CanvasBoard.
 *
 * Reads state from contexts and passes to the original CanvasBoard component.
 * This enables incremental migration without modifying the original component.
 */
export function CanvasBoardMigrated({
  edgePaths,
  onSelectEdgeId,
  onRemoveEdge,
  onDisconnectPort,
  onReconnectInput,
  onSelectNode,
  onOpenNodeConfig,
  onFireTrigger,
  onPointerDownNode,
  onPointerMoveNode,
  onPointerUpNode,
  onStartConnection,
  onCompleteConnection,
  onDrop,
  onDragOver,
  onPanStart,
  onPanMove,
  onPanEnd,
  onZoomTo,
  onFitToNodes,
  onResetView,
}: CanvasBoardMigratedProps): React.JSX.Element {
  // Read state from contexts
  const { view, panState, lastDrop, connecting, connectingPos, dragState } = useCanvasState();
  const { viewportRef, canvasRef } = useCanvasRefs();
  const { nodes, edges } = useGraphState();
  const { selectedNodeId, selectedEdgeId } = useSelectionState();
  const { runtimeState } = useRuntimeState();

  // Derive values from context state
  const connectingFromNode = useMemo<AiNode | null>(() => {
    if (!connecting?.fromNodeId) return null;
    return nodes.find((node) => node.id === connecting.fromNodeId) ?? null;
  }, [nodes, connecting?.fromNodeId]);

  const draggingNodeId = dragState?.nodeId ?? null;

  return (
    <CanvasBoard
      // Refs from CanvasContext
      viewportRef={viewportRef}
      canvasRef={canvasRef}
      // State from GraphContext
      nodes={nodes}
      edges={edges}
      // State from RuntimeContext
      runtimeState={runtimeState}
      // Derived value (kept as prop)
      edgePaths={edgePaths}
      // State from CanvasContext
      view={view}
      panState={panState}
      lastDrop={lastDrop}
      connecting={connecting}
      connectingPos={connectingPos}
      // Derived from CanvasContext
      connectingFromNode={connectingFromNode}
      draggingNodeId={draggingNodeId}
      // State from SelectionContext
      selectedNodeId={selectedNodeId}
      selectedEdgeId={selectedEdgeId}
      // All callbacks passed through
      onSelectEdgeId={onSelectEdgeId}
      onRemoveEdge={onRemoveEdge}
      onDisconnectPort={onDisconnectPort}
      onReconnectInput={onReconnectInput}
      onSelectNode={onSelectNode}
      onOpenNodeConfig={onOpenNodeConfig}
      onFireTrigger={onFireTrigger}
      onPointerDownNode={onPointerDownNode}
      onPointerMoveNode={onPointerMoveNode}
      onPointerUpNode={onPointerUpNode}
      onStartConnection={onStartConnection}
      onCompleteConnection={onCompleteConnection}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onPanStart={onPanStart}
      onPanMove={onPanMove}
      onPanEnd={onPanEnd}
      onZoomTo={onZoomTo}
      onFitToNodes={onFitToNodes}
      onResetView={onResetView}
    />
  );
}
