"use client";

import { Button, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input, Dialog, DialogContent, DialogHeader, DialogTitle, Tooltip } from "@/shared/ui";
import { ChevronUp, ChevronDown, LayoutGrid } from "lucide-react";
import React from "react";

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
} from "@/features/ai-paths/lib";
import { formatPortLabel } from "@/features/ai-paths/utils/ui-utils";
import { TEMPLATE_SNIPPETS, SORT_PRESETS, PROJECTION_PRESETS, READ_QUERY_TYPES, QUERY_OPERATOR_GROUPS, UPDATE_OPERATOR_GROUPS, AGGREGATION_STAGE_SNIPPETS } from "@/features/ai-paths/config/query-presets";
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
}: DatabaseConstructorTabProps) {
  const isUpdateAction =
    databaseConfig.useMongoActions && databaseConfig.actionCategory === "update";
  // State for code snippet navigation in AI responses
  const [selectedSnippetIndex, setSelectedSnippetIndex] = React.useState<number>(-1);
  // State for template snippets modal
  const [snippetsModalOpen, setSnippetsModalOpen] = React.useState(false);

  // Extract code snippets from pending AI query
  const codeSnippets = React.useMemo(() => {
    if (!pendingAiQuery) return [];
    return extractCodeSnippets(pendingAiQuery);
  }, [pendingAiQuery]);

  // Reset snippet selection when pending query changes
  React.useEffect(() => {
    setSelectedSnippetIndex(codeSnippets.length > 0 ? 0 : -1);
  }, [pendingAiQuery, codeSnippets.length]);

  const applyQueryTemplateUpdate = (nextQuery: string) => {
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

  const insertQueryPlaceholder = (placeholder: string) => {
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

  const insertTemplateSnippet = (snippet: string) => {
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
            onClick={() => {
              // Use selected snippet if available, otherwise use full response
              const queryToAccept = selectedSnippetIndex >= 0 && codeSnippets[selectedSnippetIndex]
                ? codeSnippets[selectedSnippetIndex]
                : pendingAiQuery;
              const newQuery = {
                id: `ai-${Date.now()}`,
                query: queryToAccept,
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
            onClick={() => {
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
              onClick={() => setSelectedSnippetIndex((prev) => Math.max(0, prev - 1))}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              className="h-5 w-5 rounded-sm border border-purple-600 bg-purple-500/20 p-0 text-purple-200 hover:bg-purple-500/40 disabled:opacity-30"
              disabled={selectedSnippetIndex >= codeSnippets.length - 1}
              onClick={() => setSelectedSnippetIndex((prev) => Math.min(codeSnippets.length - 1, prev + 1))}
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
                onClick={() => setSelectedSnippetIndex(-1)}
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
            Save As Preset
          </Button>
          <Select
            value={databaseConfig.presetId ?? "custom"}
            onValueChange={(value) => applyDatabasePreset(value)}
          >
            <SelectTrigger className="h-7 w-[180px] border-border bg-card/70 text-xs text-white">
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
            <SelectTrigger className="h-7 w-[180px] border-border bg-card/70 text-xs text-white">
              <SelectValue placeholder="AI Queries" />
            </SelectTrigger>
            <SelectContent className="border-border bg-gray-900">
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
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertQueryPlaceholder(chip)}
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
                {fetchedDbSchema.collections.map((coll) => {
                  const schemaFields = coll.fields?.map((f) => `${f.name}: ${f.type}`).join(", ") ?? "";
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
                    </Tooltip>
                  );
                })}
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
                          className="rounded-md border border/50 bg-gray-800/30 px-2 py-0.5 text-[9px] text-gray-300 hover:bg-gray-700/50"
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
          onClick={() => setSnippetsModalOpen(true)}
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
                {TEMPLATE_SNIPPETS.map((snippet) => (
                  <Button
                    key={snippet.label}
                    type="button"
                    className="h-auto flex-col items-start gap-1 rounded-md border border-emerald-600/50 bg-emerald-500/10 p-3 text-left hover:bg-emerald-500/20"
                    onClick={() => {
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
                {READ_QUERY_TYPES.map((snippet) => (
                  <Button
                    key={snippet.label}
                    type="button"
                    disabled={snippet.disabled}
                    className={`h-auto flex-col items-start gap-1 rounded-md border p-3 text-left ${
                      snippet.disabled
                        ? "border-gray-700 bg-gray-800/30 text-gray-500"
                        : "border-indigo-600/50 bg-indigo-500/10 hover:bg-indigo-500/20"
                    }`}
                    onClick={() => {
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
                {QUERY_OPERATOR_GROUPS.map((group) => (
                  <div key={group.label} className="space-y-1">
                    <div className="text-[10px] text-gray-500">{group.label}</div>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <Button
                          key={item.label}
                          type="button"
                          className="h-6 rounded-md border border-emerald-600/50 bg-emerald-500/10 px-2 text-[10px] text-emerald-200 hover:bg-emerald-500/20"
                          onClick={() => {
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
                {UPDATE_OPERATOR_GROUPS.map((group) => (
                  <div key={group.label} className="space-y-1">
                    <div className="text-[10px] text-gray-500">{group.label}</div>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <Button
                          key={item.label}
                          type="button"
                          className="h-6 rounded-md border border-sky-600/50 bg-sky-500/10 px-2 text-[10px] text-sky-200 hover:bg-sky-500/20"
                          onClick={() => {
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
              <div className="flex flex-wrap gap-2">
                {AGGREGATION_STAGE_SNIPPETS.map((stage) => (
                  <Button
                    key={stage.label}
                    type="button"
                    className="h-6 rounded-md border border-amber-600/50 bg-amber-500/10 px-2 text-[10px] text-amber-200 hover:bg-amber-500/20"
                    onClick={() => {
                      insertTemplateSnippet(stage.value);
                      toast(`Inserted ${stage.label}`, { variant: "success" });
                    }}
                  >
                    {stage.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sort Presets */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400 uppercase tracking-wide">Sort Options</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SORT_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    className="h-auto flex-col items-start gap-1 rounded-md border border-sky-600/50 bg-sky-500/10 p-3 text-left hover:bg-sky-500/20"
                    onClick={() => {
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
              <Label className="text-xs text-gray-400 uppercase tracking-wide">Projection (Fields)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PROJECTION_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    className="h-auto flex-col items-start gap-1 rounded-md border border-amber-600/50 bg-amber-500/10 p-3 text-left hover:bg-amber-500/20"
                    onClick={() => {
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
          onChange={(event) =>
            updateSelectedNodeConfig({
              database: {
                ...databaseConfig,
                aiPrompt: event.target.value,
              },
            })
          }
          onKeyDown={(event) => {
            // Send on Ctrl+Enter or Cmd+Enter
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              if (onSendToAi && selectedNode?.id && databaseConfig.aiPrompt?.trim() && !sendingToAi) {
                void onSendToAi(selectedNode.id, databaseConfig.aiPrompt);
              }
            }
          }}
          placeholder="Write a MongoDB query that finds products where... (Ctrl+Enter to send)"
        />
        <div className="flex flex-wrap gap-2">
          <div className="text-[11px] text-gray-400">Context placeholders:</div>
          <Tooltip
            content={`{{operation:${operation}}}`}
            side="bottom"
          >
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
          </Tooltip>
          {hasSchemaConnection && fetchedDbSchema?.collections && fetchedDbSchema.collections.length > 0 ? (
            fetchedDbSchema.collections.map((coll) => {
              const schemaFields = coll.fields?.map((f) => `${f.name}: ${f.type}`).join(", ") ?? "";
              const resolvedPlaceholder = `{{schema:Collection "${coll.name}" with fields: ${schemaFields || "unknown"}}}`;
              return (
                <Tooltip
                  key={coll.name}
                  content={resolvedPlaceholder}
                  side="bottom"
                  maxWidth="500px"
                >
                  <Button
                    type="button"
                    className="rounded-md border border-cyan-700 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-200 hover:bg-cyan-500/20"
                    onClick={() => {
                      const placeholder = `{{ schema: ${coll.name} }}`;
                      const currentValue = databaseConfig.aiPrompt ?? "";
                      updateSelectedNodeConfig({
                        database: {
                          ...databaseConfig,
                          aiPrompt: currentValue + placeholder,
                        },
                      });
                    }}
                  >
                    Schema: {coll.name}
                  </Button>
                </Tooltip>
              );
            })
          ) : (
            <Tooltip
              content={`{{collection:${queryConfig.collection}}}`}
              side="bottom"
            >
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
            </Tooltip>
          )}
          <Tooltip
            content={`{{provider:${queryConfig.provider === "auto" ? "auto-detect" : queryConfig.provider}}}`}
            side="bottom"
          >
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
          </Tooltip>
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

      {operation === "update" && (
        <div className="space-y-3 rounded-md border border-border bg-card/40 p-3">
          <Label className="text-xs text-gray-400">Sample JSON (fetch to enable Field Mapping)</Label>
          <div className="flex flex-wrap gap-2 items-center">
            {hasSchemaConnection && fetchedDbSchema?.collections && fetchedDbSchema.collections.length > 0 && (
              <Select
                value={sampleState.entityType}
                onValueChange={(value) => {
                  setUpdaterSamples((prev) => ({
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
                  {fetchedDbSchema.collections.map((coll) => (
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
              onChange={(event) =>
                setUpdaterSamples((prev) => ({
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
              onClick={() =>
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
            onChange={(event) =>
              setUpdaterSamples((prev) => ({
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
              onValueChange={(value) =>
                setUpdaterSamples((prev) => ({
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
                setUpdaterSamples((prev) => ({
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
            const customValue = mapping.sourcePath ?? "";
            // Schema selection = targetValue matches a schema option
            const hasSchemaSelection = uniqueTargetPathOptions.some(opt => opt.value === targetValue) && targetValue.trim().length > 0;
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
                    onValueChange={(value) => {
                      if (value && value !== "__empty__") {
                        updateMapping(index, { targetPath: value });
                      } else {
                        updateMapping(index, { targetPath: "" });
                      }
                    }}
                  >
                    <SelectTrigger className="border-border bg-card/70 text-[10px] text-gray-200">
                      <SelectValue placeholder="Pick from schema" />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-gray-900">
                      <SelectItem value="__empty__">— None —</SelectItem>
                      {uniqueTargetPathOptions.map((option) => (
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
                    onValueChange={(value) =>
                      updateMapping(index, {
                        sourcePort: value,
                        sourcePath: mapping.sourcePath ?? "",
                      })
                    }
                  >
                    <SelectTrigger className="border-border bg-card/70 text-[10px] text-gray-200">
                      <SelectValue placeholder="Select input" />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-gray-900">
                      {sourcePortOptions.map((port) => (
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
                        onValueChange={(value) =>
                          updateMapping(index, {
                            sourcePath: value,
                          })
                        }
                      >
                        <SelectTrigger className="border-border bg-card/70 text-[10px] text-gray-200">
                          <SelectValue placeholder="Pick bundle key" />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-gray-900">
                          {Array.from(bundleKeys).map((key) => (
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
                        onChange={(event) =>
                          updateMapping(index, {
                            sourcePath: event.target.value,
                          })
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
          className="w-full rounded-md border text-xs text-white hover:bg-muted/60"
          onClick={addMapping}
        >
          Add mapping
        </Button>
      </div>
      )}
    </div>
  );
}
