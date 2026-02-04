"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { Button, Label, SectionPanel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, useToast } from "@/shared/ui";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/use-settings";
import { parseJsonSetting, serializeSetting } from "@/shared/utils/settings-json";
import { logClientError } from "@/features/observability";
import { IMAGE_STUDIO_UI_ACTIVE_KEY, IMAGE_STUDIO_UI_PRESETS_KEY, parseImageStudioUiPresets, type ImageStudioUiPreset } from "../utils/ui-presets";

export function AdminImageStudioUiPresetsPage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();

  const [presets, setPresets] = useState<ImageStudioUiPreset[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (!settingsQuery.data) return;
    const presetsRaw = settingsQuery.data.get(IMAGE_STUDIO_UI_PRESETS_KEY);
    const activeRaw = settingsQuery.data.get(IMAGE_STUDIO_UI_ACTIVE_KEY);
    setPresets(parseImageStudioUiPresets(presetsRaw));
    setActiveId(parseJsonSetting<string | null>(activeRaw, null) ?? "");
  }, [settingsQuery.data]);

  const handleSetActive = useCallback(
    async (id: string): Promise<void> => {
      setActiveId(id);
      try {
        await updateSetting.mutateAsync({
          key: IMAGE_STUDIO_UI_ACTIVE_KEY,
          value: serializeSetting(id),
        });
        toast("Active UI preset updated.", { variant: "success" });
      } catch (error) {
        logClientError(error, { context: { source: "AdminImageStudioUiPresetsPage", action: "setActive" } });
        toast("Failed to update active UI preset.", { variant: "error" });
      }
    },
    [toast, updateSetting]
  );

  const handleDelete = useCallback(
    async (id: string): Promise<void> => {
      const next = presets.filter((preset: ImageStudioUiPreset) => preset.id !== id);
      setPresets(next);
      const nextActive = activeId === id ? "" : activeId;
      setActiveId(nextActive);
      try {
        await updateSetting.mutateAsync({
          key: IMAGE_STUDIO_UI_PRESETS_KEY,
          value: serializeSetting(next),
        });
        await updateSetting.mutateAsync({
          key: IMAGE_STUDIO_UI_ACTIVE_KEY,
          value: serializeSetting(nextActive || null),
        });
        toast("UI preset deleted.", { variant: "success" });
      } catch (error) {
        logClientError(error, { context: { source: "AdminImageStudioUiPresetsPage", action: "deletePreset" } });
        toast("Failed to delete UI preset.", { variant: "error" });
      }
    },
    [activeId, presets, toast, updateSetting]
  );

  const empty = presets.length === 0;
  const activePreset = presets.find((preset: ImageStudioUiPreset) => preset.id === activeId) ?? null;

  return (
    <div className="container mx-auto max-w-5xl py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg text-gray-100">Image Studio UI Presets</div>
          <div className="text-xs text-gray-500">Manage saved UI control layouts and defaults.</div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Link href="/admin/image-studio" className="text-gray-300 hover:text-white">
            Back to Studio
          </Link>
          <Link href="/admin/image-studio?tab=settings" className="text-gray-400 hover:text-white">
            Settings
          </Link>
        </div>
      </div>

      <SectionPanel variant="subtle" className="space-y-4">
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Active UI preset</Label>
          <Select
            value={activeId || "__none__"}
            onValueChange={(value: string) => {
              if (value === "__none__") return;
              void handleSetActive(value);
            }}
          >
            <SelectTrigger className="h-9 max-w-md">
              <SelectValue placeholder="Select an active preset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select an active preset</SelectItem>
              {presets.map((preset: ImageStudioUiPreset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activePreset ? (
            <div className="text-[11px] text-gray-500">
              Active: <span className="text-gray-300">{activePreset.name}</span>
            </div>
          ) : null}
        </div>

        {empty ? (
          <div className="rounded border border-dashed border-border p-6 text-center text-sm text-gray-400">
            No UI presets saved yet. Save a UI from the Image Studio right panel.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {presets.map((preset: ImageStudioUiPreset) => (
              <div key={preset.id} className="rounded border border-border bg-card/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-100">{preset.name}</div>
                    {preset.description ? (
                      <div className="mt-1 text-[11px] text-gray-400">{preset.description}</div>
                    ) : null}
                    <div className="mt-2 text-[11px] text-gray-500">
                      Params: {Object.keys(preset.params ?? {}).length}
                    </div>
                    <div className="text-[11px] text-gray-500">Updated: {preset.updatedAt}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant={activeId === preset.id ? "default" : "outline"}
                      onClick={() => void handleSetActive(preset.id)}
                    >
                      {activeId === preset.id ? "Active" : "Set active"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void handleDelete(preset.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="mt-3 rounded border border-border bg-card/60 p-2">
                  <div className="text-[11px] text-gray-400">Param UI overrides</div>
                  <Textarea
                    readOnly
                    className="mt-1 h-20 font-mono text-[10px]"
                    value={JSON.stringify(preset.paramUiOverrides ?? {}, null, 2)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionPanel>
    </div>
  );
}
