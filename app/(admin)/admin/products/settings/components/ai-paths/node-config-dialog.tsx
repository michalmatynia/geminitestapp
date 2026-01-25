"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  AiNode,
  ConstantConfig,
  CompareConfig,
  GateConfig,
  DatabaseConfig,
  DatabaseOperation,
  DbQueryConfig,
  HttpConfig,
  Edge,
  MathConfig,
  ModelConfig,
  NodeConfig,
  ParserConfig,
  ParserSampleState,
  PollConfig,
  PromptConfig,
  RouterConfig,
  RuntimeState,
  TemplateConfig,
  UpdaterMapping,
  UpdaterSampleState,
} from "./types";
import {
  DB_COLLECTION_OPTIONS,
  DEFAULT_CONTEXT_ROLE,
  DEFAULT_MODELS,
  PARSER_PATH_OPTIONS,
  PARSER_PRESETS,
  TRIGGER_EVENTS,
  applyContextPreset,
  buildFlattenedMappings,
  buildTopLevelMappings,
  coerceInput,
  createParserMappings,
  createViewerOutputs,
  extractJsonPathEntries,
  formatRuntimeValue,
  getContextPresetSet,
  inferImageMappingPath,
  parsePathList,
  renderTemplate,
  safeParseJson,
  toggleContextTarget,
  toNumber,
} from "./helpers";
import { extractImageUrls, formatPortLabel, formatPlaceholderLabel } from "./ui-utils";

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
  toast,
}: NodeConfigDialogProps) {
  const [hideLargeFields, setHideLargeFields] = React.useState(true);
  const [showDiff, setShowDiff] = React.useState(true);
  const [diffOnlyChanges, setDiffOnlyChanges] = React.useState(true);
  const [parserDraftMappings, setParserDraftMappings] = React.useState<Record<string, string>>(
    {}
  );
  const [parserDraftNodeId, setParserDraftNodeId] = React.useState<string | null>(null);
  const parserDraftTimerRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!selectedNode || selectedNode.type !== "parser") return;
    const nextMappings =
      selectedNode.config?.parser?.mappings ??
      createParserMappings(selectedNode.outputs ?? []);
    setParserDraftNodeId(selectedNode.id);
    setParserDraftMappings(nextMappings);
    return () => {
      if (parserDraftTimerRef.current) {
        window.clearTimeout(parserDraftTimerRef.current);
        parserDraftTimerRef.current = null;
      }
    };
  }, [selectedNode?.id, selectedNode?.type]);

  if (!selectedNode) return null;
  return (
<Dialog open={configOpen} onOpenChange={setConfigOpen}>
          <DialogContent className="max-h-[85vh] w-[95vw] max-w-4xl overflow-y-auto border border-gray-800 bg-gray-950 text-white">
            <DialogHeader>
              <DialogTitle className="text-lg">
                Configure {selectedNode.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-400">
                Adjust parser mappings, model selection, or database operations
                for this node.
              </DialogDescription>
            </DialogHeader>

            <>
                  {selectedNode.type === "parser" && (() => {
              const parserConfig: ParserConfig = selectedNode.config?.parser ?? {
                mappings: createParserMappings(selectedNode.outputs),
                outputMode: "individual",
                presetId: PARSER_PRESETS[0]?.id ?? "custom",
              };
              const mappings =
                parserConfig.mappings ?? createParserMappings(selectedNode.outputs);
              const draftMappings =
                parserDraftNodeId === selectedNode.id ? parserDraftMappings : mappings;
              const outputMode = parserConfig.outputMode ?? "individual";
              const presetId =
                parserConfig.presetId ?? PARSER_PRESETS[0]?.id ?? "custom";
              const presetOptions = [
                ...PARSER_PRESETS,
                {
                  id: "custom",
                  label: "Custom",
                  description: "Use manual mappings.",
                  mappings: {},
                },
              ];
              const activePreset =
                presetOptions.find((preset) => preset.id === presetId) ?? null;
              const sampleState =
                parserSamples[selectedNode.id] ?? {
                  entityType: "product",
                  entityId: "",
                  simulationId: "",
                  json: "",
                  mappingMode: "top",
                  depth: 2,
                  keyStyle: "path",
                  includeContainers: false,
                };
              const simulationOptions = nodes
                .filter((node) => node.type === "simulation")
                .map((node) => {
                  const simConfig = node.config?.simulation;
                  const entityId =
                    simConfig?.entityId?.trim() || simConfig?.productId?.trim() || "";
                  const entityType = simConfig?.entityType?.trim() || "product";
                  return {
                    id: node.id,
                    label: `${node.title} · ${entityType}:${entityId || "missing id"}`,
                    entityId,
                    entityType,
                  };
                })
                .filter((option) => option.entityId);
              const parsedSample = safeParseJson(sampleState.json);
              const sampleValue = parsedSample.value;
              const sampleMappings = sampleValue
                ? sampleState.mappingMode === "flatten"
                  ? buildFlattenedMappings(
                      sampleValue,
                      sampleState.depth ?? 2,
                      sampleState.keyStyle ?? "path",
                      sampleState.includeContainers ?? false
                    )
                  : buildTopLevelMappings(sampleValue)
                : {};
              const sampleEntries = sampleValue
                ? extractJsonPathEntries(sampleValue, sampleState.depth ?? 2)
                : [];
              const samplePaths = sampleEntries
                .filter((entry) => {
                  if (sampleState.includeContainers) return true;
                  return entry.type === "value" || entry.type === "array";
                })
                .map((entry) => entry.path);
              const samplePathOptions = samplePaths.map((path) => {
                const value = path.startsWith("[") ? `$${path}` : `$.${path}`;
                return { label: `Sample: ${path}`, value };
              });
              const parserRuntimeInputs = runtimeState.inputs[selectedNode.id] ?? {};
              const parserContext =
                parserRuntimeInputs.context && typeof parserRuntimeInputs.context === "object"
                  ? (parserRuntimeInputs.context as Record<string, unknown>)
                  : null;
              const parserContextEntity =
                parserContext?.entity ||
                parserContext?.entityJson ||
                parserContext?.product ||
                null;
              const parserSourceLabel = parserRuntimeInputs.entityJson
                ? "entityJson input"
                : parserContextEntity
                  ? "context entity"
                  : parserRuntimeInputs.context
                    ? "context (no entity)"
                    : "no runtime input yet";
              const suggestedPathOptions = samplePathOptions.length
                ? [...samplePathOptions, ...PARSER_PATH_OPTIONS]
                : PARSER_PATH_OPTIONS;
              const uniqueSuggestedPathOptions = Array.from(
                new Map(
                  suggestedPathOptions.map((option) => [option.value, option])
                ).values()
              );
              const entries = Object.entries(draftMappings);
              const commitMappingsDebounced = (
                nextMappings: Record<string, string>,
                nextMode: "individual" | "bundle" = outputMode,
                nextPresetId: string = presetId
              ) => {
                setParserDraftNodeId(selectedNode.id);
                setParserDraftMappings(nextMappings);
                if (parserDraftTimerRef.current) {
                  window.clearTimeout(parserDraftTimerRef.current);
                }
                parserDraftTimerRef.current = window.setTimeout(() => {
                  commitMappings(nextMappings, nextMode, nextPresetId);
                }, 500);
              };
              const commitMappingsImmediate = (
                nextMappings: Record<string, string>,
                nextMode: "individual" | "bundle" = outputMode,
                nextPresetId: string = presetId
              ) => {
                setParserDraftNodeId(selectedNode.id);
                setParserDraftMappings(nextMappings);
                if (parserDraftTimerRef.current) {
                  window.clearTimeout(parserDraftTimerRef.current);
                  parserDraftTimerRef.current = null;
                }
                commitMappings(nextMappings, nextMode, nextPresetId);
              };
              const commitMappings = (
                nextMappings: Record<string, string>,
                nextMode: "individual" | "bundle" = outputMode,
                nextPresetId: string = presetId
              ) => {
                const keys = Object.keys(nextMappings)
                  .map((key) => key.trim())
                  .filter(Boolean);
                const hasImagesOutput = keys.some(
                  (key) => key.toLowerCase() === "images"
                );
                const nextOutputs =
                  nextMode === "bundle"
                    ? ["bundle", ...(hasImagesOutput ? ["images"] : [])]
                    : keys;
                updateSelectedNode({
                  outputs: nextOutputs.length ? nextOutputs : selectedNode.outputs,
                  config: {
                    ...selectedNode.config,
                    parser: {
                      mappings: nextMappings,
                      outputMode: nextMode,
                      presetId: nextPresetId,
                    },
                  },
                });
              };
              const addMapping = (baseKey: string, defaultPath: string) => {
                let nextKey = baseKey;
                let counter = 1;
                while (draftMappings[nextKey]) {
                  counter += 1;
                  nextKey = `${baseKey}_${counter}`;
                }
                commitMappingsImmediate({ ...draftMappings, [nextKey]: defaultPath });
              };
              const updateMappingKey = (index: number, value: string) => {
                const nextEntries = entries.map((entry, idx) => {
                  if (idx !== index) return entry;
                  const nextKey = value.trim() || entry[0];
                  return [nextKey, entry[1]] as [string, string];
                });
                const nextMappings: Record<string, string> = {};
                nextEntries.forEach(([key, path]) => {
                  if (!key.trim()) return;
                  nextMappings[key.trim()] = path;
                });
                commitMappingsDebounced(nextMappings);
              };
              const updateMappingPath = (index: number, value: string) => {
                const nextEntries = entries.map((entry, idx) =>
                  idx === index ? [entry[0], value] : entry
                );
                const nextMappings: Record<string, string> = {};
                nextEntries.forEach(([key, path]) => {
                  if (!key.trim()) return;
                  nextMappings[key.trim()] = path;
                });
                commitMappingsDebounced(nextMappings);
              };
              const removeMapping = (index: number) => {
                if (entries.length <= 1) return;
                const nextEntries = entries.filter((_, idx) => idx !== index);
                const nextMappings: Record<string, string> = {};
                nextEntries.forEach(([key, path]) => {
                  if (!key.trim()) return;
                  nextMappings[key.trim()] = path;
                });
                commitMappingsImmediate(nextMappings);
              };
              const applyPreset = (mode: "replace" | "merge") => {
                if (!activePreset || activePreset.id === "custom") return;
                if (mode === "replace") {
                  commitMappingsImmediate(
                    activePreset.mappings,
                    outputMode,
                    activePreset.id
                  );
                  return;
                }
                const merged: Record<string, string> = { ...draftMappings };
                Object.entries(activePreset.mappings).forEach(([key, value]) => {
                  if (!(key in merged)) {
                    merged[key] = value;
                  }
                });
                commitMappingsImmediate(merged, outputMode, activePreset.id);
              };
              const applySampleMappings = (mode: "replace" | "merge") => {
                const keys = Object.keys(sampleMappings);
                if (keys.length === 0) return;
                if (mode === "replace") {
                  commitMappingsImmediate(sampleMappings, outputMode, "custom");
                  return;
                }
                const merged: Record<string, string> = { ...draftMappings };
                keys.forEach((key) => {
                  if (!(key in merged)) {
                    merged[key] = sampleMappings[key] ?? "";
                  }
                });
                commitMappingsImmediate(merged, outputMode, "custom");
              };
              const handleDetectImages = () => {
                if (!sampleValue) {
                  toast("Provide sample JSON to detect image fields.", { variant: "error" });
                  return;
                }
                const detected = inferImageMappingPath(
                  sampleValue,
                  sampleState.depth ?? 2
                );
                if (!detected) {
                  toast("No image-like field detected in the sample.", { variant: "error" });
                  return;
                }
                if (imageEntryIndex >= 0) {
                  const nextEntries = entries.map((entry, idx) =>
                    idx === imageEntryIndex ? [entry[0], detected] : entry
                  );
                  const nextMappings: Record<string, string> = {};
                  nextEntries.forEach(([key, path]) => {
                    if (!key.trim()) return;
                    nextMappings[key.trim()] = path;
                  });
                  commitMappingsImmediate(nextMappings);
                  toast(`Image field detected: ${detected}`, { variant: "success" });
                  return;
                }
                commitMappingsImmediate({ ...draftMappings, images: detected });
                toast(`Image field detected: ${detected}`, { variant: "success" });
              };
              const imageEntryIndex = entries.findIndex(([key]) =>
                key.toLowerCase().includes("image")
              );
              return (
                <div className="space-y-4">
                  <div className="rounded-md border border-gray-800 bg-gray-900/60 px-3 py-2 text-[11px] text-gray-300">
                    <div className="text-gray-400">Input source</div>
                    <div className="mt-1 text-sm text-gray-200">{parserSourceLabel}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Preset</Label>
                    <Select
                      value={presetId}
                      onValueChange={(value) =>
                        commitMappingsImmediate(draftMappings, outputMode, value)
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
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
                    {activePreset && (
                      <p className="mt-2 text-[11px] text-gray-500">
                        {activePreset.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                        onClick={() => applyPreset("replace")}
                      >
                        Replace mappings
                      </Button>
                      <Button
                        type="button"
                        className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                        onClick={() => applyPreset("merge")}
                      >
                        Add missing fields
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-400">Sample JSON</Label>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-center">
                      <Select
                        value={sampleState.entityType}
                        onValueChange={(value) =>
                          setParserSamples((prev) => ({
                            ...prev,
                            [selectedNode.id]: {
                              ...sampleState,
                              entityType: value,
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Entity type" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="space-y-2">
                        <Input
                          className="w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                          value={sampleState.entityId}
                          onChange={(event) =>
                            setParserSamples((prev) => ({
                              ...prev,
                              [selectedNode.id]: {
                                ...sampleState,
                                entityId: event.target.value,
                                simulationId: "",
                              },
                            }))
                          }
                          placeholder="Entity ID"
                        />
                        {simulationOptions.length > 0 && (
                          <Select
                            value={sampleState.simulationId ?? ""}
                            onValueChange={(value) => {
                              const option = simulationOptions.find(
                                (item) => item.id === value
                              );
                              if (!option) return;
                              setParserSamples((prev) => ({
                                ...prev,
                                [selectedNode.id]: {
                                  ...sampleState,
                                  entityType: option.entityType,
                                  entityId: option.entityId,
                                  simulationId: option.id,
                                },
                              }));
                            }}
                          >
                            <SelectTrigger className="border-gray-800 bg-gray-950/70 text-[10px] text-gray-200">
                              <SelectValue placeholder="Use simulation ID" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              {simulationOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <Button
                        type="button"
                        className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                        disabled={parserSampleLoading}
                        onClick={() =>
                          void handleFetchParserSample(
                            selectedNode.id,
                            sampleState.entityType,
                            sampleState.entityId
                          )
                        }
                      >
                        {parserSampleLoading ? "Loading..." : "Fetch sample"}
                      </Button>
                    </div>
                    <Textarea
                      className="mt-2 min-h-[120px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={sampleState.json}
                      onChange={(event) =>
                        setParserSamples((prev) => ({
                          ...prev,
                          [selectedNode.id]: {
                            ...sampleState,
                            json: event.target.value,
                          },
                        }))
                      }
                      placeholder='{ "id": "123", "title": "Sample" }'
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Select
                        value={sampleState.mappingMode}
                        onValueChange={(value) =>
                          setParserSamples((prev) => ({
                            ...prev,
                            [selectedNode.id]: {
                              ...sampleState,
                              mappingMode: value as "top" | "flatten",
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="w-[180px] border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Mapping mode" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          <SelectItem value="top">Top-level fields</SelectItem>
                          <SelectItem value="flatten">Flatten nested</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={String(sampleState.depth)}
                        onValueChange={(value) =>
                          setParserSamples((prev) => ({
                            ...prev,
                            [selectedNode.id]: {
                              ...sampleState,
                              depth: Number(value),
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="w-[160px] border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Depth" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          {[1, 2, 3, 4].map((depth) => (
                            <SelectItem key={depth} value={String(depth)}>
                              Depth {depth}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        className={`rounded-md border border-gray-700 px-3 text-[10px] ${
                          sampleState.includeContainers
                            ? "text-emerald-200 hover:bg-emerald-500/10"
                            : "text-gray-300 hover:bg-gray-900/80"
                        }`}
                        onClick={() =>
                          setParserSamples((prev) => ({
                            ...prev,
                            [selectedNode.id]: {
                              ...sampleState,
                              includeContainers: !sampleState.includeContainers,
                            },
                          }))
                        }
                      >
                        {sampleState.includeContainers ? "Containers: On" : "Containers: Off"}
                      </Button>
                      {sampleState.mappingMode === "flatten" && (
                        <Select
                          value={sampleState.keyStyle}
                          onValueChange={(value) =>
                            setParserSamples((prev) => ({
                              ...prev,
                              [selectedNode.id]: {
                                ...sampleState,
                                keyStyle: value as "path" | "leaf",
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="w-[170px] border-gray-800 bg-gray-950/70 text-sm text-white">
                            <SelectValue placeholder="Key style" />
                          </SelectTrigger>
                          <SelectContent className="border-gray-800 bg-gray-900">
                            <SelectItem value="path">Path keys</SelectItem>
                            <SelectItem value="leaf">Leaf keys</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    {parsedSample.error ? (
                      <p className="mt-2 text-[11px] text-rose-300">
                        {parsedSample.error}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.keys(sampleMappings).length > 0 && (
                        <>
                          <Button
                            type="button"
                            className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                            onClick={() => applySampleMappings("replace")}
                          >
                            Auto-map from sample
                          </Button>
                          <Button
                            type="button"
                            className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                            onClick={() => applySampleMappings("merge")}
                          >
                            Add missing from sample
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                        onClick={handleDetectImages}
                      >
                        Detect images
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-400">Output Mode</Label>
                    <Select
                      value={outputMode}
                      onValueChange={(value) =>
                        commitMappingsImmediate(
                          draftMappings,
                          value as "individual" | "bundle"
                        )
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select output mode" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="individual">Individual outputs</SelectItem>
                        <SelectItem value="bundle">Single bundle output</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-[11px] text-gray-500">
                      Bundle mode emits a single <span className="text-gray-300">bundle</span>{" "}
                      port and uses mapping keys as placeholders for Prompt templates.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                      onClick={() => addMapping("title", "$.title")}
                    >
                      Add title
                    </Button>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                      onClick={() => addMapping("images", "$.images")}
                    >
                      Add images
                    </Button>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                      onClick={() => addMapping("productId", "$.id")}
                    >
                      Add id
                    </Button>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                      onClick={() => addMapping("sku", "$.sku")}
                    >
                      Add sku
                    </Button>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                      onClick={() => addMapping("price", "$.price")}
                    >
                      Add price
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {entries.map(([key, path], index) => (
                      <div
                        key={`${key}-${index}`}
                        className="grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-start"
                      >
                        <Input
                          className="w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                          value={key}
                          onChange={(event) =>
                            updateMappingKey(index, event.target.value)
                          }
                          placeholder="output key"
                        />
                        <div className="space-y-2">
                          <Input
                            className="w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={path}
                            onChange={(event) =>
                              updateMappingPath(index, event.target.value)
                            }
                            placeholder="$.path.to.value"
                          />
                          <Select onValueChange={(value) => updateMappingPath(index, value)}>
                            <SelectTrigger className="border-gray-800 bg-gray-950/70 text-[10px] text-gray-200">
                              <SelectValue placeholder="Pick a suggested path" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                            {uniqueSuggestedPathOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          disabled={entries.length <= 1}
                          className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => removeMapping(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button
                      type="button"
                      className="w-full rounded-md border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                      onClick={() =>
                        addMapping(`field_${entries.length + 1}`, "")
                      }
                    >
                      Add mapping
                    </Button>
                    <Button
                      type="button"
                      className="w-full rounded-md border border-gray-700 text-xs text-gray-200 hover:bg-gray-900/80 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={entries.length === 0}
                      onClick={() => removeMapping(entries.length - 1)}
                    >
                      Remove last
                    </Button>
                    <Button
                      type="button"
                      className="w-full rounded-md border border-rose-400/50 text-xs text-rose-100 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={entries.length === 0}
                      onClick={() => commitMappingsImmediate({}, outputMode, "custom")}
                    >
                      Clear mappings
                    </Button>
                  </div>
                  {imageEntryIndex >= 0 && (
                    <div className="rounded-md border border-gray-800 bg-gray-900/50 p-3 text-[11px] text-gray-400">
                      <div className="text-gray-300">Image helpers</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                          onClick={() =>
                            updateMappingPath(imageEntryIndex, "$.images")
                          }
                        >
                          Use $.images
                        </Button>
                        <Button
                          type="button"
                          className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                          onClick={() =>
                            updateMappingPath(imageEntryIndex, "$.imageLinks")
                          }
                        >
                          Use $.imageLinks
                        </Button>
                        <Button
                          type="button"
                          className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                          onClick={() =>
                            updateMappingPath(imageEntryIndex, "$.media")
                          }
                        >
                          Use $.media
                        </Button>
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500">
                    Use JSON paths like{" "}
                    <span className="text-gray-300">{`$.images`}</span>,{" "}
                    <span className="text-gray-300">{`$.imageLinks`}</span>, or{" "}
                    <span className="text-gray-300">{`$.media`}</span> for image arrays.
                  </p>
                </div>
              );
            })()}

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
              const queryConfig = resolvedPollConfig.dbQuery;
              const collectionOption = DB_COLLECTION_OPTIONS.some(
                (option) => option.value === queryConfig.collection
              )
                ? queryConfig.collection
                : "custom";
              const runtimeInputs = runtimeState.inputs[selectedNode.id] ?? {};
              const runtimeValue =
                coerceInput(runtimeInputs.value) ??
                coerceInput(runtimeInputs.entityId) ??
                coerceInput(runtimeInputs.productId);
              const queryPreview = (() => {
                if (queryConfig.mode === "preset") {
                  const presetValue = runtimeValue ?? "";
                  const presetField =
                    queryConfig.preset === "by_field"
                      ? queryConfig.field || "id"
                      : queryConfig.preset === "by_productId"
                        ? "productId"
                        : queryConfig.preset === "by_entityId"
                          ? "entityId"
                          : "_id";
                  return { [presetField]: presetValue };
                }
                if (
                  runtimeInputs.query &&
                  typeof runtimeInputs.query === "object" &&
                  !Array.isArray(runtimeInputs.query)
                ) {
                  return runtimeInputs.query as Record<string, unknown>;
                }
                const rendered = renderTemplate(
                  queryConfig.queryTemplate ?? "{}",
                  runtimeInputs as Record<string, unknown>,
                  runtimeValue ?? ""
                );
                const parsed = safeParseJson(rendered);
                if (parsed.value && typeof parsed.value === "object") {
                  return parsed.value as Record<string, unknown>;
                }
                return { __raw: rendered };
              })();
              const queryPreviewText = (() => {
                try {
                  return JSON.stringify(queryPreview, null, 2);
                } catch {
                  return String(queryPreview);
                }
              })();
              const placeholderChips = [
                "{{value}}",
                "{{entityId}}",
                "{{productId}}",
                "{{context.entityId}}",
                "{{bundle.key}}",
                "{{meta.pathId}}",
              ];
              const templateSnippets = [
                {
                  label: "By _id",
                  value: "{\n  \"_id\": \"{{value}}\"\n}",
                },
                {
                  label: "By productId",
                  value: "{\n  \"productId\": \"{{value}}\"\n}",
                },
                {
                  label: "By SKU",
                  value: "{\n  \"sku\": \"{{value}}\"\n}",
                },
                {
                  label: "Name contains",
                  value:
                    "{\n  \"name\": { \"$regex\": \"{{value}}\", \"$options\": \"i\" }\n}",
                },
                {
                  label: "Created after",
                  value: "{\n  \"createdAt\": { \"$gte\": \"{{value}}\" }\n}",
                },
              ];
              const updatePollConfig = (patch: Partial<typeof resolvedPollConfig>) =>
                updateSelectedNodeConfig({
                  poll: {
                    ...resolvedPollConfig,
                    ...patch,
                  },
                });
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Mode</Label>
                    <Select
                      value={resolvedPollConfig.mode}
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
                            value={resolvedPollConfig.successOperator}
                            onValueChange={(value) =>
                              updatePollConfig({
                                successOperator:
                                  value as typeof resolvedPollConfig.successOperator,
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

            {selectedNode.type === "database" && (() => {
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
              const persistedDatabase = selectedNode.config?.database;
              const defaultMappings: UpdaterMapping[] = [
                {
                  targetPath: "content_en",
                  sourcePort: selectedNode.inputs.includes("result") ? "result" : "content_en",
                },
              ];
              const databaseConfig: DatabaseConfig = {
                operation: persistedDatabase?.operation ?? "query",
                entityType: persistedDatabase?.entityType ?? "product",
                idField: persistedDatabase?.idField ?? "entityId",
                mode: persistedDatabase?.mode ?? "replace",
                mappings:
                  persistedDatabase?.mappings && persistedDatabase.mappings.length > 0
                    ? persistedDatabase.mappings
                    : defaultMappings,
                query: {
                  ...defaultQuery,
                  ...(persistedDatabase?.query ?? {}),
                } as DbQueryConfig,
                writeSource: persistedDatabase?.writeSource ?? "bundle",
                writeSourcePath: persistedDatabase?.writeSourcePath ?? "",
                dryRun: persistedDatabase?.dryRun ?? false,
              };
              const operation = databaseConfig.operation ?? "query";
              const queryConfig = databaseConfig.query ?? defaultQuery;
              const incomingEdges = edges.filter((edge) => edge.to === selectedNode.id);
              const incomingPorts = Array.from(
                new Set(
                  incomingEdges
                    .map((edge) => edge.toPort)
                    .filter((port): port is string => Boolean(port))
                )
              );
              const availablePorts = incomingPorts.length
                ? incomingPorts
                : selectedNode.inputs;
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
              const mappings =
                databaseConfig.mappings && databaseConfig.mappings.length > 0
                  ? databaseConfig.mappings
                  : defaultMappings;
              const sampleState =
                updaterSamples[selectedNode.id] ?? {
                  entityType: databaseConfig.entityType ?? "product",
                  entityId: "",
                  json: "",
                  depth: 2,
                  includeContainers: false,
                };
              const parsedSample = safeParseJson(sampleState.json);
              const sampleValue = parsedSample.value;
              const sampleEntries = sampleValue
                ? extractJsonPathEntries(sampleValue, sampleState.depth ?? 2)
                : [];
              const targetPaths = sampleEntries
                .filter((entry) => {
                  if (sampleState.includeContainers) return true;
                  return entry.type === "value" || entry.type === "array";
                })
                .map((entry) => entry.path);
              const targetPathOptions = targetPaths.map((path) => ({
                label: path,
                value: path,
              }));
              const uniqueTargetPathOptions = Array.from(
                new Map(targetPathOptions.map((option) => [option.value, option])).values()
              );
              const findMatchingTargetPath = (port: string) => {
                const normalized = port.toLowerCase();
                const endsWith = targetPaths.find((path) =>
                  path.toLowerCase().endsWith(normalized)
                );
                if (endsWith) return endsWith;
                const includes = targetPaths.find((path) =>
                  path.toLowerCase().includes(normalized)
                );
                return includes ?? port;
              };
              const updateMappings = (nextMappings: UpdaterMapping[]) => {
                updateSelectedNodeConfig({
                  database: {
                    ...databaseConfig,
                    mappings: nextMappings,
                  },
                });
              };
              const updateMapping = (index: number, patch: Partial<UpdaterMapping>) => {
                const nextMappings = mappings.map((mapping, idx) =>
                  idx === index ? { ...mapping, ...patch } : mapping
                );
                updateMappings(nextMappings);
              };
              const addMapping = () => {
                updateMappings([
                  ...mappings,
                  {
                    targetPath: "",
                    sourcePort: availablePorts[0] ?? "result",
                    sourcePath: "",
                  },
                ]);
              };
              const removeMapping = (index: number) => {
                if (mappings.length <= 1) return;
                updateMappings(mappings.filter((_, idx) => idx !== index));
              };
              const mapInputsToTargets = () => {
                const nextMappings: UpdaterMapping[] = [];
                availablePorts.forEach((port) => {
                  if (port === databaseConfig.idField) return;
                  if (port === "bundle") {
                    if (bundleKeys.size === 0) return;
                    Array.from(bundleKeys).forEach((key) => {
                      nextMappings.push({
                        targetPath: key,
                        sourcePort: "bundle",
                        sourcePath: key,
                      });
                    });
                    return;
                  }
                  nextMappings.push({
                    targetPath: findMatchingTargetPath(port),
                    sourcePort: port,
                  });
                });
                if (nextMappings.length > 0) {
                  updateMappings(nextMappings);
                }
              };
              const handleOperationChange = (value: string) =>
                updateSelectedNodeConfig({
                  database: {
                    ...databaseConfig,
                    operation: value as DatabaseOperation,
                    query: databaseConfig.query ?? defaultQuery,
                    mappings,
                    writeSource: databaseConfig.writeSource ?? "bundle",
                    entityType: databaseConfig.entityType ?? "product",
                    idField: databaseConfig.idField ?? "entityId",
                    mode: databaseConfig.mode ?? "replace",
                  },
                });
              const writeSource = databaseConfig.writeSource ?? "bundle";
              const collectionOption = DB_COLLECTION_OPTIONS.some(
                (option) => option.value === queryConfig.collection
              )
                ? queryConfig.collection
                : "custom";
              const runtimeInputs = runtimeState.inputs[selectedNode.id] ?? {};
              const runtimeValue =
                coerceInput(runtimeInputs.value) ??
                coerceInput(runtimeInputs.entityId) ??
                coerceInput(runtimeInputs.productId);
              const queryPreview = (() => {
                if (queryConfig.mode === "preset") {
                  const presetValue = runtimeValue ?? "";
                  const presetField =
                    queryConfig.preset === "by_field"
                      ? queryConfig.field || "id"
                      : queryConfig.preset === "by_productId"
                        ? "productId"
                        : queryConfig.preset === "by_entityId"
                          ? "entityId"
                          : "_id";
                  return { [presetField]: presetValue };
                }
                if (
                  runtimeInputs.query &&
                  typeof runtimeInputs.query === "object" &&
                  !Array.isArray(runtimeInputs.query)
                ) {
                  return runtimeInputs.query as Record<string, unknown>;
                }
                const rendered = renderTemplate(
                  queryConfig.queryTemplate ?? "{}",
                  runtimeInputs as Record<string, unknown>,
                  runtimeValue ?? ""
                );
                const parsed = safeParseJson(rendered);
                if (parsed.value && typeof parsed.value === "object") {
                  return parsed.value as Record<string, unknown>;
                }
                return { __raw: rendered };
              })();
              const queryPreviewText = (() => {
                try {
                  return JSON.stringify(queryPreview, null, 2);
                } catch {
                  return String(queryPreview);
                }
              })();
              const placeholderChips = [
                "{{value}}",
                "{{entityId}}",
                "{{productId}}",
                "{{context.entityId}}",
                "{{bundle.key}}",
                "{{meta.pathId}}",
              ];
              const templateSnippets = [
                {
                  label: "By _id",
                  value: "{\n  \"_id\": \"{{value}}\"\n}",
                },
                {
                  label: "By productId",
                  value: "{\n  \"productId\": \"{{value}}\"\n}",
                },
                {
                  label: "By SKU",
                  value: "{\n  \"sku\": \"{{value}}\"\n}",
                },
                {
                  label: "Name contains",
                  value:
                    "{\n  \"name\": { \"$regex\": \"{{value}}\", \"$options\": \"i\" }\n}",
                },
                {
                  label: "Created after",
                  value: "{\n  \"createdAt\": { \"$gte\": \"{{value}}\" }\n}",
                },
              ];
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Operation</Label>
                    <Select value={operation} onValueChange={handleOperationChange}>
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select operation" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="query">Query</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="insert">Insert (POST)</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
                    <span>Dry run</span>
                    <Button
                      type="button"
                      className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                        databaseConfig.dryRun
                          ? "text-emerald-200 hover:bg-emerald-500/10"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() =>
                        updateSelectedNodeConfig({
                          database: {
                            ...databaseConfig,
                            dryRun: !databaseConfig.dryRun,
                          },
                        })
                      }
                    >
                      {databaseConfig.dryRun ? "Enabled" : "Disabled"}
                    </Button>
                  </div>

                  {operation === "query" && (
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-gray-400">Provider</Label>
                          <Select
                            value={queryConfig.provider}
                            onValueChange={(value) =>
                              updateSelectedNodeConfig({
                                database: {
                                  ...databaseConfig,
                                  query: {
                                    ...queryConfig,
                                    provider: value as DbQueryConfig["provider"],
                                  },
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
                            onValueChange={(value) => {
                              updateSelectedNodeConfig({
                                database: {
                                  ...databaseConfig,
                                  query: {
                                    ...queryConfig,
                                    collection:
                                      value === "custom" ? queryConfig.collection : value,
                                  },
                                },
                              });
                            }}
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
                            </SelectContent>
                          </Select>
                          {collectionOption === "custom" && (
                            <Input
                              className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                              value={queryConfig.collection}
                              onChange={(event) =>
                                updateSelectedNodeConfig({
                                  database: {
                                    ...databaseConfig,
                                    query: { ...queryConfig, collection: event.target.value },
                                  },
                                })
                              }
                              placeholder="collection_name"
                            />
                          )}
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-gray-400">Mode</Label>
                          <Select
                            value={queryConfig.mode}
                            onValueChange={(value) =>
                              updateSelectedNodeConfig({
                                database: {
                                  ...databaseConfig,
                                  query: {
                                    ...queryConfig,
                                    mode: value as DbQueryConfig["mode"],
                                  },
                                },
                              })
                            }
                          >
                            <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              <SelectItem value="preset">Preset</SelectItem>
                              <SelectItem value="custom">Custom JSON</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400">Limit</Label>
                          <Input
                            type="number"
                            step="1"
                            className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={queryConfig.limit}
                            onChange={(event) =>
                              updateSelectedNodeConfig({
                                database: {
                                  ...databaseConfig,
                                  query: {
                                    ...queryConfig,
                                    limit: toNumber(event.target.value, queryConfig.limit),
                                  },
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                      {queryConfig.mode === "preset" && (
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label className="text-xs text-gray-400">Preset</Label>
                              <Select
                                value={queryConfig.preset}
                                onValueChange={(value) =>
                                  updateSelectedNodeConfig({
                                    database: {
                                      ...databaseConfig,
                                      query: {
                                        ...queryConfig,
                                        preset: value as DbQueryConfig["preset"],
                                      },
                                    },
                                  })
                                }
                              >
                                <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                                  <SelectValue placeholder="Select preset" />
                                </SelectTrigger>
                                <SelectContent className="border-gray-800 bg-gray-900">
                                  <SelectItem value="by_id">By ID (_id)</SelectItem>
                                  <SelectItem value="by_productId">By productId</SelectItem>
                                  <SelectItem value="by_entityId">By entityId</SelectItem>
                                  <SelectItem value="by_field">By custom field</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-400">ID Type</Label>
                              <Select
                                value={queryConfig.idType}
                                onValueChange={(value) =>
                                  updateSelectedNodeConfig({
                                    database: {
                                      ...databaseConfig,
                                      query: {
                                        ...queryConfig,
                                        idType: value as DbQueryConfig["idType"],
                                      },
                                    },
                                  })
                                }
                              >
                                <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                                  <SelectValue placeholder="Select id type" />
                                </SelectTrigger>
                                <SelectContent className="border-gray-800 bg-gray-900">
                                  <SelectItem value="string">String</SelectItem>
                                  <SelectItem value="objectId">ObjectId</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {queryConfig.preset === "by_field" && (
                            <div>
                              <Label className="text-xs text-gray-400">Field</Label>
                              <Input
                                className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                                value={queryConfig.field}
                                onChange={(event) =>
                                  updateSelectedNodeConfig({
                                    database: {
                                      ...databaseConfig,
                                      query: { ...queryConfig, field: event.target.value },
                                    },
                                  })
                                }
                                placeholder="fieldName"
                              />
                            </div>
                          )}
                        </div>
                      )}
                      {queryConfig.mode === "custom" && (
                        <div>
                          <Label className="text-xs text-gray-400">Query Template</Label>
                          <Textarea
                            className="mt-2 min-h-[140px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={queryConfig.queryTemplate}
                            onChange={(event) =>
                              updateSelectedNodeConfig({
                                database: {
                                  ...databaseConfig,
                                  query: {
                                    ...queryConfig,
                                    queryTemplate: event.target.value,
                                  },
                                },
                              })
                            }
                          />
                          <div className="mt-2 flex flex-wrap gap-2">
                            {placeholderChips.map((chip) => (
                              <Button
                                key={chip}
                                type="button"
                                className="rounded-md border border-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-900/80"
                                onClick={() =>
                                  updateSelectedNodeConfig({
                                    database: {
                                      ...databaseConfig,
                                      query: {
                                        ...queryConfig,
                                        queryTemplate: `${queryConfig.queryTemplate ?? ""}${chip}`,
                                      },
                                    },
                                  })
                                }
                              >
                                {chip}
                              </Button>
                            ))}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {templateSnippets.map((snippet) => (
                              <Button
                                key={snippet.label}
                                type="button"
                                className="rounded-md border border-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-900/80"
                                onClick={() =>
                                  updateSelectedNodeConfig({
                                    database: {
                                      ...databaseConfig,
                                      query: { ...queryConfig, queryTemplate: snippet.value },
                                    },
                                  })
                                }
                              >
                                {snippet.label}
                              </Button>
                            ))}
                          </div>
                          <p className="mt-2 text-[11px] text-gray-500">
                            Use placeholders like <span className="text-gray-300">{`{{value}}`}</span>{" "}
                            or <span className="text-gray-300">{`{{entityId}}`}</span>.
                          </p>
                        </div>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-gray-400">Sort (JSON)</Label>
                          <Textarea
                            className="mt-2 min-h-[80px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={queryConfig.sort}
                            onChange={(event) =>
                              updateSelectedNodeConfig({
                                database: {
                                  ...databaseConfig,
                                  query: { ...queryConfig, sort: event.target.value },
                                },
                              })
                            }
                          />
                          <p className="mt-2 text-[11px] text-gray-500">
                            Example: <span className="text-gray-300">{`{ "createdAt": -1 }`}</span>
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400">Projection (JSON)</Label>
                          <Textarea
                            className="mt-2 min-h-[80px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={queryConfig.projection}
                            onChange={(event) =>
                              updateSelectedNodeConfig({
                                database: {
                                  ...databaseConfig,
                                  query: { ...queryConfig, projection: event.target.value },
                                },
                              })
                            }
                          />
                          <p className="mt-2 text-[11px] text-gray-500">
                            Example:{" "}
                            <span className="text-gray-300">{`{ "title": 1, "price": 1 }`}</span>
                          </p>
                        </div>
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
                            updateSelectedNodeConfig({
                              database: {
                                ...databaseConfig,
                                query: { ...queryConfig, single: !queryConfig.single },
                              },
                            })
                          }
                        >
                          {queryConfig.single ? "Enabled" : "Disabled"}
                        </Button>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Collections are allowlisted on the server for safety.
                      </p>
                    </div>
                  )}

                  {operation === "update" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-gray-400">Entity Type</Label>
                        <Select
                          value={databaseConfig.entityType ?? "product"}
                          onValueChange={(value) =>
                            updateSelectedNodeConfig({
                              database: { ...databaseConfig, entityType: value },
                            })
                          }
                        >
                          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                            <SelectValue placeholder="Entity type" />
                          </SelectTrigger>
                          <SelectContent className="border-gray-800 bg-gray-900">
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="note">Note</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">ID Field</Label>
                        <Select
                          value={databaseConfig.idField ?? "entityId"}
                          onValueChange={(value) =>
                            updateSelectedNodeConfig({
                              database: { ...databaseConfig, idField: value },
                            })
                          }
                        >
                          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                            <SelectValue placeholder="Select ID input" />
                          </SelectTrigger>
                          <SelectContent className="border-gray-800 bg-gray-900">
                            {availablePorts.map((port) => (
                              <SelectItem key={port} value={port}>
                                {formatPortLabel(port)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">Write Mode</Label>
                        <Select
                          value={databaseConfig.mode}
                          onValueChange={(value) =>
                            updateSelectedNodeConfig({
                              database: {
                                ...databaseConfig,
                                mode: value as "replace" | "append",
                              },
                            })
                          }
                        >
                          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                          <SelectContent className="border-gray-800 bg-gray-900">
                            <SelectItem value="replace">Replace</SelectItem>
                            <SelectItem value="append">Append</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs text-gray-400">Sample JSON</Label>
                        <div className="mt-2 grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-center">
                          <Select
                            value={sampleState.entityType}
                            onValueChange={(value) =>
                              setUpdaterSamples((prev) => ({
                                ...prev,
                                [selectedNode.id]: {
                                  ...sampleState,
                                  entityType: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="border-gray-800 bg-gray-950/70 text-sm text-white">
                              <SelectValue placeholder="Entity type" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              <SelectItem value="product">Product</SelectItem>
                              <SelectItem value="note">Note</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            className="w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={sampleState.entityId}
                            onChange={(event) =>
                              setUpdaterSamples((prev) => ({
                                ...prev,
                                [selectedNode.id]: {
                                  ...sampleState,
                                  entityId: event.target.value,
                                },
                              }))
                            }
                            placeholder="Entity ID"
                          />
                          <Button
                            type="button"
                            className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                            disabled={updaterSampleLoading}
                            onClick={() =>
                              void handleFetchUpdaterSample(
                                selectedNode.id,
                                sampleState.entityType,
                                sampleState.entityId
                              )
                            }
                          >
                            {updaterSampleLoading ? "Loading..." : "Fetch sample"}
                          </Button>
                        </div>
                        <Textarea
                          className="mt-2 min-h-[120px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                          value={sampleState.json}
                          onChange={(event) =>
                            setUpdaterSamples((prev) => ({
                              ...prev,
                              [selectedNode.id]: {
                                ...sampleState,
                                json: event.target.value,
                              },
                            }))
                          }
                          placeholder='{ "id": "123", "title": "Sample" }'
                        />
                        {parsedSample.error ? (
                          <p className="mt-2 text-[11px] text-rose-300">
                            {parsedSample.error}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Select
                            value={String(sampleState.depth)}
                            onValueChange={(value) =>
                              setUpdaterSamples((prev) => ({
                                ...prev,
                                [selectedNode.id]: {
                                  ...sampleState,
                                  depth: Number(value),
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-[150px] border-gray-800 bg-gray-950/70 text-sm text-white">
                              <SelectValue placeholder="Depth" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              {[1, 2, 3, 4].map((depth) => (
                                <SelectItem key={depth} value={String(depth)}>
                                  Depth {depth}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            className={`rounded-md border border-gray-700 px-3 text-[10px] ${
                              sampleState.includeContainers
                                ? "text-emerald-200 hover:bg-emerald-500/10"
                                : "text-gray-300 hover:bg-gray-900/80"
                            }`}
                            onClick={() =>
                              setUpdaterSamples((prev) => ({
                                ...prev,
                                [selectedNode.id]: {
                                  ...sampleState,
                                  includeContainers: !sampleState.includeContainers,
                                },
                              }))
                            }
                          >
                            {sampleState.includeContainers ? "Containers: On" : "Containers: Off"}
                          </Button>
                        </div>
                      </div>

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

                      <div className="space-y-3">
                        {mappings.map((mapping, index) => {
                          const targetValue = mapping.targetPath ?? "";
                          return (
                            <div
                              key={`${mapping.targetPath}-${index}`}
                              className="grid gap-2 sm:grid-cols-[1fr_140px_auto] sm:items-start"
                            >
                              <div className="space-y-2">
                                <Input
                                  className="w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                                  value={targetValue}
                                  onChange={(event) =>
                                    updateMapping(index, {
                                      targetPath: event.target.value,
                                    })
                                  }
                                  placeholder="Target field path"
                                />
                                <Select
                                  onValueChange={(value) =>
                                    updateMapping(index, { targetPath: value })
                                  }
                                >
                                  <SelectTrigger className="border-gray-800 bg-gray-950/70 text-[10px] text-gray-200">
                                    <SelectValue placeholder="Pick target field" />
                                  </SelectTrigger>
                                  <SelectContent className="border-gray-800 bg-gray-900">
                                    {uniqueTargetPathOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Select
                                  value={mapping.sourcePort}
                                  onValueChange={(value) =>
                                    updateMapping(index, { sourcePort: value })
                                  }
                                >
                                  <SelectTrigger className="border-gray-800 bg-gray-950/70 text-[10px] text-gray-200">
                                    <SelectValue placeholder="Input" />
                                  </SelectTrigger>
                                  <SelectContent className="border-gray-800 bg-gray-900">
                                    {availablePorts.map((port) => (
                                      <SelectItem key={port} value={port}>
                                        {formatPortLabel(port)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {mapping.sourcePort === "bundle" && (
                                  <>
                                    <Input
                                      className="w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                                      value={mapping.sourcePath ?? ""}
                                      onChange={(event) =>
                                        updateMapping(index, {
                                          sourcePath: event.target.value,
                                        })
                                      }
                                      placeholder="Bundle path"
                                    />
                                    <Select
                                      onValueChange={(value) =>
                                        updateMapping(index, { sourcePath: value })
                                      }
                                    >
                                      <SelectTrigger className="border-gray-800 bg-gray-950/70 text-[10px] text-gray-200">
                                        <SelectValue placeholder="Pick bundle key" />
                                      </SelectTrigger>
                                      <SelectContent className="border-gray-800 bg-gray-900">
                                        {Array.from(bundleKeys).map((key) => (
                                          <SelectItem key={key} value={key}>
                                            {formatPortLabel(key)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </>
                                )}
                              </div>
                              <Button
                                type="button"
                                className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                                disabled={mappings.length <= 1}
                                onClick={() => removeMapping(index)}
                              >
                                Remove
                              </Button>
                            </div>
                          );
                        })}
                      </div>

                      <Button
                        type="button"
                        className="w-full rounded-md border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                        onClick={addMapping}
                      >
                        Add mapping
                      </Button>
                    </div>
                  )}

                  {operation === "insert" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-gray-400">Entity Type</Label>
                        <Select
                          value={databaseConfig.entityType ?? "product"}
                          onValueChange={(value) =>
                            updateSelectedNodeConfig({
                              database: { ...databaseConfig, entityType: value },
                            })
                          }
                        >
                          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                            <SelectValue placeholder="Entity type" />
                          </SelectTrigger>
                          <SelectContent className="border-gray-800 bg-gray-900">
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="note">Note</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">Payload Source</Label>
                        <Select
                          value={writeSource}
                          onValueChange={(value) =>
                            updateSelectedNodeConfig({
                              database: { ...databaseConfig, writeSource: value },
                            })
                          }
                        >
                          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                            <SelectValue placeholder="Select payload input" />
                          </SelectTrigger>
                          <SelectContent className="border-gray-800 bg-gray-900">
                            {availablePorts.map((port) => (
                              <SelectItem key={port} value={port}>
                                {formatPortLabel(port)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-2 text-[11px] text-gray-500">
                          The selected input should contain a JSON object. Bundle is recommended.
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">Payload Path (optional)</Label>
                        <Input
                          className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                          value={databaseConfig.writeSourcePath ?? ""}
                          onChange={(event) =>
                            updateSelectedNodeConfig({
                              database: {
                                ...databaseConfig,
                                writeSourcePath: event.target.value,
                              },
                            })
                          }
                          placeholder="payload.subset"
                        />
                        {writeSource === "bundle" && bundleKeys.size > 0 && (
                          <Select
                            value={databaseConfig.writeSourcePath || undefined}
                            onValueChange={(value) =>
                              updateSelectedNodeConfig({
                                database: {
                                  ...databaseConfig,
                                  writeSourcePath: value,
                                },
                              })
                            }
                          >
                            <SelectTrigger className="mt-2 border-gray-800 bg-gray-950/70 text-[10px] text-gray-200">
                              <SelectValue placeholder="Pick bundle key" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              {Array.from(bundleKeys).map((key) => (
                                <SelectItem key={key} value={key}>
                                  {formatPortLabel(key)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <p className="mt-2 text-[11px] text-gray-500">
                          Optional path inside the payload to use as the request body.
                        </p>
                      </div>
                    </div>
                  )}

                  {operation === "delete" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-gray-400">Entity Type</Label>
                        <Select
                          value={databaseConfig.entityType ?? "product"}
                          onValueChange={(value) =>
                            updateSelectedNodeConfig({
                              database: { ...databaseConfig, entityType: value },
                            })
                          }
                        >
                          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                            <SelectValue placeholder="Entity type" />
                          </SelectTrigger>
                          <SelectContent className="border-gray-800 bg-gray-900">
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="note">Note</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">ID Field</Label>
                        <Select
                          value={databaseConfig.idField ?? "entityId"}
                          onValueChange={(value) =>
                            updateSelectedNodeConfig({
                              database: { ...databaseConfig, idField: value },
                            })
                          }
                        >
                          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                            <SelectValue placeholder="Select ID input" />
                          </SelectTrigger>
                          <SelectContent className="border-gray-800 bg-gray-900">
                            {availablePorts.map((port) => (
                              <SelectItem key={port} value={port}>
                                {formatPortLabel(port)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-2 text-[11px] text-gray-500">
                          The selected input will be used as the entity ID to delete.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
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

            {selectedNode.type === "context" && (() => {
              const contextConfig = selectedNode.config?.context ?? {
                role: DEFAULT_CONTEXT_ROLE,
                entityType: "product",
                entityIdSource: "simulation",
                entityId: "",
                scopeMode: "full",
                scopeTarget: "entity",
                includePaths: [],
                excludePaths: [],
              };
              const presetSet = getContextPresetSet(contextConfig.entityType);
              const receivedInputs = runtimeState.inputs[selectedNode.id] ?? {};
              const resolvedOutputs = runtimeState.outputs[selectedNode.id] ?? {};
              const largeFieldKeys = new Set([
                "images",
                "imageUrls",
                "entityJson",
                "entity",
                "bundle",
                "context",
                "meta",
                "trigger",
                "inputs",
                "outputs",
                "ui",
                "location",
                "user",
                "event",
                "extras",
              ]);
              const pruneLargeFields = (value: unknown, seen = new Set<object>()): unknown => {
                if (value === null || value === undefined) return value;
                if (typeof value !== "object") return value;
                if (seen.has(value)) return value;
                seen.add(value);
                if (Array.isArray(value)) {
                  return value.map((item) => pruneLargeFields(item, seen));
                }
                const record = value as Record<string, unknown>;
                const next: Record<string, unknown> = {};
                Object.entries(record).forEach(([key, entry]) => {
                  if (largeFieldKeys.has(key)) return;
                  next[key] = pruneLargeFields(entry, seen);
                });
                return next;
              };
              const sanitizePayload = (value: unknown) =>
                hideLargeFields ? pruneLargeFields(value) : value;
              const stringifyPayload = (value: unknown) => {
                if (value === undefined) return "";
                if (typeof value === "string") return value;
                try {
                  return JSON.stringify(value, null, 2);
                } catch {
                  return safeStringify(value);
                }
              };
              const receivedContext = sanitizePayload(receivedInputs.context);
              const sanitizedInputs = sanitizePayload(receivedInputs) as Record<string, unknown>;
              const sanitizedOutputs = sanitizePayload(resolvedOutputs) as Record<string, unknown>;
              const receivedContextText = stringifyPayload(receivedContext);
              const receivedInputsText = stringifyPayload(sanitizedInputs);
              const resolvedOutputsText = stringifyPayload(sanitizedOutputs);
              const resolvedEntityId =
                typeof sanitizedOutputs?.entityId === "string"
                  ? (sanitizedOutputs.entityId as string)
                  : "";
              const resolvedEntityType =
                typeof sanitizedOutputs?.entityType === "string"
                  ? (sanitizedOutputs.entityType as string)
                  : "";
              const diffInputs = sanitizedInputs ?? {};
              const diffOutputs = sanitizedOutputs ?? {};
              const diffKeys = Array.from(
                new Set([
                  ...Object.keys(diffInputs ?? {}),
                  ...Object.keys(diffOutputs ?? {}),
                ])
              ).sort();
              const diff = diffKeys.reduce<{
                added: string[];
                removed: string[];
                changed: string[];
                same: string[];
              }>(
                (acc, key) => {
                  const inInput = key in diffInputs;
                  const inOutput = key in diffOutputs;
                  if (!inInput && inOutput) {
                    acc.added.push(key);
                    return acc;
                  }
                  if (inInput && !inOutput) {
                    acc.removed.push(key);
                    return acc;
                  }
                  const inputValue = diffInputs[key];
                  const outputValue = diffOutputs[key];
                  const inputString = stringifyPayload(inputValue);
                  const outputString = stringifyPayload(outputValue);
                  if (inputString !== outputString) {
                    acc.changed.push(key);
                  } else {
                    acc.same.push(key);
                  }
                  return acc;
                },
                { added: [], removed: [], changed: [], same: [] }
              );
              const diffLines = [
                ...diff.added.map(
                  (key) => `+ ${key}: ${formatRuntimeValue(diffOutputs[key])}`
                ),
                ...diff.removed.map(
                  (key) => `- ${key}: ${formatRuntimeValue(diffInputs[key])}`
                ),
                ...diff.changed.map(
                  (key) =>
                    `~ ${key}: ${formatRuntimeValue(diffInputs[key])} -> ${formatRuntimeValue(
                      diffOutputs[key]
                    )}`
                ),
                ...(!diffOnlyChanges
                  ? diff.same.map((key) => `= ${key}`)
                  : []),
              ];
              const copyPayload = async (payload: unknown, label: string) => {
                try {
                  await navigator.clipboard.writeText(stringifyPayload(payload));
                  toast(`${label} copied.`, { variant: "success" });
                } catch (error) {
                  toast("Failed to copy payload.", { variant: "error" });
                  console.warn("Failed to copy payload", error);
                }
              };
              const copyDiff = async () => {
                try {
                  await navigator.clipboard.writeText(diffLines.join("\n"));
                  toast("Diff copied.", { variant: "success" });
                } catch (error) {
                  toast("Failed to copy diff.", { variant: "error" });
                  console.warn("Failed to copy diff", error);
                }
              };
              const combinedPayload = {
                inputs: sanitizedInputs,
                outputs: sanitizedOutputs,
                diff: {
                  added: diff.added,
                  removed: diff.removed,
                  changed: diff.changed,
                  same: diff.same,
                },
              };
              return (
                <div className="space-y-4">
                  <p className="text-[11px] text-gray-500">
                    Connect Trigger <span className="text-gray-300">context</span> into this
                    node to filter it. If left unconnected, the filter will fetch an
                    entity based on the settings below.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-900/70"
                      onClick={() => copyPayload(combinedPayload, "Payload")}
                    >
                      Copy payload
                    </Button>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-900/70"
                      onClick={() => copyPayload(sanitizedInputs, "Inputs")}
                    >
                      Copy inputs
                    </Button>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-900/70"
                      onClick={() => copyPayload(sanitizedOutputs, "Outputs")}
                    >
                      Copy outputs
                    </Button>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-900/70"
                      onClick={copyDiff}
                    >
                      Copy diff
                    </Button>
                    <Button
                      type="button"
                      className={`rounded-md border px-2 py-1 text-[10px] ${
                        hideLargeFields
                          ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                          : "border-gray-700 text-gray-200 hover:bg-gray-900/70"
                      }`}
                      onClick={() => setHideLargeFields((prev) => !prev)}
                    >
                      {hideLargeFields ? "Hide large fields" : "Show large fields"}
                    </Button>
                    <Button
                      type="button"
                      className={`rounded-md border px-2 py-1 text-[10px] ${
                        showDiff
                          ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                          : "border-gray-700 text-gray-200 hover:bg-gray-900/70"
                      }`}
                      onClick={() => setShowDiff((prev) => !prev)}
                    >
                      {showDiff ? "Diff on" : "Diff off"}
                    </Button>
                    {showDiff && (
                      <Button
                        type="button"
                        className={`rounded-md border px-2 py-1 text-[10px] ${
                          diffOnlyChanges
                            ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                            : "border-gray-700 text-gray-200 hover:bg-gray-900/70"
                        }`}
                        onClick={() => setDiffOnlyChanges((prev) => !prev)}
                      >
                        {diffOnlyChanges ? "Changes only" : "Show all"}
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border border-gray-800 bg-gray-900/60 p-3">
                      <div className="text-[11px] text-gray-400">Resolved Entity</div>
                      <div className="mt-2 text-[12px] text-gray-200">
                        {resolvedEntityId
                          ? `${resolvedEntityType || "entity"} · ${resolvedEntityId}`
                          : "No entity resolved yet"}
                      </div>
                    </div>
                    <div className="rounded-md border border-gray-800 bg-gray-900/60 p-3">
                      <div className="text-[11px] text-gray-400">Received context summary</div>
                      <div className="mt-2 text-[12px] text-gray-200">
                        {receivedContextText
                          ? `${receivedContextText.length} chars`
                          : "No context input received"}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-md border border-gray-800 bg-gray-900/60 p-3">
                    <div className="text-[11px] text-gray-400">Received payload (context input)</div>
                    {receivedContextText ? (
                      <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-[11px] text-gray-200">
                        {receivedContextText}
                      </pre>
                    ) : (
                      <p className="mt-2 text-[11px] text-gray-500">
                        No context payload received yet. Fire the trigger or connect a
                        context input to inspect the payload.
                      </p>
                    )}
                  </div>
                  <div className="rounded-md border border-gray-800 bg-gray-900/60 p-3">
                    <div className="text-[11px] text-gray-400">All incoming inputs</div>
                    {Object.keys(receivedInputs).length > 0 ? (
                      <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-[11px] text-gray-200">
                        {receivedInputsText}
                      </pre>
                    ) : (
                      <p className="mt-2 text-[11px] text-gray-500">
                        No inputs recorded yet for this node.
                      </p>
                    )}
                  </div>
                  <div className="rounded-md border border-gray-800 bg-gray-900/60 p-3">
                    <div className="text-[11px] text-gray-400">Resolved outputs</div>
                    {Object.keys(resolvedOutputs).length > 0 ? (
                      <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-[11px] text-gray-200">
                        {resolvedOutputsText}
                      </pre>
                    ) : (
                      <p className="mt-2 text-[11px] text-gray-500">
                        No resolved outputs yet. Trigger the path to populate this panel.
                      </p>
                    )}
                  </div>
                  {showDiff && (
                    <div className="rounded-md border border-gray-800 bg-gray-900/60 p-3">
                      <div className="text-[11px] text-gray-400">
                        Diff (inputs vs outputs)
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-300">
                        <span>Added: {diff.added.length}</span>
                        <span>Removed: {diff.removed.length}</span>
                        <span>Changed: {diff.changed.length}</span>
                        <span>Unchanged: {diff.same.length}</span>
                      </div>
                      {diffLines.length > 0 ? (
                        <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-[11px] text-gray-200">
                          {diffLines.join("\n")}
                        </pre>
                      ) : (
                        <p className="mt-2 text-[11px] text-gray-500">
                          No differences detected yet.
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-gray-400">Filter Role</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={contextConfig.role}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          context: { ...contextConfig, role: event.target.value },
                        })
                      }
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Optional label attached to the filtered context output.
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Context Scope Presets</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(["light", "medium", "full"] as const).map((preset) => (
                        <Button
                          key={preset}
                          type="button"
                          className="rounded-md border border-gray-700 px-3 py-1 text-[10px] text-gray-200 hover:bg-gray-900/80"
                          onClick={() =>
                            updateSelectedNodeConfig({
                              context: applyContextPreset(contextConfig, preset),
                            })
                          }
                        >
                          {preset.toUpperCase()}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        className="rounded-md border border-gray-700 px-3 py-1 text-[10px] text-gray-200 hover:bg-gray-900/80"
                        onClick={() =>
                          updateSelectedNodeConfig({
                            context: {
                              ...contextConfig,
                              scopeMode: "full",
                              includePaths: [],
                              excludePaths: [],
                            },
                          })
                        }
                      >
                        RESET
                      </Button>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-500">
                      Presets adjust scope to include curated fields for the selected entity (or a generic set when auto).
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-gray-400">Entity Type</Label>
                    <Select
                        value={contextConfig.entityType ?? "auto"}
                        onValueChange={(value) =>
                          updateSelectedNodeConfig({
                            context: { ...contextConfig, entityType: value },
                          })
                        }
                      >
                        <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Select entity" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          <SelectItem value="auto">Auto (use trigger)</SelectItem>
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="chat">Chat</SelectItem>
                          <SelectItem value="log">Log Entry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Scope Target</Label>
                      <Select
                        value={contextConfig.scopeTarget ?? "entity"}
                        onValueChange={(value) =>
                          updateSelectedNodeConfig({
                            context: {
                              ...contextConfig,
                              scopeTarget: value as "entity" | "context",
                            },
                          })
                        }
                      >
                        <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Select target" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          <SelectItem value="entity">Entity only</SelectItem>
                          <SelectItem value="context">Full context</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="mt-2 text-[11px] text-gray-500">
                        Choose whether scope filters apply to the entity payload or the
                        full context object.
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Entity ID Source</Label>
                      <Select
                        value={contextConfig.entityIdSource ?? "simulation"}
                        onValueChange={(value) =>
                          updateSelectedNodeConfig({
                            context: {
                              ...contextConfig,
                              entityIdSource: value as "simulation" | "manual" | "context",
                            },
                          })
                        }
                      >
                        <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          <SelectItem value="simulation">Simulation node</SelectItem>
                          <SelectItem value="context">Context payload</SelectItem>
                          <SelectItem value="manual">Manual ID</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Target Fields</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {presetSet.suggested.map((field) => {
                        const active = contextConfig.includePaths?.includes(field);
                        return (
                          <button
                            key={field}
                            type="button"
                            onClick={() =>
                              updateSelectedNodeConfig({
                                context: toggleContextTarget(contextConfig, field),
                              })
                            }
                            className={`rounded-full border px-2 py-1 text-[10px] transition ${
                              active
                                ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                                : "border-gray-700 text-gray-300 hover:bg-gray-900/70"
                            }`}
                          >
                            {field}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedNodeConfig({
                            context: {
                              ...contextConfig,
                              scopeMode: "include",
                              includePaths: [],
                              excludePaths: [],
                            },
                          })
                        }
                        className="rounded-full border border-gray-700 px-2 py-1 text-[10px] text-gray-300 hover:bg-gray-900/70"
                      >
                        Clear
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-500">
                      Click to toggle fields. This switches scope to include mode.
                    </p>
                  </div>
                  {contextConfig.entityIdSource === "manual" && (
                    <div>
                      <Label className="text-xs text-gray-400">Entity ID</Label>
                      <Input
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={contextConfig.entityId ?? ""}
                        onChange={(event) =>
                          updateSelectedNodeConfig({
                            context: { ...contextConfig, entityId: event.target.value },
                          })
                        }
                      />
                    </div>
                  )}
                    <div>
                      <Label className="text-xs text-gray-400">Data Scope</Label>
                      <Select
                        value={contextConfig.scopeMode ?? "full"}
                        onValueChange={(value) =>
                          updateSelectedNodeConfig({
                            context: {
                              ...contextConfig,
                              scopeMode: value as "full" | "include" | "exclude",
                            },
                          })
                        }
                      >

                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select scope" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="full">Full entity payload</SelectItem>
                        <SelectItem value="include">Include only listed paths</SelectItem>
                        <SelectItem value="exclude">Exclude listed paths</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-[11px] text-gray-500">
                      Use dot paths (e.g. <span className="text-gray-300">priceGroups.default</span>).
                    </p>
                  </div>
                  {(contextConfig.scopeMode === "include" ||
                    contextConfig.scopeMode === "exclude") && (
                    <div>
                      <Label className="text-xs text-gray-400">
                        {contextConfig.scopeMode === "include"
                          ? "Include paths (one per line)"
                          : "Exclude paths (one per line)"}
                      </Label>
                      <Textarea
                        className="mt-2 min-h-[120px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={
                          contextConfig.scopeMode === "include"
                            ? (contextConfig.includePaths ?? []).join("\n")
                            : (contextConfig.excludePaths ?? []).join("\n")
                        }
                        onChange={(event) => {
                          const list = parsePathList(event.target.value);
                          updateSelectedNodeConfig({
                            context: {
                              ...contextConfig,
                              includePaths:
                                contextConfig.scopeMode === "include"
                                  ? list
                                  : contextConfig.includePaths ?? [],
                              excludePaths:
                                contextConfig.scopeMode === "exclude"
                                  ? list
                                  : contextConfig.excludePaths ?? [],
                            },
                          });
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })()}

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
                    if (Array.isArray(current)) return [...current, value];
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

            {selectedNode.type !== "parser" &&
              selectedNode.type !== "model" &&
              selectedNode.type !== "database" &&
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
              
  );
}
