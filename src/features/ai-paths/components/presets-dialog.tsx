"use client";

import React from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Textarea,
} from "@/shared/ui";

import type { ClusterPreset } from "@/features/ai-paths/lib";

type PresetsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetsJson: string;
  setPresetsJson: React.Dispatch<React.SetStateAction<string>>;
  clusterPresets: ClusterPreset[];
  onImportPresets: (mode: "merge" | "replace") => void;
  toast: (message: string, options?: { variant?: "success" | "error" }) => void;
  reportAiPathsError: (
    error: unknown,
    meta: Record<string, unknown>,
    prefix?: string
  ) => void;
};

export function PresetsDialog({
  open,
  onOpenChange,
  presetsJson,
  setPresetsJson,
  clusterPresets,
  onImportPresets,
  toast,
  reportAiPathsError,
}: PresetsDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border border-border bg-card text-white">
        <DialogHeader>
          <DialogTitle className="text-lg">Export / Import Presets</DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            Share Cluster Presets as JSON across projects.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            className="min-h-[240px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
            value={presetsJson}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
              setPresetsJson(event.target.value)
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="rounded-md border text-xs text-white hover:bg-muted/60"
              onClick={() => setPresetsJson(JSON.stringify(clusterPresets, null, 2))}
            >
              Load Export
            </Button>
            <Button
              type="button"
              className="rounded-md border border-emerald-500/40 text-xs text-emerald-200 hover:bg-emerald-500/10"
              onClick={() => onImportPresets("merge")}
            >
              Import (Merge)
            </Button>
            <Button
              type="button"
              className="rounded-md border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10"
              onClick={() => onImportPresets("replace")}
            >
              Replace Existing
            </Button>
            <Button
              type="button"
              className="rounded-md border text-xs text-white hover:bg-muted/60"
              onClick={() => {
                const value = presetsJson || JSON.stringify(clusterPresets, null, 2);
                navigator.clipboard
                  .writeText(value)
                  .then(() => toast("Presets copied to clipboard.", { variant: "success" }))
                  .catch((error: Error) => {
                    reportAiPathsError(
                      error,
                      { action: "copyPresets" },
                      "Failed to copy presets:"
                    );
                    toast("Failed to copy presets.", { variant: "error" });
                  });
              }}
            >
              Copy JSON
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
