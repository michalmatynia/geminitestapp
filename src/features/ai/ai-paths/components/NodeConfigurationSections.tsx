"use client";

import type {
  AiNode,
  DbNodePreset,
  DbQueryPreset,
  Edge,
  NodeConfig,
  ParserSampleState,
  PathDebugSnapshot,
  RuntimeState,
  UpdaterSampleState,
} from "@/features/ai/ai-paths/lib";
import React from "react"; // Import React explicitly if needed for JSX.Element type
import { ContextNodeConfigSection } from "./node-config/ContextNodeConfigSection";
import { DatabaseNodeConfigSection } from "./node-config/DatabaseNodeConfigSection";
import { DbSchemaNodeConfigSection } from "./node-config/DbSchemaNodeConfigSection";
import { ParserNodeConfigSection } from "./node-config/ParserNodeConfigSection";
import { AiDescriptionNodeConfigSection } from "./node-config/dialog/AiDescriptionNodeConfigSection";
import { BundleNodeConfigSection } from "./node-config/dialog/BundleNodeConfigSection";
import { CompareNodeConfigSection } from "./node-config/dialog/CompareNodeConfigSection";
import { ConstantNodeConfigSection } from "./node-config/dialog/ConstantNodeConfigSection";
import { DelayNodeConfigSection } from "./node-config/dialog/DelayNodeConfigSection";
import { GateNodeConfigSection } from "./node-config/dialog/GateNodeConfigSection";
import { HttpNodeConfigSection } from "./node-config/dialog/HttpNodeConfigSection";
import { AgentNodeConfigSection } from "./node-config/dialog/AgentNodeConfigSection";
import { LearnerAgentNodeConfigSection } from "./node-config/dialog/LearnerAgentNodeConfigSection";
import { MapperNodeConfigSection } from "./node-config/dialog/MapperNodeConfigSection";
import { MathNodeConfigSection } from "./node-config/dialog/MathNodeConfigSection";
import { ModelNodeConfigSection } from "./node-config/dialog/ModelNodeConfigSection";
import { MutatorNodeConfigSection } from "./node-config/dialog/MutatorNodeConfigSection";
import { PollNodeConfigSection } from "./node-config/dialog/PollNodeConfigSection";
import { PromptNodeConfigSection } from "./node-config/dialog/PromptNodeConfigSection";
import { RouterNodeConfigSection } from "./node-config/dialog/RouterNodeConfigSection";
import { RuntimeNodeConfigSection } from "./node-config/dialog/RuntimeNodeConfigSection";
import { SimulationNodeConfigSection } from "./node-config/dialog/SimulationNodeConfigSection";
import { TemplateNodeConfigSection } from "./node-config/dialog/TemplateNodeConfigSection";
import { TriggerNodeConfigSection } from "./node-config/dialog/TriggerNodeConfigSection";
import { UnsupportedNodeConfigNotice } from "./node-config/dialog/UnsupportedNodeConfigNotice";
import { ValidatorNodeConfigSection } from "./node-config/dialog/ValidatorNodeConfigSection";
import { ViewerNodeConfigSection } from "./node-config/dialog/ViewerNodeConfigSection";
import { RegexNodeConfigSection } from "./node-config/dialog/RegexNodeConfigSection";
import { IteratorNodeConfigSection } from "./node-config/dialog/IteratorNodeConfigSection";

type NodeConfigurationSectionsProps = {
  selectedNode: AiNode | null;
  nodes: AiNode[];
  edges: Edge[];
  modelOptions: string[];
  parserSamples: Record<string, ParserSampleState>;
  setParserSamples: React.Dispatch<React.SetStateAction<Record<string, ParserSampleState>>>;
  parserSampleLoading: boolean;
  updaterSamples: Record<string, UpdaterSampleState>;
  setUpdaterSamples: React.Dispatch<React.SetStateAction<Record<string, UpdaterSampleState>>>;
  updaterSampleLoading: boolean;
  runtimeState: RuntimeState;
  pathDebugSnapshot?: PathDebugSnapshot | null | undefined;
  updateSelectedNode: (patch: Partial<AiNode>, options?: { nodeId?: string }) => void;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  handleFetchParserSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  handleFetchUpdaterSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  handleRunSimulation: (node: AiNode) => void | Promise<void>;
  clearRuntimeForNode?: ((nodeId: string) => void) | undefined;
  onSendToAi?: ((databaseNodeId: string, prompt: string) => Promise<void>) | undefined;
  sendingToAi?: boolean | undefined;
  dbQueryPresets: DbQueryPreset[];
  setDbQueryPresets: React.Dispatch<React.SetStateAction<DbQueryPreset[]>>;
  saveDbQueryPresets: (nextPresets: DbQueryPreset[]) => Promise<void>;
  dbNodePresets: DbNodePreset[];
  setDbNodePresets: React.Dispatch<React.SetStateAction<DbNodePreset[]>>;
  saveDbNodePresets: (nextPresets: DbNodePreset[]) => Promise<void>;
  toast: (
    message: string,
    options?: { variant?: "success" | "error" | "info" | "warning" }
  ) => void;
};

