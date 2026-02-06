"use client";

import React from "react";
import { Button, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input, Dialog, DialogContent, DialogHeader, DialogTitle, Tooltip } from "@/shared/ui";
import { ChevronUp, ChevronDown, LayoutGrid } from "lucide-react";
import type {
  AiNode,
  DatabaseConfig,
  DatabaseOperation,
  DbQueryConfig,
  Edge,
  NodeConfig,
  RuntimeState,
  UpdaterMapping,
  UpdaterSampleState,
} from "@/features/ai/ai-paths/lib";
import { formatPortLabel } from "@/features/ai/ai-paths/utils/ui-utils";
import {
  TEMPLATE_SNIPPETS,
  PRISMA_TEMPLATE_SNIPPETS,
  SORT_PRESETS,
  PRISMA_SORT_PRESETS,
  PROJECTION_PRESETS,
  PRISMA_PROJECTION_PRESETS,
  READ_QUERY_TYPES,
  PRISMA_READ_QUERY_TYPES,
  QUERY_OPERATOR_GROUPS,
  PRISMA_QUERY_OPERATOR_GROUPS,
  UPDATE_OPERATOR_GROUPS,
  PRISMA_UPDATE_OPERATOR_GROUPS,
  AGGREGATION_STAGE_SNIPPETS,
  PRISMA_AGGREGATION_STAGE_SNIPPETS,
} from "@/features/ai/ai-paths/config/query-presets";
import { DB_PROVIDER_PLACEHOLDERS } from "@/features/ai/ai-paths/lib";
import type { AiQuery, CollectionSchema, DatabasePresetOption, FieldSchema, SchemaData } from "./types";
import { PlaceholderMatrixDialog, type PlaceholderGroup, type PlaceholderTarget } from "./PlaceholderMatrixDialog";

/** Extract code blocks from markdown-style ``` delimiters */
function extractCodeSnippets(text: string): string[] {
  const regex = /```[\w]*\n?([\s\S]*?)```/g;
  const snippets: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const code = match[1]?.trim();
    if (code) snippets.push(code);
  }
  return snippets;
}

const toTitleCase = (value: string): string =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const singularize = (value: string): string => {
  if (value.endsWith("ies") && value.length > 3) {
    return `${value.slice(0, -3)}y`;
  }
  if (value.endsWith("ses") && value.length > 3) {
    return value.slice(0, -2);
  }
  if (value.endsWith("s") && !value.endsWith("ss") && value.length > 1) {
    return value.slice(0, -1);
  }
  return value;
};

const normalizeSchemaType = (value: string): string => {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  if (lower === "string") return "string";
  if (lower === "int" || lower === "float" || lower === "decimal" || lower === "number") return "number";
  if (lower === "boolean" || lower === "bool") return "boolean";
  if (lower === "datetime" || lower === "date") return "string";
  if (lower === "json") return "Record<string, unknown>";
  return normalized || "unknown";
};

