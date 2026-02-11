'use client';

/**
 * CanvasSidebarWrapper - Context-based wrapper for CanvasSidebar.
 *
 * NOW FULLY MIGRATED: All state and interactions come from context.
 */

import React from 'react';

import type { NodeDefinition } from '@/features/ai/ai-paths/lib';

import { usePersistenceActions } from '../../context';
import { useAiPathsSettingsOrchestrator } from '../ai-paths-settings/AiPathsSettingsOrchestratorContext';
import { CanvasSidebar } from '../canvas-sidebar';


export type CanvasSidebarWrapperProps = {
  /** Palette node definitions - not in context, passed from parent */
  palette: NodeDefinition[];
};

/**
 * CanvasSidebarWrapper - Context-based wrapper.
 */
export function CanvasSidebarWrapper({ palette }: CanvasSidebarWrapperProps): React.JSX.Element {
  const {
    handleDragStart,
    updateSelectedNode,
    handleDeleteSelectedNode,
    handleRemoveEdge,
  } = useAiPathsSettingsOrchestrator();
  const { savePathConfig } = usePersistenceActions();

  return (
    <CanvasSidebar
      palette={palette}
      onDragStart={handleDragStart}
      onUpdateSelectedNode={(patch, options) => {
        updateSelectedNode(patch, options);
      }}
      onDeleteSelectedNode={handleDeleteSelectedNode}
      onRemoveEdge={handleRemoveEdge}
      savePathConfig={savePathConfig}
    />
  );
}
