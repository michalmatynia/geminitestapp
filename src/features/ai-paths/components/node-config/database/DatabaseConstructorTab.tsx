"use client";

import React from "react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type {
  AiNode,
  DatabaseConfig,
  DatabaseOperation,
  DbQueryConfig,
  Edge,
  NodeConfig,
  RuntimeState,
} from "@/features/ai-paths/lib";
import { formatPortLabel } from "@/features/ai-paths/utils/ui-utils";
import { TEMPLATE_SNIPPETS } from "@/features/ai-paths/config/query-presets";
import type { AiQuery, DatabasePresetOption, SchemaData } from "./types";

type DatabaseConstructorTabProps = {
  queryInputControls: React.ReactNode;
  pendingAiQuery: string;
  setPendingAiQuery: React.Dispatch<React.SetStateAction<string>>;
  aiQueries: AiQuery[];
  setAiQueries: React.Dispatch<React.SetStateAction<AiQuery[]>>;
  selectedAiQueryId: string;
  setSelectedAiQueryId: React.Dispatch<React.SetStateAction<string>>;
  presetOptions: DatabasePresetOption[];
  applyDatabasePreset: (presetId: string) => void;
  openSaveQueryPresetModal: () => void;
  databaseConfig: DatabaseConfig;
  queryConfig: DbQueryConfig;
  operation: DatabaseOperation;
  queryTemplateValue: string;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  updateQueryConfig: (patch: Partial<DbQueryConfig>) => void;
  connectedPlaceholders: string[];
  hasSchemaConnection: boolean;
  fetchedDbSchema: SchemaData | null;
  schemaLoading: boolean;
  nodes: AiNode[];
  edges: Edge[];
  selectedNode: AiNode;
  runtimeState: RuntimeState;
  onSendToAi?: (databaseNodeId: string, prompt: string) => Promise<void>;
  sendingToAi?: boolean;
  mapInputsToTargets: () => void;
  bundleKeys: Set<string>;
  toast: (message: string, options?: { variant?: "success" | "error" }) => void;
  aiPromptRef?: React.RefObject<HTMLTextAreaElement>;
};

