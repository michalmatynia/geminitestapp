"use client";

import { Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { dbApi } from "@/features/ai-paths/lib/api";
import React from "react";






import type {
  AiNode,
  DatabaseAction,
  DatabaseActionCategory,
  DatabaseConfig,
  DbNodePreset,
  DbQueryConfig,
  DbQueryPreset,
  Edge,
  NodeConfig,
  PathDebugSnapshot,
  RuntimeState,
  UpdaterMapping,
  UpdaterSampleState,
} from "@/features/ai-paths/lib";
import {
  DB_COLLECTION_OPTIONS,
  createParserMappings,
  createPresetId,
  extractJsonPathEntries,
  renderTemplate,
  safeParseJson,
  toNumber,
} from "@/features/ai-paths/lib";
import {
  PROJECTION_PRESETS,
  SORT_PRESETS,
  buildPresetQueryTemplate,
} from "@/features/ai-paths/config/query-presets";
import { DatabaseConstructorTab } from "./database/DatabaseConstructorTab";
import { DatabasePresetsTab } from "./database/DatabasePresetsTab";
import { DatabaseQueryInputControls } from "./database/DatabaseQueryInputControls";
import { DatabaseQueryValidatorPanel } from "./database/DatabaseQueryValidatorPanel";
import { DatabaseSaveQueryPresetDialog } from "./database/DatabaseSaveQueryPresetDialog";
import { DatabaseSettingsTab } from "./database/DatabaseSettingsTab";
import {
  buildMongoQueryValidation,
  formatAndFixMongoQuery,
  getQueryPlaceholderByAction,
  getUpdatePlaceholderByAction,
} from "./database/query-utils";
import type { AiQuery, DatabasePresetOption, SchemaData } from "./database/types";

type SchemaConfig = {
  mode?: "all" | "selected";
  collections?: string[];
  includeFields?: boolean;
};

type DatabaseNodeConfigSectionProps = {
  selectedNode: AiNode;
  nodes: AiNode[];
  edges: Edge[];
  runtimeState: RuntimeState;
  pathDebugSnapshot?: PathDebugSnapshot | null;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  onSendToAi?: (databaseNodeId: string, prompt: string) => Promise<void>;
  sendingToAi?: boolean;
  updaterSamples: Record<string, UpdaterSampleState>;
  setUpdaterSamples: React.Dispatch<React.SetStateAction<Record<string, UpdaterSampleState>>>;
  updaterSampleLoading: boolean;
  handleFetchUpdaterSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  dbQueryPresets: DbQueryPreset[];
  setDbQueryPresets: React.Dispatch<React.SetStateAction<DbQueryPreset[]>>;
  saveDbQueryPresets: (nextPresets: DbQueryPreset[]) => Promise<void>;
  dbNodePresets: DbNodePreset[];
  setDbNodePresets: React.Dispatch<React.SetStateAction<DbNodePreset[]>>;
  saveDbNodePresets: (nextPresets: DbNodePreset[]) => Promise<void>;
  toast: (message: string, options?: { variant?: "success" | "error" }) => void;
};

export function DatabaseNodeConfigSection({
  selectedNode,
  nodes,
  edges,
  runtimeState,
  pathDebugSnapshot,
  updateSelectedNodeConfig,
  onSendToAi,
  sendingToAi,
  updaterSamples,
  setUpdaterSamples,
  updaterSampleLoading,
  handleFetchUpdaterSample,
  dbQueryPresets,
  setDbQueryPresets,
  saveDbQueryPresets,
  _dbNodePresets,
  _setDbNodePresets,
  _saveDbNodePresets,
  toast,
}: DatabaseNodeConfigSectionProps) {
  const [queryValidatorEnabled, setQueryValidatorEnabled] = React.useState(false);
  const [queryFormatterEnabled, setQueryFormatterEnabled] = React.useState(true);
  const [selectedQueryPresetId, setSelectedQueryPresetId] = React.useState<string>("");
  const [queryPresetName, setQueryPresetName] = React.useState<string>("");
  const [saveQueryPresetModalOpen, setSaveQueryPresetModalOpen] = React.useState(false);
  const [newQueryPresetName, setNewQueryPresetName] = React.useState<string>("");
  const [databaseTab, setDatabaseTab] = React.useState<"settings" | "constructor" | "presets">("settings");
  const [pendingAiQuery, setPendingAiQuery] = React.useState<string>("");
  const [aiQueries, setAiQueries] = React.useState<AiQuery[]>([]);
  const [selectedAiQueryId, setSelectedAiQueryId] = React.useState<string>("");
  const [testQueryResult, setTestQueryResult] = React.useState<string>("");
  const [testQueryLoading, setTestQueryLoading] = React.useState(false);
  const [testQueryDryRun, setTestQueryDryRun] = React.useState(false);
  const queryTemplateRef = React.useRef<HTMLTextAreaElement | null>(null);
  const aiPromptRef = React.useRef<HTMLTextAreaElement | null>(null);
  const lastInjectedResponseRef = React.useRef<string>("");
  const lastAutoFetchedRef = React.useRef<string>("");
  const incomingEdges = React.useMemo(
    () => edges.filter((edge) => edge.to === selectedNode.id),
    [edges, selectedNode.id]
  );
  const schemaConnection = React.useMemo(() => {
    if (selectedNode.type !== "database") {
      return { hasSchemaConnection: false, schemaConfig: null as SchemaConfig | null };
    }
    const schemaEdge = edges.find((edge) => {
      if (edge.to !== selectedNode.id) return false;
      const fromNode = nodes.find((node) => node.id === edge.from);
      return fromNode?.type === "db_schema";
    });
    if (!schemaEdge) {
      return { hasSchemaConnection: false, schemaConfig: null as SchemaConfig | null };
    }
    const schemaNode = nodes.find((node) => node.id === schemaEdge.from);
    return {
      hasSchemaConnection: Boolean(schemaNode?.type === "db_schema"),
      schemaConfig: (schemaNode?.config?.db_schema ?? null) as SchemaConfig | null,
    };
  }, [edges, nodes, selectedNode.id, selectedNode.type]);

  const schemaQuery = useQuery({
    queryKey: ["db-schema"],
    queryFn: async () => {
      const result = await dbApi.schema();
      if (!result.ok) {
        throw new Error(result.error || "Failed to fetch schema.");
      }
      return result.data as SchemaData;
    },
    enabled: schemaConnection.hasSchemaConnection && selectedNode.type === "database",
  });

  const fetchedDbSchema = React.useMemo(() => {
    if (!schemaConnection.hasSchemaConnection || !schemaQuery.data) return null;
    const schemaConfig = schemaConnection.schemaConfig;
    let collections = schemaQuery.data.collections;
    if (schemaConfig?.mode === "selected" && schemaConfig.collections?.length) {
      const selectedCollections = new Set(schemaConfig.collections);
      collections = collections.filter((c) => selectedCollections.has(c.name));
    }
    if (schemaConfig?.includeFields === false) {
      collections = collections.map((c) => ({ ...c, fields: [] }));
    }
    return { ...schemaQuery.data, collections };
  }, [schemaConnection.hasSchemaConnection, schemaConnection.schemaConfig, schemaQuery.data]);
  const schemaLoading = schemaQuery.isFetching;

  const dbActionMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const result = await dbApi.action<Record<string, unknown>>(payload as Parameters<typeof dbApi.action>[0]);
      if (!result.ok) {
        throw new Error(result.error || "Query failed");
      }
      return result.data;
    },
  });

  // Auto-intercept incoming signal data and fetch sample for Field Mapping
  React.useEffect(() => {
    if (selectedNode.type !== "database") return;

    const runtimeInputs = runtimeState.inputs[selectedNode.id] ?? {};

    // Extract potential entityId/productId from various sources
    let detectedId: string | undefined;
    let detectedCollection: string | undefined;

    // Check direct inputs
    if (typeof runtimeInputs.entityId === "string" && runtimeInputs.entityId.trim()) {
      detectedId = runtimeInputs.entityId.trim();
    } else if (typeof runtimeInputs.productId === "string" && runtimeInputs.productId.trim()) {
      detectedId = runtimeInputs.productId.trim();
    } else if (typeof runtimeInputs.value === "string" && runtimeInputs.value.trim()) {
      detectedId = runtimeInputs.value.trim();
    }

    // Check context input for nested entityId/entityType
    const contextInput = runtimeInputs.context;
    if (contextInput && typeof contextInput === "object") {
      const ctx = contextInput as Record<string, unknown>;
      if (!detectedId && typeof ctx.entityId === "string" && ctx.entityId.trim()) {
        detectedId = ctx.entityId.trim();
      }
      if (typeof ctx.entityType === "string" && ctx.entityType.trim()) {
        detectedCollection = ctx.entityType.trim();
      }
    }

    // Check for collection from inputs
    if (!detectedCollection) {
      if (typeof runtimeInputs.entityType === "string" && runtimeInputs.entityType.trim()) {
        detectedCollection = runtimeInputs.entityType.trim();
      } else if (typeof runtimeInputs.collection === "string" && runtimeInputs.collection.trim()) {
        detectedCollection = runtimeInputs.collection.trim();
      }
    }

    // Use the configured collection from queryConfig if not detected
    const persistedDatabase = selectedNode.config?.database;
    const queryCollection = persistedDatabase?.query?.collection ?? "products";
    const finalCollection = detectedCollection || queryCollection;

    // Only auto-fetch if we have an ID and it's different from last fetch
    if (!detectedId) return;

    const fetchKey = `${finalCollection}:${detectedId}`;
    if (fetchKey === lastAutoFetchedRef.current) return;

    // Check if we already have a sample for this node
    const existingSample = updaterSamples[selectedNode.id];
    if (existingSample?.entityId === detectedId && existingSample?.json?.trim()) return;

    lastAutoFetchedRef.current = fetchKey;

    // Auto-fetch the sample
    void handleFetchUpdaterSample(selectedNode.id, finalCollection, detectedId);
  }, [selectedNode.id, selectedNode.type, selectedNode.config?.database, runtimeState, updaterSamples, handleFetchUpdaterSample]);

  React.useEffect(() => {
    setSelectedQueryPresetId("");
    setQueryPresetName("");
    setDatabaseTab("settings");
    setQueryValidatorEnabled(false);
    setPendingAiQuery("");
    lastInjectedResponseRef.current = "";
    setTestQueryDryRun(false);
  }, [selectedNode.id]);

  React.useEffect(() => {
    if (selectedNode.type !== "database") return;
    const callbackValue = runtimeState.inputs[selectedNode.id]?.queryCallback
      ?? runtimeState.outputs[selectedNode.id]?.queryCallback;
    if (typeof callbackValue === "string" && callbackValue.trim().length > 0) {
      if (callbackValue !== lastInjectedResponseRef.current) {
        lastInjectedResponseRef.current = callbackValue;
        setPendingAiQuery(callbackValue);
        setDatabaseTab("constructor"); // Auto-switch to constructor tab to show pending query
        toast("AI query ready for review.", { variant: "success" });
      }
    }
  }, [selectedNode.id, selectedNode.type, runtimeState, toast]);

  React.useEffect(() => {
    if (!selectedQueryPresetId) return;
    const preset = dbQueryPresets.find((item) => item.id === selectedQueryPresetId);
    if (preset) {
      setQueryPresetName(preset.name);
    }
  }, [selectedQueryPresetId, dbQueryPresets]);

  if (selectedNode.type !== "database") return null;

                const defaultQuery: DbQueryConfig = {
                  provider: "mongodb",
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
                const inferredUseMongoActions =
                  persistedDatabase?.useMongoActions ??
                  Boolean(persistedDatabase?.actionCategory || persistedDatabase?.action);
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
                  updateStrategy: persistedDatabase?.updateStrategy ?? "one",
                  useMongoActions: inferredUseMongoActions,
                  actionCategory: persistedDatabase?.actionCategory,
                  action: persistedDatabase?.action,
                  distinctField: persistedDatabase?.distinctField ?? "",
                  updateTemplate: persistedDatabase?.updateTemplate ?? "",
                  mappings:
                    persistedDatabase?.mappings && persistedDatabase.mappings.length > 0
                      ? persistedDatabase.mappings
                      : defaultMappings,
                  query: {
                    ...defaultQuery,
                    ...(persistedDatabase?.query ?? {}),
                    provider: "mongodb",
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
                const deriveCategoryFromOperation = (op: string) => {
                  if (op === "insert") return "create";
                  if (op === "update") return "update";
                  if (op === "delete") return "delete";
                  return "read";
                };
                const queryConfig = databaseConfig.query ?? defaultQuery;
                const deriveActionFromCategory = (category: string, single: boolean) => {
                  switch (category) {
                    case "create":
                      return "insertOne";
                    case "update":
                      return "updateOne";
                    case "delete":
                      return "deleteOne";
                    case "aggregate":
                      return "aggregate";
                    default:
                      return single ? "findOne" : "find";
                  }
                };
                const derivedCategory = deriveCategoryFromOperation(databaseConfig.operation ?? "query");
                const actionCategory =
                  databaseConfig.useMongoActions
                    ? databaseConfig.actionCategory ?? derivedCategory
                    : derivedCategory;
                const action =
                  databaseConfig.useMongoActions
                    ? databaseConfig.action ?? deriveActionFromCategory(actionCategory, queryConfig.single ?? false)
                    : deriveActionFromCategory(actionCategory, queryConfig.single ?? false);
                const operation =
                  actionCategory === "create"
                    ? "insert"
                    : actionCategory === "update"
                      ? "update"
                        : actionCategory === "delete"
                          ? "delete"
                          : "query";
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

                // Build connected placeholders from actual inputs
                const connectedPlaceholders: string[] = [];
                const placeholderSet = new Set<string>();
                const addPlaceholder = (placeholder: string) => {
                  const trimmed = placeholder.trim();
                  if (!trimmed || placeholderSet.has(trimmed)) return;
                  placeholderSet.add(trimmed);
                  connectedPlaceholders.push(trimmed);
                };
                // Check if db_schema node is connected
                const hasSchemaConnection = schemaConnection.hasSchemaConnection;
                // Add direct port connections
                incomingPorts.forEach((port) => {
                  if (port === "bundle") {
                    // Bundle keys are handled separately below
                    return;
                  }
                  if (port === "result" && operation !== "update") {
                    // result is not a valid placeholder for database queries
                    return;
                  }
                  addPlaceholder(`{{${port}}}`);
                });
                // Add bundle keys as {{bundle.keyName}}
                bundleKeys.forEach((key) => {
                  addPlaceholder(`{{bundle.${key}}}`);
                });
                // Also add context keys if context is connected
                if (incomingPorts.includes("context")) {
                  incomingEdges.forEach((edge) => {
                    if (edge.toPort !== "context") return;
                    const fromNode = nodes.find((node) => node.id === edge.from);
                    if (!fromNode) return;
                    if (fromNode.type === "context") {
                      addPlaceholder("{{context.entityId}}");
                      addPlaceholder("{{context.entityType}}");
                    }
                  });
                }
                // Add meta keys if meta is connected
                if (incomingPorts.includes("meta")) {
                  addPlaceholder("{{meta.pathId}}");
                  addPlaceholder("{{meta.trigger}}");
                }
                // Add placeholders derived from mappings only when they map to a connected port
                mappings.forEach((mapping) => {
                  const sourcePort = mapping.sourcePort?.trim();
                  const sourcePath = mapping.sourcePath?.trim();
                  if (!sourcePort || !incomingPorts.includes(sourcePort)) return;
                  if (sourcePort === "result" && operation !== "update") return;

                  if (sourcePath) {
                    const prefix = sourcePort === "bundle" ? "bundle" : sourcePort;
                    addPlaceholder(`{{${prefix}.${sourcePath}}}`);
                    return;
                  }

                  if (sourcePort !== "bundle") {
                    addPlaceholder(`{{${sourcePort}}}`);
                  }
                });
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
                                  const presetOptions: DatabasePresetOption[] = [
                  {
                    id: "custom",
                    label: "Custom",
                    description: "Keep current settings and customize manually.",
                  },
                  {
                    id: "query_by_id",
                    label: "Query by ID",
                    description: "Flexible ID query (supports UUID, ObjectId, entityId).",
                  },
                  {
                    id: "query_recent_products",
                    label: "Query recent",
                    description: "Fetches newest documents sorted by createdAt.",
                  },
                  {
                    id: "query_name_contains",
                    label: "Search by name",
                    description: "Regex search on name field.",
                  },
                  {
                    id: "update_content_en_from_result",
                    label: "Update from result",
                    description: "Updates document field using incoming result.",
                  },
                  {
                    id: "delete_product_by_entity",
                    label: "Delete by ID",
                    description: "Deletes document using connected ID input.",
                  },
                  {
                    id: "insert_from_bundle",
                    label: "Insert from bundle",
                    description: "Creates new document from bundle payload.",
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
                const handleRenameDbPreset = async (presetId: string, nextName: string) => {
                  const name = (overrideName ?? queryPresetName).trim();
                  const filterTemplate = queryTemplateValue.trim();
                  const updateTemplate = (databaseConfig.updateTemplate ?? "").trim();
                  const requiredTemplate = isUpdateAction ? updateTemplate : filterTemplate;
                  if (!name) {
                    toast("Query preset name is required.", { variant: "error" });
                    return;
                  }
                  if (!requiredTemplate) {
                    toast(
                      isUpdateAction ? "Update document is empty." : "Query template is empty.",
                      { variant: "error" }
                    );
                    return;
                  }
                  setQueryPresetName(name);
                  const now = new Date().toISOString();
                  let nextPresets = [...dbQueryPresets];
                  const existingIndex = options?.forceNew
                    ? -1
                    : nextPresets.findIndex(
                        (preset) => preset.id === selectedQueryPresetId
                      );
                  if (existingIndex >= 0) {
                    const existingPreset = nextPresets[existingIndex]!;
                    nextPresets[existingIndex] = {
                      ...existingPreset,
                      name,
                      queryTemplate: filterTemplate || existingPreset.queryTemplate,
                      updateTemplate,
                      updatedAt: now,
                    };
                  } else {
                    const newPreset: DbQueryPreset = {
                      id: createPresetId(),
                      name,
                      queryTemplate: filterTemplate || "{\n  \"_id\": \"{{value}}\"\n}",
                      updateTemplate,
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
                const handleRenameQueryPreset = async (presetId: string, nextName: string) => {
                  const trimmed = nextName.trim();
                  if (!trimmed) {
                    toast("Query preset name is required.", { variant: "error" });
                    return;
                  }
                  const target = dbQueryPresets.find((preset) => preset.id === presetId);
                  if (!target) return;
                  if (target.name.trim() === trimmed) return;
                  const now = new Date().toISOString();
                  const nextPresets = dbQueryPresets.map((preset) =>
                    preset.id === presetId
                      ? { ...preset, name: trimmed, updatedAt: now }
                      : preset
                  );
                  setDbQueryPresets(nextPresets);
                  await saveDbQueryPresets(nextPresets);
                  if (selectedQueryPresetId === presetId) {
                    setQueryPresetName(trimmed);
                  }
                  toast("Query preset renamed.", { variant: "success" });
                };
                const handleDeleteQueryPresetById = async (presetId: string) => {
                  const target = dbQueryPresets.find((preset) => preset.id === presetId);
                  if (!target) return;
                  const confirmed = window.confirm(
                    `Delete query preset \"${target.name}\"?`
                  );
                  if (!confirmed) return;
                  const nextPresets = dbQueryPresets.filter(
                    (preset) => preset.id !== presetId
                  );
                  setDbQueryPresets(nextPresets);
                  await saveDbQueryPresets(nextPresets);
                  if (selectedQueryPresetId === presetId) {
                    setSelectedQueryPresetId("");
                    setQueryPresetName("");
                  }
                  toast("Query preset deleted.", { variant: "success" });
                };
                const closeSaveQueryPresetModal = () => {
                  setSaveQueryPresetModalOpen(false);
                  setNewQueryPresetName("");
                };
                const handleSaveQueryPresetFromModal = async () => {
                  const name = newQueryPresetName.trim();
                  const filterTemplate = queryTemplateValue.trim();
                  const updateTemplate = (databaseConfig.updateTemplate ?? "").trim();
                  const requiredTemplate = isUpdateAction ? updateTemplate : filterTemplate;
                  if (!name) {
                    toast("Query preset name is required.", { variant: "error" });
                    return;
                  }
                  if (!requiredTemplate) {
                    toast(
                      isUpdateAction ? "Update document is empty." : "Query template is empty.",
                      { variant: "error" }
                    );
                    return;
                  }
                  await handleSaveQueryPreset(name, { forceNew: true });
                  closeSaveQueryPresetModal();
                };
                const openSaveQueryPresetModal = () => {
                  setNewQueryPresetName("");
                  setSaveQueryPresetModalOpen(true);
                };
                const actionCategoryOptions = [
                  { value: "create", label: "Create" },
                  { value: "read", label: "Read" },
                  { value: "update", label: "Update" },
                  { value: "delete", label: "Delete" },
                  { value: "aggregate", label: "Aggregate" },
                ] as const;
                const actionOptionsByCategory = {
                  create: [
                    { value: "insertOne", label: "insertOne" },
                    { value: "insertMany", label: "insertMany" },
                  ],
                  read: [
                    { value: "find", label: "find" },
                    { value: "findOne", label: "findOne" },
                    { value: "countDocuments", label: "countDocuments" },
                    { value: "distinct", label: "distinct" },
                  ],
                  update: [
                    { value: "updateOne", label: "updateOne" },
                    { value: "updateMany", label: "updateMany" },
                    { value: "replaceOne", label: "replaceOne" },
                    { value: "findOneAndUpdate", label: "findOneAndUpdate" },
                  ],
                  delete: [
                    { value: "deleteOne", label: "deleteOne" },
                    { value: "deleteMany", label: "deleteMany" },
                    { value: "findOneAndDelete", label: "findOneAndDelete" },
                  ],
                  aggregate: [{ value: "aggregate", label: "aggregate" }],
                } as const;
                const actionOptions =
                  actionOptionsByCategory[
                    actionCategory as keyof typeof actionOptionsByCategory
                  ] ?? actionOptionsByCategory.read;
                const isReadAction = actionCategory === "read";
                const showFindControls = isReadAction && action === "find";
                const showFindOneControls = isReadAction && action === "findOne";
                const showQueryExtras = showFindControls || showFindOneControls;
                const showLimit = showFindControls;
                const showSort = showFindControls;
                const showProjection = showQueryExtras;
                const showSingleToggle = showFindControls;
                const showDistinctField =
                  databaseConfig.useMongoActions && isReadAction && action === "distinct";
                const isUpdateAction =
                  actionCategory === "update" &&
                  ["updateOne", "updateMany", "replaceOne", "findOneAndUpdate"].includes(action);
                const queryPlaceholder = getQueryPlaceholderByAction(action);
                const updateTemplateValue = databaseConfig.updateTemplate ?? "";
                const updatePlaceholder = getUpdatePlaceholderByAction(action);
                const activeQueryValue = isUpdateAction
                  ? updateTemplateValue
                  : queryTemplateValue;
                const activeQueryPlaceholder = isUpdateAction
                  ? updatePlaceholder
                  : queryPlaceholder;
                const queryValidation = queryValidatorEnabled
                  ? buildMongoQueryValidation(activeQueryValue)
                  : null;
                const applyActionConfig = (
                  nextCategory: DatabaseActionCategory,
                  nextAction: DatabaseAction
                ) => {
                  const nextOperation =
                    nextCategory === "create"
                      ? "insert"
                      : nextCategory === "update"
                        ? "update"
                        : nextCategory === "delete"
                          ? "delete"
                          : "query";
                  const nextQueryPatch: Partial<DbQueryConfig> = {};
                  if (nextCategory === "read") {
                    if (nextAction === "findOne") {
                      nextQueryPatch.single = true;
                    } else if (nextAction === "find") {
                      nextQueryPatch.single = false;
                    }
                  }
                  if (nextCategory === "aggregate") {
                    nextQueryPatch.single = false;
                    nextQueryPatch.mode = "custom";
                    if (!queryConfig.queryTemplate?.trim() || queryConfig.mode === "preset") {
                      nextQueryPatch.queryTemplate = "[]";
                    }
                  }
                  const nextUpdateStrategy =
                    nextAction === "updateMany"
                      ? "many"
                      : nextAction === "updateOne" ||
                        nextAction === "replaceOne" ||
                        nextAction === "findOneAndUpdate"
                        ? "one"
                        : databaseConfig.updateStrategy ?? "one";
                  updateSelectedNodeConfig({
                    database: {
                      ...databaseConfig,
                      useMongoActions: true,
                      actionCategory: nextCategory,
                      action: nextAction,
                      operation: nextOperation,
                      updateStrategy: nextUpdateStrategy,
                      query: {
                        ...queryConfig,
                        ...nextQueryPatch,
                      },
                    },
                  });
                };
                const handleActionCategoryChange = (value: DatabaseActionCategory) => {
                  const defaultAction =
                    actionOptionsByCategory[value]?.[0]
                      ?.value ?? "find";
                  applyActionConfig(value, defaultAction as DatabaseAction);
                };
                const handleActionChange = (value: DatabaseAction) => {
                  applyActionConfig(actionCategory, value);
                };
                const handleFormatClick = () => {
                  if (queryFormatterEnabled) {
                    const formatted = formatAndFixMongoQuery(activeQueryValue);
                    if (isUpdateAction) {
                      updateSelectedNodeConfig({
                        database: {
                          ...databaseConfig,
                          updateTemplate: formatted,
                        },
                      });
                    } else {
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
                };
                const handleFormatContextMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
                  event.preventDefault();
                  setQueryFormatterEnabled((prev) => !prev);
                };
                const handleToggleValidator = () => setQueryValidatorEnabled((prev) => !prev);
                const handleRunQuery = async () => {
                  if (!["read", "aggregate", "update", "create", "delete"].includes(actionCategory)) {
                    toast("Run is available for read, aggregate, create, update, and delete actions only.", { variant: "error" });
                    return;
                  }
                  setTestQueryLoading(true);
                  setTestQueryResult("");
                  try {
                    const runtimeInputs = (runtimeState.inputs[selectedNode.id] ?? {}) as Record<string, unknown>;
                    const runtimeOutputs = (runtimeState.outputs[selectedNode.id] ?? {}) as Record<string, unknown>;
                    const templateContext = { ...runtimeOutputs, ...runtimeInputs };
                    const rawValue =
                      runtimeInputs.value ??
                      runtimeInputs.jobId ??
                      runtimeOutputs.value ??
                      runtimeOutputs.jobId;
                    const currentValue = Array.isArray(rawValue) ? (rawValue as unknown[])[0] : rawValue;
                    const collectionName = queryConfig.collection ?? "products";
                    const serializePreview = (value: unknown) => {
                      try {
                        const raw = JSON.stringify(value, null, 2);
                        return raw.length > 600 ? `${raw.slice(0, 600)}...` : raw;
                      } catch {
                        return String(value);
                      }
                    };
                    const confirmWriteAction = (summary: string) => {
                      if (testQueryDryRun) return true;
                      return window.confirm(`${summary}\n\nProceed?`);
                    };
                    if (actionCategory === "create") {
                      const renderedPayload = renderTemplate(
                        activeQueryValue,
                        templateContext as Record<string, unknown>,
                        currentValue ?? ""
                      );
                      const parsedPayload = safeParseJson(renderedPayload);
                      const payloadValue = parsedPayload.value ?? null;
                      if (parsedPayload.error) {
                        const message = parsedPayload.error || "Insert payload must be valid JSON.";
                        setTestQueryResult(JSON.stringify({ error: message }, null, 2));
                        toast(message, { variant: "error" });
                        setTestQueryLoading(false);
                        return;
                      }
                      if (action === "insertOne") {
                        if (!payloadValue || typeof payloadValue !== "object" || Array.isArray(payloadValue)) {
                          const message = "insertOne requires a JSON object payload.";
                          setTestQueryResult(JSON.stringify({ error: message }, null, 2));
                          toast(message, { variant: "error" });
                          setTestQueryLoading(false);
                          return;
                        }
                      } else if (action === "insertMany") {
                        if (!Array.isArray(payloadValue)) {
                          const message = "insertMany requires a JSON array payload.";
                          setTestQueryResult(JSON.stringify({ error: message }, null, 2));
                          toast(message, { variant: "error" });
                          setTestQueryLoading(false);
                          return;
                        }
                      }
                      if (testQueryDryRun) {
                        const preview = {
                          dryRun: true,
                          action,
                          collection: collectionName,
                          payload: payloadValue,
                        };
                        setTestQueryResult(JSON.stringify(preview, null, 2));
                        toast("Dry run preview generated.", { variant: "success" });
                        setTestQueryLoading(false);
                        return;
                      }
                      const payloadSummary = serializePreview(payloadValue);
                      const confirmed = confirmWriteAction(
                        `Run ${action} on ${collectionName}?\n\nPayload:\n${payloadSummary}`
                      );
                      if (!confirmed) {
                        toast("Run cancelled.", { variant: "success" });
                        setTestQueryLoading(false);
                        return;
                      }
                      const data = await dbActionMutation.mutateAsync({
                        action,
                        collection: collectionName,
                        document: action === "insertOne" ? (payloadValue as Record<string, unknown>) : undefined,
                        documents: action === "insertMany" ? (payloadValue as unknown[]) : undefined,
                      });
                      setTestQueryResult(JSON.stringify(data, null, 2));
                      const insertedCount =
                        (data as { insertedCount?: number }).insertedCount ??
                        (Array.isArray(payloadValue) ? payloadValue.length : 1);
                      toast(`Inserted ${insertedCount} document${insertedCount === 1 ? "" : "s"}.`, { variant: "success" });
                      setTestQueryLoading(false);
                      return;
                    }

                    if (actionCategory === "delete") {
                      const renderedFilter = renderTemplate(
                        queryTemplateValue,
                        templateContext as Record<string, unknown>,
                        currentValue ?? ""
                      );
                      const parsedFilter = safeParseJson(renderedFilter);
                      const filterValue = parsedFilter.value ?? {};
                      if (parsedFilter.error) {
                        const message = parsedFilter.error || "Filter must be valid JSON.";
                        setTestQueryResult(JSON.stringify({ error: message }, null, 2));
                        toast(message, { variant: "error" });
                        setTestQueryLoading(false);
                        return;
                      }
                      if (!filterValue || typeof filterValue !== "object" || Array.isArray(filterValue)) {
                        const message = "Filter must be a JSON object.";
                        setTestQueryResult(JSON.stringify({ error: message }, null, 2));
                        toast(message, { variant: "error" });
                        setTestQueryLoading(false);
                        return;
                      }
                      if (Object.keys(filterValue as Record<string, unknown>).length === 0) {
                        const message = "Delete requires a non-empty filter.";
                        setTestQueryResult(JSON.stringify({ error: message }, null, 2));
                        toast(message, { variant: "error" });
                        setTestQueryLoading(false);
                        return;
                      }
                      if (testQueryDryRun) {
                        const preview = {
                          dryRun: true,
                          action,
                          collection: collectionName,
                          filter: filterValue,
                        };
                        setTestQueryResult(JSON.stringify(preview, null, 2));
                        toast("Dry run preview generated.", { variant: "success" });
                        setTestQueryLoading(false);
                        return;
                      }
                      const filterSummary = serializePreview(filterValue);
                      const confirmed = confirmWriteAction(
                        `Run ${action} on ${collectionName}?\n\nFilter:\n${filterSummary}`
                      );
                      if (!confirmed) {
                        toast("Run cancelled.", { variant: "success" });
                        setTestQueryLoading(false);
                        return;
                      }
                      const data = await dbActionMutation.mutateAsync({
                        action,
                        collection: collectionName,
                        filter: filterValue,
                        idType: queryConfig.idType ?? "string",
                      });
                      setTestQueryResult(JSON.stringify(data, null, 2));
                      const deletedCount =
                        (data as { deletedCount?: number }).deletedCount ??
                        ((data as { value?: unknown }).value ? 1 : 0);
                      toast(`Deleted ${deletedCount} document${deletedCount === 1 ? "" : "s"}.`, { variant: "success" });
                      setTestQueryLoading(false);
                      return;
                    }

                    if (actionCategory === "update") {
                      const renderedFilter = renderTemplate(
                        queryTemplateValue,
                        templateContext as Record<string, unknown>,
                        currentValue ?? ""
                      );
                      const parsedFilter = safeParseJson(renderedFilter);
                      const filterValue = parsedFilter.value ?? {};
                      if (parsedFilter.error) {
                        const message = parsedFilter.error || "Filter must be valid JSON.";
                        setTestQueryResult(JSON.stringify({ error: message }, null, 2));
                        toast(message, { variant: "error" });
                        setTestQueryLoading(false);
                        return;
                      }
                      if (!filterValue || typeof filterValue !== "object" || Array.isArray(filterValue)) {
                        const message = "Filter must be a JSON object.";
                        setTestQueryResult(JSON.stringify({ error: message }, null, 2));
                        toast(message, { variant: "error" });
                        setTestQueryLoading(false);
                        return;
                      }
                      if (Object.keys(filterValue as Record<string, unknown>).length === 0) {
                        const message = "Update requires a non-empty filter.";
                        setTestQueryResult(JSON.stringify({ error: message }, null, 2));
                        toast(message, { variant: "error" });
                        setTestQueryLoading(false);
                        return;
                      }
                      const renderedUpdate = renderTemplate(
                        activeQueryValue,
                        templateContext as Record<string, unknown>,
                        currentValue ?? ""
                      );
                      const parsedUpdate = safeParseJson(renderedUpdate);
                      const updateValue = parsedUpdate.value ?? null;
                      if (parsedUpdate.error) {
                        const message = parsedUpdate.error || "Update document must be valid JSON.";
                        setTestQueryResult(JSON.stringify({ error: message }, null, 2));
                        toast(message, { variant: "error" });
                        setTestQueryLoading(false);
                        return;
                      }
                      if (!updateValue || (typeof updateValue !== "object" && !Array.isArray(updateValue))) {
                        const message = "Update document must be a JSON object or pipeline array.";
                        setTestQueryResult(JSON.stringify({ error: message }, null, 2));
                        toast(message, { variant: "error" });
                        setTestQueryLoading(false);
                        return;
                      }
                      if (action === "replaceOne" && Array.isArray(updateValue)) {
                        const message = "replaceOne requires a JSON object (not a pipeline array).";
                        setTestQueryResult(JSON.stringify({ error: message }, null, 2));
                        toast(message, { variant: "error" });
                        setTestQueryLoading(false);
                        return;
                      }
                      if (testQueryDryRun) {
                        const preview = {
                          dryRun: true,
                          action,
                          collection: collectionName,
                          filter: filterValue,
                          update: updateValue,
                        };
                        setTestQueryResult(JSON.stringify(preview, null, 2));
                        toast("Dry run preview generated.", { variant: "success" });
                        setTestQueryLoading(false);
                        return;
                      }
                      const filterSummary = serializePreview(filterValue);
                      const updateSummary = serializePreview(updateValue);
                      const confirmed = confirmWriteAction(
                        `Run ${action} on ${collectionName}?\n\nFilter:\n${filterSummary}\n\nUpdate:\n${updateSummary}`
                      );
                      if (!confirmed) {
                        toast("Run cancelled.", { variant: "success" });
                        setTestQueryLoading(false);
                        return;
                      }
                      const data = await dbActionMutation.mutateAsync({
                        action,
                        collection: collectionName,
                        filter: filterValue,
                        update: updateValue,
                        idType: queryConfig.idType ?? "string",
                      });
                      setTestQueryResult(JSON.stringify(data, null, 2));
                      const matched = (data as { matchedCount?: number }).matchedCount ?? 0;
                      const modified = (data as { modifiedCount?: number }).modifiedCount;
                      const count = modified ?? matched;
                      toast(`Update processed ${count} document${count === 1 ? "" : "s"}.`, { variant: "success" });
                      setTestQueryLoading(false);
                      return;
                    }

                    const renderedQuery = renderTemplate(
                      queryTemplateValue,
                      templateContext as Record<string, unknown>,
                      currentValue ?? ""
                    );
                    const parsedQuery = safeParseJson(renderedQuery);
                    const parsedValue = parsedQuery.value ?? {};
                    if (parsedQuery.error && actionCategory !== "read" && actionCategory !== "aggregate") {
                      const message = parsedQuery.error || "Query template must be valid JSON.";
                      setTestQueryResult(JSON.stringify({ error: message }, null, 2));
                      toast(message, { variant: "error" });
                      setTestQueryLoading(false);
                      return;
                    }
                    if (
                      actionCategory === "read" &&
                      (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue))
                    ) {
                      const message = "Read filter must be a JSON object.";
                      setTestQueryResult(JSON.stringify({ error: message }, null, 2));
                      toast(message, { variant: "error" });
                      setTestQueryLoading(false);
                      return;
                    }
                    if (actionCategory === "aggregate" && !Array.isArray(parsedValue)) {
                      const message = parsedQuery.error || "Aggregation pipeline must be a JSON array.";
                      setTestQueryResult(JSON.stringify({ error: message }, null, 2));
                      toast(message, { variant: "error" });
                      setTestQueryLoading(false);
                      return;
                    }
                    if (action === "distinct" && !databaseConfig.distinctField?.trim()) {
                      const message = "Distinct requires a field name.";
                      setTestQueryResult(JSON.stringify({ error: message }, null, 2));
                      toast(message, { variant: "error" });
                      setTestQueryLoading(false);
                      return;
                    }
                    const parsedProjection = queryConfig.projection
                      ? safeParseJson(queryConfig.projection).value
                      : null;
                    const parsedSort = queryConfig.sort
                      ? safeParseJson(queryConfig.sort).value
                      : null;
                    const projection =
                      parsedProjection && typeof parsedProjection === "object"
                        ? parsedProjection
                        : undefined;
                    const sort =
                      parsedSort && typeof parsedSort === "object" ? parsedSort : undefined;
                    const data = await dbActionMutation.mutateAsync({
                      action,
                      collection: queryConfig.collection ?? "products",
                      filter: actionCategory === "aggregate" ? undefined : parsedValue,
                      pipeline: actionCategory === "aggregate" ? parsedValue : undefined,
                      projection,
                      sort,
                      limit: queryConfig.limit ?? 20,
                      idType: queryConfig.idType ?? "string",
                      distinctField: databaseConfig.distinctField?.trim() || undefined,
                    });
                    const resultData =
                      data.item ?? data.items ?? data.values ?? data.result ?? data;
                    setTestQueryResult(JSON.stringify(resultData, null, 2));
                    const count =
                      (data as { count?: number }).count ??
                      (Array.isArray(resultData) ? resultData.length : 1);
                    toast(`Query returned ${count} result(s)`, { variant: "success" });
                  } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : "Failed to execute query";
                    setTestQueryResult(JSON.stringify({ error: errorMessage }, null, 2));
                    toast(errorMessage, { variant: "error" });
                  } finally {
                    setTestQueryLoading(false);
                  }
                };
                const handleQueryChange = (value: string) => {
                  if (isUpdateAction) {
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        useMongoActions: true,
                        actionCategory,
                        action,
                        operation: "update",
                        updateTemplate: value,
                      },
                    });
                    return;
                  }
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
                          queryTemplate: value,
                        },
                      },
                    });
                  } else {
                    if (isUpdateAction) {
                      updateSelectedNodeConfig({
                        database: {
                          ...databaseConfig,
                          useMongoActions: true,
                          actionCategory,
                          action,
                          operation: "update",
                          query: {
                            ...queryConfig,
                            mode: "custom",
                            queryTemplate: value,
                          },
                        },
                      });
                      return;
                    }
                    updateQueryConfig({
                      mode: "custom",
                      queryTemplate: value,
                    });
                  }
                };
                const handleFilterChange = (value: string) => {
                  const currentPresetId = databaseConfig.presetId ?? "custom";
                  const currentAiQueryId = selectedAiQueryId;

                  if (currentPresetId !== "custom" || currentAiQueryId) {
                    setSelectedAiQueryId("");
                    updateSelectedNodeConfig({
                      database: {
                        ...databaseConfig,
                        ...(isUpdateAction
                          ? {
                              useMongoActions: true,
                              actionCategory,
                              action,
                              operation: "update",
                            }
                          : null),
                        presetId: "custom",
                        query: {
                          ...queryConfig,
                          mode: "custom",
                          queryTemplate: value,
                        },
                      },
                    });
                  } else {
                    updateQueryConfig({
                      mode: "custom",
                      queryTemplate: value,
                    });
                  }
                };
                // Shared query input controls (used in both Query and Constructor tabs)
                const queryInputControls = (
                  <DatabaseQueryInputControls
                    actionCategory={actionCategory}
                    action={action}
                                      actionCategoryOptions={[...actionCategoryOptions]}
                
                    actionOptions={[...actionOptions]}
                    queryTemplateValue={activeQueryValue}
                    queryPlaceholder={activeQueryPlaceholder}
                    showFilterInput={isUpdateAction}
                    filterTemplateValue={queryTemplateValue}
                    filterPlaceholder={queryPlaceholder}
                    onFilterChange={handleFilterChange}
                    runDry={testQueryDryRun}
                    onToggleRunDry={() => setTestQueryDryRun((prev) => !prev)}
                    queryValidation={queryValidation}
                    queryFormatterEnabled={queryFormatterEnabled}
                    queryValidatorEnabled={queryValidatorEnabled}
                    testQueryLoading={testQueryLoading}
                    queryTemplateRef={queryTemplateRef}
                    onActionCategoryChange={(value) => handleActionCategoryChange(value)}
                    onActionChange={(value) => handleActionChange(value)}
                    onFormatClick={handleFormatClick}
                    onFormatContextMenu={handleFormatContextMenu}
                    onToggleValidator={handleToggleValidator}
                    onRunQuery={() => void handleRunQuery()}
                    onQueryChange={handleQueryChange}
                  />
                );
                const liveDebugPayload = (runtimeState.outputs[selectedNode.id] as
                  | { debugPayload?: unknown }
                  | undefined)?.debugPayload;
                const persistedDebugEntry = pathDebugSnapshot?.entries?.find(
                  (entry) => entry.nodeId === selectedNode.id
                );
                const debugPayload = liveDebugPayload ?? persistedDebugEntry?.debug;
                const debugRunAt =
                  liveDebugPayload || !pathDebugSnapshot?.runAt
                    ? null
                    : pathDebugSnapshot.runAt;
                const hasDebugPayload = debugPayload !== undefined && debugPayload !== null;

                const queryEditor = (
                  <div className="space-y-4 rounded-md border border-border bg-card/40 p-3">
                    <div>
                      {queryInputControls}
                      {/* Query Result Display */}
                      {testQueryResult && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-gray-400">Query Result</Label>
                            <Button
                              type="button"
                              className="h-6 rounded-md border px-2 text-[10px] text-gray-400 hover:bg-muted/50"
                              onClick={() => setTestQueryResult("")}
                            >
                              Clear
                            </Button>
                          </div>
                          <Textarea
                            className="min-h-[120px] w-full rounded-md border border-cyan-800/50 bg-card/70 font-mono text-xs text-cyan-100"
                            value={testQueryResult}
                            readOnly
                            placeholder="Query results will appear here..."
                          />
                        </div>
                      )}
                    </div>
                    {queryValidatorEnabled && queryValidation && (
                      <DatabaseQueryValidatorPanel
                        queryValidation={queryValidation}
                        queryConfig={queryConfig}
                        operation={operation}
                        queryTemplateValue={queryTemplateValue}
                        databaseConfig={databaseConfig}
                        selectedNode={selectedNode}
                        nodes={nodes}
                        edges={edges}
                        updateSelectedNodeConfig={updateSelectedNodeConfig}
                        toast={toast}
                      />
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs text-gray-400">Provider</Label>
                        <Select value="mongodb" disabled>
                          <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent className="border-border bg-gray-900">
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
                          <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                            <SelectValue placeholder="Select collection" />
                          </SelectTrigger>
                          <SelectContent className="border-border bg-gray-900 max-h-60 overflow-y-auto">
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
                            className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
                            value={queryConfig.collection}
                            onChange={(event) =>
                              updateQueryConfig({ collection: event.target.value })
                            }
                            placeholder="collection_name"
                          />
                        )}
                      </div>
                    </div>
                    {showLimit && (
                      <div>
                        <Label className="text-xs text-gray-400">Limit</Label>
                        <Input
                          type="number"
                          step="1"
                          className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
                          value={queryConfig.limit}
                          onChange={(event) =>
                            updateQueryConfig({
                              limit: toNumber(event.target.value, queryConfig.limit),
                            })
                          }
                        />
                      </div>
                    )}
                    {showSort && (
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
                            <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                              <SelectValue placeholder="Select preset" />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-gray-900">
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
                            className="mt-2 min-h-[80px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
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
                        {showProjection && (
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
                            <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                              <SelectValue placeholder="Select preset" />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-gray-900">
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
                            className="mt-2 min-h-[80px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
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
                        )}
                      </div>
                    )}
                    {showProjection && !showSort && (
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
                          <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                            <SelectValue placeholder="Select preset" />
                          </SelectTrigger>
                          <SelectContent className="border-border bg-gray-900">
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
                          className="mt-2 min-h-[80px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
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
                    )}
                    {showDistinctField && (
                      <div>
                        <Label className="text-xs text-gray-400">Distinct field</Label>
                        <Input
                          className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
                          value={databaseConfig.distinctField ?? ""}
                          onChange={(event) =>
                            updateSelectedNodeConfig({
                              database: {
                                ...databaseConfig,
                                distinctField: event.target.value,
                              },
                            })
                          }
                          placeholder="fieldName"
                        />
                      </div>
                    )}
                    {showSingleToggle && (
                      <div className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300">
                        <span>Single result</span>
                        <Button
                          type="button"
                          className={`rounded border px-3 py-1 text-xs ${
                            queryConfig.single
                              ? "text-emerald-200 hover:bg-emerald-500/10"
                              : "text-gray-300 hover:bg-muted/50"
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

                return (
                  <>
                  <Tabs
                    value={databaseTab}
                    onValueChange={(value) => setDatabaseTab(value as "settings" | "constructor" | "presets")}
                    className="space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                  <TabsList className="justify-start border border-border bg-card/60">
                    <TabsTrigger value="settings">Query</TabsTrigger>
                    <TabsTrigger value="constructor">Constructor</TabsTrigger>
                    <TabsTrigger value="presets">Presets</TabsTrigger>
                  </TabsList>
                  <div
                    className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wide ${
                      databaseConfig.useMongoActions
                            ? "border-emerald-700/60 bg-emerald-500/10 text-emerald-200"
                            : "border-amber-700/60 bg-amber-500/10 text-amber-200"
                        }`}
                        title={
                          databaseConfig.useMongoActions
                            ? "Mongo Actions enabled (filter + update document)"
                            : "Legacy update mode (mappings only)"
                        }
                      >
                        Mongo Actions: {databaseConfig.useMongoActions ? "On" : "Off"}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-card/50 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-400">
                          Last Runtime Debug
                          {debugRunAt
                            ? ` • Saved ${new Date(debugRunAt).toLocaleString()}`
                            : ""}
                        </Label>
                        <Button
                          type="button"
                          className="h-6 rounded-md border px-2 text-[10px] text-gray-400 hover:bg-muted/50 disabled:opacity-50"
                          disabled={!hasDebugPayload}
                          onClick={() => {
                            if (!hasDebugPayload) return;
                            try {
                              const payload = JSON.stringify(debugPayload, null, 2);
                              void navigator.clipboard.writeText(payload);
                              toast("Debug payload copied.", { variant: "success" });
                            } catch {
                              toast("Failed to copy debug payload.", { variant: "error" });
                            }
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                      <Textarea
                        className="mt-2 min-h-[110px] w-full rounded-md border border-amber-800/50 bg-card/70 font-mono text-xs text-amber-100"
                        value={hasDebugPayload ? JSON.stringify(debugPayload, null, 2) : ""}
                        readOnly
                        placeholder="Run the path trigger to capture debug output..."
                      />
                    </div>
                    <TabsContent value="settings">
                      <DatabaseSettingsTab
                        queryEditor={queryEditor}
                        availablePorts={availablePorts}
                        bundleKeys={bundleKeys}
                        operation={operation}
                        databaseConfig={databaseConfig}
                        writeSource={writeSource}
                        updateSelectedNodeConfig={updateSelectedNodeConfig}
                      />
                </TabsContent>
                <TabsContent value="constructor">
                  <DatabaseConstructorTab
                    queryInputControls={queryInputControls}
                    pendingAiQuery={pendingAiQuery}
                    setPendingAiQuery={setPendingAiQuery}
                    aiQueries={aiQueries}
                    setAiQueries={setAiQueries}
                    selectedAiQueryId={selectedAiQueryId}
                    setSelectedAiQueryId={setSelectedAiQueryId}
                    presetOptions={presetOptions}
                    applyDatabasePreset={applyDatabasePreset}
                    openSaveQueryPresetModal={openSaveQueryPresetModal}
                    databaseConfig={databaseConfig}
                    queryConfig={queryConfig}
                    operation={operation}
                    queryTemplateValue={activeQueryValue}
                    queryTemplateRef={queryTemplateRef}
                    sampleState={sampleState}
                    parsedSampleError={parsedSample.error}
                    updaterSampleLoading={updaterSampleLoading}
                    selectedNodeId={selectedNode.id}
                    setUpdaterSamples={setUpdaterSamples}
                    onFetchUpdaterSample={handleFetchUpdaterSample}
                    updateSelectedNodeConfig={updateSelectedNodeConfig}
                    updateQueryConfig={updateQueryConfig}
                    connectedPlaceholders={connectedPlaceholders}
                    hasSchemaConnection={hasSchemaConnection}
                    fetchedDbSchema={fetchedDbSchema}
                    schemaLoading={schemaLoading}
                    nodes={nodes}
                    edges={edges}
                    selectedNode={selectedNode}
                    runtimeState={runtimeState}
                    onSendToAi={onSendToAi}
                    sendingToAi={sendingToAi}
                    mapInputsToTargets={mapInputsToTargets}
                    bundleKeys={bundleKeys}
                    toast={toast}
                    aiPromptRef={aiPromptRef}
                    mappings={mappings}
                    updateMapping={updateMapping}
                    removeMapping={removeMapping}
                    addMapping={addMapping}
                    availablePorts={availablePorts}
                    uniqueTargetPathOptions={uniqueTargetPathOptions}
                  />
                </TabsContent>
                <TabsContent value="presets">
                  <DatabasePresetsTab
                    dbQueryPresets={dbQueryPresets}
                    builtInPresets={presetOptions}
                    onApplyBuiltInPreset={applyDatabasePreset}
                    onRenameQueryPreset={handleRenameQueryPreset}
                    onDeleteQueryPreset={handleDeleteQueryPresetById}
                  />
                </TabsContent>
              </Tabs>
              <DatabaseSaveQueryPresetDialog
                open={saveQueryPresetModalOpen}
                onOpenChange={(open) => {
                  if (!open) {
                    closeSaveQueryPresetModal();
                    return;
                  }
                  setSaveQueryPresetModalOpen(true);
                }}
                newQueryPresetName={newQueryPresetName}
                setNewQueryPresetName={setNewQueryPresetName}
                queryTemplateValue={queryTemplateValue}
                onCancel={closeSaveQueryPresetModal}
                onSave={() => void handleSaveQueryPresetFromModal()}
              />
            </>
                );
            
}
