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
  UpdaterSampleState,
} from "@/features/ai-paths/lib";
import {
  DB_COLLECTION_OPTIONS,
  createParserMappings,
  createPresetId,
  extractJsonPathEntries,
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
  getQueryPlaceholderByOperation,
} from "./database/query-utils";
import type { AiQuery, DatabasePresetOption, SchemaData } from "./database/types";

type DatabaseNodeConfigSectionProps = {
  selectedNode: AiNode;
  nodes: AiNode[];
  edges: Edge[];
  runtimeState: RuntimeState;
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
  const [aiQueries, setAiQueries] = React.useState<AiQuery[]>([]);
  const [selectedAiQueryId, setSelectedAiQueryId] = React.useState<string>("");
  const [fetchedDbSchema, setFetchedDbSchema] = React.useState<SchemaData | null>(null);
  const [schemaLoading, setSchemaLoading] = React.useState(false);
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
                                  const presetOptions: DatabasePresetOption[] = [
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
                const handleSaveQueryPreset = async (overrideName?: string) => {
                  const name = (overrideName ?? queryPresetName).trim();
                  const template = queryTemplateValue.trim();
                  if (!name) {
                    toast("Query preset name is required.", { variant: "error" });
                    return;
                  }
                  if (!template) {
                    toast("Query template is empty.", { variant: "error" });
                    return;
                  }
                  setQueryPresetName(name);
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
                const closeSaveQueryPresetModal = () => {
                  setSaveQueryPresetModalOpen(false);
                  setNewQueryPresetName("");
                };
                const handleSaveQueryPresetFromModal = async () => {
                  const name = newQueryPresetName.trim();
                  const template = queryTemplateValue.trim();
                  if (!name) {
                    toast("Query preset name is required.", { variant: "error" });
                    return;
                  }
                  if (!template) {
                    toast("Query template is empty.", { variant: "error" });
                    return;
                  }
                  await handleSaveQueryPreset(name);
                  closeSaveQueryPresetModal();
                };
                const openSaveQueryPresetModal = () => {
                  setNewQueryPresetName("");
                  setSaveQueryPresetModalOpen(true);
                };
                const showQueryExtras = operation === "query";
                const queryPlaceholder = getQueryPlaceholderByOperation(operation);
                const handleOperationChange = (value: DatabaseOperation) => {
                  updateSelectedNodeConfig({
                    database: {
                      ...databaseConfig,
                      operation: value,
                    },
                  });
                };
                const handleFormatClick = () => {
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
                };
                const handleFormatContextMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
                  event.preventDefault();
                  setQueryFormatterEnabled((prev) => !prev);
                };
                const handleToggleValidator = () => setQueryValidatorEnabled((prev) => !prev);
                const handleRunQuery = async () => {
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
                };
                const handleQueryChange = (value: string) => {
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
                    updateQueryConfig({
                      mode: "custom",
                      queryTemplate: value,
                    });
                  }
                };
                // Shared query input controls (used in both Query and Constructor tabs)
                const queryInputControls = (
                  <DatabaseQueryInputControls
                    operation={operation}
                    queryTemplateValue={queryTemplateValue}
                    queryPlaceholder={queryPlaceholder}
                    queryValidation={queryValidation}
                    queryFormatterEnabled={queryFormatterEnabled}
                    queryValidatorEnabled={queryValidatorEnabled}
                    testQueryLoading={testQueryLoading}
                    queryTemplateRef={queryTemplateRef}
                    onOperationChange={handleOperationChange}
                    onFormatClick={handleFormatClick}
                    onFormatContextMenu={handleFormatContextMenu}
                    onToggleValidator={handleToggleValidator}
                    onRunQuery={() => void handleRunQuery()}
                    onQueryChange={handleQueryChange}
                  />
                );

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

                return (
                  <>
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
                      <DatabaseSettingsTab
                        queryEditor={queryEditor}
                        mappings={mappings}
                        updateMapping={updateMapping}
                        removeMapping={removeMapping}
                        addMapping={addMapping}
                        availablePorts={availablePorts}
                        uniqueTargetPathOptions={uniqueTargetPathOptions}
                        bundleKeys={bundleKeys}
                        operation={operation}
                        databaseConfig={databaseConfig}
                        writeSource={writeSource}
                        sampleState={sampleState}
                        parsedSampleError={parsedSample.error}
                        updaterSampleLoading={updaterSampleLoading}
                        selectedNodeId={selectedNode.id}
                        setUpdaterSamples={setUpdaterSamples}
                        onFetchUpdaterSample={handleFetchUpdaterSample}
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
                    queryTemplateValue={queryTemplateValue}
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
                  />
                </TabsContent>
                <TabsContent value="presets">
                  <DatabasePresetsTab
                    dbNodePresets={dbNodePresets}
                    selectedDbPresetId={selectedDbPresetId}
                    setSelectedDbPresetId={setSelectedDbPresetId}
                    dbPresetName={dbPresetName}
                    setDbPresetName={setDbPresetName}
                    dbPresetDescription={dbPresetDescription}
                    setDbPresetDescription={setDbPresetDescription}
                    selectedDbPreset={selectedDbPreset}
                    handleApplyDbPreset={handleApplyDbPreset}
                    handleSaveDbPreset={handleSaveDbPreset}
                    handleDeleteDbPreset={handleDeleteDbPreset}
                    dbQueryPresets={dbQueryPresets}
                    selectedQueryPresetId={selectedQueryPresetId}
                    setSelectedQueryPresetId={setSelectedQueryPresetId}
                    queryPresetName={queryPresetName}
                    setQueryPresetName={setQueryPresetName}
                    selectedQueryPreset={selectedQueryPreset}
                    handleSaveQueryPreset={handleSaveQueryPreset}
                    handleDeleteQueryPreset={handleDeleteQueryPreset}
                    queryTemplateValue={queryTemplateValue}
                    queryTemplateRef={queryTemplateRef}
                    setDatabaseTab={setDatabaseTab}
                    updateSelectedNodeConfig={updateSelectedNodeConfig}
                    databaseConfig={databaseConfig}
                    queryConfig={queryConfig}
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
