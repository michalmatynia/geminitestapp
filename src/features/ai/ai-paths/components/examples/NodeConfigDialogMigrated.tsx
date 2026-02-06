"use client";

/**
 * NodeConfigDialogMigrated - Context-based wrapper for NodeConfigDialog.
 *
 * This component reads state from contexts and passes to the original NodeConfigDialog.
 * Demonstrates incremental migration pattern for complex components.
 *
 * BEFORE: 34 props
 * ```tsx
 * <NodeConfigDialog
 *   configOpen={configOpen}
 *   setConfigOpen={setConfigOpen}
 *   selectedNode={selectedNode}
 *   nodes={nodes}
 *   edges={edges}
 *   isPathLocked={isPathLocked}
 *   runtimeState={runtimeState}
 *   parserSamples={parserSamples}
 *   setParserSamples={setParserSamples}
 *   parserSampleLoading={parserSampleLoading}
 *   updaterSamples={updaterSamples}
 *   setUpdaterSamples={setUpdaterSamples}
 *   updaterSampleLoading={updaterSampleLoading}
 *   pathDebugSnapshot={pathDebugSnapshot}
 *   sendingToAi={sendingToAi}
 *   dbQueryPresets={dbQueryPresets}
 *   setDbQueryPresets={setDbQueryPresets}
 *   dbNodePresets={dbNodePresets}
 *   setDbNodePresets={setDbNodePresets}
 *   ... 15 more callback props
 * />
 * ```
 *
 * AFTER: 14 props (only callbacks + modelOptions)
 * ```tsx
 * <NodeConfigDialogMigrated
 *   modelOptions={modelOptions}
 *   updateSelectedNode={...}
 *   ... 12 more callback props
 * />
 * ```
 *
 * State props eliminated (20 props removed, 59% reduction):
 * - configOpen, setConfigOpen → SelectionContext
 * - selectedNode → derived from SelectionContext + GraphContext
 * - nodes, edges, isPathLocked → GraphContext
 * - runtimeState, parserSamples, setParserSamples, parserSampleLoading → RuntimeContext
 * - updaterSamples, setUpdaterSamples, updaterSampleLoading → RuntimeContext
 * - pathDebugSnapshot, sendingToAi → RuntimeContext
 * - dbQueryPresets, setDbQueryPresets → PresetsContext
 * - dbNodePresets, setDbNodePresets → PresetsContext
 */

import { useMemo } from "react";
import { NodeConfigDialog } from "../node-config-dialog";
import { useGraphState } from "../../context/GraphContext";
import { useSelectionState, useSelectionActions } from "../../context/SelectionContext";
import { useRuntimeState, useRuntimeActions } from "../../context/RuntimeContext";
import { usePresetsState, usePresetsActions } from "../../context/PresetsContext";
import type { AiNode, DbQueryPreset, DbNodePreset, NodeConfig } from "@/features/ai/ai-paths/lib";

/**
 * Props for NodeConfigDialogMigrated.
 *
 * State props have been removed as they now come from contexts.
 * Only callbacks and configuration options remain.
 */
export type NodeConfigDialogMigratedProps = {
  // Configuration (not in context)
  modelOptions: string[];

  // Callbacks for node operations
  updateSelectedNode: (patch: Partial<AiNode>, options?: { nodeId?: string }) => void;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;

  // Callbacks for sample fetching
  handleFetchParserSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  handleFetchUpdaterSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;

  // Callbacks for simulation
  handleRunSimulation: (node: AiNode) => void | Promise<void>;

  // Callbacks for AI operations
  onSendToAi?: ((databaseNodeId: string, prompt: string) => Promise<void>) | undefined;

  // Callbacks for preset persistence
  saveDbQueryPresets: (nextPresets: DbQueryPreset[]) => Promise<void>;
  saveDbNodePresets: (nextPresets: DbNodePreset[]) => Promise<void>;

  // Utility callbacks
  toast: (message: string, options?: { variant?: "success" | "error" }) => void;
  onDirtyChange?: ((dirty: boolean) => void) | undefined;
  savePathConfig?: ((options?: {
    silent?: boolean;
    includeNodeConfig?: boolean;
    force?: boolean;
    nodesOverride?: AiNode[];
  }) => Promise<void>) | undefined;
};

/**
 * NodeConfigDialogMigrated - Context-based wrapper for NodeConfigDialog.
 *
 * Reads state from contexts and passes to the original component.
 */
export function NodeConfigDialogMigrated({
  modelOptions,
  updateSelectedNode,
  updateSelectedNodeConfig,
  handleFetchParserSample,
  handleFetchUpdaterSample,
  handleRunSimulation,
  onSendToAi,
  saveDbQueryPresets,
  saveDbNodePresets,
  toast,
  onDirtyChange,
  savePathConfig,
}: NodeConfigDialogMigratedProps): React.JSX.Element | null {
  // Read state from GraphContext
  const { nodes, edges, isPathLocked, activePathId } = useGraphState();

  // Read state from SelectionContext
  const { selectedNodeId, configOpen } = useSelectionState();
  const { setConfigOpen } = useSelectionActions();

  // Read state from RuntimeContext
  const {
    runtimeState,
    parserSamples,
    updaterSamples,
    parserSampleLoading,
    updaterSampleLoading,
    pathDebugSnapshots,
    sendingToAi,
  } = useRuntimeState();
  const { setParserSamples, setUpdaterSamples, clearNodeRuntime, clearNodeHistory } = useRuntimeActions();

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

  // Build optional props object to avoid passing undefined with exactOptionalPropertyTypes
  const optionalProps = {
    ...(onSendToAi !== undefined && { onSendToAi }),
    ...(onDirtyChange !== undefined && { onDirtyChange }),
    ...(savePathConfig !== undefined && { savePathConfig }),
  };

  return (
    <NodeConfigDialog
      // State from SelectionContext
      configOpen={configOpen}
      setConfigOpen={setConfigOpen}
      // Derived from SelectionContext + GraphContext
      selectedNode={selectedNode}
      // State from GraphContext
      nodes={nodes}
      edges={edges}
      isPathLocked={isPathLocked}
      // Configuration prop
      modelOptions={modelOptions}
      // State from RuntimeContext
      parserSamples={parserSamples}
      setParserSamples={setParserSamples}
      parserSampleLoading={parserSampleLoading}
      updaterSamples={updaterSamples}
      setUpdaterSamples={setUpdaterSamples}
      updaterSampleLoading={updaterSampleLoading}
      runtimeState={runtimeState}
      pathDebugSnapshot={pathDebugSnapshot}
      sendingToAi={sendingToAi}
      // Actions from RuntimeContext
      clearRuntimeForNode={clearNodeRuntime}
      clearNodeHistory={clearNodeHistory}
      // State from PresetsContext
      dbQueryPresets={dbQueryPresets}
      setDbQueryPresets={setDbQueryPresets}
      dbNodePresets={dbNodePresets}
      setDbNodePresets={setDbNodePresets}
      // Callback props passed through
      updateSelectedNode={updateSelectedNode}
      updateSelectedNodeConfig={updateSelectedNodeConfig}
      handleFetchParserSample={handleFetchParserSample}
      handleFetchUpdaterSample={handleFetchUpdaterSample}
      handleRunSimulation={handleRunSimulation}
      saveDbQueryPresets={saveDbQueryPresets}
      saveDbNodePresets={saveDbNodePresets}
      toast={toast}
      // Optional props spread conditionally
      {...optionalProps}
    />
  );
}