export function DatabaseConstructorTab({
  queryInputControls,
  pendingAiQuery,
  setPendingAiQuery,
  aiQueries,
  setAiQueries,
  selectedAiQueryId,
  setSelectedAiQueryId,
  presetOptions,
  applyDatabasePreset,
  openSaveQueryPresetModal,
  databaseConfig,
  queryConfig,
  operation,
  queryTemplateValue,
  updateSelectedNodeConfig,
  updateQueryConfig,
  connectedPlaceholders,
  hasSchemaConnection,
  fetchedDbSchema,
  schemaLoading,
  nodes,
  edges,
  selectedNode,
  runtimeState,
  onSendToAi,
  sendingToAi,
  mapInputsToTargets,
  bundleKeys,
  toast,
  aiPromptRef,
}: DatabaseConstructorTabProps) {
  const pendingAiQuerySection = pendingAiQuery ? (
    <div className="rounded-md border border-purple-500/40 bg-purple-500/10 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-purple-400"></div>
          <span className="text-xs text-purple-100">AI query ready for review</span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            className="h-7 rounded-md border border-emerald-700 bg-emerald-500/10 px-3 text-[10px] text-emerald-200 hover:bg-emerald-500/20"
            onClick={() => {
              const newQuery = {
                id: `ai-${Date.now()}`,
                query: pendingAiQuery,
                timestamp: new Date().toISOString(),
              };
              setAiQueries((prev) => [...prev, newQuery]);
              setSelectedAiQueryId(newQuery.id);
              updateSelectedNodeConfig({
                database: {
                  ...databaseConfig,
                  query: {
                    ...queryConfig,
                    mode: "custom",
                    queryTemplate: pendingAiQuery,
                  },
                },
              });
              setPendingAiQuery("");
              toast("AI query accepted and saved.", { variant: "success" });
            }}
          >
            Accept
          </Button>
          <Button
            type="button"
            className="h-7 rounded-md border border-rose-700 bg-rose-500/10 px-3 text-[10px] text-rose-200 hover:bg-rose-500/20"
            onClick={() => {
              setPendingAiQuery("");
              toast("AI query rejected.", { variant: "success" });
            }}
          >
            Reject
          </Button>
        </div>
      </div>
      <pre className="mt-2 max-h-[100px] overflow-auto rounded-md bg-gray-950/70 p-2 text-[11px] text-gray-300 whitespace-pre-wrap break-all">
        {pendingAiQuery}
      </pre>
    </div>
  ) : null;

  return (
    <div className="space-y-4 rounded-md border border-gray-800 bg-gray-900/40 p-3">
      {queryInputControls}

      {pendingAiQuerySection}

      <div className="space-y-3">
        <Label className="text-xs text-gray-400">Quick Presets</Label>
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            type="button"
            className="h-7 rounded-md border border-blue-700 bg-blue-500/10 px-2 text-[10px] text-blue-200 hover:bg-blue-500/20"
            onClick={openSaveQueryPresetModal}
          >
            Save Preset
          </Button>
          <Select
            value={databaseConfig.presetId ?? "custom"}
            onValueChange={(value) => applyDatabasePreset(value)}
          >
            <SelectTrigger className="h-7 w-[180px] border-gray-800 bg-gray-950/70 text-xs text-white">
              <SelectValue placeholder="Select preset" />
            </SelectTrigger>
            <SelectContent className="border-gray-800 bg-gray-900">
              {presetOptions.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedAiQueryId || "none"}
            onValueChange={(value) => {
              if (value === "none") {
                setSelectedAiQueryId("");
                return;
              }
              const aiQuery = aiQueries.find((q) => q.id === value);
              if (aiQuery) {
                setSelectedAiQueryId(value);
                updateSelectedNodeConfig({
                  database: {
                    ...databaseConfig,
                    query: {
                      ...queryConfig,
                      mode: "custom",
                      queryTemplate: aiQuery.query,
                    },
                  },
                });
              }
            }}
          >
            <SelectTrigger className="h-7 w-[180px] border-gray-800 bg-gray-950/70 text-xs text-white">
              <SelectValue placeholder="AI Queries" />
            </SelectTrigger>
            <SelectContent className="border-gray-800 bg-gray-900">
              <SelectItem value="none">No AI Query</SelectItem>
              {aiQueries.map((aiQuery) => (
                <SelectItem key={aiQuery.id} value={aiQuery.id}>
                  AI Query {new Date(aiQuery.timestamp).toLocaleTimeString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-gray-400">Connected Placeholders</Label>
        <div className="flex flex-wrap items-center gap-2">
          {connectedPlaceholders.length > 0 ? (
            <>
              {connectedPlaceholders.map((chip) => (
                <Button
                  key={chip}
                  type="button"
                  className="rounded-md border border-emerald-700/50 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/20"
                  onClick={() => {
                    const currentPresetId = databaseConfig.presetId ?? "custom";
                    const currentAiQueryId = selectedAiQueryId;

                    if (currentPresetId !== "custom" || currentAiQueryId) {
                      setSelectedAiQueryId("");
                      updateSelectedNodeConfig({
                        database: {
                          ...databaseConfig,
                          presetId: "custom",
                          query: {
                            ...queryConfig,
                            mode: "custom",
                            queryTemplate: `${queryTemplateValue}${chip}`,
                          },
                        },
                      });
                    } else {
                      updateQueryConfig({
                        mode: "custom",
                        queryTemplate: `${queryTemplateValue}${chip}`,
                      });
                    }
                  }}
                >
                  {chip}
                </Button>
              ))}
            </>
          ) : (
            <span className="text-[10px] text-gray-500 italic">
              Connect inputs to see available placeholders
            </span>
          )}
        </div>
      </div>

      {hasSchemaConnection && (
        <div className="rounded-md border border-purple-800/50 bg-purple-950/20 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] font-medium text-purple-300">
              Database Schema
            </span>
            {schemaLoading && (
              <span className="text-[10px] text-gray-500">Loading...</span>
            )}
          </div>
          {fetchedDbSchema?.collections && fetchedDbSchema.collections.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[10px] text-gray-400">
                Click to set collection or insert field:
              </div>
              <div className="flex flex-wrap gap-1">
                {fetchedDbSchema.collections.map((coll) => (
                  <Button
                    key={coll.name}
                    type="button"
                    className="rounded-md border border-purple-700/50 bg-purple-500/10 px-2 py-1 text-[10px] text-purple-300 hover:bg-purple-500/20"
                    onClick={() => {
                      updateQueryConfig({
                        mode: "custom",
                        collection: coll.name,
                      });
                      toast(`Collection set to: ${coll.name}`, { variant: "success" });
                    }}
                  >
                    {coll.name}
                  </Button>
                ))}
              </div>
              {(() => {
                const currentColl = fetchedDbSchema.collections.find(
                  (c) => c.name === queryConfig.collection
                );
                if (!currentColl?.fields?.length) return null;
                return (
                  <div className="mt-2">
                    <div className="text-[10px] text-gray-400">
                      Fields in {currentColl.name}:
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {currentColl.fields.slice(0, 20).map((field) => (
                        <Button
                          key={field.name}
                          type="button"
                          className="rounded-md border border-gray-700/50 bg-gray-800/30 px-2 py-0.5 text-[9px] text-gray-300 hover:bg-gray-700/50"
                          onClick={() => {
                            const fieldQuery = `"${field.name}": "{{value}}"`;
                            const current = queryTemplateValue.trim();
                            let newQuery: string;
                            if (!current || current === "{}") {
                              newQuery = `{\n  ${fieldQuery}\n}`;
                            } else if (current.endsWith("}")) {
                              const insertPos = current.lastIndexOf("}");
                              const before = current.slice(0, insertPos).trimEnd();
                              const needsComma =
                                before.length > 1 && !before.endsWith("{") && !before.endsWith(",");
                              newQuery = `${before}${needsComma ? "," : ""}\n  ${fieldQuery}\n}`;
                            } else {
                              newQuery = `${current}\n  ${fieldQuery}`;
                            }
                            setSelectedAiQueryId("");
                            updateQueryConfig({
                              mode: "custom",
                              queryTemplate: newQuery,
                            });
                          }}
                          title={`Type: ${field.type}`}
                        >
                          {field.name}
                          <span className="ml-1 text-[8px] text-gray-500">
                            {field.type}
                          </span>
                        </Button>
                      ))}
                      {currentColl.fields.length > 20 && (
                        <span className="px-2 py-0.5 text-[9px] text-gray-500">
                          +{currentColl.fields.length - 20} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : !schemaLoading ? (
            <div className="text-[10px] text-gray-500 italic">
              No schema data available
            </div>
          ) : null}
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs text-gray-400">Template Snippets</Label>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_SNIPPETS.map((snippet) => (
            <Button
              key={snippet.label}
              type="button"
              className="rounded-md border border-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-900/80"
              onClick={() => {
                setSelectedAiQueryId("");
                updateQueryConfig({
                  mode: "custom",
                  queryTemplate: snippet.value,
                });
              }}
            >
              {snippet.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-gray-400">AI Prompt (Output to AI Node)</Label>
        <Textarea
          ref={aiPromptRef}
          className="min-h-[100px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
          value={databaseConfig.aiPrompt ?? ""}
          onChange={(event) =>
            updateSelectedNodeConfig({
              database: {
                ...databaseConfig,
                aiPrompt: event.target.value,
              },
            })
          }
          placeholder="Write a MongoDB query that finds products where..."
        />
        <div className="flex flex-wrap gap-2">
          <div className="text-[11px] text-gray-400">Context placeholders:</div>
          <Button
            type="button"
            className="rounded-md border border-emerald-700 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/20"
            onClick={() => {
              const placeholder = `{{operation:${operation}}}`;
              const currentValue = databaseConfig.aiPrompt ?? "";
              updateSelectedNodeConfig({
                database: {
                  ...databaseConfig,
                  aiPrompt: currentValue + placeholder,
                },
              });
            }}
          >
            Operation: {operation}
          </Button>
          <Button
            type="button"
            className="rounded-md border border-blue-700 bg-blue-500/10 px-2 py-1 text-[10px] text-blue-200 hover:bg-blue-500/20"
            onClick={() => {
              const placeholder = `{{collection:${queryConfig.collection}}}`;
              const currentValue = databaseConfig.aiPrompt ?? "";
              updateSelectedNodeConfig({
                database: {
                  ...databaseConfig,
                  aiPrompt: currentValue + placeholder,
                },
              });
            }}
          >
            Collection: {queryConfig.collection}
          </Button>
          <Button
            type="button"
            className="rounded-md border border-purple-700 bg-purple-500/10 px-2 py-1 text-[10px] text-purple-200 hover:bg-purple-500/20"
            onClick={() => {
              const providerName = queryConfig.provider === "auto" ? "auto-detect" : queryConfig.provider;
              const placeholder = `{{provider:${providerName}}}`;
              const currentValue = databaseConfig.aiPrompt ?? "";
              updateSelectedNodeConfig({
                database: {
                  ...databaseConfig,
                  aiPrompt: currentValue + placeholder,
                },
              });
            }}
          >
            Provider: {queryConfig.provider === "auto" ? "auto" : queryConfig.provider}
          </Button>
        </div>
        {(() => {
          const aiPromptEdges = edges.filter(
            (edge) => edge.from === selectedNode.id && edge.fromPort === "aiPrompt"
          );
          const callbackEdges = edges.filter(
            (edge) => edge.to === selectedNode.id && edge.toPort === "queryCallback"
          );

          const aiNode = aiPromptEdges.length > 0
            ? nodes.find((n) => n.id === aiPromptEdges[0]?.to && n.type === "model")
            : null;

          const aiModelId = aiNode?.config?.model?.modelId;
          const hasValidConnection = aiNode && callbackEdges.length > 0;

          const callbackValue = runtimeState.inputs[selectedNode.id]?.queryCallback
            ?? runtimeState.outputs[selectedNode.id]?.queryCallback;
          const hasAiResponse = typeof callbackValue === "string" && callbackValue.trim().length > 0;

          return (
            <div className="space-y-2">
              {hasValidConnection ? (
                <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                    <span className="text-[11px] text-emerald-100">
                      Connected to AI Model: <span className="font-medium text-emerald-200">{aiModelId || "Unknown"}</span>
                    </span>
                  </div>
                  {hasAiResponse && (
                    <Button
                      type="button"
                      className="mt-2 rounded-md border border-emerald-500/40 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/20"
                      onClick={() => {
                        updateQueryConfig({
                          mode: "custom",
                          queryTemplate: callbackValue,
                        });
                        toast("AI response injected into query.", { variant: "success" });
                      }}
                    >
                      Inject AI Response into Query
                    </Button>
                  )}
                  {onSendToAi && databaseConfig.aiPrompt && databaseConfig.aiPrompt.trim() && (
                    <Button
                      type="button"
                      className="mt-2 rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-[11px] text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
                      disabled={sendingToAi}
                      onClick={() => {
                        if (selectedNode?.id && databaseConfig.aiPrompt) {
                          void onSendToAi(selectedNode.id, databaseConfig.aiPrompt);
                        }
                      }}
                    >
                      {sendingToAi ? "Sending..." : "Send to AI Model"}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-400"></div>
                    <span className="text-[11px] text-amber-100">
                      {aiNode && !callbackEdges.length
                        ? "AI node connected, but callback not wired"
                        : !aiNode && callbackEdges.length > 0
                        ? "Callback wired, but no AI node connected"
                        : "Not connected to AI node"}
                    </span>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-gray-500">
                Connect this node&apos;s <span className="text-gray-300">aiPrompt</span> output to an AI Node, then connect
                the AI&apos;s <span className="text-gray-300">result</span> back to this node&apos;s{" "}
                <span className="text-gray-300">queryCallback</span> input.
              </p>
            </div>
          );
        })()}
      </div>

      <div className="space-y-3 border-t border-gray-800 pt-4">
        <Label className="text-xs text-gray-400">Field Mapping</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
            onClick={mapInputsToTargets}
          >
            Auto-map inputs
          </Button>
          {bundleKeys.size > 0 && (
            <span className="text-[11px] text-gray-500">
              Bundle keys:{" "}
              {Array.from(bundleKeys)
                .map((key) => formatPortLabel(key))
                .join(", ")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
