'use client';

/**
 * CanvasSidebarWrapper - Context-based wrapper for CanvasSidebar.
 *
 * NOW FULLY MIGRATED: All state and interactions come from context.
 */

import React from 'react';

import type { AiNode, NodeDefinition } from '@/features/ai/ai-paths/lib';

import { CanvasSidebar } from '../canvas-sidebar';


export type CanvasSidebarWrapperProps = {
  /** Palette node definitions - not in context, passed from parent */
  palette: NodeDefinition[];
  /** Callback when dragging a node from palette */
  onDragStart: (event: React.DragEvent<HTMLDivElement>, node: NodeDefinition) => void;
  /** Callback to fire a trigger */
  onFireTrigger: (node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void;
  /** Callback to fire a persistent trigger */
  onFireTriggerPersistent?: ((node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void) | undefined;
  
  onUpdateSelectedNode?: (node: AiNode, meta: { nodeId: string }) => void;
  onDeleteSelectedNode?: () => void;
  onRemoveEdge?: (edgeId: string) => void;
  executionMode?: 'local' | 'server';

  /** Current run status */
  runStatus: 'idle' | 'running' | 'paused' | 'stepping';
  /** Pause current run */
  onPauseRun?: () => void;
  /** Resume paused run */
  onResumeRun?: () => void;
  /** Step run (optional trigger override) */
  onStepRun?: (triggerNode?: AiNode) => void;
  /** Cancel current run */
  onCancelRun?: () => void;
  /** Callback to clear all wires */
  onClearWires: () => void;
};

/**
 * CanvasSidebarWrapper - Context-based wrapper.
 */
export function CanvasSidebarWrapper(props: CanvasSidebarWrapperProps): React.JSX.Element {
  return (
    <CanvasSidebar
      {...props}
    />
  );
}