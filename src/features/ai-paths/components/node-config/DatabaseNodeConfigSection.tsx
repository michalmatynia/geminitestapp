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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import type {
  AiNode,
  DatabaseConfig,
  DatabaseOperation,
  DbNodePreset,
  DbQueryConfig,
  DbQueryPreset,
  Edge,
  NodeConfig,
  RuntimeState,
  UpdaterMapping,
} from "@/features/ai-paths/lib";
import {
  DB_COLLECTION_OPTIONS,
  createPresetId,
  safeParseJson,
  toNumber,
} from "@/features/ai-paths/lib";
import { formatPortLabel } from "@/features/ai-paths/utils/ui-utils";
import {
  PROJECTION_PRESETS,
  SORT_PRESETS,
  TEMPLATE_SNIPPETS,
  buildPresetQueryTemplate,
} from "@/features/ai-paths/config/query-presets";

type QueryValidationResult = {
  status: "empty" | "valid" | "error";
  message: string;
  line?: number;
  column?: number;
  snippet?: string;
  hints?: string[];
};

const getQueryPlaceholderByOperation = (operation: string): string => {
  switch (operation) {
    case "query":
      return '{\n  "_id": "{{value}}"\n}';
    case "update":
      return '{\n  "$set": {\n    "fieldName": "{{value}}"\n  }\n}';
    case "insert":
      return '{\n  "fieldName": "value",\n  "createdAt": "{{timestamp}}"\n}';
    case "delete":
      return '{\n  "_id": "{{value}}"\n}';
    default:
      return '{\n  "_id": "{{value}}"\n}';
  }
};

const formatAndFixMongoQuery = (value: string): string => {
  let fixed = value ?? "";

  // Remove comments (single line // and multi-line /* */)
  fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');
  fixed = fixed.replace(/\/\/.*/g, '');

  // Fix single quotes to double quotes (but be careful with escaped quotes)
  fixed = fixed.replace(/'/g, '"');

  // Remove trailing commas before closing brackets
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

  // Replace undefined with null
  fixed = fixed.replace(/:\s*undefined\b/g, ': null');

  // Replace JavaScript boolean/null keywords if lowercase
  fixed = fixed.replace(/:\s*true\b/g, ': true');
  fixed = fixed.replace(/:\s*false\b/g, ': false');
  fixed = fixed.replace(/:\s*null\b/g, ': null');

  // Fix ObjectId(...) to string format
  fixed = fixed.replace(/ObjectId\s*\(\s*"([^"]+)"\s*\)/gi, '"$1"');
  fixed = fixed.replace(/ObjectId\s*\(\s*'([^']+)'\s*\)/gi, '"$1"');

  // Fix unquoted keys (basic pattern matching)
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

  // Fix Date objects
  fixed = fixed.replace(/new\s+Date\s*\(\s*"([^"]+)"\s*\)/gi, '"$1"');
  fixed = fixed.replace(/new\s+Date\s*\(\s*'([^']+)'\s*\)/gi, '"$1"');

  // Remove excess whitespace between tokens
  fixed = fixed.replace(/\s*:\s*/g, ': ');
  fixed = fixed.replace(/\s*,\s*/g, ', ');

  // Ensure the query starts with { or [
  fixed = fixed.trim();
  if (!fixed.startsWith("{") && !fixed.startsWith("[")) {
    // Try to wrap as object
    if (fixed.includes(":")) {
      fixed = `{\n  ${fixed}\n}`;
    }
  }

  // Try to parse and pretty-print
  try {
    const parsed = JSON.parse(fixed);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // If still invalid, return the partially fixed version with basic formatting
    try {
      // Try one more time with more aggressive fixes
      fixed = fixed.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
      const parsed = JSON.parse(fixed);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return fixed;
    }
  }
};

const buildMongoQueryValidation = (value: string): QueryValidationResult => {
  const raw = value ?? "";
  const trimmed = raw.trim();
  if (!trimmed) {
    return { status: "empty", message: "Query is empty." };
  }
  try {
    JSON.parse(raw);
    return { status: "valid", message: "Valid JSON query." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON query.";
    const match = message.match(/position\s+(?<pos>\d+)/i);
    let line: number | undefined;
    let column: number | undefined;
    let snippet: string | undefined;
    if (match?.groups?.pos) {
      const position = Number(match.groups.pos);
      if (!Number.isNaN(position)) {
        const clamped = Math.max(0, Math.min(raw.length, position));
        const before = raw.slice(0, clamped);
        const lines = before.split("\n");
        line = lines.length;
        const lastLine = lines[lines.length - 1] ?? "";
        column = lastLine.length + 1;
        const allLines = raw.split("\n");
        const lineText = allLines[line - 1] ?? "";
        const caret = `${" ".repeat(Math.max(0, column - 1))}^`;
        snippet = lineText ? `${lineText}\n${caret}` : caret;
      }
    }
    const hints: string[] = [];
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      hints.push("Start with a JSON object, e.g. { \"field\": \"value\" }.");
    }
    if (raw.includes("'")) {
      hints.push("Use double quotes for keys and string values.");
    }
    if (/\bObjectId\s*\(/.test(raw)) {
      hints.push("Wrap ObjectId values in quotes (strict JSON).");
    }
    if (/\bundefined\b/.test(raw)) {
      hints.push("Replace undefined with null or remove the field.");
    }
    if (/,\s*[}\]]/.test(raw)) {
      hints.push("Remove trailing commas.");
    }
    if (hints.length === 0) {
      hints.push("Ensure keys and string values are quoted with double quotes.");
    }
    const errorResult: QueryValidationResult = {
      status: "error",
      message,
      hints,
    };
    if (line !== undefined) errorResult.line = line;
    if (column !== undefined) errorResult.column = column;
    if (snippet !== undefined) errorResult.snippet = snippet;
    return errorResult;
  }
};

