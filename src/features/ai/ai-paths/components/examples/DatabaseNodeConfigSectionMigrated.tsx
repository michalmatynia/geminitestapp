'use client';

/**
 * DatabaseNodeConfigSectionMigrated - Context-based wrapper for DatabaseNodeConfigSection.
 *
 * This component reads state from contexts and passes to the original component.
 * Demonstrates incremental migration pattern for complex configuration components.
 *
 * BEFORE: 18 props
 * ```tsx
 * <DatabaseNodeConfigSection
 *   selectedNode={selectedNode}
 *   nodes={nodes}
 *   edges={edges}
 *   runtimeState={runtimeState}
 *   pathDebugSnapshot={pathDebugSnapshot}
 *   updaterSamples={updaterSamples}
 *   setUpdaterSamples={setUpdaterSamples}
 *   updaterSampleLoading={updaterSampleLoading}
 *   sendingToAi={sendingToAi}
 *   dbQueryPresets={dbQueryPresets}
 *   setDbQueryPresets={setDbQueryPresets}
 *   dbNodePresets={dbNodePresets}
 *   setDbNodePresets={setDbNodePresets}
 *   ... 5 more callback props
 * />
 * ```
 *
 * AFTER: 6 props (only callbacks)
 * ```tsx
 * <DatabaseNodeConfigSectionMigrated
 *   updateSelectedNodeConfig={...}
 *   onSendToAi={...}
 *   handleFetchUpdaterSample={...}
 *   saveDbQueryPresets={...}
 *   saveDbNodePresets={...}
 *   toast={...}
 * />
 * ```
 *
 * State props eliminated (12 props removed, 67% reduction):
 * - selectedNode → derived from SelectionContext + GraphContext
 * - nodes, edges → GraphContext
 * - runtimeState, pathDebugSnapshot → RuntimeContext
 * - updaterSamples, setUpdaterSamples, updaterSampleLoading → RuntimeContext
 * - sendingToAi → RuntimeContext
 * - dbQueryPresets, setDbQueryPresets → PresetsContext
 * - dbNodePresets, setDbNodePresets → PresetsContext
 */

import { useMemo } from 'react';

import type { AiNode, DbQueryPreset, DbNodePreset, NodeConfig } from '@/features/ai/ai-paths/lib';

import { useGraphState } from '../../context/GraphContext';
import { usePresetsState, usePresetsActions } from '../../context/PresetsContext';
import { useRuntimeState, useRuntimeActions } from '../../context/RuntimeContext';
import { useSelectionState } from '../../context/SelectionContext';
import { DatabaseNodeConfigSection } from '../node-config/DatabaseNodeConfigSection';


/**
 * Props for DatabaseNodeConfigSectionMigrated.
 *
 * State props have been removed as they now come from contexts.
 * Only callbacks remain.
 */
export type DatabaseNodeConfigSectionMigratedProps = {
  // Callbacks for node operations
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;

  // Callbacks for AI operations
  onSendToAi?: ((databaseNodeId: string, prompt: string) => Promise<void>) | undefined;

  // Callbacks for sample fetching
  handleFetchUpdaterSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;

  // Callbacks for preset persistence
  saveDbQueryPresets: (nextPresets: DbQueryPreset[]) => Promise<void>;
  saveDbNodePresets: (nextPresets: DbNodePreset[]) => Promise<void>;

  // Utility callbacks
  toast: (message: string, options?: { variant?: 'success' | 'error' }) => void;
};

/**
 * DatabaseNodeConfigSectionMigrated - Context-based wrapper.
 *
 * Reads state from contexts and passes to the original component.
 * Returns null if no node is selected.
 */
export function DatabaseNodeConfigSectionMigrated({
  updateSelectedNodeConfig,
  onSendToAi,
  handleFetchUpdaterSample,
  saveDbQueryPresets,
  saveDbNodePresets,
  toast,
}: DatabaseNodeConfigSectionMigratedProps): React.JSX.Element | null {
  // Read state from GraphContext
  const { nodes, edges, activePathId } = useGraphState();

  // Read state from SelectionContext
  const { selectedNodeId } = useSelectionState();

  // Read state from RuntimeContext
  const {
    runtimeState,
    updaterSamples,
    updaterSampleLoading,
    pathDebugSnapshots,
    sendingToAi,
  } = useRuntimeState();
  const { setUpdaterSamples } = useRuntimeActions();

  // Read state from PresetsContext
  const { dbQueryPresets, dbNodePresets } = usePresetsState();
  const { setDbQueryPresets, setDbNodePresets } = usePresetsActions();

  // Derive selectedNode from context state
  const selectedNode = useMemo<AiNode | null>(() => {
    if (!selectedNodeId) return null;
    return nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  // Derive pathDebugSnapshot for current path
  const pathDebugSnapshot = useMemo(() => {
    if (!activePathId) return null;
    return pathDebugSnapshots[activePathId] ?? null;
  }, [pathDebugSnapshots, activePathId]);

  // Return null if no node selected (component requires selectedNode)
  if (!selectedNode) {
    return null;
  }

  // Build optional props object to avoid passing undefined with exactOptionalPropertyTypes
  const optionalProps = {
    ...(onSendToAi !== undefined && { onSendToAi }),
  };

  return (
    <DatabaseNodeConfigSection
      // Derived from SelectionContext + GraphContext
      selectedNode={selectedNode}
      // State from GraphContext
      nodes={nodes}
      edges={edges}
      // State from RuntimeContext
      runtimeState={runtimeState}
      pathDebugSnapshot={pathDebugSnapshot}
      updaterSamples={updaterSamples}
      setUpdaterSamples={setUpdaterSamples}
      updaterSampleLoading={updaterSampleLoading}
      sendingToAi={sendingToAi}
      // State from PresetsContext
      dbQueryPresets={dbQueryPresets}
      setDbQueryPresets={setDbQueryPresets}
      dbNodePresets={dbNodePresets}
      setDbNodePresets={setDbNodePresets}
      // Callback props passed through
      updateSelectedNodeConfig={updateSelectedNodeConfig}
      handleFetchUpdaterSample={handleFetchUpdaterSample}
      saveDbQueryPresets={saveDbQueryPresets}
      saveDbNodePresets={saveDbNodePresets}
      toast={toast}
      // Optional props spread conditionally
      {...optionalProps}
    />
  );
}
