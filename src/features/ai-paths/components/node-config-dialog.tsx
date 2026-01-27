"use client";

import React from "react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import type {
  AiNode,
  DatabaseConfig,
  DbNodePreset,
  DbQueryPreset,
  Edge,
  NodeConfig,
  ParserSampleState,
  RuntimeState,
  UpdaterSampleState,
} from "@/features/ai-paths/lib";
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
import { MapperNodeConfigSection } from "./node-config/dialog/MapperNodeConfigSection";
import { MathNodeConfigSection } from "./node-config/dialog/MathNodeConfigSection";
import { ModelNodeConfigSection } from "./node-config/dialog/ModelNodeConfigSection";
import { MutatorNodeConfigSection } from "./node-config/dialog/MutatorNodeConfigSection";
import { PollNodeConfigSection } from "./node-config/dialog/PollNodeConfigSection";
import { PromptNodeConfigSection } from "./node-config/dialog/PromptNodeConfigSection";
import { RouterNodeConfigSection } from "./node-config/dialog/RouterNodeConfigSection";
import { SimulationNodeConfigSection } from "./node-config/dialog/SimulationNodeConfigSection";
import { TemplateNodeConfigSection } from "./node-config/dialog/TemplateNodeConfigSection";
import { TriggerNodeConfigSection } from "./node-config/dialog/TriggerNodeConfigSection";
import { UnsupportedNodeConfigNotice } from "./node-config/dialog/UnsupportedNodeConfigNotice";
import { ValidatorNodeConfigSection } from "./node-config/dialog/ValidatorNodeConfigSection";
import { ViewerNodeConfigSection } from "./node-config/dialog/ViewerNodeConfigSection";

type NodeConfigDialogProps = {
  configOpen: boolean;
  setConfigOpen: (open: boolean) => void;
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
  updateSelectedNode: (patch: Partial<AiNode>) => void;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  handleFetchParserSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  handleFetchUpdaterSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  handleRunSimulation: (node: AiNode) => void;
  clearRuntimeForNode?: (nodeId: string) => void;
  onSendToAi?: (databaseNodeId: string, prompt: string) => Promise<void>;
  sendingToAi?: boolean;
  dbQueryPresets: DbQueryPreset[];
  setDbQueryPresets: React.Dispatch<React.SetStateAction<DbQueryPreset[]>>;
  saveDbQueryPresets: (nextPresets: DbQueryPreset[]) => Promise<void>;
  dbNodePresets: DbNodePreset[];
  setDbNodePresets: React.Dispatch<React.SetStateAction<DbNodePreset[]>>;
  saveDbNodePresets: (nextPresets: DbNodePreset[]) => Promise<void>;
  toast: (message: string, options?: { variant?: "success" | "error" }) => void;
};

export function NodeConfigDialog({
  configOpen,
  setConfigOpen,
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
}: NodeConfigDialogProps) {
  if (!selectedNode) return null;

  return (
    <Dialog open={configOpen} onOpenChange={setConfigOpen}>
      <DialogContent className="max-h-[85vh] w-[95vw] max-w-4xl overflow-y-auto border border-gray-800 bg-gray-950 text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              Configure {selectedNode.title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {selectedNode.type === "database" && selectedNode.config?.database && (
                <Button
                  type="button"
                  size="sm"
                  className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                    selectedNode.config.database.dryRun
                      ? "text-emerald-200 hover:bg-emerald-500/10"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                  onClick={() => {
                    const dbConfig = selectedNode.config?.database;
                    if (!dbConfig) return;
                    updateSelectedNodeConfig({
                      database: {
                        ...dbConfig,
                        dryRun: !dbConfig.dryRun,
                      } as DatabaseConfig,
                    });
                  }}
                >
                  Dry Run
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-800"
                onClick={() => setConfigOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogHeader>

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
          updateSelectedNodeConfig={updateSelectedNodeConfig}
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
        <MapperNodeConfigSection
          selectedNode={selectedNode}
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
          onSendToAi={onSendToAi}
          sendingToAi={sendingToAi}
        />
        <ModelNodeConfigSection
          selectedNode={selectedNode}
          modelOptions={modelOptions}
          updateSelectedNodeConfig={updateSelectedNodeConfig}
        />
        <DatabaseNodeConfigSection
          selectedNode={selectedNode}
          nodes={nodes}
          edges={edges}
          runtimeState={runtimeState}
          updateSelectedNodeConfig={updateSelectedNodeConfig}
          onSendToAi={onSendToAi}
          sendingToAi={sendingToAi}
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
          clearRuntimeForNode={clearRuntimeForNode}
        />
        <AiDescriptionNodeConfigSection
          selectedNode={selectedNode}
          updateSelectedNodeConfig={updateSelectedNodeConfig}
        />
        <UnsupportedNodeConfigNotice selectedNode={selectedNode} />
      </DialogContent>
    </Dialog>
  );
}
