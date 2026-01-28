"use client";

import { Button, Input, Label } from "@/shared/ui";
import React from "react";

import type { DbQueryPreset } from "@/features/ai-paths/lib";

type DatabasePresetsTabProps = {
  dbQueryPresets: DbQueryPreset[];
  onRenameQueryPreset: (presetId: string, nextName: string) => Promise<void> | void;
  onDeleteQueryPreset: (presetId: string) => Promise<void> | void;
};

export function DatabasePresetsTab({
  dbQueryPresets,
  onRenameQueryPreset,
  onDeleteQueryPreset,
}: DatabasePresetsTabProps) {
  const [queryNameDrafts, setQueryNameDrafts] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setQueryNameDrafts((prev) => {
      const next = { ...prev };
      dbQueryPresets.forEach((preset) => {
        if (!next[preset.id]) {
          next[preset.id] = preset.name;
        }
      });
      Object.keys(next).forEach((key) => {
        if (!dbQueryPresets.some((preset) => preset.id === key)) {
          delete next[key];
        }
      });
      return next;
    });
  }, [dbQueryPresets]);

  const handleRename = async (presetId: string, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) return;
    await onRenameQueryPreset(presetId, trimmed);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card/50 p-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-gray-400">Query Presets</Label>
          <span className="text-[10px] text-gray-500">
            {dbQueryPresets.length} presets
          </span>
        </div>
        {dbQueryPresets.length === 0 ? (
          <div className="mt-3 text-xs text-gray-500">No query presets saved.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {dbQueryPresets.map((preset) => {
              const draftName = queryNameDrafts[preset.id] ?? preset.name;
              const nameChanged = draftName.trim() !== preset.name.trim();
              return (
                <div
                  key={preset.id}
                  className="rounded-md border border-border bg-card/60 p-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      className="h-7 flex-1 rounded-md border border-border bg-card/70 text-xs text-white"
                      value={draftName}
                      onChange={(event) =>
                        setQueryNameDrafts((prev) => ({
                          ...prev,
                          [preset.id]: event.target.value,
                        }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void handleRename(preset.id, draftName);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      className="h-7 rounded-md border border-emerald-500/40 px-2 text-[10px] text-emerald-200 hover:bg-emerald-500/10"
                      disabled={!nameChanged}
                      onClick={() => void handleRename(preset.id, draftName)}
                    >
                      Rename
                    </Button>
                    <Button
                      type="button"
                      className="h-7 rounded-md border border-rose-500/40 px-2 text-[10px] text-rose-200 hover:bg-rose-500/10"
                      onClick={() => void onDeleteQueryPreset(preset.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
