"use client";

import React, { useState } from "react";
import { Card, Checkbox, Label, Button, useToast } from "@/shared/ui";
import { useUpdateSettingsBulk } from "@/shared/hooks/use-settings";
import { useSettingsStore } from "@/shared/providers/SettingsStoreProvider";
import { Loader2 } from "lucide-react";

export const PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY = "page_builder_show_extract_placeholder";
export const PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY = "page_builder_show_section_drop_placeholder";

export function PageBuilderSettingsPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const settingsMap = settingsStore.map;
  const isLoading = settingsStore.isLoading;
  const updateSettingsBulk = useUpdateSettingsBulk();
  const { toast } = useToast();

  // Get server values
  const serverExtractValue = settingsMap?.get(PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY);
  const serverSectionDropValue = settingsMap?.get(PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY);

  // Local state for user edits (null means use server value)
  const [localExtractPlaceholder, setLocalExtractPlaceholder] = useState<boolean | null>(null);
  const [localSectionDropPlaceholder, setLocalSectionDropPlaceholder] = useState<boolean | null>(null);

  // Compute displayed values: use local if edited, otherwise derive from server
  const showExtractPlaceholder = localExtractPlaceholder ?? (serverExtractValue === "true");
  const showSectionDropPlaceholder = localSectionDropPlaceholder ?? (serverSectionDropValue !== "false");

  const isDirty = localExtractPlaceholder !== null || localSectionDropPlaceholder !== null;

  const handleSave = async (): Promise<void> => {
    try {
      await updateSettingsBulk.mutateAsync([
        {
          key: PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY,
          value: showExtractPlaceholder ? "true" : "false",
        },
        {
          key: PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY,
          value: showSectionDropPlaceholder ? "true" : "false",
        },
      ]);
      // Reset local state after successful save
      setLocalExtractPlaceholder(null);
      setLocalSectionDropPlaceholder(null);
      toast("Settings saved successfully.", { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save settings";
      toast(message, { variant: "error" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Page Builder Settings</h1>
        <p className="mt-1 text-sm text-gray-400">
          Configure settings for the CMS Page Builder.
        </p>
      </div>

      <Card className="border-border/50 bg-gray-800/30 p-6">
        <h2 className="mb-4 text-lg font-medium text-white">Drag & Drop Placeholders</h2>
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox
              checked={showSectionDropPlaceholder}
              onCheckedChange={(checked: boolean | "indeterminate"): void => {
                setLocalSectionDropPlaceholder(checked === true);
              }}
            />
            <div>
              <Label className="cursor-pointer text-sm text-gray-200">
                Show section drop placeholder
              </Label>
              <p className="text-xs text-gray-500">
                When enabled, purple &quot;Drop here&quot; placeholders will appear when dragging sections between zones.
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox
              checked={showExtractPlaceholder}
              onCheckedChange={(checked: boolean | "indeterminate"): void => {
                setLocalExtractPlaceholder(checked === true);
              }}
            />
            <div>
              <Label className="cursor-pointer text-sm text-gray-200">
                Show extract placeholder when dragging blocks
              </Label>
              <p className="text-xs text-gray-500">
                When enabled, a &quot;Drop here to extract&quot; placeholder will appear when dragging promotable blocks (ImageElement, TextElement, ButtonElement) to allow extracting them as standalone sections.
              </p>
            </div>
          </label>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={(): void => { void handleSave(); }}
          disabled={!isDirty || updateSettingsBulk.isPending}
        >
          {updateSettingsBulk.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>
    </div>
  );
}