export function NodeConfigurationSections({
  selectedNode,
  nodes,
  edges,
  modelOptions,
  parserSamples,
  setParserSamples,
  parserSampleLoading,
  updaterSamples,
  setUpdaterSamples,
  updaterSampleLoading,
  runtimeState,
  pathDebugSnapshot,
  updateSelectedNode,
  updateSelectedNodeConfig,
  handleFetchParserSample,
  handleFetchUpdaterSample,
  handleRunSimulation,
  clearRuntimeForNode,
  onSendToAi,
  sendingToAi,
  dbQueryPresets,
  setDbQueryPresets,
  saveDbQueryPresets,
  dbNodePresets,
  setDbNodePresets,
  saveDbNodePresets,
  toast,
}: NodeConfigurationSectionsProps): React.JSX.Element | null {
  if (!selectedNode) return null;

  return (
    <div className="space-y-6">
      <TriggerNodeConfigSection
        selectedNode={selectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <SimulationNodeConfigSection
        selectedNode={selectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
        handleRunSimulation={handleRunSimulation}
      />
      <ContextNodeConfigSection
        selectedNode={selectedNode}
        runtimeState={runtimeState}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
        toast={toast}
      />
      <ParserNodeConfigSection
        selectedNode={selectedNode}
        nodes={nodes}
        runtimeState={runtimeState}
        parserSamples={parserSamples}
        setParserSamples={setParserSamples}
        parserSampleLoading={parserSampleLoading}
        updateSelectedNode={updateSelectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
        handleFetchParserSample={handleFetchParserSample}
        toast={toast}
      />
      <RegexNodeConfigSection
        selectedNode={selectedNode}
        nodes={nodes}
        edges={edges}
        runtimeState={runtimeState}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
        {...(onSendToAi && { onSendToAi })}
        {...(sendingToAi !== undefined && { sendingToAi })}
      />
      <IteratorNodeConfigSection
        selectedNode={selectedNode}
        runtimeState={runtimeState}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <MapperNodeConfigSection
        selectedNode={selectedNode}
        runtimeState={runtimeState}
        updateSelectedNode={updateSelectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <MutatorNodeConfigSection
        selectedNode={selectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <ValidatorNodeConfigSection
        selectedNode={selectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <ConstantNodeConfigSection
        selectedNode={selectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <MathNodeConfigSection
        selectedNode={selectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <TemplateNodeConfigSection
        selectedNode={selectedNode}
        nodes={nodes}
        edges={edges}
        runtimeState={runtimeState}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <BundleNodeConfigSection
        selectedNode={selectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <GateNodeConfigSection
        selectedNode={selectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <CompareNodeConfigSection
        selectedNode={selectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <RouterNodeConfigSection
        selectedNode={selectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <DelayNodeConfigSection
        selectedNode={selectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <PollNodeConfigSection
        selectedNode={selectedNode}
        edges={edges}
        runtimeState={runtimeState}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <HttpNodeConfigSection
        selectedNode={selectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <PromptNodeConfigSection
        selectedNode={selectedNode}
        nodes={nodes}
        edges={edges}
        runtimeState={runtimeState}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
        {...(onSendToAi && { onSendToAi })}
        {...(sendingToAi !== undefined && { sendingToAi })}
      />
      <ModelNodeConfigSection
        selectedNode={selectedNode}
        nodes={nodes}
        edges={edges}
        modelOptions={modelOptions}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <AgentNodeConfigSection
        selectedNode={selectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <LearnerAgentNodeConfigSection
        selectedNode={selectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <DatabaseNodeConfigSection
        selectedNode={selectedNode}
        nodes={nodes}
        edges={edges}
        runtimeState={runtimeState}
        pathDebugSnapshot={pathDebugSnapshot ?? null}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
        {...(onSendToAi && { onSendToAi })}
        {...(sendingToAi !== undefined && { sendingToAi })}
        updaterSamples={updaterSamples}
        setUpdaterSamples={setUpdaterSamples}
        updaterSampleLoading={updaterSampleLoading}
        handleFetchUpdaterSample={handleFetchUpdaterSample}
        dbQueryPresets={dbQueryPresets}
        setDbQueryPresets={setDbQueryPresets}
        saveDbQueryPresets={saveDbQueryPresets}
        dbNodePresets={dbNodePresets}
        setDbNodePresets={setDbNodePresets}
        saveDbNodePresets={saveDbNodePresets}
        toast={toast}
      />
      <DbSchemaNodeConfigSection
        selectedNode={selectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <ViewerNodeConfigSection
        selectedNode={selectedNode}
        nodes={nodes}
        edges={edges}
        runtimeState={runtimeState}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
        {...(clearRuntimeForNode && { clearRuntimeForNode })}
      />
      <RuntimeNodeConfigSection
        selectedNode={selectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <AiDescriptionNodeConfigSection
        selectedNode={selectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
      />
      <UnsupportedNodeConfigNotice selectedNode={selectedNode} />
    </div>
  );
}
