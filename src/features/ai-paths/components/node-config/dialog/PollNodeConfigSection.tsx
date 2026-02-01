"use client";

import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import type {
  AiNode,
  DbQueryConfig,
  Edge,
  NodeConfig,
  PollConfig,
  RuntimeState,
} from "@/features/ai-paths/lib";
import {
  DB_COLLECTION_OPTIONS,
  renderTemplate,
  toNumber,
} from "@/features/ai-paths/lib";

type PollNodeConfigSectionProps = {
  selectedNode: AiNode;
  edges: Edge[];
  runtimeState: RuntimeState;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function PollNodeConfigSection({
  selectedNode,
  edges,
  runtimeState,
  updateSelectedNodeConfig,
}: PollNodeConfigSectionProps): React.JSX.Element | null {
  if (selectedNode.type !== "poll") return null;

  const defaultQuery: DbQueryConfig = {
    provider: "mongodb",
    collection: "products",
    mode: "preset",
    preset: "by_id",
    field: "_id",
    idType: "string",
    queryTemplate: '{\n  "_id": "{{value}}"\n}',
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
    (option: { label: string; value: string }) =>
      option.value === queryConfig.collection,
  )
    ? queryConfig.collection
    : "custom";
  const updatePollConfig = (patch: Partial<PollConfig>): void =>
    updateSelectedNodeConfig({
      poll: {
        ...resolvedPollConfig,
        ...patch,
      },
    });

  const connections = edges.filter(
    (edge: Edge): boolean => edge.to === selectedNode.id,
  );
  const resolvedRuntimeInputs = selectedNode.inputs.reduce<
    Record<string, unknown>
  >((acc: Record<string, unknown>, input: string): Record<string, unknown> => {
    const runtimeInputs = runtimeState.inputs[selectedNode.id] ?? {};
    const directValue = runtimeInputs[input];
    if (directValue !== undefined) {
      acc[input] = directValue;
      return acc;
    }
    const matchingEdges = connections.filter(
      (edge: Edge): boolean => edge.toPort === input || !edge.toPort,
    );
    const merged = matchingEdges.reduce<unknown>(
      (current: unknown, edge: Edge): unknown => {
        const fromOutput = runtimeState.outputs[edge.from];
        if (!fromOutput) return current;
        const fromPort = edge.fromPort;
        if (!fromPort) return current;
        const value = fromOutput[fromPort];
        if (value === undefined) return current;
        if (current === undefined) return value;
        if (Array.isArray(current)) return [...(current as unknown[]), value];
        return [current, value];
      },
      undefined,
    );
    if (merged !== undefined) {
      acc[input] = merged;
    }
    return acc;
  }, {});
  const inputValue =
    (resolvedRuntimeInputs.value as string) ??
    (resolvedRuntimeInputs.jobId as string) ??
    "";
  const queryPreviewText = renderTemplate(
    queryConfig.queryTemplate ?? "{}",
    resolvedRuntimeInputs,
    inputValue,
  );

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Mode</Label>
        <Select
          value={resolvedPollConfig.mode}
          onValueChange={(value: string): void =>
            updatePollConfig({ mode: value as "job" | "database" })
          }
        >
          <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent className="border-border bg-gray-900">
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
            className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
            value={resolvedPollConfig.intervalMs}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              updatePollConfig({
                intervalMs: toNumber(
                  event.target.value,
                  resolvedPollConfig.intervalMs,
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
            className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
            value={resolvedPollConfig.maxAttempts}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              updatePollConfig({
                maxAttempts: toNumber(
                  event.target.value,
                  resolvedPollConfig.maxAttempts,
                ),
              })
            }
          />
        </div>
      </div>
      {resolvedPollConfig.mode === "job" && (
        <p className="text-[11px] text-gray-500">
          Polls /api/products/ai-jobs/{"{{jobId}}"} until completion and outputs
          result + status.
        </p>
      )}
      {resolvedPollConfig.mode === "database" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-gray-400">Provider</Label>
              <Select
                value={queryConfig.provider}
                onValueChange={(value: string): void =>
                  updatePollConfig({
                    dbQuery: {
                      ...queryConfig,
                      provider: value as DbQueryConfig["provider"],
                    },
                  })
                }
              >
                <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent className="border-border bg-gray-900">
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="mongodb">MongoDB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-400">Collection</Label>
              <Select
                value={collectionOption}
                onValueChange={(value: string): void =>
                  updatePollConfig({
                    dbQuery: {
                      ...queryConfig,
                      collection:
                        value === "custom" ? queryConfig.collection : value,
                    },
                  })
                }
              >
                <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent className="border-border bg-gray-900">
                  {DB_COLLECTION_OPTIONS.map(
                    (option: {
                      label: string;
                      value: string;
                    }): React.JSX.Element => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ),
                  )}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {collectionOption === "custom" && (
            <div>
              <Label className="text-xs text-gray-400">Custom collection</Label>
              <Input
                className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
                value={queryConfig.collection}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
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
          <div className="rounded-md border border-border bg-card/60 p-3">
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
                onValueChange={(value: string): void =>
                  updatePollConfig({
                    dbQuery: {
                      ...queryConfig,
                      mode: value as DbQueryConfig["mode"],
                    },
                  })
                }
              >
                <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent className="border-border bg-gray-900">
                  <SelectItem value="preset">Preset</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-400">ID type</Label>
              <Select
                value={queryConfig.idType}
                onValueChange={(value: string): void =>
                  updatePollConfig({
                    dbQuery: {
                      ...queryConfig,
                      idType: value as DbQueryConfig["idType"],
                    },
                  })
                }
              >
                <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent className="border-border bg-gray-900">
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
                  onValueChange={(value: string): void =>
                    updatePollConfig({
                      dbQuery: {
                        ...queryConfig,
                        preset: value as DbQueryConfig["preset"],
                      },
                    })
                  }
                >
                  <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                    <SelectValue placeholder="Select preset" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-gray-900">
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
                  className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
                  value={queryConfig.field}
                  disabled={queryConfig.preset !== "by_field"}
                  onChange={(
                    event: React.ChangeEvent<HTMLInputElement>,
                  ): void =>
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
                className="mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
                value={queryConfig.queryTemplate}
                onChange={(
                  event: React.ChangeEvent<HTMLTextAreaElement>,
                ): void =>
                  updatePollConfig({
                    dbQuery: {
                      ...queryConfig,
                      queryTemplate: event.target.value,
                    },
                  })
                }
              />
              <p className="mt-2 text-[11px] text-gray-500">
                Supports placeholders like {"{{value}}"}, {"{{entityId}}"},{" "}
                {"{{jobId}}"}.
              </p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-gray-400">Limit</Label>
              <Input
                type="number"
                step="1"
                className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
                value={queryConfig.limit}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  updatePollConfig({
                    dbQuery: {
                      ...queryConfig,
                      limit: toNumber(event.target.value, queryConfig.limit),
                    },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300">
              <span>Single result</span>
              <Button
                type="button"
                className={`rounded border px-3 py-1 text-xs ${
                  queryConfig.single
                    ? "text-emerald-200 hover:bg-emerald-500/10"
                    : "text-gray-300 hover:bg-muted/50"
                }`}
                onClick={(): void =>
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
                className="mt-2 min-h-[80px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
                value={queryConfig.sort}
                onChange={(
                  event: React.ChangeEvent<HTMLTextAreaElement>,
                ): void =>
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
                className="mt-2 min-h-[80px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
                value={queryConfig.projection}
                onChange={(
                  event: React.ChangeEvent<HTMLTextAreaElement>,
                ): void =>
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
                className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
                value={resolvedPollConfig.successPath}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  updatePollConfig({ successPath: event.target.value })
                }
              />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Success operator</Label>
              <Select
                value={resolvedPollConfig.successOperator ?? "equals"}
                onValueChange={(value: string): void =>
                  updatePollConfig({
                    successOperator: value as
                      | "truthy"
                      | "equals"
                      | "contains"
                      | "notEquals",
                  })
                }
              >
                <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent className="border-border bg-gray-900">
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
                className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
                value={resolvedPollConfig.successValue}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  updatePollConfig({ successValue: event.target.value })
                }
              />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Result path</Label>
              <Input
                className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
                value={resolvedPollConfig.resultPath}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
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
}
