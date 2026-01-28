"use client";

import { Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";
import React from "react";





import type {
  AiNode,
  NodeConfig,
  ParserConfig,
  ParserSampleState,
  RuntimeState,
} from "@/features/ai-paths/lib";
import {
  PARSER_PATH_OPTIONS,
  PARSER_PRESETS,
  buildFlattenedMappings,
  buildTopLevelMappings,
  createParserMappings,
  extractJsonPathEntries,
  inferImageMappingPath,
  safeParseJson,
} from "@/features/ai-paths/lib";

type ParserNodeConfigSectionProps = {
  selectedNode: AiNode;
  nodes: AiNode[];
  runtimeState: RuntimeState;
  parserSamples: Record<string, ParserSampleState>;
  setParserSamples: React.Dispatch<React.SetStateAction<Record<string, ParserSampleState>>>;
  parserSampleLoading: boolean;
  updateSelectedNode: (patch: Partial<AiNode>) => void;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  handleFetchParserSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  toast: (message: string, options?: { variant?: "success" | "error" }) => void;
};

export function ParserNodeConfigSection({
  selectedNode,
  nodes,
  runtimeState,
  parserSamples,
  setParserSamples,
  parserSampleLoading,
  updateSelectedNode,
  updateSelectedNodeConfig: _updateSelectedNodeConfig,
  handleFetchParserSample,
  toast,
}: ParserNodeConfigSectionProps) {
  const [parserDraftMappings, setParserDraftMappings] = React.useState<Record<string, string>>({});
  const [parserDraftNodeId, setParserDraftNodeId] = React.useState<string | null>(null);
  const parserDraftTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (selectedNode.type !== "parser") return;
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
  }, [
    selectedNode.id,
    selectedNode.type,
    selectedNode.config?.parser?.mappings,
    selectedNode.outputs,
  ]);

  if (selectedNode.type !== "parser") return null;

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
    (nextEntries).forEach(([key, path]) => {
      if (!key || !key.trim()) return;
      nextMappings[key.trim()] = path;
    });
    commitMappingsDebounced(nextMappings);
  };
  const updateMappingPath = (index: number, value: string) => {
    const nextEntries = entries.map((entry, idx) =>
      idx === index ? [entry[0], value] : entry
    );
    const nextMappings: Record<string, string> = {};
    (nextEntries as [string, string][]).forEach(([key, path]) => {
      if (!key || !key.trim()) return;
      nextMappings[key.trim()] = path;
    });
    commitMappingsDebounced(nextMappings);
  };
  const removeMapping = (index: number) => {
    if (entries.length <= 1) return;
    const nextEntries = entries.filter((_, idx) => idx !== index);
    const nextMappings: Record<string, string> = {};
    (nextEntries).forEach(([key, path]) => {
      if (!key || !key.trim()) return;
      nextMappings[key.trim()] = path;
    });
    commitMappingsImmediate(nextMappings);
  };
  const applyPreset = (mode: "replace" | "merge") => {
    if (!activePreset || activePreset.id === "custom") return;
    if (mode === "replace") {
      commitMappingsImmediate(
        activePreset.mappings as Record<string, string>,
        outputMode,
        activePreset.id
      );
      return;
    }
    const merged: Record<string, string> = { ...draftMappings };
    Object.entries(activePreset.mappings as Record<string, string>).forEach(([key, value]) => {
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
      (nextEntries as [string, string][]).forEach(([key, path]) => {
        if (!key || !key.trim()) return;
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
      <div className="rounded-md border border-border bg-card/60 px-3 py-2 text-[11px] text-gray-300">
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
          <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
            <SelectValue placeholder="Select preset" />
          </SelectTrigger>
          <SelectContent className="border-border bg-gray-900">
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
            className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60"
            onClick={() => applyPreset("replace")}
          >
            Replace mappings
          </Button>
          <Button
            type="button"
            className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60"
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
            <SelectTrigger className="border-border bg-card/70 text-sm text-white">
              <SelectValue placeholder="Entity type" />
            </SelectTrigger>
            <SelectContent className="border-border bg-gray-900">
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="note">Note</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <div className="space-y-2">
            <Input
              className="w-full rounded-md border border-border bg-card/70 text-sm text-white"
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
                <SelectTrigger className="border-border bg-card/70 text-[10px] text-gray-200">
                  <SelectValue placeholder="Use simulation ID" />
                </SelectTrigger>
                <SelectContent className="border-border bg-gray-900">
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
            className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60"
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
          className="mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
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
            <SelectTrigger className="w-[180px] border-border bg-card/70 text-sm text-white">
              <SelectValue placeholder="Mapping mode" />
            </SelectTrigger>
            <SelectContent className="border-border bg-gray-900">
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
            <SelectTrigger className="w-[160px] border-border bg-card/70 text-sm text-white">
              <SelectValue placeholder="Depth" />
            </SelectTrigger>
            <SelectContent className="border-border bg-gray-900">
              {[1, 2, 3, 4].map((depth) => (
                <SelectItem key={depth} value={String(depth)}>
                  Depth {depth}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            className={`rounded-md border px-3 text-[10px] ${
              sampleState.includeContainers
                ? "text-emerald-200 hover:bg-emerald-500/10"
                : "text-gray-300 hover:bg-muted/60"
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
              <SelectTrigger className="w-[170px] border-border bg-card/70 text-sm text-white">
                <SelectValue placeholder="Key style" />
              </SelectTrigger>
              <SelectContent className="border-border bg-gray-900">
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
                className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60"
                onClick={() => applySampleMappings("replace")}
              >
                Auto-map from sample
              </Button>
              <Button
                type="button"
                className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60"
                onClick={() => applySampleMappings("merge")}
              >
                Add missing from sample
              </Button>
            </>
          )}
          <Button
            type="button"
            className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60"
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
          <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
            <SelectValue placeholder="Select output mode" />
          </SelectTrigger>
          <SelectContent className="border-border bg-gray-900">
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
          className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60"
          onClick={() => addMapping("title", "$.title")}
        >
          Add title
        </Button>
        <Button
          type="button"
          className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60"
          onClick={() => addMapping("images", "$.images")}
        >
          Add images
        </Button>
        <Button
          type="button"
          className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60"
          onClick={() => addMapping("productId", "$.id")}
        >
          Add id
        </Button>
        <Button
          type="button"
          className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60"
          onClick={() => addMapping("sku", "$.sku")}
        >
          Add sku
        </Button>
        <Button
          type="button"
          className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60"
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
              className="w-full rounded-md border border-border bg-card/70 text-sm text-white"
              value={key}
              onChange={(event) =>
                updateMappingKey(index, event.target.value)
              }
              placeholder="output key"
            />
            <div className="space-y-2">
              <Input
                className="w-full rounded-md border border-border bg-card/70 text-sm text-white"
                value={path}
                onChange={(event) =>
                  updateMappingPath(index, event.target.value)
                }
                placeholder="$.path.to.value"
              />
              <Select onValueChange={(value) => updateMappingPath(index, value)}>
                <SelectTrigger className="border-border bg-card/70 text-[10px] text-gray-200">
                  <SelectValue placeholder="Pick a suggested path" />
                </SelectTrigger>
                <SelectContent className="border-border bg-gray-900">
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
              className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
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
          className="w-full rounded-md border text-xs text-white hover:bg-muted/60"
          onClick={() =>
            addMapping(`field_${entries.length + 1}`, "")
          }
        >
          Add mapping
        </Button>
        <Button
          type="button"
          className="w-full rounded-md border text-xs text-gray-200 hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="rounded-md border border-border bg-card/50 p-3 text-[11px] text-gray-400">
          <div className="text-gray-300">Image helpers</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60"
              onClick={() =>
                updateMappingPath(imageEntryIndex, "$.images")
              }
            >
              Use $.images
            </Button>
            <Button
              type="button"
              className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60"
              onClick={() =>
                updateMappingPath(imageEntryIndex, "$.imageLinks")
              }
            >
              Use $.imageLinks
            </Button>
            <Button
              type="button"
              className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60"
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
            
}
