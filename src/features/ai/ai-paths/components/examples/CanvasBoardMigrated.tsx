'use client';

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
 * AFTER: 20 props (only callbacks)
 * ```tsx
 * <CanvasBoardMigrated
 *   onSelectEdgeId={...}
 *   ... 19 more callback props
 * />
 * ```
 *
 * State props eliminated (15 props removed, 43% reduction):
 * - viewportRef, canvasRef → CanvasContext refs
 * - view, panState, lastDrop → CanvasContext state
 * - connecting, connectingPos → CanvasContext state
 * - nodes, edges → GraphContext
 * - selectedNodeId, selectedEdgeId → SelectionContext
 * - runtimeState → RuntimeContext
 * - connectingFromNode, draggingNodeId → derived from context
 * - edgePaths → computed via useEdgePaths hook
 */

import { useMemo } from 'react';

import type {
  AiNode,
  AiPathRuntimeEvent,
  AiPathRuntimeNodeStatusMap,
  PathFlowIntensity,
} from '@/features/ai/ai-paths/lib';

import { useCanvasState, useCanvasRefs } from '../../context/CanvasContext';
import { useGraphState } from '../../context/GraphContext';
import { useEdgePaths } from '../../context/hooks/useEdgePaths';
import { useRuntimeState } from '../../context/RuntimeContext';
import { useSelectionState, useSelectionActions } from '../../context/SelectionContext';
import { CanvasBoard } from '../canvas-board';


/**
 * Props for CanvasBoardMigrated - only callbacks.
 *
 * State props have been removed as they now come from contexts:
 * - viewportRef, canvasRef (CanvasContext refs)
 * - nodes, edges (GraphContext)
 * - runtimeState (RuntimeContext)
 * - view, panState, lastDrop, connecting, connectingPos (CanvasContext state)
 * - selectedNodeId, selectedEdgeId (SelectionContext)
 * - connectingFromNode, draggingNodeId (derived from context)
 * - edgePaths (computed via useEdgePaths hook)
 *
 * Props eliminated by using context actions directly:
 * - onSelectEdgeId → SelectionContext.selectEdge
 * - onSelectNode → SelectionContext.selectNode
 * - onOpenNodeConfig → SelectionContext.setConfigOpen
 */
export type CanvasBoardMigratedProps = {
  flowIntensity?: PathFlowIntensity | undefined;
  runtimeNodeStatuses?: AiPathRuntimeNodeStatusMap | undefined;
  runtimeEvents?: AiPathRuntimeEvent[] | undefined;
  viewportClassName?: string | undefined;
  // Callbacks - remain as props since they involve orchestration
  onRemoveEdge: (edgeId: string) => void;
  onDisconnectPort: (direction: 'input' | 'output', nodeId: string, port: string) => void;
  onReconnectInput: (event: React.PointerEvent<HTMLButtonElement>, nodeId: string, port: string) => void;
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
  flowIntensity,
  runtimeNodeStatuses,
  runtimeEvents,
  viewportClassName,
  onRemoveEdge,
  onDisconnectPort,
  onReconnectInput,
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
  const { selectNode, selectEdge, setConfigOpen } = useSelectionActions();
  const { runtimeState } = useRuntimeState();

  // Compute edge paths from context data
  const edgePaths = useEdgePaths();

  // Derive values from context state
  const connectingFromNode = useMemo<AiNode | null>(() => {
    if (!connecting?.fromNodeId) return null;
    return nodes.find((node) => node.id === connecting.fromNodeId) ?? null;
  }, [nodes, connecting?.fromNodeId]);

  const draggingNodeId = dragState?.nodeId ?? null;

  return (
    <CanvasBoard
      flowIntensity={flowIntensity}
      runtimeNodeStatuses={runtimeNodeStatuses}
      runtimeEvents={runtimeEvents}
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
      viewportClassName={viewportClassName}
      // Selection actions from context
      onSelectEdgeId={selectEdge}
      onSelectNode={selectNode}
      onOpenNodeConfig={() => setConfigOpen(true)}
      // Callback props passed through
      onRemoveEdge={onRemoveEdge}
      onDisconnectPort={onDisconnectPort}
      onReconnectInput={onReconnectInput}
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
