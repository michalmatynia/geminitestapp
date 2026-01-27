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
import type {
  DatabaseConfig,
  DatabaseOperation,
  NodeConfig,
  UpdaterSampleState,
} from "@/features/ai-paths/lib";
import { formatPortLabel } from "@/features/ai-paths/utils/ui-utils";

type DatabaseSettingsTabProps = {
  queryEditor: React.ReactNode;
  availablePorts: string[];
  bundleKeys: Set<string>;
  operation: DatabaseOperation;
  databaseConfig: DatabaseConfig;
  writeSource: string;
  sampleState: UpdaterSampleState;
  parsedSampleError?: string;
  updaterSampleLoading: boolean;
  selectedNodeId: string;
  setUpdaterSamples: React.Dispatch<
    React.SetStateAction<Record<string, UpdaterSampleState>>
  >;
  onFetchUpdaterSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function DatabaseSettingsTab({
  queryEditor,
  availablePorts,
  bundleKeys,
  operation,
  databaseConfig,
  writeSource,
  sampleState,
  parsedSampleError,
  updaterSampleLoading,
  selectedNodeId,
  setUpdaterSamples,
  onFetchUpdaterSample,
  updateSelectedNodeConfig,
}: DatabaseSettingsTabProps) {
  return (
    <div className="space-y-4">
      {queryEditor}

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
              <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent className="border-border bg-gray-900">
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
                    [selectedNodeId]: {
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
              <Input
                className="w-full rounded-md border border-border bg-card/70 text-sm text-white"
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
                placeholder="Entity ID"
              />
              <Button
                type="button"
                className="rounded-md border text-[10px] text-gray-200 hover:bg-muted/60"
                disabled={updaterSampleLoading}
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
            <Textarea
              className="mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
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
              <p className="mt-2 text-[11px] text-rose-300">{parsedSampleError}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
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
              <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent className="border-border bg-gray-900">
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
              <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                <SelectValue placeholder="Select payload input" />
              </SelectTrigger>
              <SelectContent className="border-border bg-gray-900">
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
              className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
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
                <SelectTrigger className="mt-2 border-border bg-card/70 text-[10px] text-gray-200">
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
              <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent className="border-border bg-gray-900">
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
              <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                <SelectValue placeholder="Select ID input" />
              </SelectTrigger>
              <SelectContent className="border-border bg-gray-900">
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
}
