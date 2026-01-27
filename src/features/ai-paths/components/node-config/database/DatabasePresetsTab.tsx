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
  DbNodePreset,
  DbQueryConfig,
  DbQueryPreset,
  NodeConfig,
} from "@/features/ai-paths/lib";

type DatabasePresetsTabProps = {
  dbNodePresets: DbNodePreset[];
  selectedDbPresetId: string;
  setSelectedDbPresetId: React.Dispatch<React.SetStateAction<string>>;
  dbPresetName: string;
  setDbPresetName: React.Dispatch<React.SetStateAction<string>>;
  dbPresetDescription: string;
  setDbPresetDescription: React.Dispatch<React.SetStateAction<string>>;
  selectedDbPreset?: DbNodePreset;
  handleApplyDbPreset: (preset: DbNodePreset) => void;
  handleSaveDbPreset: () => Promise<void> | void;
  handleDeleteDbPreset: () => Promise<void> | void;
  dbQueryPresets: DbQueryPreset[];
  selectedQueryPresetId: string;
  setSelectedQueryPresetId: React.Dispatch<React.SetStateAction<string>>;
  queryPresetName: string;
  setQueryPresetName: React.Dispatch<React.SetStateAction<string>>;
  selectedQueryPreset?: DbQueryPreset;
  handleSaveQueryPreset: () => Promise<void> | void;
  handleDeleteQueryPreset: () => Promise<void> | void;
  queryTemplateValue: string;
  queryTemplateRef: React.RefObject<HTMLTextAreaElement>;
  setDatabaseTab: React.Dispatch<React.SetStateAction<"settings" | "constructor" | "presets">>;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  databaseConfig: DatabaseConfig;
  queryConfig: DbQueryConfig;
};

export function DatabasePresetsTab({
  dbNodePresets,
  selectedDbPresetId,
  setSelectedDbPresetId,
  dbPresetName,
  setDbPresetName,
  dbPresetDescription,
  setDbPresetDescription,
  selectedDbPreset,
  handleApplyDbPreset,
  handleSaveDbPreset,
  handleDeleteDbPreset,
  dbQueryPresets,
  selectedQueryPresetId,
  setSelectedQueryPresetId,
  queryPresetName,
  setQueryPresetName,
  selectedQueryPreset,
  handleSaveQueryPreset,
  handleDeleteQueryPreset,
  queryTemplateValue,
  queryTemplateRef,
  setDatabaseTab,
  updateSelectedNodeConfig,
  databaseConfig,
  queryConfig,
}: DatabasePresetsTabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card/50 p-3">
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
                <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                  <SelectValue placeholder="Select preset" />
                </SelectTrigger>
                <SelectContent className="border-border bg-gray-900">
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
                className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
                value={dbPresetName}
                onChange={(event) => setDbPresetName(event.target.value)}
                placeholder="My database preset"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-400">Description</Label>
            <Input
              className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
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
      <div className="rounded-md border border-border bg-card/50 p-3">
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
                  <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
                    <SelectValue placeholder="Select preset" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-gray-900">
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
                  className="mt-2 min-h-[90px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
                  value={queryTemplateValue}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60"
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
                className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
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
  );
}
