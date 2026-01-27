"use client";

import React from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import type {
  AiNode,
  ConstantConfig,
  CompareConfig,
  GateConfig,
  DatabaseConfig,
  DbQueryConfig,
  DbQueryPreset,
  DbNodePreset,
  HttpConfig,
  Edge,
  MathConfig,
  ModelConfig,
  NodeConfig,
  ParserSampleState,
  PollConfig,
  PromptConfig,
  RouterConfig,
  RuntimeState,
  TemplateConfig,
  UpdaterSampleState,
} from "@/features/ai-paths/lib";
import {
  DB_COLLECTION_OPTIONS,
  DEFAULT_MODELS,
  TRIGGER_EVENTS,
  createParserMappings,
  createViewerOutputs,
  formatRuntimeValue,
  parsePathList,
  renderTemplate,
  toNumber,
} from "@/features/ai-paths/lib";
import { extractImageUrls, formatPortLabel, formatPlaceholderLabel } from "../utils/ui-utils";
import { ParserNodeConfigSection } from "./node-config/ParserNodeConfigSection";
import { DatabaseNodeConfigSection } from "./node-config/DatabaseNodeConfigSection";
import { ContextNodeConfigSection } from "./node-config/ContextNodeConfigSection";
import { DbSchemaNodeConfigSection } from "./node-config/DbSchemaNodeConfigSection";

 

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
    <>
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

            <>
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

              {selectedNode.type === "mapper" && (() => {
              const mapperConfig = selectedNode.config?.mapper ?? {
                outputs: selectedNode.outputs.length ? selectedNode.outputs : ["value"],
                mappings: createParserMappings(
                  selectedNode.outputs.length ? selectedNode.outputs : ["value"]
                ),
              };
              const outputs = mapperConfig.outputs.length
                ? mapperConfig.outputs
                : selectedNode.outputs.length
                  ? selectedNode.outputs
                  : ["value"];
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">
                      Outputs (one per line)
                    </Label>
                    <Textarea
                      className="mt-2 min-h-[90px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={outputs.join("\n")}
                      onChange={(event) => {
                        const list = parsePathList(event.target.value);
                        const nextOutputs = list.length ? list : ["value"];
                        const nextMappings = createParserMappings(nextOutputs);
                        nextOutputs.forEach((output) => {
                          if (mapperConfig.mappings?.[output]) {
                            nextMappings[output] = mapperConfig.mappings[output];
                          }
                        });
                        updateSelectedNode({
                          outputs: nextOutputs,
                          config: {
                            ...selectedNode.config,
                            mapper: {
                              outputs: nextOutputs,
                              mappings: nextMappings,
                            },
                          },
                        });
                      }}
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Outputs must match downstream input ports exactly.
                    </p>
                  </div>
                  {outputs.map((output) => (
                    <div key={output}>
                      <Label className="text-xs text-gray-400">
                        {formatPortLabel(output)} Mapping Path
                      </Label>
                      <Input
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={mapperConfig.mappings?.[output] ?? ""}
                        onChange={(event) => {
                          const nextMappings = {
                            ...mapperConfig.mappings,
                            [output]: event.target.value,
                          };
                          updateSelectedNodeConfig({
                            mapper: { outputs, mappings: nextMappings },
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              );
            })()}

            {selectedNode.type === "mutator" && (() => {
              const mutatorConfig = selectedNode.config?.mutator ?? {
                path: "entity.title",
                valueTemplate: "{{value}}",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Target Path</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={mutatorConfig.path}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          mutator: { ...mutatorConfig, path: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Value Template</Label>
                    <Textarea
                      className="mt-2 min-h-[90px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={mutatorConfig.valueTemplate}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          mutator: {
                            ...mutatorConfig,
                            valueTemplate: event.target.value,
                          },
                        })
                      }
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Use <span className="text-gray-300">{`{{value}}`}</span> for
                      the current value or dot paths like{" "}
                      <span className="text-gray-300">{`{{entity.title}}`}</span>.
                    </p>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "validator" && (() => {
              const validatorConfig = selectedNode.config?.validator ?? {
                requiredPaths: ["entity.id"],
                mode: "all",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Validation Mode</Label>
                    <Select
                      value={validatorConfig.mode}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          validator: {
                            ...validatorConfig,
                            mode: value as "all" | "any",
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="all">All paths required</SelectItem>
                        <SelectItem value="any">Any path required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">
                      Required Paths (one per line)
                    </Label>
                    <Textarea
                      className="mt-2 min-h-[100px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={(validatorConfig.requiredPaths ?? []).join("\n")}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          validator: {
                            ...validatorConfig,
                            requiredPaths: parsePathList(event.target.value),
                          },
                        })
                      }
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Paths are relative to the incoming context object.
                    </p>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "constant" && (() => {
              const constantConfig = selectedNode.config?.constant ?? {
                valueType: "string",
                value: "",
              };
              const isJson = constantConfig.valueType === "json";
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Value Type</Label>
                    <Select
                      value={constantConfig.valueType}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          constant: {
                            ...constantConfig,
                            valueType: value as ConstantConfig["valueType"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Value</Label>
                    {isJson ? (
                      <Textarea
                        className="mt-2 min-h-[120px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={constantConfig.value}
                        onChange={(event) =>
                          updateSelectedNodeConfig({
                            constant: { ...constantConfig, value: event.target.value },
                          })
                        }
                      />
                    ) : (
                      <Input
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={constantConfig.value}
                        onChange={(event) =>
                          updateSelectedNodeConfig({
                            constant: { ...constantConfig, value: event.target.value },
                          })
                        }
                      />
                    )}
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "math" && (() => {
              const mathConfig = selectedNode.config?.math ?? {
                operation: "add",
                operand: 0,
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Operation</Label>
                    <Select
                      value={mathConfig.operation}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          math: {
                            ...mathConfig,
                            operation: value as MathConfig["operation"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select operation" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="add">Add</SelectItem>
                        <SelectItem value="subtract">Subtract</SelectItem>
                        <SelectItem value="multiply">Multiply</SelectItem>
                        <SelectItem value="divide">Divide</SelectItem>
                        <SelectItem value="round">Round</SelectItem>
                        <SelectItem value="ceil">Ceil</SelectItem>
                        <SelectItem value="floor">Floor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Operand</Label>
                    <Input
                      type="number"
                      step="0.1"
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={mathConfig.operand}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          math: {
                            ...mathConfig,
                            operand: toNumber(event.target.value, mathConfig.operand),
                          },
                        })
                      }
                    />
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "compare" && (() => {
              const compareConfig = selectedNode.config?.compare ?? {
                operator: "eq",
                compareTo: "",
                caseSensitive: false,
                message: "Comparison failed",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Operator</Label>
                    <Select
                      value={compareConfig.operator}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          compare: {
                            ...compareConfig,
                            operator: value as CompareConfig["operator"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="eq">Equals</SelectItem>
                        <SelectItem value="neq">Not equals</SelectItem>
                        <SelectItem value="gt">Greater than</SelectItem>
                        <SelectItem value="gte">Greater or equal</SelectItem>
                        <SelectItem value="lt">Less than</SelectItem>
                        <SelectItem value="lte">Less or equal</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="startsWith">Starts with</SelectItem>
                        <SelectItem value="endsWith">Ends with</SelectItem>
                        <SelectItem value="isEmpty">Is empty</SelectItem>
                        <SelectItem value="notEmpty">Not empty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Compare To</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={compareConfig.compareTo}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          compare: {
                            ...compareConfig,
                            compareTo: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
                    <span>Case Sensitive</span>
                    <Button
                      type="button"
                      className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                        compareConfig.caseSensitive
                          ? "text-emerald-200 hover:bg-emerald-500/10"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() =>
                        updateSelectedNodeConfig({
                          compare: {
                            ...compareConfig,
                            caseSensitive: !compareConfig.caseSensitive,
                          },
                        })
                      }
                    >
                      {compareConfig.caseSensitive ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Error Message</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={compareConfig.message ?? "Comparison failed"}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          compare: {
                            ...compareConfig,
                            message: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "router" && (() => {
              const routerConfig = selectedNode.config?.router ?? {
                mode: "valid",
                matchMode: "truthy",
                compareTo: "",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Match Source</Label>
                    <Select
                      value={routerConfig.mode}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          router: {
                            ...routerConfig,
                            mode: value as RouterConfig["mode"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="valid">Validator valid</SelectItem>
                        <SelectItem value="value">Value input</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Match Mode</Label>
                    <Select
                      value={routerConfig.matchMode}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          router: {
                            ...routerConfig,
                            matchMode: value as RouterConfig["matchMode"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select match mode" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="truthy">Truthy</SelectItem>
                        <SelectItem value="falsy">Falsy</SelectItem>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Compare To</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={routerConfig.compareTo}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          router: {
                            ...routerConfig,
                            compareTo: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "delay" && (() => {
              const delayConfig = selectedNode.config?.delay ?? { ms: 300 };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Delay (ms)</Label>
                    <Input
                      type="number"
                      step="50"
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={delayConfig.ms}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          delay: {
                            ms: toNumber(event.target.value, delayConfig.ms),
                          },
                        })
                      }
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Adds a pause before passing inputs downstream.
                  </p>
                </div>
              );
            })()}

            {selectedNode.type === "poll" && (() => {
              const defaultQuery: DbQueryConfig = {
                provider: "auto",
                collection: "products",
                mode: "preset",
                preset: "by_id",
                field: "_id",
                idType: "string",
                queryTemplate: "{\n  \"_id\": \"{{value}}\"\n}",
                limit: 20,
                sort: "",
                projection: "",
                single: false,
              };
              const pollConfig = selectedNode.config?.poll;
              const resolvedPollConfig: PollConfig = {
                intervalMs: pollConfig?.intervalMs ?? 2000,
                maxAttempts: pollConfig?.maxAttempts ?? 30,
                mode: pollConfig?.mode ?? "job",
                dbQuery: {
                  ...defaultQuery,
                  ...(pollConfig?.dbQuery ?? {}),
                } as DbQueryConfig,
                successPath: pollConfig?.successPath ?? "status",
                successOperator: pollConfig?.successOperator ?? "equals",
                successValue: pollConfig?.successValue ?? "completed",
                resultPath: pollConfig?.resultPath ?? "result",
              };
              const queryConfig = resolvedPollConfig.dbQuery!;
              const collectionOption = DB_COLLECTION_OPTIONS.some(
                (option) => option.value === queryConfig.collection
              )
                ? queryConfig.collection
                : "custom";
              const updatePollConfig = (patch: Partial<typeof resolvedPollConfig>) =>
                updateSelectedNodeConfig({
                  poll: {
                    ...resolvedPollConfig,
                    ...patch,
                  },
                });

              const connections = edges.filter((edge) => edge.to === selectedNode.id);
              const resolvedRuntimeInputs = selectedNode.inputs.reduce<Record<string, unknown>>(
                (acc, input) => {
                  const runtimeInputs = runtimeState.inputs[selectedNode.id] ?? {};
                  const directValue = runtimeInputs[input];
                  if (directValue !== undefined) {
                    acc[input] = directValue;
                    return acc;
                  }
                  const matchingEdges = connections.filter(
                    (edge) => edge.toPort === input || !edge.toPort
                  );
                  const merged = matchingEdges.reduce<unknown>((current, edge) => {
                    const fromOutput = runtimeState.outputs[edge.from];
                    if (!fromOutput) return current;
                    const fromPort = edge.fromPort;
                    if (!fromPort) return current;
                    const value = fromOutput[fromPort];
                    if (value === undefined) return current;
                    if (current === undefined) return value;
                    if (Array.isArray(current)) return [...(current as unknown[]), value];
                    return [current, value];
                  }, undefined);
                  if (merged !== undefined) {
                    acc[input] = merged;
                  }
                  return acc;
                },
                {}
              );
              const inputValue =
                (resolvedRuntimeInputs.value as string) ??
                (resolvedRuntimeInputs.jobId as string) ??
                "";
              const queryPreviewText = renderTemplate(
                queryConfig.queryTemplate ?? "{}",
                resolvedRuntimeInputs,
                inputValue
              );

              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Mode</Label>
                    <Select
                      value={resolvedPollConfig.mode!}
                      onValueChange={(value) =>
                        updatePollConfig({ mode: value as "job" | "database" })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="job">AI Job</SelectItem>
                        <SelectItem value="database">Database Query</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-gray-400">Interval (ms)</Label>
                      <Input
                        type="number"
                        step="100"
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={resolvedPollConfig.intervalMs}
                        onChange={(event) =>
                          updatePollConfig({
                            intervalMs: toNumber(
                              event.target.value,
                              resolvedPollConfig.intervalMs
                            ),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Max Attempts</Label>
                      <Input
                        type="number"
                        step="1"
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={resolvedPollConfig.maxAttempts}
                        onChange={(event) =>
                          updatePollConfig({
                            maxAttempts: toNumber(
                              event.target.value,
                              resolvedPollConfig.maxAttempts
                            ),
                          })
                        }
                      />
                    </div>
                  </div>
                  {resolvedPollConfig.mode === "job" && (
                    <p className="text-[11px] text-gray-500">
                      Polls /api/products/ai-jobs/{"{{jobId}}"} until completion and
                      outputs result + status.
                    </p>
                  )}
                  {resolvedPollConfig.mode === "database" && (
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-gray-400">Provider</Label>
                          <Select
                            value={queryConfig.provider}
                            onValueChange={(value) =>
                              updatePollConfig({
                                dbQuery: {
                                  ...queryConfig,
                                  provider: value as DbQueryConfig["provider"],
                                },
                              })
                            }
                          >
                            <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              <SelectItem value="auto">Auto</SelectItem>
                              <SelectItem value="mongodb">MongoDB</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400">Collection</Label>
                          <Select
                            value={collectionOption}
                            onValueChange={(value) =>
                              updatePollConfig({
                                dbQuery: {
                                  ...queryConfig,
                                  collection:
                                    value === "custom" ? queryConfig.collection : value,
                                },
                              })
                            }
                          >
                            <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                              <SelectValue placeholder="Select collection" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              {DB_COLLECTION_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {collectionOption === "custom" && (
                        <div>
                          <Label className="text-xs text-gray-400">Custom collection</Label>
                          <Input
                            className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={queryConfig.collection}
                            onChange={(event) =>
                              updatePollConfig({
                                dbQuery: {
                                  ...queryConfig,
                                  collection: event.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      )}
                      <div className="rounded-md border border-gray-800 bg-gray-900/60 p-3">
                        <div className="text-[11px] text-gray-400">Query preview</div>
                        <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-[11px] text-gray-200">
                          {queryPreviewText}
                        </pre>
                        <p className="mt-2 text-[11px] text-gray-500">
                          Preview uses current runtime inputs (if available).
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-gray-400">Query mode</Label>
                          <Select
                            value={queryConfig.mode}
                            onValueChange={(value) =>
                              updatePollConfig({
                                dbQuery: {
                                  ...queryConfig,
                                  mode: value as DbQueryConfig["mode"],
                                },
                              })
                            }
                          >
                            <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              <SelectItem value="preset">Preset</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400">ID type</Label>
                          <Select
                            value={queryConfig.idType}
                            onValueChange={(value) =>
                              updatePollConfig({
                                dbQuery: {
                                  ...queryConfig,
                                  idType: value as DbQueryConfig["idType"],
                                },
                              })
                            }
                          >
                            <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                              <SelectValue placeholder="Select ID type" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              <SelectItem value="string">String</SelectItem>
                              <SelectItem value="objectId">ObjectId</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {queryConfig.mode === "preset" && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label className="text-xs text-gray-400">Preset</Label>
                            <Select
                              value={queryConfig.preset}
                              onValueChange={(value) =>
                                updatePollConfig({
                                  dbQuery: {
                                    ...queryConfig,
                                    preset: value as DbQueryConfig["preset"],
                                  },
                                })
                              }
                            >
                              <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                                <SelectValue placeholder="Select preset" />
                              </SelectTrigger>
                              <SelectContent className="border-gray-800 bg-gray-900">
                                <SelectItem value="by_id">By _id</SelectItem>
                                <SelectItem value="by_productId">By productId</SelectItem>
                                <SelectItem value="by_entityId">By entityId</SelectItem>
                                <SelectItem value="by_field">By custom field</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-400">Custom field</Label>
                            <Input
                              className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                              value={queryConfig.field}
                              disabled={queryConfig.preset !== "by_field"}
                              onChange={(event) =>
                                updatePollConfig({
                                  dbQuery: {
                                    ...queryConfig,
                                    field: event.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                        </div>
                      )}
                      {queryConfig.mode === "custom" && (
                        <div>
                          <Label className="text-xs text-gray-400">Query template</Label>
                          <Textarea
                            className="mt-2 min-h-[120px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={queryConfig.queryTemplate}
                            onChange={(event) =>
                              updatePollConfig({
                                dbQuery: {
                                  ...queryConfig,
                                  queryTemplate: event.target.value,
                                },
                              })
                            }
                          />
                          <p className="mt-2 text-[11px] text-gray-500">
                            Supports placeholders like {"{{value}}"},{" "}
                            {"{{entityId}}"}, {"{{jobId}}"}.
                          </p>
                        </div>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-gray-400">Limit</Label>
                          <Input
                            type="number"
                            step="1"
                            className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={queryConfig.limit}
                            onChange={(event) =>
                              updatePollConfig({
                                dbQuery: {
                                  ...queryConfig,
                                  limit: toNumber(event.target.value, queryConfig.limit),
                                },
                              })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
                          <span>Single result</span>
                          <Button
                            type="button"
                            className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                              queryConfig.single
                                ? "text-emerald-200 hover:bg-emerald-500/10"
                                : "text-gray-300 hover:bg-gray-800"
                            }`}
                            onClick={() =>
                              updatePollConfig({
                                dbQuery: {
                                  ...queryConfig,
                                  single: !queryConfig.single,
                                },
                              })
                            }
                          >
                            {queryConfig.single ? "Enabled" : "Disabled"}
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-gray-400">Sort JSON</Label>
                          <Textarea
                            className="mt-2 min-h-[80px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={queryConfig.sort}
                            onChange={(event) =>
                              updatePollConfig({
                                dbQuery: {
                                  ...queryConfig,
                                  sort: event.target.value,
                                },
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400">Projection JSON</Label>
                          <Textarea
                            className="mt-2 min-h-[80px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={queryConfig.projection}
                            onChange={(event) =>
                              updatePollConfig({
                                dbQuery: {
                                  ...queryConfig,
                                  projection: event.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-gray-400">Success path</Label>
                          <Input
                            className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={resolvedPollConfig.successPath}
                            onChange={(event) =>
                              updatePollConfig({ successPath: event.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400">Success operator</Label>
                          <Select
                            value={resolvedPollConfig.successOperator ?? "equals"}
                            onValueChange={(value) =>
                              updatePollConfig({
                                successOperator:
                                  value as "truthy" | "equals" | "contains" | "notEquals",
                              })
                            }
                          >
                            <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                              <SelectValue placeholder="Select operator" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              <SelectItem value="truthy">Truthy</SelectItem>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="notEquals">Not equals</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-gray-400">Success value</Label>
                          <Input
                            className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={resolvedPollConfig.successValue}
                            onChange={(event) =>
                              updatePollConfig({ successValue: event.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400">Result path</Label>
                          <Input
                            className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={resolvedPollConfig.resultPath}
                            onChange={(event) =>
                              updatePollConfig({ resultPath: event.target.value })
                            }
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Polls MongoDB using the query settings. Use Success path/value to
                        stop polling when a record matches.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {selectedNode.type === "http" && (() => {
              const httpConfig: HttpConfig = selectedNode.config?.http ?? {
                url: "",
                method: "GET",
                headers: "{\n  \"Content-Type\": \"application/json\"\n}",
                bodyTemplate: "",
                responseMode: "json",
                responsePath: "",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">URL</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={httpConfig.url}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          http: { ...httpConfig, url: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-gray-400">Method</Label>
                      <Select
                        value={httpConfig.method}
                        onValueChange={(value) =>
                          updateSelectedNodeConfig({
                            http: { ...httpConfig, method: value as HttpConfig["method"] },
                          })
                        }
                      >
                        <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Response Mode</Label>
                      <Select
                        value={httpConfig.responseMode}
                        onValueChange={(value) =>
                          updateSelectedNodeConfig({
                            http: {
                              ...httpConfig,
                              responseMode: value as HttpConfig["responseMode"],
                            },
                          })
                        }
                      >
                        <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="status">Status only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Headers (JSON)</Label>
                    <Textarea
                      className="mt-2 min-h-[90px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={httpConfig.headers}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          http: { ...httpConfig, headers: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Body Template</Label>
                    <Textarea
                      className="mt-2 min-h-[110px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={httpConfig.bodyTemplate}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          http: { ...httpConfig, bodyTemplate: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Response Path</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={httpConfig.responsePath}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          http: { ...httpConfig, responsePath: event.target.value },
                        })
                      }
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Optional JSON path to extract a field from the response.
                    </p>
                  </div>
                </div>
              );
            })()}

              <DatabaseNodeConfigSection
                selectedNode={selectedNode}
                nodes={nodes}
                edges={edges}
                runtimeState={runtimeState}
                updateSelectedNodeConfig={updateSelectedNodeConfig}
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

{selectedNode.type === "gate" && (() => {
              const gateConfig: GateConfig = selectedNode.config?.gate ?? {
                mode: "block",
                failMessage: "Gate blocked",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Mode</Label>
                    <Select
                      value={gateConfig.mode}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          gate: {
                            ...gateConfig,
                            mode: value as GateConfig["mode"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="block">Block on invalid</SelectItem>
                        <SelectItem value="pass">Pass-through</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Fail Message</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={gateConfig.failMessage ?? ""}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          gate: { ...gateConfig, failMessage: event.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "bundle" && (() => {
              const bundleConfig = selectedNode.config?.bundle ?? {
                includePorts: [],
              };
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-400">
                      Included Ports (one per line)
                    </Label>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                      onClick={() =>
                        updateSelectedNodeConfig({
                          bundle: { includePorts: selectedNode.inputs },
                        })
                      }
                    >
                      Use all inputs
                    </Button>
                  </div>
                  <Textarea
                    className="min-h-[110px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                    value={(bundleConfig.includePorts ?? []).join("\n")}
                    onChange={(event) =>
                      updateSelectedNodeConfig({
                        bundle: { includePorts: parsePathList(event.target.value) },
                      })
                    }
                  />
                  <p className="text-[11px] text-gray-500">
                    Bundle outputs a single object with the selected ports as keys.
                  </p>
                </div>
              );
            })()}

            {selectedNode.type === "template" && (() => {
              const templateConfig: TemplateConfig = selectedNode.config?.template ?? {
                template: "",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Template</Label>
                    <Textarea
                      className="mt-2 min-h-[140px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={templateConfig.template}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          template: { template: event.target.value },
                        })
                      }
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Use placeholders like{" "}
                      <span className="text-gray-300">{`{{context.entity.title}}`}</span>{" "}
                      or{" "}
                      <span className="text-gray-300">{`{{result}}`}</span>.
                    </p>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "prompt" && (() => {
              const promptConfig: PromptConfig = selectedNode.config?.prompt ?? {
                template: "",
              };
              const handleInsertPlaceholder = (placeholder: string) => {
                const current = promptConfig.template ?? "";
                const separator = current && !current.endsWith(" ") && !current.endsWith("\n") ? " " : "";
                const next = `${current}${separator}${placeholder}`;
                updateSelectedNodeConfig({ prompt: { template: next } });
              };
              const incomingEdges = edges.filter((edge) => edge.to === selectedNode.id);
              const inputPorts = incomingEdges
                .map((edge) => edge.toPort)
                .filter((port): port is string => Boolean(port));
              const bundleKeys = new Set<string>();
              incomingEdges.forEach((edge) => {
                if (edge.toPort !== "bundle") return;
                const fromNode = nodes.find((node) => node.id === edge.from);
                if (!fromNode) return;
                if (fromNode.type === "parser") {
                  const mappings =
                    fromNode.config?.parser?.mappings ??
                    createParserMappings(fromNode.outputs);
                  Object.keys(mappings).forEach((key) => {
                    const trimmed = key.trim();
                    if (trimmed) bundleKeys.add(trimmed);
                  });
                  return;
                }
                if (fromNode.type === "bundle") {
                  fromNode.inputs.forEach((port) => {
                    const trimmed = port.trim();
                    if (trimmed) bundleKeys.add(trimmed);
                  });
                }
                if (fromNode.type === "mapper") {
                  const mapperOutputs =
                    fromNode.config?.mapper?.outputs ?? fromNode.outputs;
                  mapperOutputs.forEach((output) => {
                    const trimmed = output.trim();
                    if (trimmed) bundleKeys.add(trimmed);
                  });
                }
              });
              const directPlaceholders = inputPorts.filter((port) => port !== "bundle");
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Prompt Template</Label>
                    <Textarea
                      className="mt-2 min-h-[140px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={promptConfig.template}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          prompt: { template: event.target.value },
                        })
                      }
                      placeholder="Describe the product: {{title}}"
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Images are passed separately via the Prompt{" "}
                      <span className="text-gray-300">images</span> output and the Model{" "}
                      <span className="text-gray-300">images</span> input. You don&apos;t
                      need an <span className="text-gray-300">images</span> placeholder
                      inside the prompt text.
                    </p>
                  </div>
                  <div className="rounded-md border border-gray-800 bg-gray-900/50 p-3 text-[11px] text-gray-400">
                    <div className="text-gray-300">Available placeholders</div>
                    {bundleKeys.size > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                        {Array.from(bundleKeys).map((key) => (
                          <span
                            key={key}
                            role="button"
                            tabIndex={0}
                            className="cursor-pointer rounded-full border border-gray-700 px-2 py-0.5 text-[10px] text-gray-200 transition hover:border-gray-500 hover:bg-gray-800"
                            onClick={() => handleInsertPlaceholder(`{{${key}}}`)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleInsertPlaceholder(`{{${key}}}`);
                              }
                            }}
                          >
                            {formatPlaceholderLabel(key)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-gray-500">
                        Connect a Parser or Bundle node to the bundle input to surface
                        placeholder hints.
                      </div>
                    )}
                    {directPlaceholders.length > 0 && (
                      <div className="mt-3 text-[11px] text-gray-500">
                        Direct inputs:{" "}
                        {directPlaceholders
                          .map((port) => formatPlaceholderLabel(port))
                          .join(", ")}
                      </div>
                    )}
                  </div>
                  {(() => {
                    // Check for AI Model connection via prompt output
                    // Check for edges from this node that connect to a model node
                    const outgoingEdges = edges.filter(
                      (edge) => edge.from === selectedNode.id
                    );
                    // Find edge that connects to a model node (prefer "prompt" port, but accept any)
                    const aiEdge = outgoingEdges.find((edge) => {
                      const targetNode = nodes.find((n) => n.id === edge.to);
                      return targetNode?.type === "model";
                    });
                    const aiNode = aiEdge
                      ? nodes.find((n) => n.id === aiEdge.to && n.type === "model")
                      : null;
                    const aiModelId = aiNode?.config?.model?.modelId;
                    const hasPromptContent = promptConfig.template && promptConfig.template.trim().length > 0;

                    return (
                      <div className="mt-4 space-y-2">
                        {aiNode ? (
                          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                              <span className="text-[11px] text-emerald-100">
                                Connected to AI Model: <span className="font-medium text-emerald-200">{aiModelId || "Unknown"}</span>
                              </span>
                            </div>
                            {onSendToAi && hasPromptContent && (
                              <Button
                                type="button"
                                className="mt-2 rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-[11px] text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
                                disabled={sendingToAi}
                                onClick={() => {
                                  if (selectedNode?.id && promptConfig.template) {
                                    void onSendToAi(selectedNode.id, promptConfig.template);
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
                                Not connected to AI Model
                              </span>
                            </div>
                          </div>
                        )}
                        <p className="text-[11px] text-gray-500">
                          Connect this node&apos;s <span className="text-gray-300">prompt</span> output to an AI Model node to enable direct sending.
                        </p>
                      </div>
                    );
                  })()}
                  {(() => {
                    // Display result input value
                    const resultValue = runtimeState.inputs[selectedNode.id]?.result
                      ?? runtimeState.outputs[selectedNode.id]?.result;
                    const hasResult = resultValue !== undefined && resultValue !== null;
                    const displayValue = hasResult
                      ? (typeof resultValue === "string"
                          ? resultValue
                          : formatRuntimeValue(resultValue))
                      : "";

                    return (
                      <div className="mt-4">
                        <Label className="text-xs text-gray-400">Result Input</Label>
                        <Textarea
                          className="mt-2 min-h-[100px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                          value={displayValue}
                          readOnly
                          placeholder="No result received yet. Connect a node to the result input and run the graph."
                        />
                        <p className="mt-1 text-[11px] text-gray-500">
                          Shows the value passed through the <span className="text-gray-300">result</span> input port.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {selectedNode.type === "model" && (() => {
                            const modelConfig: ModelConfig = selectedNode.config?.model ?? {
                              modelId: DEFAULT_MODELS[0] ?? "gpt-4o",
                              temperature: 0.7,
                              maxTokens: 800,
                              vision: selectedNode.inputs.includes("images"),
                            };
              
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Model</Label>
                    <Select
                      value={modelConfig.modelId}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          model: { ...modelConfig, modelId: value },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        {modelOptions.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-gray-400">Temperature</Label>
                      <Input
                        type="number"
                        step="0.1"
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={modelConfig.temperature}
                        onChange={(event) =>
                          updateSelectedNodeConfig({
                            model: {
                              ...modelConfig,
                              temperature: toNumber(
                                event.target.value,
                                modelConfig.temperature
                              ),
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Max Tokens</Label>
                      <Input
                        type="number"
                        step="50"
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={modelConfig.maxTokens}
                        onChange={(event) =>
                          updateSelectedNodeConfig({
                            model: {
                              ...modelConfig,
                              maxTokens: toNumber(
                                event.target.value,
                                modelConfig.maxTokens
                              ),
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
                    <span>Accepts Images</span>
                    <Button
                      type="button"
                      className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                        modelConfig.vision
                          ? "text-emerald-200 hover:bg-emerald-500/10"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() =>
                        updateSelectedNodeConfig({
                          model: { ...modelConfig, vision: !modelConfig.vision },
                        })
                      }
                    >
                      {modelConfig.vision ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
                    <span>Wait for result</span>
                    <Button
                      type="button"
                      className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                        modelConfig.waitForResult !== false
                          ? "text-emerald-200 hover:bg-emerald-500/10"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() =>
                        updateSelectedNodeConfig({
                          model: {
                            ...modelConfig,
                            waitForResult: modelConfig.waitForResult === false,
                          },
                        })
                      }
                    >
                      {modelConfig.waitForResult === false ? "Disabled" : "Enabled"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    When enabled, the Model node polls the job until completion and emits
                    <span className="text-gray-300"> result</span>. Disable to emit only{" "}
                    <span className="text-gray-300">jobId</span> and use a Poll node.
                  </p>
                </div>
              );
            })()}

              <ContextNodeConfigSection
                selectedNode={selectedNode}
                runtimeState={runtimeState}
                updateSelectedNodeConfig={updateSelectedNodeConfig}
                toast={toast}
              />

              {selectedNode.type === "trigger" && (() => {
              const triggerConfig = selectedNode.config?.trigger ?? {
                event: TRIGGER_EVENTS[0]?.id ?? "path_generate_description",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Trigger Action</Label>
                    <Select
                      value={triggerConfig.event}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          trigger: { event: value },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        {TRIGGER_EVENTS.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "simulation" && (() => {
              const simulationConfig = selectedNode.config?.simulation ?? {
                productId: "",
                entityType: "product",
                entityId: "",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Entity Type</Label>
                    <Select
                      value={simulationConfig.entityType ?? "product"}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          simulation: {
                            ...simulationConfig,
                            entityType: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select entity" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="chat">Chat</SelectItem>
                        <SelectItem value="log">Log Entry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">
                      {simulationConfig.entityType === "product"
                        ? "Product ID"
                        : "Entity ID"}
                    </Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={simulationConfig.entityId ?? simulationConfig.productId}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          simulation: {
                            ...simulationConfig,
                            entityId: event.target.value,
                            productId: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Used to simulate {simulationConfig.entityType ?? "product"} context.
                  </p>
                  <Button
                    className="w-full rounded-md border border-cyan-500/40 text-sm text-cyan-200 hover:bg-cyan-500/10"
                    type="button"
                    onClick={() => handleRunSimulation(selectedNode)}
                  >
                    Run Simulation
                  </Button>
                </div>
              );
            })()}

            {selectedNode.type === "viewer" && (() => {
              const viewerConfig = selectedNode.config?.viewer ?? {
                outputs: createViewerOutputs(selectedNode.inputs),
                showImagesAsJson: false,
              };
              const showImagesAsJson = viewerConfig.showImagesAsJson ?? false;
              const connections = edges.filter((edge) => edge.to === selectedNode.id);
              const isConnectedToTrigger = (() => {
                const triggerIds = nodes.filter((node) => node.type === "trigger").map((node) => node.id);
                if (triggerIds.length === 0) return false;
                const adjacency = new Map<string, Set<string>>();
                edges.forEach((edge) => {
                  if (!edge.from || !edge.to) return;
                  const fromSet = adjacency.get(edge.from) ?? new Set<string>();
                  fromSet.add(edge.to);
                  adjacency.set(edge.from, fromSet);
                  const toSet = adjacency.get(edge.to) ?? new Set<string>();
                  toSet.add(edge.from);
                  adjacency.set(edge.to, toSet);
                });
                const visited = new Set<string>();
                const queue = [...triggerIds];
                triggerIds.forEach((id) => visited.add(id));
                while (queue.length) {
                  const current = queue.shift();
                  if (!current) continue;
                  const neighbors = adjacency.get(current);
                  if (!neighbors) continue;
                  neighbors.forEach((neighbor) => {
                    if (visited.has(neighbor)) return;
                    visited.add(neighbor);
                    queue.push(neighbor);
                  });
                }
                return visited.has(selectedNode.id);
              })();
              const runtimeInputs = runtimeState.inputs[selectedNode.id] ?? {};
              const resolvedRuntimeInputs = selectedNode.inputs.reduce<Record<string, unknown>>(
                (acc, input) => {
                  const directValue = runtimeInputs[input];
                  if (directValue !== undefined) {
                    acc[input] = directValue;
                    return acc;
                  }
                  const matchingEdges = connections.filter(
                    (edge) => edge.toPort === input || !edge.toPort
                  );
                  const merged = matchingEdges.reduce<unknown>((current, edge) => {
                    const fromOutput = runtimeState.outputs[edge.from];
                    if (!fromOutput) return current;
                    const fromPort = edge.fromPort;
                    if (!fromPort) return current;
                    const value = fromOutput[fromPort];
                    if (value === undefined) return current;
                    if (current === undefined) return value;
                    if (Array.isArray(current)) return [...(current as unknown[]), value];
                    return [current, value];
                  }, undefined);
                  if (merged !== undefined) {
                    acc[input] = merged;
                  }
                  return acc;
                },
                {}
              );
              const outputValues = {
                ...createViewerOutputs(selectedNode.inputs),
                ...viewerConfig.outputs,
              };
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      Store and review outputs that flow into this node.
                    </div>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 text-xs text-gray-200 hover:bg-gray-900/80"
                      onClick={() => {
                        updateSelectedNodeConfig({
                          viewer: {
                            outputs: createViewerOutputs(selectedNode.inputs),
                            showImagesAsJson,
                          },
                        });
                        clearRuntimeForNode?.(selectedNode.id);
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 text-xs text-gray-200 hover:bg-gray-900/80"
                      onClick={() =>
                        updateSelectedNodeConfig({
                          viewer: {
                            ...viewerConfig,
                            showImagesAsJson: !showImagesAsJson,
                          },
                        })
                      }
                    >
                      {showImagesAsJson ? "Images: JSON" : "Images: Thumbnails"}
                    </Button>
                  </div>
                  {!isConnectedToTrigger && (
                    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                      This Result Viewer is not connected to a Trigger path, so it will not update when you fire triggers.
                      Connect it to the same path as a Trigger (directly or through other nodes).
                    </div>
                  )}
                  {selectedNode.inputs.map((input) => {
                    const connectedSources = connections
                      .filter((edge) => !edge.toPort || edge.toPort === input)
                      .map((edge) => {
                        const fromNode = nodes.find((node) => node.id === edge.from);
                        if (!fromNode) return null;
                        const portLabel = edge.fromPort ? `:${edge.fromPort}` : "";
                        return `${fromNode.title}${portLabel}`;
                      })
                      .filter(Boolean)
                      .join(", ");
                    const runtimeValue = resolvedRuntimeInputs[input];
                    const imageUrls =
                      input === "images" ? extractImageUrls(runtimeValue) : [];
                    const hasImagePreview =
                      input === "images" && imageUrls.length > 0 && !showImagesAsJson;
                    return (
                      <div key={input} className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <Label className="text-xs text-gray-400">
                            {formatPortLabel(input)}
                          </Label>
                          {connectedSources && (
                            <span className="text-[10px] text-gray-500">
                              Connected: {connectedSources}
                            </span>
                          )}
                        </div>
                        {runtimeValue !== undefined && (
                          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-100">
                            <div className="mb-1 text-[9px] uppercase text-emerald-300">
                              Runtime
                            </div>
                            {hasImagePreview ? (
                              <>
                                <div className="text-[10px] text-emerald-200">
                                  Detected {imageUrls.length} image
                                  {imageUrls.length === 1 ? "" : "s"}
                                </div>
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                  {imageUrls.map((url, index) => (
                                    <div
                                      key={`${url}-${index}`}
                                      className="overflow-hidden rounded border border-emerald-500/30 bg-black/30"
                                    >
                                      <img
                                        src={url}
                                        alt={`Image ${index + 1}`}
                                        className="h-20 w-full object-cover"
                                        loading="lazy"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <pre className="whitespace-pre-wrap">
                                {formatRuntimeValue(runtimeValue)}
                              </pre>
                            )}
                          </div>
                        )}
                        <Textarea
                          className="min-h-[90px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                          value={outputValues[input] ?? ""}
                          onChange={(event) =>
                            updateSelectedNodeConfig({
                              viewer: {
                                ...viewerConfig,
                                outputs: {
                                  ...outputValues,
                                  [input]: event.target.value,
                                },
                              },
                            })
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {selectedNode.type === "ai_description" && (() => {
              const descriptionConfig = selectedNode.config?.description ?? {
                visionOutputEnabled: true,
                generationOutputEnabled: true,
              };
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
                    <span>Include vision analysis</span>
                    <Button
                      type="button"
                      className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                        descriptionConfig.visionOutputEnabled
                          ? "text-emerald-200 hover:bg-emerald-500/10"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() =>
                        updateSelectedNodeConfig({
                          description: {
                            ...descriptionConfig,
                            visionOutputEnabled: !descriptionConfig.visionOutputEnabled,
                          },
                        })
                      }
                    >
                      {descriptionConfig.visionOutputEnabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
                    <span>Include generation output</span>
                    <Button
                      type="button"
                      className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                        descriptionConfig.generationOutputEnabled
                          ? "text-emerald-200 hover:bg-emerald-500/10"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() =>
                        updateSelectedNodeConfig({
                          description: {
                            ...descriptionConfig,
                            generationOutputEnabled:
                              !descriptionConfig.generationOutputEnabled,
                          },
                        })
                      }
                    >
                      {descriptionConfig.generationOutputEnabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                </div>
              );
            })()}

              <DbSchemaNodeConfigSection
                selectedNode={selectedNode}
                updateSelectedNodeConfig={updateSelectedNodeConfig}
              />

              {selectedNode.type !== "parser" &&
              selectedNode.type !== "model" &&
              selectedNode.type !== "database" &&
              selectedNode.type !== "db_schema" &&
              selectedNode.type !== "trigger" &&
              selectedNode.type !== "simulation" &&
              selectedNode.type !== "context" &&
              selectedNode.type !== "mapper" &&
              selectedNode.type !== "mutator" &&
              selectedNode.type !== "validator" &&
              selectedNode.type !== "constant" &&
              selectedNode.type !== "math" &&
              selectedNode.type !== "template" &&
              selectedNode.type !== "bundle" &&
              selectedNode.type !== "gate" &&
              selectedNode.type !== "compare" &&
              selectedNode.type !== "router" &&
              selectedNode.type !== "delay" &&
              selectedNode.type !== "http" &&
              selectedNode.type !== "viewer" &&
              selectedNode.type !== "ai_description" &&
              selectedNode.type !== "description_updater" && (
                <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4 text-sm text-gray-400">
                  No configuration is available for this node yet.
                </div>
              )}
            </>
          </DialogContent>
        </Dialog>

            </>
  );
}
