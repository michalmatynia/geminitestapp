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
  
  onUpdateSelectedNode?: (
    patch: Partial<AiNode>,
    meta: { nodeId: string }
  ) => void;
  onDeleteSelectedNode?: () => void;
  onRemoveEdge?: (edgeId: string) => void;
  executionMode?: 'local' | 'server';
  /** Save path config - for persisting node changes */
  savePathConfig?: ((options?: {
    silent?: boolean | undefined;
    includeNodeConfig?: boolean | undefined;
    force?: boolean | undefined;
    nodesOverride?: AiNode[] | undefined;
    nodeOverride?: AiNode | undefined;
  }) => Promise<boolean>) | undefined;
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
