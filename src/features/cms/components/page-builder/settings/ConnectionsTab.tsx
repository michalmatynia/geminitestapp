"use client";

import React from "react";
import { Input, Label, Checkbox } from "@/shared/ui";

interface ConnectionsTabProps {
  hasSelection: boolean;
  selectedLabel: string;
  connectionSettings: {
    enabled: boolean;
    source: string;
    path: string;
    fallback: string;
  };
  updateConnectionSetting: (patch: Partial<{ enabled: boolean; source: string; path: string; fallback: string }>) => void;
}

function ConnectionsTab({
  hasSelection,
  selectedLabel,
  connectionSettings,
  updateConnectionSetting,
}: ConnectionsTabProps): React.ReactNode {
  if (!hasSelection) {
    return (
      <div className="text-xs text-gray-500">Select an element to configure connections.</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400">
        Connection settings for <span className="text-gray-200">{selectedLabel}</span>
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-gray-400">Data source</Label>
        <Input
          value={connectionSettings.source}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            updateConnectionSetting({ source: e.target.value })
          }
          placeholder="e.g. product, collection, hero"
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-gray-400">Key path</Label>
        <Input
          value={connectionSettings.path}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            updateConnectionSetting({ path: e.target.value })
          }
          placeholder="e.g. title, hero.text"
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-gray-400">Fallback</Label>
        <Input
          value={connectionSettings.fallback}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            updateConnectionSetting({ fallback: e.target.value })
          }
          placeholder="Optional fallback text"
          className="h-8 text-xs"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-400">
        <Checkbox
          checked={connectionSettings.enabled}
          onCheckedChange={(value: boolean | "indeterminate"): void =>
            updateConnectionSetting({ enabled: value === true })
          }
        />
        Enable data connection
      </label>
    </div>
  );
}

export { ConnectionsTab };
