'use client';

/**
 * CanvasBoardMigrated - Wrapper demonstrating context migration for CanvasBoard.
 *
 * NOW FULLY MIGRATED: All state and interactions come from context.
 * This component now just provides the few props that CanvasBoard still accepts
 * but could eventually be moved to context too.
 */

import React from 'react';

import type { AiNode } from '@/features/ai/ai-paths/lib';

import { CanvasBoard } from '../canvas-board';


export type CanvasBoardMigratedProps = {
  runtimeRunStatus?: 'idle' | 'running' | 'paused' | 'stepping';
  viewportClassName?: string | undefined;
  onFireTrigger?: (node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void;
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