const formatCollectionSchema = (collectionName: string, fields: FieldSchema[]): string => {
  const interfaceName = toTitleCase(singularize(collectionName));
  if (!fields || fields.length === 0) {
    return `interface ${interfaceName} {}`;
  }
  const lines = fields.map((field: FieldSchema) => `  ${field.name}: ${normalizeSchemaType(field.type)};`);
  return `interface ${interfaceName} {\n${lines.join("\n")}\n}`;
};

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
  queryTemplateRef?: React.RefObject<HTMLTextAreaElement | null>;
  sampleState: UpdaterSampleState;
  parsedSampleError?: string;
  updaterSampleLoading: boolean;
  selectedNodeId: string;
  setUpdaterSamples: React.Dispatch<
    React.SetStateAction<Record<string, UpdaterSampleState>>
  >;
  onFetchUpdaterSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  updateQueryConfig: (patch: Partial<DbQueryConfig>) => void;
  connectedPlaceholders: string[];
  hasSchemaConnection: boolean;
  fetchedDbSchema: SchemaData | null;
  schemaMatrix: SchemaData | null;
  onSyncSchema?: () => void;
  schemaSyncing?: boolean;
  schemaLoading: boolean;
  nodes: AiNode[];
  edges: Edge[];
  selectedNode: AiNode;
  runtimeState: RuntimeState;
  onSendToAi?: ((databaseNodeId: string, prompt: string) => Promise<void>) | undefined;
  sendingToAi?: boolean | undefined;
  mapInputsToTargets: () => void;
  bundleKeys: Set<string>;
  toast: (message: string, options?: { variant?: "success" | "error" }) => void;
  aiPromptRef?: React.RefObject<HTMLTextAreaElement | null>;
  mappings: UpdaterMapping[];
  updateMapping: (index: number, patch: Partial<UpdaterMapping>) => void;
  removeMapping: (index: number) => void;
  addMapping: () => void;
  availablePorts: string[];
  uniqueTargetPathOptions: Array<{ label: string; value: string }>;
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
  queryTemplateRef,
  sampleState,
  parsedSampleError,
  updaterSampleLoading,
  selectedNodeId,
  setUpdaterSamples,
  onFetchUpdaterSample,
  updateSelectedNodeConfig,
  updateQueryConfig,
  connectedPlaceholders,
  hasSchemaConnection,
  fetchedDbSchema,
  schemaMatrix,
  onSyncSchema,
  schemaSyncing,
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
  mappings,
  updateMapping,
  removeMapping,
  addMapping,
  availablePorts,
  uniqueTargetPathOptions,
}: DatabaseConstructorTabProps): React.JSX.Element {
  const isUpdateAction =
    databaseConfig.useMongoActions && databaseConfig.actionCategory === "update";
  const isPrismaProvider = queryConfig.provider === "prisma";
  const providerLabel = isPrismaProvider ? "Prisma" : "MongoDB";
  const templateSnippets = isPrismaProvider ? PRISMA_TEMPLATE_SNIPPETS : TEMPLATE_SNIPPETS;
  const readQueryTypes = isPrismaProvider ? PRISMA_READ_QUERY_TYPES : READ_QUERY_TYPES;
  const queryOperatorGroups = isPrismaProvider ? PRISMA_QUERY_OPERATOR_GROUPS : QUERY_OPERATOR_GROUPS;
  const updateOperatorGroups = isPrismaProvider ? PRISMA_UPDATE_OPERATOR_GROUPS : UPDATE_OPERATOR_GROUPS;
  const aggregationStageSnippets = isPrismaProvider
    ? PRISMA_AGGREGATION_STAGE_SNIPPETS
    : AGGREGATION_STAGE_SNIPPETS;
  const sortPresets = isPrismaProvider ? PRISMA_SORT_PRESETS : SORT_PRESETS;
  const projectionPresets = isPrismaProvider ? PRISMA_PROJECTION_PRESETS : PROJECTION_PRESETS;
  // State for code snippet navigation in AI responses
  const [selectedSnippetIndex, setSelectedSnippetIndex] = React.useState<number>(-1);
  // State for template snippets modal
  const [snippetsModalOpen, setSnippetsModalOpen] = React.useState<boolean>(false);
  const [placeholderMatrixOpen, setPlaceholderMatrixOpen] = React.useState<boolean>(false);
  const [placeholderTarget, setPlaceholderTarget] = React.useState<PlaceholderTarget>("query");

  // Extract code snippets from pending AI query
  const codeSnippets = React.useMemo((): string[] => {
    if (!pendingAiQuery) return [];
    return extractCodeSnippets(pendingAiQuery);
  }, [pendingAiQuery]);

  // Reset snippet selection when pending query changes
  React.useEffect((): void => {
    setSelectedSnippetIndex((_prev: number): number => codeSnippets.length > 0 ? 0 : -1);
  }, [pendingAiQuery, codeSnippets.length]);

  const applyQueryTemplateUpdate = (nextQuery: string): void => {
    if (isUpdateAction) {
      updateSelectedNodeConfig({
        database: {
          ...databaseConfig,
          updateTemplate: nextQuery,
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
            queryTemplate: nextQuery,
          },
        },
      });
    } else {
      updateQueryConfig({
        mode: "custom",
        queryTemplate: nextQuery,
      });
    }
  };

  const insertQueryPlaceholder = (placeholder: string): void => {
    const currentTemplate = queryTemplateValue ?? "";
    const textArea = queryTemplateRef?.current;
    const selectionStart =
      typeof textArea?.selectionStart === "number" ? textArea.selectionStart : currentTemplate.length;
    const selectionEnd =
      typeof textArea?.selectionEnd === "number" ? textArea.selectionEnd : currentTemplate.length;
    const rangeStart = Math.max(0, Math.min(selectionStart, selectionEnd, currentTemplate.length));
    const rangeEnd = Math.max(rangeStart, Math.min(Math.max(selectionStart, selectionEnd), currentTemplate.length));
    const nextQuery = `${currentTemplate.slice(0, rangeStart)}${placeholder}${currentTemplate.slice(rangeEnd)}`;

    applyQueryTemplateUpdate(nextQuery);

    window.setTimeout(() => {
      const node = queryTemplateRef?.current;
      if (!node) return;
      const cursorPosition = rangeStart + placeholder.length;
      node.focus();
      node.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  };

  const insertAiPromptPlaceholder = (placeholder: string): void => {
    const currentValue = databaseConfig.aiPrompt ?? "";
    const textArea = aiPromptRef?.current;
    const selectionStart =
      typeof textArea?.selectionStart === "number" ? textArea.selectionStart : currentValue.length;
    const selectionEnd =
      typeof textArea?.selectionEnd === "number" ? textArea.selectionEnd : currentValue.length;
    const rangeStart = Math.max(0, Math.min(selectionStart, selectionEnd, currentValue.length));
    const rangeEnd = Math.max(rangeStart, Math.min(Math.max(selectionStart, selectionEnd), currentValue.length));
    const nextValue = `${currentValue.slice(0, rangeStart)}${placeholder}${currentValue.slice(rangeEnd)}`;

    updateSelectedNodeConfig({
      database: {
        ...databaseConfig,
        aiPrompt: nextValue,
      },
    });

    window.setTimeout(() => {
      const node = aiPromptRef?.current;
      if (!node) return;
      const cursorPosition = rangeStart + placeholder.length;
      node.focus();
      node.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  };

  const insertTemplateSnippet = (snippet: string): void => {
    const currentTemplate = queryTemplateValue ?? "";
    const textArea = queryTemplateRef?.current;
    const selectionStart =
      typeof textArea?.selectionStart === "number" ? textArea.selectionStart : currentTemplate.length;
    const selectionEnd =
      typeof textArea?.selectionEnd === "number" ? textArea.selectionEnd : currentTemplate.length;
    const rangeStart = Math.max(0, Math.min(selectionStart, selectionEnd, currentTemplate.length));
    const rangeEnd = Math.max(rangeStart, Math.min(Math.max(selectionStart, selectionEnd), currentTemplate.length));
    const nextTemplate = `${currentTemplate.slice(0, rangeStart)}${snippet}${currentTemplate.slice(rangeEnd)}`;

    applyQueryTemplateUpdate(nextTemplate);

    window.setTimeout(() => {
      const node = queryTemplateRef?.current;
      if (!node) return;
      const cursorPosition = rangeStart + snippet.length;
      node.focus();
      node.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  };

  const handleInsertPlaceholder = (placeholder: string, target: PlaceholderTarget): void => {
    if (target === "aiPrompt") {
      insertAiPromptPlaceholder(placeholder);
      return;
    }
    insertQueryPlaceholder(placeholder);
  };

  const placeholderGroups = React.useMemo((): PlaceholderGroup[] => {
    const groups: PlaceholderGroup[] = [];
    const connectedEntries = connectedPlaceholders.map((token: string, index: number) => {
      const raw = token.replace(/^\{\{|\}\}$/g, "").trim();
      let description = "Connected input placeholder.";
      if (raw.startsWith("bundle.")) {
        description = `Bundle key: ${raw.replace("bundle.", "")}`;
      } else if (raw.startsWith("context.")) {
        description = `Context value: ${raw.replace("context.", "")}`;
      } else if (raw.startsWith("meta.")) {
        description = `Meta value: ${raw.replace("meta.", "")}`;
      }
      return {
        id: `connected-${index}-${raw}`,
        label: raw || token,
        token,
        resolvesTo: description,
      };
    });
    if (connectedEntries.length > 0) {
      groups.push({
        id: "connected",
        title: "Connected Inputs",
        description: "Placeholders derived from currently wired inputs.",
        entries: connectedEntries,
      });
    }

    const activeEntries: PlaceholderGroup = {
      id: "active",
      title: "Active Query Context",
      description: "Current operation & selection placeholders.",
      entries: [
        {
          id: `operation-${operation}`,
          label: `Operation: ${operation}`,
          token: `{{operation:${operation}}}`,
          resolvesTo: operation,
        },
        {
          id: `collection-${queryConfig.collection}`,
          label: `Collection: ${queryConfig.collection}`,
          token: `{{collection:${queryConfig.collection}}}`,
          resolvesTo: queryConfig.collection,
        },
        {
          id: `provider-${queryConfig.provider}`,
          label: `Provider: ${queryConfig.provider === "auto" ? "auto" : queryConfig.provider}`,
          token: `{{provider:${queryConfig.provider === "auto" ? "auto-detect" : queryConfig.provider}}}`,
          resolvesTo: queryConfig.provider === "auto" ? "auto-detect" : queryConfig.provider,
        },
      ],
    };
    groups.push(activeEntries);

    const providerEntries = DB_PROVIDER_PLACEHOLDERS.map((provider: string) => ({
      id: `db-provider-${provider}`,
      label: provider,
      token: `{{DB Provider: ${provider}}}`,
      resolvesTo: provider,
    }));
    if (providerEntries.length > 0) {
      groups.push({
        id: "providers",
        title: "Database Providers",
        description: "Static provider placeholders.",
        entries: providerEntries,
      });
    }

    const dateEntry = {
      id: "date-current",
      label: "Date: Current",
      token: "{{Date: Current}}",
      resolvesTo: new Date().toISOString(),
      dynamic: true,
    };
    groups.push({
      id: "dates",
      title: "Dynamic Dates",
      description: "Runtime date placeholders.",
      entries: [dateEntry],
    });

    const schemaEntries: PlaceholderGroup["entries"] = [];
    if (schemaMatrix?.collections?.length) {
      schemaMatrix.collections.forEach((collection: CollectionSchema, index: number) => {
        const schemaText = formatCollectionSchema(collection.name, collection.fields ?? []);
        const displayName = toTitleCase(singularize(collection.name));
        const nameSet = new Set<string>([collection.name, displayName]);
        Array.from(nameSet).forEach((name: string) => {
          schemaEntries.push({
            id: `schema-${index}-${name}`,
            label: `Collection: ${name}`,
            token: `{{Collection: ${name}}}`,
            resolvesTo: schemaText,
            dynamic: true,
          });
        });
      });
    }
    if (schemaEntries.length > 0) {
      groups.push({
        id: "schemas",
        title: "Collection Schemas",
        description: "Synchronized schema snapshots for use in prompts or queries.",
        entries: schemaEntries,
      });
    }

    return groups;
  }, [connectedPlaceholders, operation, queryConfig.collection, queryConfig.provider, schemaMatrix]);

  const pendingAiQuerySection = pendingAiQuery ? (
    <div className="rounded-md border border-purple-500/40 bg-purple-500/10 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-purple-400"></div>
          <span className="text-xs text-purple-100">AI query ready for review</span>
          {codeSnippets.length > 0 && (
            <span className="text-[10px] text-purple-300">
              ({codeSnippets.length} code snippet{codeSnippets.length > 1 ? "s" : ""})
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            className="h-7 rounded-md border border-emerald-700 bg-emerald-500/10 px-3 text-[10px] text-emerald-200 hover:bg-emerald-500/20"
            onClick={(): void => {
              // Use selected snippet if available, otherwise use full response
              const queryToAccept = selectedSnippetIndex >= 0 && codeSnippets[selectedSnippetIndex]
                ? codeSnippets[selectedSnippetIndex]
                : pendingAiQuery;
              const newQuery: AiQuery = {
                id: `ai-${Date.now()}`,
                query: queryToAccept,
                timestamp: new Date().toISOString(),
              };
              setAiQueries((prev: AiQuery[]): AiQuery[] => [...prev, newQuery]);
              setSelectedAiQueryId(newQuery.id);
              updateSelectedNodeConfig({
                database: {
                  ...databaseConfig,
                  query: {
                    ...queryConfig,
                    mode: "custom",
                    queryTemplate: queryToAccept,
                  },
                },
              });
              setPendingAiQuery("");
              toast(
                selectedSnippetIndex >= 0 && codeSnippets[selectedSnippetIndex]
                  ? `Code snippet ${selectedSnippetIndex + 1} accepted.`
                  : "AI query accepted and saved.",
                { variant: "success" }
              );
            }}
          >
            {selectedSnippetIndex >= 0 && codeSnippets.length > 0
              ? `Accept Snippet ${selectedSnippetIndex + 1}`
              : "Accept"}
          </Button>
          <Button
            type="button"
            className="h-7 rounded-md border border-rose-700 bg-rose-500/10 px-3 text-[10px] text-rose-200 hover:bg-rose-500/20"
            onClick={(): void => {
              setPendingAiQuery("");
              toast("AI query rejected.", { variant: "success" });
            }}
          >
            Reject
          </Button>
        </div>
      </div>

      {/* Code snippet navigation */}
      {codeSnippets.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex flex-col">
            <Button
              type="button"
              className="h-5 w-5 rounded-sm border border-purple-600 bg-purple-500/20 p-0 text-purple-200 hover:bg-purple-500/40 disabled:opacity-30"
              disabled={selectedSnippetIndex <= 0}
              onClick={(): void => setSelectedSnippetIndex((prev: number): number => Math.max(0, prev - 1))}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              className="h-5 w-5 rounded-sm border border-purple-600 bg-purple-500/20 p-0 text-purple-200 hover:bg-purple-500/40 disabled:opacity-30"
              disabled={selectedSnippetIndex >= codeSnippets.length - 1}
              onClick={(): void => setSelectedSnippetIndex((prev: number): number => Math.min(codeSnippets.length - 1, prev + 1))}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex-1 rounded-md border border-cyan-600/50 bg-cyan-500/10 p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] text-cyan-300">
                Snippet {selectedSnippetIndex + 1} of {codeSnippets.length}
              </span>
              <Button
                type="button"
                className="h-5 rounded-sm border border-gray-600 bg-gray-500/20 px-2 text-[9px] text-gray-300 hover:bg-gray-500/40"
                onClick={(): void => setSelectedSnippetIndex(-1)}
              >
                Show Full Response
              </Button>
            </div>
            <pre className="max-h-20 overflow-auto rounded bg-card/70 p-2 text-[11px] text-cyan-100 whitespace-pre-wrap break-all">
              {codeSnippets[selectedSnippetIndex]}
            </pre>
          </div>
        </div>
      )}

      {/* Full response (shown when no snippet selected or no snippets available) */}
      {(selectedSnippetIndex < 0 || codeSnippets.length === 0) && (
        <pre className="mt-2 max-h-25 overflow-auto rounded-md bg-card/70 p-2 text-[11px] text-gray-300 whitespace-pre-wrap break-all">
          {pendingAiQuery}
        </pre>
      )}
    </div>
  ) : null;

  return (
    <div className="space-y-4 rounded-md border border-border bg-card/40 p-3">
      <div onFocusCapture={(): void => setPlaceholderTarget("query")}>
        {queryInputControls}
      </div>

      {pendingAiQuerySection}

      <div className="space-y-3">
        <Label className="text-xs text-gray-400">Quick Presets</Label>
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            type="button"
            className="h-7 rounded-md border border-blue-700 bg-blue-500/10 px-2 text-[10px] text-blue-200 hover:bg-blue-500/20"
            onClick={(): void => openSaveQueryPresetModal()}
          >
            Save As Preset
          </Button>
          <Select
            value={databaseConfig.presetId ?? "custom"}
            onValueChange={(value: string): void => applyDatabasePreset(value)}
          >
            <SelectTrigger className="h-7 w-[180px] border-border bg-card/70 text-xs text-white">
              <SelectValue placeholder="Select preset" />
            </SelectTrigger>
            <SelectContent className="border-border bg-gray-900">
              {presetOptions.map((preset: DatabasePresetOption): React.JSX.Element => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedAiQueryId || "none"}
            onValueChange={(value: string): void => {
              if (value === "none") {
                setSelectedAiQueryId("");
                return;
              }
              const aiQuery = aiQueries.find((q: AiQuery) => q.id === value);
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
            <SelectTrigger className="h-7 w-[180px] border-border bg-card/70 text-xs text-white">
              <SelectValue placeholder="AI Queries" />
            </SelectTrigger>
            <SelectContent className="border-border bg-gray-900">
              <SelectItem value="none">No AI Query</SelectItem>
              {aiQueries.map((aiQuery: AiQuery): React.JSX.Element => (
                <SelectItem key={aiQuery.id} value={aiQuery.id}>
                  AI Query {new Date(aiQuery.timestamp).toLocaleTimeString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            className="h-7 rounded-md border border-rose-500/40 px-2 text-[10px] text-rose-200 hover:bg-rose-500/10 disabled:opacity-40"
            disabled={!selectedAiQueryId}
            onClick={(): void => {
              if (!selectedAiQueryId) return;
              const targetId = selectedAiQueryId;
              setAiQueries((prev: AiQuery[]): AiQuery[] =>
                prev.filter((query: AiQuery): boolean => query.id !== targetId)
              );
              setSelectedAiQueryId("");
              toast("AI query removed.", { variant: "success" });
            }}
            title="Remove selected AI query"
          >
            Remove AI Query
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-card/40 px-3 py-2">
        <div>
          <div className="text-xs font-medium text-gray-200">Placeholders</div>
          <div className="text-[10px] text-gray-400">
            Open the matrix to insert any placeholder into queries or prompts.
          </div>
        </div>
        <Button
          type="button"
          className="h-7 rounded-md border border-sky-500/40 px-3 text-[10px] text-sky-100 hover:bg-sky-500/10"
          onClick={(): void => setPlaceholderMatrixOpen(true)}
        >
          <LayoutGrid className="mr-2 h-3.5 w-3.5" />
          Placeholders
        </Button>
      </div>

      <PlaceholderMatrixDialog
        open={placeholderMatrixOpen}
        onOpenChange={setPlaceholderMatrixOpen}
        groups={placeholderGroups}
        target={placeholderTarget}
        onTargetChange={setPlaceholderTarget}
        onInsert={handleInsertPlaceholder}
        onSync={onSyncSchema}
        syncing={schemaSyncing}
      />

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
                {fetchedDbSchema.collections.map((coll: CollectionSchema): React.JSX.Element => {
                  const schemaFields = coll.fields?.map((f: FieldSchema): string => `${f.name}: ${f.type}`).join(", ") ?? "";
                  const resolvedTooltip = `{{schema:Collection "${coll.name}" with fields: ${schemaFields || "unknown"}}}`;
                  return (
                    <Tooltip
                      key={coll.name}
                      content={resolvedTooltip}
                      side="bottom"
                      maxWidth="500px"
                    >
                      <Button
                        type="button"
                        className="rounded-md border border-purple-700/50 bg-purple-500/10 px-2 py-1 text-[10px] text-purple-300 hover:bg-purple-500/20"
                        onClick={(): void => {
                          updateQueryConfig({
                            mode: "custom",
                            collection: coll.name,
                          });
                          toast(`Collection set to: ${coll.name}`, { variant: "success" });
                        }}
                      >
                        {coll.name}
                      </Button>
                    </Tooltip>
                  );
                })}
              </div>
              {((): React.JSX.Element | null => {
                const currentColl = fetchedDbSchema.collections.find(
                  (c: CollectionSchema) => c.name === queryConfig.collection
                );
                if (!currentColl?.fields?.length) return null;
                return (
                  <div className="mt-2">
                    <div className="text-[10px] text-gray-400">
                      Fields in {currentColl.name}:
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {currentColl.fields.slice(0, 20).map((field: FieldSchema): React.JSX.Element => (
                        <Button
                          key={field.name}
                          type="button"
                          className="rounded-md border border/50 bg-gray-800/30 px-2 py-0.5 text-[9px] text-gray-300 hover:bg-gray-700/50"
                          onClick={(): void => {
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
                            applyQueryTemplateUpdate(newQuery);
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
        <Button
          type="button"
          className="flex items-center gap-2 rounded-md border border-purple-600 bg-purple-500/10 px-3 py-1.5 text-[11px] text-purple-200 hover:bg-purple-500/20"
          onClick={(): void => setSnippetsModalOpen(true)}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Browse Snippets
        </Button>
      </div>

      {/* Template Snippets Modal */}
      <Dialog open={snippetsModalOpen} onOpenChange={setSnippetsModalOpen}>
        <DialogContent className="max-w-2xl border border-border bg-card text-white">
          <DialogHeader>
            <DialogTitle className="text-lg">Template Snippets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Query Templates */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400 uppercase tracking-wide">Query Templates</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {templateSnippets.map((snippet: { label: string; value: string }): React.JSX.Element => (
                  <Button
                    key={snippet.label}
                    type="button"
                    className="h-auto flex-col items-start gap-1 rounded-md border border-emerald-600/50 bg-emerald-500/10 p-3 text-left hover:bg-emerald-500/20"
                    onClick={(): void => {
                      setSelectedAiQueryId("");
                      updateQueryConfig({
                        mode: "custom",
                        queryTemplate: snippet.value,
                      });
                      setSnippetsModalOpen(false);
                      toast(`Applied: ${snippet.label}`, { variant: "success" });
                    }}
                  >
                    <span className="text-[11px] font-medium text-emerald-200">{snippet.label}</span>
                    <pre className="text-[9px] text-gray-400 whitespace-pre-wrap break-all line-clamp-2">{snippet.value}</pre>
                  </Button>
                ))}
              </div>
            </div>

            {/* Read Query Types */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400 uppercase tracking-wide">Read Query Types</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {readQueryTypes.map((snippet: { label: string; value: string; disabled?: boolean; note?: string }): React.JSX.Element => (
                  <Button
                    key={snippet.label}
                    type="button"
                    disabled={snippet.disabled}
                    className={`h-auto flex-col items-start gap-1 rounded-md border p-3 text-left ${
                      snippet.disabled
                        ? "border-gray-700 bg-gray-800/30 text-gray-500"
                        : "border-indigo-600/50 bg-indigo-500/10 hover:bg-indigo-500/20"
                    }`}
                    onClick={(): void => {
                      if (snippet.disabled) return;
                      insertTemplateSnippet(snippet.value);
                      toast(`Inserted: ${snippet.label}`, { variant: "success" });
                    }}
                    title={snippet.note ?? undefined}
                  >
                    <span className="text-[11px] font-medium text-indigo-200">{snippet.label}</span>
                    {snippet.note ? (
                      <span className="text-[9px] text-gray-400">{snippet.note}</span>
                    ) : null}
                  </Button>
                ))}
              </div>
            </div>

            {/* Query Operators */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400 uppercase tracking-wide">Query Operators</Label>
              <div className="space-y-3">
                {queryOperatorGroups.map((group: { label: string; items: Array<{ label: string; value: string }> }): React.JSX.Element => (
                  <div key={group.label} className="space-y-1">
                    <div className="text-[10px] text-gray-500">{group.label}</div>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((item: { label: string; value: string }): React.JSX.Element => (
                        <Button
                          key={item.label}
                          type="button"
                          className="h-6 rounded-md border border-emerald-600/50 bg-emerald-500/10 px-2 text-[10px] text-emerald-200 hover:bg-emerald-500/20"
                          onClick={(): void => {
                            insertTemplateSnippet(item.value);
                            toast(`Inserted ${item.label}`, { variant: "success" });
                          }}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Update Operators */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400 uppercase tracking-wide">Update Operators</Label>
              <div className="space-y-3">
                {updateOperatorGroups.map((group: { label: string; items: Array<{ label: string; value: string }> }): React.JSX.Element => (
                  <div key={group.label} className="space-y-1">
                    <div className="text-[10px] text-gray-500">{group.label}</div>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((item: { label: string; value: string }): React.JSX.Element => (
                        <Button
                          key={item.label}
                          type="button"
                          className="h-6 rounded-md border border-sky-600/50 bg-sky-500/10 px-2 text-[10px] text-sky-200 hover:bg-sky-500/20"
                          onClick={(): void => {
                            insertTemplateSnippet(item.value);
                            toast(`Inserted ${item.label}`, { variant: "success" });
                          }}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aggregation Stages */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400 uppercase tracking-wide">Aggregation Stages</Label>
              {aggregationStageSnippets.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {aggregationStageSnippets.map((stage: { label: string; value: string }): React.JSX.Element => (
                    <Button
                      key={stage.label}
                      type="button"
                      className="h-6 rounded-md border border-amber-600/50 bg-amber-500/10 px-2 text-[10px] text-amber-200 hover:bg-amber-500/20"
                      onClick={(): void => {
                        insertTemplateSnippet(stage.value);
                        toast(`Inserted ${stage.label}`, { variant: "success" });
                      }}
                    >
                      {stage.label}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-amber-200/80">
                  Aggregation pipelines are MongoDB-only.
                </div>
              )}
            </div>

            {/* Sort Presets */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400 uppercase tracking-wide">
                {isPrismaProvider ? "Order By Options" : "Sort Options"}
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sortPresets.map((preset: { id: string; label: string; value: string }): React.JSX.Element => (
                  <Button
                    key={preset.id}
                    type="button"
                    className="h-auto flex-col items-start gap-1 rounded-md border border-sky-600/50 bg-sky-500/10 p-3 text-left hover:bg-sky-500/20"
                    onClick={(): void => {
                      updateQueryConfig({
                        mode: "custom",
                        sort: preset.value,
                      });
                      setSnippetsModalOpen(false);
                      toast(`Applied sort: ${preset.label}`, { variant: "success" });
                    }}
                  >
                    <span className="text-[11px] font-medium text-sky-200">{preset.label}</span>
                    <pre className="text-[9px] text-gray-400 whitespace-pre-wrap break-all">{preset.value}</pre>
                  </Button>
                ))}
              </div>
            </div>

            {/* Projection Presets */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400 uppercase tracking-wide">
                {isPrismaProvider ? "Select (Fields)" : "Projection (Fields)"}
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {projectionPresets.map((preset: { id: string; label: string; value: string }): React.JSX.Element => (
                  <Button
                    key={preset.id}
                    type="button"
                    className="h-auto flex-col items-start gap-1 rounded-md border border-amber-600/50 bg-amber-500/10 p-3 text-left hover:bg-amber-500/20"
                    onClick={(): void => {
                      updateQueryConfig({
                        mode: "custom",
                        projection: preset.value,
                      });
                      setSnippetsModalOpen(false);
                      toast(`Applied projection: ${preset.label}`, { variant: "success" });
                    }}
                  >
                    <span className="text-[11px] font-medium text-amber-200">{preset.label}</span>
                    <pre className="text-[9px] text-gray-400 whitespace-pre-wrap break-all line-clamp-2">{preset.value}</pre>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        <Label className="text-xs text-gray-400">AI Prompt (Output to AI Node)</Label>
        <Textarea
          ref={aiPromptRef}
          className="min-h-[100px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
          value={databaseConfig.aiPrompt ?? ""}
          onFocus={(): void => setPlaceholderTarget("aiPrompt")}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateSelectedNodeConfig({
              database: {
                ...databaseConfig,
                aiPrompt: event.target.value,
              },
            })
          }
          onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
            // Send on Ctrl+Enter or Cmd+Enter
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              if (onSendToAi && selectedNode?.id && databaseConfig.aiPrompt?.trim() && !sendingToAi) {
                void onSendToAi(selectedNode.id, databaseConfig.aiPrompt);
              }
            }
          }}
          placeholder={`Write a ${providerLabel} query that finds products where... (Ctrl+Enter to send)`}
        />
        {((): React.JSX.Element => {
          const aiPromptEdges = edges.filter(
            (edge: Edge): boolean => edge.from === selectedNode.id && edge.fromPort === "aiPrompt"
          );
          const callbackEdges = edges.filter(
            (edge: Edge): boolean => edge.to === selectedNode.id && edge.toPort === "queryCallback"
          );

          const aiNode = aiPromptEdges.length > 0
            ? nodes.find((n: AiNode): boolean => n.id === aiPromptEdges[0]?.to && n.type === "model")
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
                      onClick={(): void => {
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
                      onClick={(): void => {
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

      {operation === "update" && (
        <div className="space-y-3 rounded-md border border-border bg-card/40 p-3">
          <Label className="text-xs text-gray-400">Sample JSON (fetch to enable Field Mapping)</Label>
          <div className="flex flex-wrap gap-2 items-center">
            {hasSchemaConnection && fetchedDbSchema?.collections && fetchedDbSchema.collections.length > 0 && (
              <Select
                value={sampleState.entityType}
                onValueChange={(value: string): void => {
                  setUpdaterSamples((prev: Record<string, UpdaterSampleState>): Record<string, UpdaterSampleState> => ({
                    ...prev,
                    [selectedNodeId]: {
                      ...sampleState,
                      entityType: value,
                    },
                  }));
                  // Auto-fetch first document from selected collection
                  void onFetchUpdaterSample(selectedNodeId, value, "");
                }}
              >
                <SelectTrigger className="w-[180px] border-border bg-card/70 text-sm text-white">
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent className="border-border bg-gray-900 max-h-60 overflow-y-auto">
                  {fetchedDbSchema.collections.map((coll: CollectionSchema): React.JSX.Element => (
                    <SelectItem key={coll.name} value={coll.name}>
                      {coll.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input
              className="w-[200px] rounded-md border border-border bg-card/70 text-sm text-white"
              value={sampleState.entityId}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setUpdaterSamples((prev: Record<string, UpdaterSampleState>): Record<string, UpdaterSampleState> => ({
                  ...prev,
                  [selectedNodeId]: {
                    ...sampleState,
                    entityId: event.target.value,
                  },
                }))
              }
              placeholder="Document ID"
            />
            <Button
              type="button"
              className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60"
              disabled={updaterSampleLoading || (hasSchemaConnection && !sampleState.entityType)}
              onClick={(): void =>
                void onFetchUpdaterSample(
                  selectedNodeId,
                  sampleState.entityType,
                  sampleState.entityId
                )
              }
            >
              {updaterSampleLoading ? "Loading..." : "Fetch sample"}
            </Button>
          </div>
          {hasSchemaConnection && !fetchedDbSchema?.collections?.length && !schemaLoading && (
            <p className="text-[11px] text-amber-300">Connect a Database Schema node to select collections</p>
          )}
          <Textarea
            className="min-h-[120px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
            value={sampleState.json}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
              setUpdaterSamples((prev: Record<string, UpdaterSampleState>): Record<string, UpdaterSampleState> => ({
                ...prev,
                [selectedNodeId]: {
                  ...sampleState,
                  json: event.target.value,
                },
              }))
            }
            placeholder='{ "id": "123", "title": "Sample" }'
          />
          {parsedSampleError ? (
            <p className="text-[11px] text-rose-300">{parsedSampleError}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Select
              value={String(sampleState.depth)}
              onValueChange={(value: string): void =>
                setUpdaterSamples((prev: Record<string, UpdaterSampleState>): Record<string, UpdaterSampleState> => ({
                  ...prev,
                  [selectedNodeId]: {
                    ...sampleState,
                    depth: Number(value),
                  },
                }))
              }
            >
              <SelectTrigger className="w-[150px] border-border bg-card/70 text-sm text-white">
                <SelectValue placeholder="Depth" />
              </SelectTrigger>
              <SelectContent className="border-border bg-gray-900">
                {[1, 2, 3, 4].map((depth: number): React.JSX.Element => (
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
              onClick={(): void =>
                setUpdaterSamples((prev: Record<string, UpdaterSampleState>): Record<string, UpdaterSampleState> => ({
                  ...prev,
                  [selectedNodeId]: {
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
      )}

      {/* Field Mapping: Show for query operations always, for update only after sample is fetched */}
      {(operation !== "update" || sampleState.json.trim().length > 0) && (
      <div className="space-y-3 border-t border-border pt-4">
        <Label className="text-xs text-gray-400">Parameter Mapping</Label>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Button
            type="button"
            className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60"
            onClick={(): void => mapInputsToTargets()}
          >
            Auto-map inputs
          </Button>
          {bundleKeys.size > 0 && (
            <span className="text-[11px] text-gray-500">
              Bundle keys:{" "}
              {Array.from(bundleKeys)
                .map((key: string): string => formatPortLabel(key))
                .join(", ")}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {mappings.map((mapping: UpdaterMapping, index: number): React.JSX.Element => {
            const targetValue = mapping.targetPath ?? "";
            const customValue = mapping.sourcePath ?? "";
            // Schema selection = targetValue matches a schema option
            const hasSchemaSelection = uniqueTargetPathOptions.some((opt: { label: string; value: string }): boolean => opt.value === targetValue) && targetValue.trim().length > 0;
            const sourcePort = mapping.sourcePort ?? "";
            const sourcePortOptions =
              sourcePort && !availablePorts.includes(sourcePort)
                ? [sourcePort, ...availablePorts]
                : availablePorts;

            return (
              <div
                key={`mapping-${index}`}
                className="flex flex-wrap gap-2 items-start"
              >
                {/* "Pick from schema" dropdown - ALWAYS visible */}
                <div className="space-y-2 min-w-[180px]">
                  <Select
                    value={hasSchemaSelection ? targetValue : ""}
                    onValueChange={(value: string): void => {
                      if (value && value !== "__empty__") {
                        updateMapping(index, { targetPath: value } as Partial<UpdaterMapping>);
                      } else {
                        updateMapping(index, { targetPath: "" } as Partial<UpdaterMapping>);
                      }
                    }}
                  >
                    <SelectTrigger className="border-border bg-card/70 text-[10px] text-gray-200">
                      <SelectValue placeholder="Pick from schema" />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-gray-900">
                      <SelectItem value="__empty__">— None —</SelectItem>
                      {uniqueTargetPathOptions.map((option: { label: string; value: string }): React.JSX.Element => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Source port selector */}
                <div className="space-y-2 min-w-[160px]">
                  <Select
                    value={sourcePort}
                    onValueChange={(value: string): void =>
                      updateMapping(index, {
                        sourcePort: value,
                        sourcePath: mapping.sourcePath ?? "",
                      } as Partial<UpdaterMapping>)
                    }
                  >
                    <SelectTrigger className="border-border bg-card/70 text-[10px] text-gray-200">
                      <SelectValue placeholder="Select input" />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-gray-900">
                      {sourcePortOptions.map((port: string): React.JSX.Element => (
                        <SelectItem key={port} value={port}>
                          {formatPortLabel(port)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Source path input */}
                {hasSchemaSelection && sourcePort && (
                  <div className="space-y-2 min-w-[140px]">
                    {sourcePort === "bundle" && bundleKeys.size > 0 ? (
                      <Select
                        value={customValue}
                        onValueChange={(value: string): void =>
                          updateMapping(index, {
                            sourcePath: value,
                          } as Partial<UpdaterMapping>)
                        }
                      >
                        <SelectTrigger className="border-border bg-card/70 text-[10px] text-gray-200">
                          <SelectValue placeholder="Pick bundle key" />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-gray-900">
                          {Array.from(bundleKeys).map((key: string): React.JSX.Element => (
                            <SelectItem key={key} value={key}>
                              {formatPortLabel(key)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="w-full rounded-md border border-border bg-card/70 text-sm text-white"
                        value={customValue}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          updateMapping(index, {
                            sourcePath: event.target.value,
                          } as Partial<UpdaterMapping>)
                        }
                        placeholder="Source path (optional)"
                      />
                    )}
                  </div>
                )}

                <Button
                  type="button"
                  className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60 self-start"
                  disabled={mappings.length <= 1}
                  onClick={(): void => removeMapping(index)}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          className="w-full rounded-md border text-xs text-white hover:bg-muted/60"
          onClick={(): void => addMapping()}
        >
          Add mapping
        </Button>
      </div>
      )}
    </div>
  );
}
