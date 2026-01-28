"use client";

import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";
import React from "react";




import type { AiNode, NodeConfig } from "@/features/ai-paths/lib";

type SchemaData = {
  provider: string;
  collections: Array<{
    name: string;
    fields: Array<{ name: string; type: string }>;
    relations?: string[];
  }>;
};

type DbSchemaNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function DbSchemaNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
}: DbSchemaNodeConfigSectionProps) {
  const [fetchedDbSchema, setFetchedDbSchema] = React.useState<SchemaData | null>(null);
  const [schemaLoading, setSchemaLoading] = React.useState(false);

  React.useEffect(() => {
    if (selectedNode.type !== "db_schema") {
      setFetchedDbSchema(null);
      return;
    }

    setSchemaLoading(true);
    fetch("/api/databases/schema")
      .then((res) => res.json())
      .then((data) => {
        setFetchedDbSchema(data as SchemaData);
      })
      .catch((err) => {
        console.error("Failed to fetch schema:", err);
        setFetchedDbSchema(null);
      })
      .finally(() => {
        setSchemaLoading(false);
      });
  }, [selectedNode.id, selectedNode.type]);

  if (selectedNode.type !== "db_schema") return null;

  const schemaConfig = selectedNode.config?.db_schema ?? {
    mode: "all" as const,
    collections: [] as string[],
    includeFields: true,
    includeRelations: true,
    formatAs: "text" as const,
  };

  const updateSchemaConfig = (patch: Partial<typeof schemaConfig>) => {
    updateSelectedNodeConfig({
      db_schema: { ...schemaConfig, ...patch },
    });
  };

  const toggleCollection = (collName: string) => {
    const current = schemaConfig.collections ?? [];
    const next = current.includes(collName)
      ? current.filter((c) => c !== collName)
      : [...current, collName];
    updateSchemaConfig({ collections: next });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-purple-800/50 bg-purple-950/20 p-4">
        <div className="mb-3 text-sm font-medium text-purple-300">
          Database Schema Browser
        </div>

        {schemaLoading ? (
          <div className="py-4 text-center text-sm text-gray-400">
            Loading schema...
          </div>
        ) : fetchedDbSchema?.collections && fetchedDbSchema.collections.length > 0 ? (
          <div className="space-y-4">
            <div className="text-xs text-gray-400">
              Provider: <span className="text-purple-300">{fetchedDbSchema.provider}</span>
              {" · "}
              {fetchedDbSchema.collections.length} collections
            </div>

            <div>
              <Label className="text-xs text-gray-400">Collection Mode</Label>
              <Select
                value={schemaConfig.mode}
                onValueChange={(value) =>
                  updateSchemaConfig({ mode: value as "all" | "selected" })
                }
              >
                <SelectTrigger className="mt-2 border-border bg-card/70 text-sm text-white">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Collections</SelectItem>
                  <SelectItem value="selected">Selected Collections Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {schemaConfig.mode === "selected" && (
              <div>
                <Label className="text-xs text-gray-400">
                  Select Collections ({schemaConfig.collections?.length ?? 0} selected)
                </Label>
                <div className="mt-2 max-h-[200px] space-y-1 overflow-y-auto rounded-md border border-border bg-card/50 p-2">
                  {fetchedDbSchema.collections.map((coll) => {
                    const isSelected = schemaConfig.collections?.includes(coll.name);
                    return (
                      <button
                        key={coll.name}
                        type="button"
                        onClick={() => toggleCollection(coll.name)}
                        className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition ${
                          isSelected
                            ? "bg-purple-500/20 text-purple-200"
                            : "text-gray-300 hover:bg-muted/50"
                        }`}
                      >
                        <span className="font-medium">{coll.name}</span>
                        <span className="text-[10px] text-gray-500">
                          {coll.fields?.length ?? 0} fields
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300">
                <span>Include Fields</span>
                <Button
                  type="button"
                  className={`rounded border px-3 py-1 text-xs ${
                    schemaConfig.includeFields
                      ? "text-emerald-200 hover:bg-emerald-500/10"
                      : "text-gray-500 hover:bg-muted/50"
                  }`}
                  onClick={() =>
                    updateSchemaConfig({ includeFields: !schemaConfig.includeFields })
                  }
                >
                  {schemaConfig.includeFields ? "Yes" : "No"}
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300">
                <span>Include Relations</span>
                <Button
                  type="button"
                  className={`rounded border px-3 py-1 text-xs ${
                    schemaConfig.includeRelations
                      ? "text-emerald-200 hover:bg-emerald-500/10"
                      : "text-gray-500 hover:bg-muted/50"
                  }`}
                  onClick={() =>
                    updateSchemaConfig({ includeRelations: !schemaConfig.includeRelations })
                  }
                >
                  {schemaConfig.includeRelations ? "Yes" : "No"}
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-400">Output Format</Label>
              <Select
                value={schemaConfig.formatAs}
                onValueChange={(value) =>
                  updateSchemaConfig({ formatAs: value as "json" | "text" })
                }
              >
                <SelectTrigger className="mt-2 border-border bg-card/70 text-sm text-white">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text (Human Readable)</SelectItem>
                  <SelectItem value="json">JSON (Structured)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview of selected collections */}
            <div className="rounded-md border border-border bg-card/40 p-3">
              <div className="mb-2 text-[10px] uppercase text-gray-500">Preview</div>
              <div className="max-h-[150px] overflow-y-auto text-[11px] text-gray-300">
                {(schemaConfig.mode === "all"
                  ? fetchedDbSchema.collections
                  : fetchedDbSchema.collections.filter((c) =>
                      schemaConfig.collections?.includes(c.name)
                    )
                ).map((coll) => (
                  <div key={coll.name} className="mb-2">
                    <div className="font-medium text-purple-300">{coll.name}</div>
                    {schemaConfig.includeFields && coll.fields && (
                      <div className="ml-2 text-[10px] text-gray-500">
                        {coll.fields.slice(0, 5).map((f) => f.name).join(", ")}
                        {coll.fields.length > 5 && ` +${coll.fields.length - 5} more`}
                      </div>
                    )}
                  </div>
                ))}
                {schemaConfig.mode === "selected" &&
                  (!schemaConfig.collections || schemaConfig.collections.length === 0) && (
                    <div className="italic text-gray-500">No collections selected</div>
                  )}
              </div>
            </div>

            {/* Data Browser */}
            <div className="rounded-md border border-cyan-800/50 bg-cyan-950/20 p-3">
              <div className="mb-3 text-[11px] font-medium text-cyan-300">
                Data Browser
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Browse Collection</Label>
                <div className="flex gap-2">
                  <Select
                    value={browseCollection ?? ""}
                    onValueChange={(value) => {
                      setBrowseCollection(value || null);
                      setBrowseDocuments([]);
                      setBrowseSkip(0);
                      setBrowseSearch("");
                      setExpandedDocId(null);
                      if (value) {
                        setBrowseLoading(true);
                        fetch(`/api/databases/browse?collection=${encodeURIComponent(value)}&limit=${browseLimit}&skip=0`)
                          .then((res) => res.json())
                          .then((data) => {
                            setBrowseDocuments((data as { documents: Record<string, unknown>[] }).documents ?? []);
                            setBrowseTotal((data as { total: number }).total ?? 0);
                          })
                          .catch((err) => console.error("Failed to browse:", err))
                          .finally(() => setBrowseLoading(false));
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1 border-border bg-card/70 text-sm text-white">
                      <SelectValue placeholder="Select collection to browse" />
                    </SelectTrigger>
                    <SelectContent>
                      {fetchedDbSchema.collections.map((coll) => (
                        <SelectItem key={coll.name} value={coll.name}>
                          {coll.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {browseCollection && (
                    <Button
                      type="button"
                      className="rounded border px-3 text-xs text-gray-300 hover:bg-muted/50"
                      onClick={() => {
                        setBrowseCollection(null);
                        setBrowseDocuments([]);
                        setBrowseTotal(0);
                        setBrowseSkip(0);
                        setBrowseSearch("");
                        setExpandedDocId(null);
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {browseCollection && (
                <div className="mt-3 space-y-3">
                  {/* Search */}
                  <div className="flex gap-2">
                    <Input
                      className="flex-1 border-border bg-card/70 text-sm text-white"
                      placeholder="Search documents..."
                      value={browseSearch}
                      onChange={(e) => setBrowseSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setBrowseLoading(true);
                          setBrowseSkip(0);
                          const searchQuery = browseSearch.trim() ? `&query=${encodeURIComponent(browseSearch)}` : "";
                          fetch(`/api/databases/browse?collection=${encodeURIComponent(browseCollection)}&limit=${browseLimit}&skip=0${searchQuery}`)
                            .then((res) => res.json())
                            .then((data) => {
                              setBrowseDocuments((data as { documents: Record<string, unknown>[] }).documents ?? []);
                              setBrowseTotal((data as { total: number }).total ?? 0);
                            })
                            .catch((err) => console.error("Failed to search:", err))
                            .finally(() => setBrowseLoading(false));
                        }
                      }}
                    />
                    <Button
                      type="button"
                      className="rounded border border-cyan-700 px-3 text-xs text-cyan-300 hover:bg-cyan-500/10"
                      onClick={() => {
                        setBrowseLoading(true);
                        setBrowseSkip(0);
                        const searchQuery = browseSearch.trim() ? `&query=${encodeURIComponent(browseSearch)}` : "";
                        fetch(`/api/databases/browse?collection=${encodeURIComponent(browseCollection)}&limit=${browseLimit}&skip=0${searchQuery}`)
                          .then((res) => res.json())
                          .then((data) => {
                            setBrowseDocuments((data as { documents: Record<string, unknown>[] }).documents ?? []);
                            setBrowseTotal((data as { total: number }).total ?? 0);
                          })
                          .catch((err) => console.error("Failed to search:", err))
                          .finally(() => setBrowseLoading(false));
                      }}
                    >
                      Search
                    </Button>
                  </div>

                  {/* Results info */}
                  <div className="text-[10px] text-gray-500">
                    Showing {browseSkip + 1}-{Math.min(browseSkip + browseLimit, browseTotal)} of {browseTotal} documents
                  </div>

                  {/* Documents list */}
                  {browseLoading ? (
                    <div className="py-4 text-center text-sm text-gray-400">
                      Loading documents...
                    </div>
                  ) : browseDocuments.length > 0 ? (
                    <div className="max-h-[300px] space-y-2 overflow-y-auto">
                                                          {browseDocuments.map((doc, idx) => {
                                                            const docId = String(doc._id?.toString?.() ?? doc._id ?? doc.id?.toString?.() ?? doc.id ?? `doc-${idx}`);
                                                            const isExpanded = expandedDocId === docId;
                                                            const displayNameValue = doc.name ?? doc.title ?? doc.name_en ?? doc.sku ?? docId;
                                                            const displayName = typeof displayNameValue === 'object' ? JSON.stringify(displayNameValue) : String(displayNameValue);
                                                            return (
                                                              <div
                                                                key={docId}
                                                                className="rounded-md border border-border bg-card/50"
                                                              >
                                                                <button
                                                                  type="button"
                                                                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-muted/50/50"
                                                                  onClick={() => setExpandedDocId(isExpanded ? null : docId)}
                                                                >
                                                                  <div className="flex items-center gap-2">
                                                                    <span className="text-cyan-300">{displayName}</span>
                                                                    <span className="text-[9px] text-gray-500">({docId})</span>
                                                                  </div>                                          <svg
                                className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {isExpanded && (
                              <div className="border-t border-border p-3">
                                <pre className="max-h-[200px] overflow-auto whitespace-pre-wrap text-[10px] text-gray-300">
                                  {JSON.stringify(doc, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-sm text-gray-500">
                      No documents found
                    </div>
                  )}

                  {/* Pagination */}
                  {browseTotal > browseLimit && (
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        type="button"
                        disabled={browseSkip === 0}
                        className="rounded border px-3 py-1 text-xs text-gray-300 hover:bg-muted/50 disabled:opacity-50"
                        onClick={() => {
                          const newSkip = Math.max(0, browseSkip - browseLimit);
                          setBrowseSkip(newSkip);
                          setBrowseLoading(true);
                          const searchQuery = browseSearch.trim() ? `&query=${encodeURIComponent(browseSearch)}` : "";
                          fetch(`/api/databases/browse?collection=${encodeURIComponent(browseCollection)}&limit=${browseLimit}&skip=${newSkip}${searchQuery}`)
                            .then((res) => res.json())
                            .then((data) => {
                              setBrowseDocuments((data as { documents: Record<string, unknown>[] }).documents ?? []);
                              setBrowseTotal((data as { total: number }).total ?? 0);
                            })
                            .catch((err) => console.error("Failed to paginate:", err))
                            .finally(() => setBrowseLoading(false));
                        }}
                      >
                        Previous
                      </Button>
                      <span className="text-[10px] text-gray-500">
                        Page {Math.floor(browseSkip / browseLimit) + 1} of {Math.ceil(browseTotal / browseLimit)}
                      </span>
                      <Button
                        type="button"
                        disabled={browseSkip + browseLimit >= browseTotal}
                        className="rounded border px-3 py-1 text-xs text-gray-300 hover:bg-muted/50 disabled:opacity-50"
                        onClick={() => {
                          const newSkip = browseSkip + browseLimit;
                          setBrowseSkip(newSkip);
                          setBrowseLoading(true);
                          const searchQuery = browseSearch.trim() ? `&query=${encodeURIComponent(browseSearch)}` : "";
                          fetch(`/api/databases/browse?collection=${encodeURIComponent(browseCollection)}&limit=${browseLimit}&skip=${newSkip}${searchQuery}`)
                            .then((res) => res.json())
                            .then((data) => {
                              setBrowseDocuments((data as { documents: Record<string, unknown>[] }).documents ?? []);
                              setBrowseTotal((data as { total: number }).total ?? 0);
                            })
                            .catch((err) => console.error("Failed to paginate:", err))
                            .finally(() => setBrowseLoading(false));
                        }}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="py-4 text-center text-sm text-gray-500">
              No schema data available
            </div>
            <Button
              type="button"
              className="w-full rounded-md border border-purple-700 text-xs text-purple-200 hover:bg-purple-500/10"
              onClick={() => {
                setSchemaLoading(true);
                fetch("/api/databases/schema")
                  .then((res) => res.json())
                  .then((data) => setFetchedDbSchema(data as typeof fetchedDbSchema))
                  .catch((err) => console.error("Failed to fetch schema:", err))
                  .finally(() => setSchemaLoading(false));
              }}
            >
              Fetch Schema
            </Button>
          </div>
        )}
      </div>
    </div>
  );
            
}
