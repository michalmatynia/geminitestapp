'use client';

/**
 * CanvasBoardMigrated - Wrapper demonstrating context migration for CanvasBoard.
 *
 * NOW FULLY MIGRATED: All state and interactions come from context.
 * This component now just provides the few props that CanvasBoard still accepts
 * but could eventually be moved to context too.
 */

import React from 'react';

import type {
  AiNode,
  AiPathRuntimeEvent,
  AiPathRuntimeNodeStatusMap,
  PathFlowIntensity,
} from '@/features/ai/ai-paths/lib';

import { CanvasBoard } from '../canvas-board';


export type CanvasBoardMigratedProps = {
  flowIntensity?: PathFlowIntensity;
  runtimeNodeStatuses?: AiPathRuntimeNodeStatusMap | undefined;
  runtimeEvents?: AiPathRuntimeEvent[] | undefined;
  viewportClassName?: string | undefined;
  onRemoveEdge?: (edgeId: string) => void;
  onDisconnectPort?: (direction: 'input' | 'output', nodeId: string, port: string) => void;
  onReconnectInput?: (event: React.PointerEvent<HTMLButtonElement>, nodeId: string, port: string) => void;
  onFireTrigger: (node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void;
  onPointerDownNode?: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  onPointerMoveNode?: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  onPointerUpNode?: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  onStartConnection?: (event: React.PointerEvent<HTMLButtonElement>, node: AiNode, port: string) => void;
  onCompleteConnection?: (event: React.PointerEvent<HTMLButtonElement>, node: AiNode, port: string) => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  onPanStart?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPanMove?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPanEnd?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onZoomTo?: (scale: number) => void;
  onFitToNodes?: () => void;
  onResetView?: () => void;
  fitToNodes?: () => void;
  resetView?: () => void;
};

/**
 * CanvasBoardMigrated - Context-based wrapper for CanvasBoard.
 *
 * Reads state from contexts and passes to the original CanvasBoard component.
 * Since CanvasBoard is now context-aware, this wrapper is very thin.
 */
export function CanvasBoardMigrated(props: CanvasBoardMigratedProps): React.JSX.Element {
  return (
    <CanvasBoard
      {...props}
    />
  );
}
