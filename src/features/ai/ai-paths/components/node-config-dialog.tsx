"use client";

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui";
import { NodeConfigurationSections } from "./NodeConfigurationSections"; // Import the new component

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
import { NodeHistoryTab } from "./node-config/dialog/NodeHistoryTab"; // Keep NodeHistoryTab import

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
  pathDebugSnapshot?: PathDebugSnapshot | null;
  updateSelectedNode: (patch: Partial<AiNode>) => void;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  handleFetchParserSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  handleFetchUpdaterSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  handleRunSimulation: (node: AiNode) => void | Promise<void>;
  clearRuntimeForNode?: (nodeId: string) => void;
  clearNodeHistory?: (nodeId: string) => void | Promise<void>;
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
  pathDebugSnapshot,
  updateSelectedNode,
  updateSelectedNodeConfig,
  handleFetchParserSample,
  handleFetchUpdaterSample,
  handleRunSimulation,
  clearRuntimeForNode,
  clearNodeHistory,
  onSendToAi,
  sendingToAi,
  dbQueryPresets,
  setDbQueryPresets,
  saveDbQueryPresets,
  dbNodePresets,
  setDbNodePresets,
  saveDbNodePresets,
  toast,
}: NodeConfigDialogProps): React.JSX.Element | null {
  if (!selectedNode) return null;
  const isScheduledTrigger =
    selectedNode.type === "trigger" &&
    selectedNode.config?.trigger?.event === "scheduled_run";

  return (
    <Dialog open={configOpen} onOpenChange={setConfigOpen}>
      <DialogContent className="max-h-[85vh] w-[95vw] max-w-4xl overflow-y-auto border border-border bg-card text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span>Configure {selectedNode.title}</span>
              {isScheduledTrigger ? (
                <span className="rounded-full border border-amber-400/60 bg-amber-500/15 px-2 py-[1px] text-[10px] uppercase text-amber-200">
                  Scheduled
                </span>
              ) : null}
            </DialogTitle>
            <Button
              type="button"
              size="sm"
              className="rounded border px-3 py-1 text-xs text-gray-300 hover:bg-muted/50"
              onClick={() => setConfigOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogHeader>
        <Tabs defaultValue="settings" className="mt-2">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="settings">
            {/* Render the new consolidated component here */}
            <NodeConfigurationSections
              selectedNode={selectedNode}
              nodes={nodes}
              edges={edges}
              modelOptions={modelOptions}
              parserSamples={parserSamples}
              setParserSamples={setParserSamples}
              parserSampleLoading={parserSampleLoading}
              updaterSamples={updaterSamples}
              setUpdaterSamples={setUpdaterSamples}
              updaterSampleLoading={updaterSampleLoading}
              runtimeState={runtimeState}
              pathDebugSnapshot={pathDebugSnapshot}
              updateSelectedNode={updateSelectedNode}
              updateSelectedNodeConfig={updateSelectedNodeConfig}
              handleFetchParserSample={handleFetchParserSample}
              handleFetchUpdaterSample={handleFetchUpdaterSample}
              handleRunSimulation={handleRunSimulation}
              clearRuntimeForNode={clearRuntimeForNode}
              onSendToAi={onSendToAi}
              sendingToAi={sendingToAi}
              dbQueryPresets={dbQueryPresets}
              setDbQueryPresets={setDbQueryPresets}
              saveDbQueryPresets={saveDbQueryPresets}
              dbNodePresets={dbNodePresets}
              setDbNodePresets={setDbNodePresets}
              saveDbNodePresets={saveDbNodePresets}
              toast={toast}
            />
          </TabsContent>
          <TabsContent value="history">
            <NodeHistoryTab
              selectedNode={selectedNode}
              runtimeState={runtimeState}
              {...(clearNodeHistory && { onClearNodeHistory: clearNodeHistory })}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