type DatabaseNodeConfigSectionProps = {
  selectedNode: AiNode;
  nodes: AiNode[];
  edges: Edge[];
  runtimeState: RuntimeState;
  updateSelectedNode: (patch: Partial<AiNode>) => void;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
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

type SchemaData = {
  provider: string;
  collections: Array<{
    name: string;
    fields: Array<{ name: string; type: string }>;
    relations?: string[];
  }>;
};

export function DatabaseNodeConfigSection({
  selectedNode,
  nodes,
  edges,
  runtimeState,
  updateSelectedNode,
  updateSelectedNodeConfig,
  onSendToAi,
  sendingToAi,
  dbQueryPresets,
  setDbQueryPresets,
  saveDbQueryPresets,
  dbNodePresets,
  setDbNodePresets,
  saveDbNodePresets,
  toast,
}: DatabaseNodeConfigSectionProps) {
  const [queryValidatorEnabled, setQueryValidatorEnabled] = React.useState(false);
  const [queryFormatterEnabled, setQueryFormatterEnabled] = React.useState(true);
  const [selectedQueryPresetId, setSelectedQueryPresetId] = React.useState<string>("");
  const [queryPresetName, setQueryPresetName] = React.useState<string>("");
  const [saveQueryPresetModalOpen, setSaveQueryPresetModalOpen] = React.useState(false);
  const [newQueryPresetName, setNewQueryPresetName] = React.useState<string>("");
  const [selectedDbPresetId, setSelectedDbPresetId] = React.useState<string>("");
  const [dbPresetName, setDbPresetName] = React.useState<string>("");
  const [dbPresetDescription, setDbPresetDescription] = React.useState<string>("");
  const [databaseTab, setDatabaseTab] = React.useState<"settings" | "constructor" | "presets">("settings");
  const [pendingAiQuery, setPendingAiQuery] = React.useState<string>("");
  const [aiQueries, setAiQueries] = React.useState<Array<{ id: string; query: string; timestamp: string }>>([]);
  const [selectedAiQueryId, setSelectedAiQueryId] = React.useState<string>("");
  const [fetchedDbSchema, setFetchedDbSchema] = React.useState<SchemaData | null>(null);
  const [schemaLoading, setSchemaLoading] = React.useState(false);
  const [browseCollection, setBrowseCollection] = React.useState<string | null>(null);
  const [browseDocuments, setBrowseDocuments] = React.useState<Record<string, unknown>[]>([]);
  const [browseTotal, setBrowseTotal] = React.useState(0);
  const [browseSkip, setBrowseSkip] = React.useState(0);
  const [browseLimit] = React.useState(10);
  const [browseLoading, setBrowseLoading] = React.useState(false);
  const [browseSearch, setBrowseSearch] = React.useState("");
  const [expandedDocId, setExpandedDocId] = React.useState<string | null>(null);
  const [testQueryResult, setTestQueryResult] = React.useState<string>("");
  const [testQueryLoading, setTestQueryLoading] = React.useState(false);
  const queryTemplateRef = React.useRef<HTMLTextAreaElement | null>(null);
  const aiPromptRef = React.useRef<HTMLTextAreaElement | null>(null);
  const lastInjectedResponseRef = React.useRef<string>("");

  React.useEffect(() => {
    if (selectedNode.type !== "database") return;
    const callbackValue = runtimeState.inputs[selectedNode.id]?.queryCallback
      ?? runtimeState.outputs[selectedNode.id]?.queryCallback;
    if (typeof callbackValue === "string" && callbackValue.trim().length > 0) {
      if (callbackValue !== lastInjectedResponseRef.current) {
        lastInjectedResponseRef.current = callbackValue;
        setPendingAiQuery(callbackValue);
        toast("AI query ready for review.", { variant: "success" });
      }
    }
  }, [selectedNode.id, selectedNode.type, runtimeState, toast]);

  React.useEffect(() => {
    if (selectedNode.type !== "database") {
      setFetchedDbSchema(null);
      return;
    }

    const schemaEdge = edges.find((edge) => {
      if (edge.to !== selectedNode.id) return false;
      const fromNode = nodes.find((node) => node.id === edge.from);
      return fromNode?.type === "db_schema";
    });

    if (!schemaEdge) {
      setFetchedDbSchema(null);
      return;
    }

    const schemaNode = nodes.find((node) => node.id === schemaEdge.from);
    const schemaConfig = schemaNode?.config?.db_schema;

    setSchemaLoading(true);
    fetch("/api/databases/schema")
      .then((res) => res.json())
      .then((rawData) => {
        const data = rawData as SchemaData;
        if (schemaConfig?.mode === "selected" && schemaConfig.collections?.length > 0) {
          const selectedCollections = new Set(schemaConfig.collections);
          data.collections = data.collections.filter((c) =>
            selectedCollections.has(c.name)
          );
        }

        if (schemaConfig?.includeFields === false) {
          data.collections = data.collections.map((c) => ({
            ...c,
            fields: [],
          }));
        }

        setFetchedDbSchema(data);
      })
      .catch((err) => {
        console.error("Failed to fetch schema:", err);
        setFetchedDbSchema(null);
      })
      .finally(() => {
        setSchemaLoading(false);
      });
  }, [selectedNode.id, selectedNode.type, edges, nodes]);

  React.useEffect(() => {
    setSelectedQueryPresetId("");
    setQueryPresetName("");
    setSelectedDbPresetId("");
    setDbPresetName("");
    setDbPresetDescription("");
    setDatabaseTab("settings");
    setQueryValidatorEnabled(false);
  }, [selectedNode.id]);

  React.useEffect(() => {
    if (!selectedQueryPresetId) return;
    const preset = dbQueryPresets.find((item) => item.id === selectedQueryPresetId);
    if (preset) {
      setQueryPresetName(preset.name);
    }
  }, [selectedQueryPresetId, dbQueryPresets]);

  React.useEffect(() => {
    if (!selectedDbPresetId) return;
    const preset = dbNodePresets.find((item) => item.id === selectedDbPresetId);
    if (preset) {
      setDbPresetName(preset.name);
      setDbPresetDescription(preset.description ?? "");
    }
  }, [selectedDbPresetId, dbNodePresets]);

  if (selectedNode.type !== "database") return null;

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
                  ...(persistedDatabase?.presetId
                    ? { presetId: persistedDatabase.presetId }
                    : {}),
                  skipEmpty: persistedDatabase?.skipEmpty ?? false,
                  trimStrings: persistedDatabase?.trimStrings ?? false,
                  aiPrompt: persistedDatabase?.aiPrompt ?? "",
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

                // Build connected placeholders from actual inputs
                const connectedPlaceholders: string[] = [];
                // Check if db_schema node is connected
                const hasSchemaConnection = incomingEdges.some((edge) => {
                  const fromNode = nodes.find((node) => node.id === edge.from);
                  return fromNode?.type === "db_schema";
                });
                // Add direct port connections
                incomingPorts.forEach((port) => {
                  if (port === "bundle") {
                    // Bundle keys are handled separately below
                    return;
                  }
                  connectedPlaceholders.push(`{{${port}}}`);
                });
                // Add bundle keys as {{bundle.keyName}}
                bundleKeys.forEach((key) => {
                  connectedPlaceholders.push(`{{bundle.${key}}}`);
                });
                // Also add context keys if context is connected
                if (incomingPorts.includes("context")) {
                  incomingEdges.forEach((edge) => {
                    if (edge.toPort !== "context") return;
                    const fromNode = nodes.find((node) => node.id === edge.from);
                    if (!fromNode) return;
                    if (fromNode.type === "context") {
                      connectedPlaceholders.push("{{context.entityId}}");
                      connectedPlaceholders.push("{{context.entityType}}");
                    }
                  });
                }
                // Add meta keys if meta is connected
                if (incomingPorts.includes("meta")) {
                  connectedPlaceholders.push("{{meta.pathId}}");
                  connectedPlaceholders.push("{{meta.trigger}}");
                }

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
                                  const presetOptions = [
                                    {
                                      id: "custom",                  label: "Custom",
                    description: "Keep current settings and customize manually.",
                  },
                  {
                    id: "query_by_entity",
                    label: "Query products by entityId",
                    description: "Preset query using the connected entityId input.",
                  },
                  {
                    id: "query_by_product",
                    label: "Query products by productId",
                    description: "Preset query using the connected productId input.",
                  },
                  {
                    id: "query_by_id",
                    label: "Query product by id (flexible)",
                    description:
                      "Uses by_id preset so UUIDs resolve against id and ObjectIds use _id.",
                  },
                  {
                    id: "query_recent_products",
                    label: "Query recent products",
                    description: "Fetches newest products sorted by createdAt desc.",
                  },
                  {
                    id: "query_recent_updates",
                    label: "Query recently updated products",
                    description: "Fetches products sorted by updatedAt desc.",
                  },
                  {
                    id: "query_by_sku",
                    label: "Query product by SKU",
                    description: "Looks up a product by SKU using the value input.",
                  },
                  {
                    id: "query_name_contains",
                    label: "Query products by name contains",
                    description: "Uses a regex search on name (value input).",
                  },
                  {
                    id: "query_listings_by_product",
                    label: "Query listings by productId",
                    description: "Fetches product listings for a productId.",
                  },
                  {
                    id: "query_images_by_product",
                    label: "Query images by productId",
                    description: "Fetches image files linked to a productId.",
                  },
                  {
                    id: "query_ai_jobs_by_status",
                    label: "Query AI jobs by status",
                    description: "Searches AI jobs by status (value input).",
                  },
                  {
                    id: "query_notes_by_entity",
                    label: "Query notes by entityId",
                    description: "Fetches notes linked to an entityId.",
                  },
                  {
                    id: "update_description_from_model",
                    label: "Update description_en from model result",
                    description: "Writes model result into description_en for the product.",
                  },
                  {
                    id: "update_content_en_from_result",
                    label: "Update content_en from result (entityId)",
                    description:
                      "Updates product content_en using the incoming result and the connected entityId.",
                  },
                  {
                    id: "update_description_en_from_result",
                    label: "Update description_en from result",
                    description:
                      "Updates product description_en using the incoming result and any connected id.",
                  },
                  {
                    id: "update_description_en_from_result_by_entity",
                    label: "Update description_en from result (entityId)",
                    description:
                      "Updates product description_en using the incoming result and the connected entityId.",
                  },
                  {
                    id: "append_description_from_result",
                    label: "Append description from result",
                    description: "Appends the result to content_en.",
                  },
                  {
                    id: "update_name_en_from_value",
                    label: "Update name_en from value",
                    description: "Updates product name_en using the value input.",
                  },
                  {
                    id: "delete_product_by_entity",
                    label: "Delete product by entityId",
                    description: "Deletes a product using the entityId input.",
                  },
                  {
                    id: "insert_from_bundle",
                    label: "Insert product from bundle",
                    description: "Creates a new product using the bundle payload.",
                  },
                  {
                    id: "insert_note_from_bundle",
                    label: "Insert note from bundle",
                    description: "Creates a note using the bundle payload.",
                  },
                ];
                const applyDatabasePreset = (presetId: string) => {
                  if (presetId === "custom") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                      },
                    });
                    return;
                  }
                  if (presetId === "query_by_entity") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "query",
                        entityType: "product",
                        idField: "entityId",
                        query: {
                          ...defaultQuery,
                          ...(databaseConfig.query ?? {}),
                          mode: "preset",
                          preset: "by_entityId",
                        },
                      },
                    });
                    return;
                  }
                  if (presetId === "query_by_product") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "query",
                        entityType: "product",
                        idField: "productId",
                        query: {
                          ...defaultQuery,
                          ...(databaseConfig.query ?? {}),
                          mode: "preset",
                          preset: "by_productId",
                        },
                      },
                    });
                    return;
                  }
                  if (presetId === "query_by_id") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "query",
                        entityType: "product",
                        query: {
                          ...defaultQuery,
                          collection: "products",
                          mode: "preset",
                          preset: "by_id",
                          idType: "string",
                        },
                      },
                    });
                    return;
                  }
                  if (presetId === "query_recent_products") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "query",
                        entityType: "product",
                        query: {
                          ...defaultQuery,
                          collection: "products",
                          mode: "custom",
                          queryTemplate: "{}",
                          sort: "{\n  \"createdAt\": -1\n}",
                          limit: 10,
                        },
                      },
                    });
                    return;
                  }
                  if (presetId === "query_recent_updates") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "query",
                        entityType: "product",
                        query: {
                          ...defaultQuery,
                          collection: "products",
                          mode: "custom",
                          queryTemplate: "{}",
                          sort: "{\n  \"updatedAt\": -1\n}",
                          limit: 10,
                        },
                      },
                    });
                    return;
                  }
                  if (presetId === "query_by_sku") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "query",
                        entityType: "product",
                        query: {
                          ...defaultQuery,
                          collection: "products",
                          mode: "preset",
                          preset: "by_field",
                          field: "sku",
                        },
                      },
                    });
                    return;
                  }
                  if (presetId === "query_name_contains") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "query",
                        entityType: "product",
                        query: {
                          ...defaultQuery,
                          collection: "products",
                          mode: "custom",
                          queryTemplate:
                            "{\n  \"name\": { \"$regex\": \"{{value}}\", \"$options\": \"i\" }\n}",
                        },
                      },
                    });
                    return;
                  }
                  if (presetId === "query_listings_by_product") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "query",
                        entityType: "product",
                        query: {
                          ...defaultQuery,
                          collection: "product_listings",
                          mode: "preset",
                          preset: "by_productId",
                        },
                      },
                    });
                    return;
                  }
                  if (presetId === "query_images_by_product") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "query",
                        entityType: "product",
                        query: {
                          ...defaultQuery,
                          collection: "image_files",
                          mode: "preset",
                          preset: "by_productId",
                        },
                      },
                    });
                    return;
                  }
                  if (presetId === "query_ai_jobs_by_status") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "query",
                        entityType: "product",
                        query: {
                          ...defaultQuery,
                          collection: "product_ai_jobs",
                          mode: "custom",
                          queryTemplate: "{\n  \"status\": \"{{value}}\"\n}",
                          sort: "{\n  \"createdAt\": -1\n}",
                          limit: 10,
                        },
                      },
                    });
                    return;
                  }
                  if (presetId === "query_notes_by_entity") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "query",
                        entityType: "note",
                        query: {
                          ...defaultQuery,
                          collection: "notes",
                          mode: "preset",
                          preset: "by_entityId",
                        },
                      },
                    });
                    return;
                  }
                  if (presetId === "update_description_from_model") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "update",
                        entityType: "product",
                        idField: "productId",
                        mode: "replace",
                        mappings: [
                          {
                            targetPath: "description_en",
                            sourcePort: selectedNode.inputs.includes("result")
                              ? "result"
                              : "description_en",
                            sourcePath: "",
                          },
                        ],
                        writeSource: databaseConfig.writeSource ?? "bundle",
                        writeSourcePath: databaseConfig.writeSourcePath ?? "",
                      },
                    });
                    return;
                  }
                  if (presetId === "update_content_en_from_result") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "update",
                        entityType: "product",
                        idField: "entityId",
                        mode: "replace",
                        mappings: [
                          {
                            targetPath: "content_en",
                            sourcePort: selectedNode.inputs.includes("result")
                              ? "result"
                              : "content_en",
                            sourcePath: "",
                          },
                        ],
                        writeSource: databaseConfig.writeSource ?? "bundle",
                        writeSourcePath: databaseConfig.writeSourcePath ?? "",
                      },
                    });
                    return;
                  }
                  if (presetId === "update_description_en_from_result") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "update",
                        entityType: "product",
                        idField: "productId",
                        mode: "replace",
                        mappings: [
                          {
                            targetPath: "description_en",
                            sourcePort: selectedNode.inputs.includes("result")
                              ? "result"
                              : "description_en",
                            sourcePath: "",
                          },
                        ],
                        writeSource: databaseConfig.writeSource ?? "bundle",
                        writeSourcePath: databaseConfig.writeSourcePath ?? "",
                      },
                    });
                    return;
                  }
                  if (presetId === "update_description_en_from_result_by_entity") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "update",
                        entityType: "product",
                        idField: "entityId",
                        mode: "replace",
                        mappings: [
                          {
                            targetPath: "description_en",
                            sourcePort: selectedNode.inputs.includes("result")
                              ? "result"
                              : "description_en",
                            sourcePath: "",
                          },
                        ],
                        writeSource: databaseConfig.writeSource ?? "bundle",
                        writeSourcePath: databaseConfig.writeSourcePath ?? "",
                      },
                    });
                    return;
                  }
                  if (presetId === "append_description_from_result") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "update",
                        entityType: "product",
                        idField: "entityId",
                        mode: "append",
                        mappings: [
                          {
                            targetPath: "content_en",
                            sourcePort: selectedNode.inputs.includes("result")
                              ? "result"
                              : "content_en",
                            sourcePath: "",
                          },
                        ],
                      },
                    });
                    return;
                  }
                  if (presetId === "update_name_en_from_value") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "update",
                        entityType: "product",
                        idField: "entityId",
                        mode: "replace",
                        mappings: [
                          {
                            targetPath: "name_en",
                            sourcePort: selectedNode.inputs.includes("value")
                              ? "value"
                              : "result",
                            sourcePath: "",
                          },
                        ],
                      },
                    });
                    return;
                  }
                  if (presetId === "delete_product_by_entity") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "delete",
                        entityType: "product",
                        idField: "entityId",
                      },
                    });
                    return;
                  }
                  if (presetId === "insert_from_bundle") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "insert",
                        entityType: "product",
                        writeSource: "bundle",
                        writeSourcePath: "",
                      },
                    });
                  }
                  if (presetId === "insert_note_from_bundle") {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        presetId,
                        operation: "insert",
                        entityType: "note",
                        writeSource: "bundle",
                        writeSourcePath: "",
                      },
                    });
                  }
                };
                const writeSource = databaseConfig.writeSource ?? "bundle";
                const collectionOption = DB_COLLECTION_OPTIONS.some(
                  (option) => option.value === queryConfig.collection
                )
                  ? queryConfig.collection
                  : "custom";
                const normalizePresetValue = (value?: string) => (value ?? "").trim();
                const resolvedSortPresetId = SORT_PRESETS.some(
                  (preset) => preset.id === queryConfig.sortPresetId
                )
                  ? queryConfig.sortPresetId
                  : undefined;
                const resolvedProjectionPresetId = PROJECTION_PRESETS.some(
                  (preset) => preset.id === queryConfig.projectionPresetId
                )
                  ? queryConfig.projectionPresetId
                  : undefined;
                const sortPresetId =
                  resolvedSortPresetId ??
                  SORT_PRESETS.find(
                    (preset) =>
                      normalizePresetValue(preset.value) ===
                      normalizePresetValue(queryConfig.sort)
                  )?.id ??
                  "custom";
                const projectionPresetId =
                  resolvedProjectionPresetId ??
                  PROJECTION_PRESETS.find(
                    (preset) =>
                      normalizePresetValue(preset.value) ===
                      normalizePresetValue(queryConfig.projection)
                  )?.id ??
                  "custom";
                const presetQueryTemplate = buildPresetQueryTemplate(queryConfig);
                const rawQueryTemplate = queryConfig.queryTemplate ?? "";
                const queryTemplateValue = rawQueryTemplate.trim().length
                  ? rawQueryTemplate
                  : queryConfig.mode === "preset"
                    ? presetQueryTemplate
                    : rawQueryTemplate;
                const queryValidation = queryValidatorEnabled
                  ? buildMongoQueryValidation(queryTemplateValue)
                  : null;
                const updateQueryConfig = (
                  patch: Partial<DbQueryConfig>,
                  options?: { syncPreset?: boolean }
                ) => {
                  const nextQuery = { ...queryConfig, ...patch };
                  if (options?.syncPreset && nextQuery.mode === "preset") {
                    nextQuery.queryTemplate = buildPresetQueryTemplate(nextQuery);
                  }
                  updateSelectedNodeConfig({
                    database: {
                      ...databaseConfig,
                      query: nextQuery,
                    },
                  });
                };
                const selectedDbPreset = dbNodePresets.find(
                  (preset) => preset.id === selectedDbPresetId
                );
                const handleApplyDbPreset = (preset: DbNodePreset) => {
                  updateSelectedNodeConfig({
                    database: {
                      ...databaseConfig,
                      ...preset.config,
                      mappings:
                        preset.config.mappings && preset.config.mappings.length > 0
                          ? preset.config.mappings
                          : mappings,
                      query: preset.config.query ?? queryConfig,
                    },
                  });
                };
                const handleSaveDbPreset = async () => {
                  const name = dbPresetName.trim();
                  if (!name) {
                    toast("Preset name is required.", { variant: "error" });
                    return;
                  }
                  const now = new Date().toISOString();
                  const payload: DatabaseConfig = {
                    operation: databaseConfig.operation ?? "query",
                    entityType: databaseConfig.entityType ?? "product",
                    idField: databaseConfig.idField ?? "entityId",
                    mode: databaseConfig.mode ?? "replace",
                    mappings,
                    query: { ...queryConfig, queryTemplate: queryTemplateValue },
                    writeSource: databaseConfig.writeSource ?? "bundle",
                    writeSourcePath: databaseConfig.writeSourcePath ?? "",
                    dryRun: databaseConfig.dryRun ?? false,
                    ...(databaseConfig.presetId ? { presetId: databaseConfig.presetId } : {}),
                    skipEmpty: databaseConfig.skipEmpty ?? false,
                    trimStrings: databaseConfig.trimStrings ?? false,
                  };
                  let nextPresets = [...dbNodePresets];
                  const existingIndex = nextPresets.findIndex(
                    (preset) => preset.id === selectedDbPresetId
                  );
                  if (existingIndex >= 0) {
                    const existingPreset = nextPresets[existingIndex]!;
                    nextPresets[existingIndex] = {
                      ...existingPreset,
                      name,
                      description: dbPresetDescription.trim(),
                      config: payload,
                      updatedAt: now,
                    };
                  } else {
                    const newPreset: DbNodePreset = {
                      id: createPresetId(),
                      name,
                      description: dbPresetDescription.trim(),
                      config: payload,
                      createdAt: now,
                      updatedAt: now,
                    };
                    nextPresets = [...nextPresets, newPreset];
                    setSelectedDbPresetId(newPreset.id);
                  }
                  setDbNodePresets(nextPresets);
                  await saveDbNodePresets(nextPresets);
                  toast("Database preset saved.", { variant: "success" });
                };
                const handleDeleteDbPreset = async () => {
                  if (!selectedDbPreset) return;
                  const confirmed = window.confirm(
                    `Delete database preset \"${selectedDbPreset.name}\"?`
                  );
                  if (!confirmed) return;
                  const nextPresets = dbNodePresets.filter(
                    (preset) => preset.id !== selectedDbPreset.id
                  );
                  setDbNodePresets(nextPresets);
                  await saveDbNodePresets(nextPresets);
                  setSelectedDbPresetId("");
                  setDbPresetName("");
                  setDbPresetDescription("");
                  toast("Database preset deleted.", { variant: "success" });
                };
                const selectedQueryPreset = dbQueryPresets.find(
                  (preset) => preset.id === selectedQueryPresetId
                );
                const handleSaveQueryPreset = async () => {
                  const name = queryPresetName.trim();
                  const template = queryTemplateValue.trim();
                  if (!name) {
                    toast("Query preset name is required.", { variant: "error" });
                    return;
                  }
                  if (!template) {
                    toast("Query template is empty.", { variant: "error" });
                    return;
                  }
                  const now = new Date().toISOString();
                  let nextPresets = [...dbQueryPresets];
                  const existingIndex = nextPresets.findIndex(
                    (preset) => preset.id === selectedQueryPresetId
                  );
                  if (existingIndex >= 0) {
                    const existingPreset = nextPresets[existingIndex]!;
                    nextPresets[existingIndex] = {
                      ...existingPreset,
                      name,
                      queryTemplate: template,
                      updatedAt: now,
                    };
                  } else {
                    const newPreset: DbQueryPreset = {
                      id: createPresetId(),
                      name,
                      queryTemplate: template,
                      createdAt: now,
                      updatedAt: now,
                    };
                    nextPresets = [...nextPresets, newPreset];
                    setSelectedQueryPresetId(newPreset.id);
                  }
                  setDbQueryPresets(nextPresets);
                  await saveDbQueryPresets(nextPresets);
                  toast("Query preset saved.", { variant: "success" });
                };
                const handleDeleteQueryPreset = async () => {
                  if (!selectedQueryPreset) return;
                  const confirmed = window.confirm(
                    `Delete query preset \"${selectedQueryPreset.name}\"?`
                  );
                  if (!confirmed) return;
                  const nextPresets = dbQueryPresets.filter(
                    (preset) => preset.id !== selectedQueryPreset.id
                  );
                  setDbQueryPresets(nextPresets);
                  await saveDbQueryPresets(nextPresets);
                  setSelectedQueryPresetId("");
                  setQueryPresetName("");
                  toast("Query preset deleted.", { variant: "success" });
                };
                const showQueryExtras = operation === "query";
                const queryPlaceholder = getQueryPlaceholderByOperation(operation);
                // Shared query input controls (used in both Query and Constructor tabs)
                const queryInputControls = (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2 items-center">
                        <Select
                          value={operation}
                          onValueChange={(value: DatabaseOperation) => {
                            updateSelectedNodeConfig({
                              database: {
                                ...databaseConfig,
                                operation: value,
                              },
                            });
                          }}
                        >
                          <SelectTrigger className="h-7 w-[140px] border-gray-800 bg-gray-950/70 text-xs text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-gray-800 bg-gray-900">
                            <SelectItem value="query">Query</SelectItem>
                            <SelectItem value="update">Update</SelectItem>
                            <SelectItem value="insert">Insert</SelectItem>
                            <SelectItem value="delete">Delete</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          className={`h-7 rounded-md border px-2 text-[10px] ${
                            !queryFormatterEnabled
                              ? "border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800"
                              : queryValidation && queryValidation.status === "error"
                              ? "border-amber-700 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                              : "border-emerald-700 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                          }`}
                          onClick={() => {
                            if (queryFormatterEnabled) {
                              const formatted = formatAndFixMongoQuery(queryTemplateValue);
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
                                      queryTemplate: formatted,
                                    },
                                  },
                                });
                              } else {
                                updateQueryConfig({
                                  mode: "custom",
                                  queryTemplate: formatted,
                                });
                              }
                              if (queryValidation && queryValidation.status === "error") {
                                toast("Query auto-corrected based on validation.", { variant: "success" });
                              } else {
                                toast("Query formatted and fixed.", { variant: "success" });
                              }
                            } else {
                              setQueryFormatterEnabled(true);
                              toast("Formatter enabled.", { variant: "success" });
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setQueryFormatterEnabled((prev) => !prev);
                          }}
                        >
                          {!queryFormatterEnabled
                            ? "Format"
                            : queryValidation && queryValidation.status === "error"
                            ? "Fix Issues"
                            : "Format ✓"}
                        </Button>
                        <Button
                          type="button"
                          className="h-7 rounded-md border border-gray-700 px-2 text-[10px] text-gray-200 hover:bg-gray-900/80"
                          onClick={() => setQueryValidatorEnabled((prev) => !prev)}
                        >
                          {queryValidatorEnabled ? "Hide validator" : "Validate"}
                        </Button>
                        <Button
                          type="button"
                          className={`h-7 rounded-md border px-3 text-[10px] font-medium ${
                            testQueryLoading
                              ? "border-amber-700 bg-amber-500/10 text-amber-200"
                              : "border-cyan-700 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                          }`}
                          disabled={testQueryLoading}
                          onClick={async () => {
                            if (!queryTemplateValue.trim()) {
                              toast("Query is empty", { variant: "error" });
                              return;
                            }
                            setTestQueryLoading(true);
                            setTestQueryResult("");
                            try {
                              let testQuery = queryTemplateValue;
                              testQuery = testQuery.replace(/\{\{[^}]+\}\}/g, '""');

                              const queryObj = JSON.parse(testQuery);
                              const response = await fetch("/api/ai-paths/db-query", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  collection: queryConfig.collection ?? "products",
                                  query: queryObj,
                                  limit: queryConfig.limit ?? 20,
                                  single: queryConfig.single ?? false,
                                  idType: queryConfig.idType ?? "string",
                                }),
                              });
                              const data = await response.json();
                              if (!response.ok) {
                                setTestQueryResult(JSON.stringify({ error: data.error || "Query failed" }, null, 2));
                                toast("Query failed", { variant: "error" });
                              } else {
                                const resultData = data.item ?? data.items ?? data;
                                setTestQueryResult(JSON.stringify(resultData, null, 2));
                                const count = data.count ?? (Array.isArray(resultData) ? resultData.length : 1);
                                toast(`Query returned ${count} result(s)`, { variant: "success" });
                              }
                            } catch (err) {
                              const errorMessage = err instanceof Error ? err.message : "Failed to execute query";
                              setTestQueryResult(JSON.stringify({ error: errorMessage }, null, 2));
                              toast(errorMessage, { variant: "error" });
                            } finally {
                              setTestQueryLoading(false);
                            }
                          }}
                        >
                          {testQueryLoading ? "Running..." : "Run"}
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      ref={queryTemplateRef}
                      className="min-h-[140px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={queryTemplateValue}
                      onChange={(event) => {
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
                                queryTemplate: event.target.value,
                              },
                            },
                          });
                        } else {
                          updateQueryConfig({
                            mode: "custom",
                            queryTemplate: event.target.value,
                          });
                        }
                      }}
                      placeholder={queryTemplateValue.trim() === "" ? queryPlaceholder : undefined}
                    />
                  </div>
                );

                // Pending AI query review section (used in Constructor tab)
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

                const queryEditor = (
                  <div className="space-y-4 rounded-md border border-gray-800 bg-gray-900/40 p-3">
                    <div>
                      {queryInputControls}
                      {/* Query Result Display */}
                      {testQueryResult && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-gray-400">Query Result</Label>
                            <Button
                              type="button"
                              className="h-6 rounded-md border border-gray-700 px-2 text-[10px] text-gray-400 hover:bg-gray-800"
                              onClick={() => setTestQueryResult("")}
                            >
                              Clear
                            </Button>
                          </div>
                          <Textarea
                            className="min-h-[120px] w-full rounded-md border border-cyan-800/50 bg-gray-950/70 font-mono text-xs text-cyan-100"
                            value={testQueryResult}
                            readOnly
                            placeholder="Query results will appear here..."
                          />
                        </div>
                      )}
                    </div>
                    {queryValidatorEnabled && queryValidation && (
                        ref={queryTemplateRef}
                        className="mt-2 min-h-[140px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={queryTemplateValue}
                        onChange={(event) => {
                          // When user starts typing, switch preset/AI query to custom
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
                                  queryTemplate: event.target.value,
                                },
                              },
                            });
                          } else {
                            updateQueryConfig({
                              mode: "custom",
                              queryTemplate: event.target.value,
                            });
                          }
                        }}
                        placeholder={queryTemplateValue.trim() === "" ? queryPlaceholder : undefined}
                      />
                      {/* Query Result Display */}
                      {testQueryResult && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-gray-400">Query Result</Label>
                            <Button
                              type="button"
                              className="h-6 rounded-md border border-gray-700 px-2 text-[10px] text-gray-400 hover:bg-gray-800"
                              onClick={() => setTestQueryResult("")}
                            >
                              Clear
                            </Button>
                          </div>
                          <Textarea
                            className="min-h-[120px] w-full rounded-md border border-cyan-800/50 bg-gray-950/70 font-mono text-xs text-cyan-100"
                            value={testQueryResult}
                            readOnly
                            placeholder="Query results will appear here..."
                          />
                        </div>
                      )}
                    </div>
                    {queryValidatorEnabled && queryValidation && (
                      <div
                        className={`rounded-md border px-3 py-2 text-[11px] ${
                          queryValidation.status === "valid"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                            : queryValidation.status === "empty"
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                              : "border-rose-500/40 bg-rose-500/10 text-rose-100"
                        }`}
                      >
                        <div className="font-medium">MongoDB Query Validator</div>
                        <div className="mt-1">{queryValidation.message}</div>
                        {queryValidation.line && queryValidation.column && (
                          <div className="mt-1">
                            Line {queryValidation.line}, column {queryValidation.column}
                          </div>
                        )}
                        {queryValidation.snippet && (
                          <pre className="mt-2 whitespace-pre-wrap text-[11px] text-rose-100">
                            {queryValidation.snippet}
                          </pre>
                        )}
                        {queryValidation.hints && queryValidation.hints.length > 0 && (
                          <div className="mt-2 space-y-1 text-[11px] text-rose-100/90">
                            {queryValidation.hints.map((hint) => (
                              <div key={hint}>- {hint}</div>
                            ))}
                          </div>
                        )}
                        {queryValidation.status === "error" && (() => {
                          // Check if AI is connected
                          const aiPromptEdges = edges.filter(
                            (edge) => edge.from === selectedNode.id && edge.fromPort === "aiPrompt"
                          );
                          const aiNode = aiPromptEdges.length > 0
                            ? nodes.find((n) => n.id === aiPromptEdges[0]?.to && n.type === "model")
                            : null;

                          if (!aiNode) return null;

                          return (
                            <Button
                              type="button"
                              className="mt-3 w-full rounded-md border border-purple-700 bg-purple-500/10 px-3 py-2 text-[11px] text-purple-200 hover:bg-purple-500/20"
                              onClick={() => {
                                const providerName = queryConfig.provider === "auto" ? "MongoDB (auto-detect)" : queryConfig.provider;
                                const correctionPrompt = `Fix this invalid ${providerName} query for a ${operation} operation on the "${queryConfig.collection}" collection.

  Current Query:
  \`\`\`json
  ${queryTemplateValue}
  \`\`\`

  Validation Errors:
  ${queryValidation.message}

  ${queryValidation.hints && queryValidation.hints.length > 0 ? `Suggestions:\n${queryValidation.hints.map(h => `- ${h}`).join('\n')}` : ''}

  Please return ONLY the corrected query as valid JSON, without any explanation or markdown formatting.`;

                                updateSelectedNodeConfig({
                                  database: {
                                    ...databaseConfig,
                                    aiPrompt: correctionPrompt,
                                  },
                                });
                                toast("Validation errors sent to AI for correction.", { variant: "success" });
                              }}
                            >
                              🤖 Send to AI for Auto-Correction
                            </Button>
                          );
                        })()}
                      </div>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs text-gray-400">Provider</Label>
                        <Select
                          value={queryConfig.provider}
                          onValueChange={(value) =>
                            updateQueryConfig({ provider: value as DbQueryConfig["provider"] })
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
                            updateQueryConfig({
                              collection: value === "custom" ? queryConfig.collection : value,
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
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        {collectionOption === "custom" && (
                          <Input
                            className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={queryConfig.collection}
                            onChange={(event) =>
                              updateQueryConfig({ collection: event.target.value })
                            }
                            placeholder="collection_name"
                          />
                        )}
                      </div>
                    </div>
                    {showQueryExtras && (
                      <div>
                        <Label className="text-xs text-gray-400">Limit</Label>
                        <Input
                          type="number"
                          step="1"
                          className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                          value={queryConfig.limit}
                          onChange={(event) =>
                            updateQueryConfig({
                              limit: toNumber(event.target.value, queryConfig.limit),
                            })
                          }
                        />
                      </div>
                    )}
                    {showQueryExtras && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-gray-400">Sort preset</Label>
                          <Select
                            value={sortPresetId}
                            onValueChange={(value) => {
                              if (value === "custom") return;
                              const preset = SORT_PRESETS.find((item) => item.id === value);
                              if (!preset) return;
                              updateQueryConfig({
                                sort: preset.value,
                                sortPresetId: preset.id,
                              });
                            }}
                          >
                            <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                              <SelectValue placeholder="Select preset" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              <SelectItem value="custom">Custom</SelectItem>
                              {SORT_PRESETS.map((preset) => (
                                <SelectItem key={preset.id} value={preset.id}>
                                  {preset.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Label className="mt-3 text-xs text-gray-400">Sort (JSON)</Label>
                          <Textarea
                            className="mt-2 min-h-[80px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={queryConfig.sort}
                            onChange={(event) =>
                              updateQueryConfig({
                                sort: event.target.value,
                                sortPresetId: "custom",
                              })
                            }
                          />
                          <p className="mt-2 text-[11px] text-gray-500">
                            Example:{" "}
                            <span className="text-gray-300">{`{ "createdAt": -1 }`}</span>
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400">Projection preset</Label>
                          <Select
                            value={projectionPresetId}
                            onValueChange={(value) => {
                              if (value === "custom") return;
                              const preset = PROJECTION_PRESETS.find((item) => item.id === value);
                              if (!preset) return;
                              updateQueryConfig({
                                projection: preset.value,
                                projectionPresetId: preset.id,
                              });
                            }}
                          >
                            <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                              <SelectValue placeholder="Select preset" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              <SelectItem value="custom">Custom</SelectItem>
                              {PROJECTION_PRESETS.map((preset) => (
                                <SelectItem key={preset.id} value={preset.id}>
                                  {preset.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Label className="mt-3 text-xs text-gray-400">
                            Projection (JSON)
                          </Label>
                          <Textarea
                            className="mt-2 min-h-[80px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={queryConfig.projection}
                            onChange={(event) =>
                              updateQueryConfig({
                                projection: event.target.value,
                                projectionPresetId: "custom",
                              })
                            }
                          />
                          <p className="mt-2 text-[11px] text-gray-500">
                            Example:{" "}
                            <span className="text-gray-300">{`{ "title": 1, "price": 1 }`}</span>
                          </p>
                        </div>
                      </div>
                    )}
                    {showQueryExtras && (
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
                            updateQueryConfig({ single: !queryConfig.single })
                          }
                        >
                          {queryConfig.single ? "Enabled" : "Disabled"}
                        </Button>
                      </div>
                    )}
                    {showQueryExtras && (
                      <p className="text-[11px] text-gray-500">
                        Collections are allowlisted on the server for safety.
                      </p>
                    )}
                  </div>
                );

                // Query Constructor content (separate from main query editor)
                const queryConstructorContent = (
                  <div className="space-y-4 rounded-md border border-gray-800 bg-gray-900/40 p-3">
                    {/* Shared query input controls */}
                    {queryInputControls}

                    {/* Pending AI query review */}
                    {pendingAiQuerySection}

                    {/* Presets row */}
                    <div className="space-y-3">
                      <Label className="text-xs text-gray-400">Quick Presets</Label>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Button
                          type="button"
                          className="h-7 rounded-md border border-blue-700 bg-blue-500/10 px-2 text-[10px] text-blue-200 hover:bg-blue-500/20"
                          onClick={() => {
                            setNewQueryPresetName("");
                            setSaveQueryPresetModalOpen(true);
                          }}
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

                    {/* Connected placeholders */}
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

                    {/* Schema collections */}
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
                                            const needsComma = before.length > 1 && !before.endsWith("{") && !before.endsWith(",");
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

                    {/* Template snippets */}
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

                    {/* AI Prompt section */}
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

                    {/* Auto-mapper */}
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

                return (
                  <Tabs
                    value={databaseTab}
                    onValueChange={(value) => setDatabaseTab(value as "settings" | "constructor" | "presets")}
                    className="space-y-4"
                  >
                    <TabsList className="w-full justify-start border border-gray-800 bg-gray-950/60">
                      <TabsTrigger value="settings">Query</TabsTrigger>
                      <TabsTrigger value="constructor">Constructor</TabsTrigger>
                      <TabsTrigger value="presets">Presets</TabsTrigger>
                    </TabsList>
                    <TabsContent value="settings">
                      <div className="space-y-4">
                    {queryEditor}

                    <div className="space-y-4">
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

                    {operation === "update" && (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs text-gray-400">Write Mode</Label>
                          <Select
                            value={databaseConfig.mode ?? "replace"}
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
                              value={databaseConfig.writeSourcePath ?? ""}
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
                </TabsContent>
                <TabsContent value="constructor">
                  {queryConstructorContent}
                </TabsContent>
                <TabsContent value="presets">
                  <div className="space-y-4">
                    <div className="rounded-md border border-gray-800 bg-gray-950/50 p-3">
                      <div className="space-y-3">
                        <Label className="text-xs text-gray-400">Database presets</Label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label className="text-xs text-gray-400">Saved presets</Label>
                            <Select
                              value={selectedDbPresetId || "none"}
                              onValueChange={(value) => {
                                const nextId = value === "none" ? "" : value;
                                setSelectedDbPresetId(nextId);
                                if (!nextId) {
                                  setDbPresetName("");
                                  setDbPresetDescription("");
                                  return;
                                }
                                const preset = dbNodePresets.find((item) => item.id === nextId);
                                if (preset) {
                                  setDbPresetName(preset.name);
                                  setDbPresetDescription(preset.description ?? "");
                                  handleApplyDbPreset(preset);
                                }
                              }}
                            >
                              <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                                <SelectValue placeholder="Select preset" />
                              </SelectTrigger>
                              <SelectContent className="border-gray-800 bg-gray-900">
                                <SelectItem value="none">None</SelectItem>
                                {dbNodePresets.map((preset) => (
                                  <SelectItem key={preset.id} value={preset.id}>
                                    {preset.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-400">Preset name</Label>
                            <Input
                              className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                              value={dbPresetName}
                              onChange={(event) => setDbPresetName(event.target.value)}
                              placeholder="My database preset"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400">Description</Label>
                          <Input
                            className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={dbPresetDescription}
                            onChange={(event) => setDbPresetDescription(event.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            className="rounded-md border border-emerald-500/40 text-[10px] text-emerald-200 hover:bg-emerald-500/10"
                            onClick={() => void handleSaveDbPreset()}
                          >
                            {selectedDbPreset ? "Update preset" : "Save preset"}
                          </Button>
                          {selectedDbPreset ? (
                            <Button
                              type="button"
                              className="rounded-md border border-rose-500/40 text-[10px] text-rose-200 hover:bg-rose-500/10"
                              onClick={() => void handleDeleteDbPreset()}
                            >
                              Delete preset
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-md border border-gray-800 bg-gray-950/50 p-3">
                      <div className="space-y-3">
                        <Label className="text-xs text-gray-400">Query presets</Label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs text-gray-400">Saved query presets</Label>
                              <Select
                                value={selectedQueryPresetId || "none"}
                                onValueChange={(value) => {
                                  const nextId = value === "none" ? "" : value;
                                  setSelectedQueryPresetId(nextId);
                                  if (!nextId) {
                                    setQueryPresetName("");
                                    return;
                                  }
                                  const preset = dbQueryPresets.find((item) => item.id === nextId);
                                  if (preset) {
                                    updateSelectedNodeConfig({
                                      database: {
                                        ...databaseConfig,
                                        query: {
                                          ...queryConfig,
                                          queryTemplate: preset.queryTemplate,
                                          mode: "custom",
                                        },
                                      },
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                                  <SelectValue placeholder="Select preset" />
                                </SelectTrigger>
                                <SelectContent className="border-gray-800 bg-gray-900">
                                  <SelectItem value="none">None</SelectItem>
                                  {dbQueryPresets.map((preset) => (
                                    <SelectItem key={preset.id} value={preset.id}>
                                      {preset.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-400">Query preview</Label>
                              <Textarea
                                readOnly
                                className="mt-2 min-h-[90px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                                value={queryTemplateValue}
                              />
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  className="rounded-md border border-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-900/80"
                                  onClick={() => {
                                    setDatabaseTab("settings");
                                    updateSelectedNodeConfig({
                                      database: {
                                        ...databaseConfig,
                                        query: {
                                          ...queryConfig,
                                          mode: "custom",
                                        },
                                      },
                                    });
                                    window.setTimeout(() => queryTemplateRef.current?.focus(), 0);
                                  }}
                                >
                                  Edit in settings
                                </Button>
                              </div>
                              <p className="mt-2 text-[11px] text-gray-500">
                                Use dot paths for nested keys, e.g.{" "}
                                <span className="text-gray-300">{`{{bundle.key}}`}</span> or{" "}
                                <span className="text-gray-300">{`{{context.entity.title}}`}</span>.
                                Arrays support indexes like{" "}
                                <span className="text-gray-300">{`{{bundle.items[0].sku}}`}</span>.
                              </p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-400">Preset name</Label>
                            <Input
                              className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                              value={queryPresetName}
                              onChange={(event) => setQueryPresetName(event.target.value)}
                              placeholder="My product lookup"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            className="rounded-md border border-emerald-500/40 text-[10px] text-emerald-200 hover:bg-emerald-500/10"
                            onClick={() => void handleSaveQueryPreset()}
                          >
                            {selectedQueryPreset ? "Update preset" : "Save preset"}
                          </Button>
                          {selectedQueryPreset ? (
                            <Button
                              type="button"
                              className="rounded-md border border-rose-500/40 text-[10px] text-rose-200 hover:bg-rose-500/10"
                              onClick={() => void handleDeleteQueryPreset()}
                            >
                              Delete preset
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
                );
            
}
