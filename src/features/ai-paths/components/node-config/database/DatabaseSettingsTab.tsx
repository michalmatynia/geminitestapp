"use client";

import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";
import React from "react";





import type { DatabaseConfig, DatabaseOperation, NodeConfig } from "@/features/ai-paths/lib";
import { DB_COLLECTION_OPTIONS } from "@/features/ai-paths/lib";
import { formatPortLabel } from "@/features/ai-paths/utils/ui-utils";

type DatabaseSettingsTabProps = {
  queryEditor: React.ReactNode;
  availablePorts: string[];
  bundleKeys: Set<string>;
  operation: DatabaseOperation;
  databaseConfig: DatabaseConfig;
  writeSource: string;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function DatabaseSettingsTab({
  queryEditor,
  availablePorts,
  bundleKeys,
  operation,
  databaseConfig,
  writeSource,
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
        </div>
      )}

      {operation === "insert" && (
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-gray-400">Collection Type</Label>
            <Select
              value={databaseConfig.entityType ?? "products"}
              onValueChange={(value) =>
                updateSelectedNodeConfig({
                  database: { ...databaseConfig, entityType: value },
                })
              }
            >
              <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                <SelectValue placeholder="Collection type" />
              </SelectTrigger>
              <SelectContent className="border-border bg-gray-900 max-h-60 overflow-y-auto">
                {DB_COLLECTION_OPTIONS.filter((opt) => opt.value !== "custom").map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
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
            <Label className="text-xs text-gray-400">Collection Type</Label>
            <Select
              value={databaseConfig.entityType ?? "products"}
              onValueChange={(value) =>
                updateSelectedNodeConfig({
                  database: { ...databaseConfig, entityType: value },
                })
              }
            >
              <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                <SelectValue placeholder="Collection type" />
              </SelectTrigger>
              <SelectContent className="border-border bg-gray-900 max-h-60 overflow-y-auto">
                {DB_COLLECTION_OPTIONS.filter((opt) => opt.value !== "custom").map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
