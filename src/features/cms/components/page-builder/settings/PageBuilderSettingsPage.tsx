"use client";

import React, { useEffect, useState } from "react";
import { Card, Checkbox, Label, Button, useToast } from "@/shared/ui";
import { useSettingsMap, useUpdateSettingsBulk } from "@/shared/hooks/use-settings";
import { Loader2 } from "lucide-react";

export const PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY = "page_builder_show_extract_placeholder";
export const PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY = "page_builder_show_section_drop_placeholder";

export function PageBuilderSettingsPage(): React.JSX.Element {
  const { data: settingsMap, isLoading } = useSettingsMap();
  const updateSettingsBulk = useUpdateSettingsBulk();
  const { toast } = useToast();

  const [showExtractPlaceholder, setShowExtractPlaceholder] = useState(false);
  const [showSectionDropPlaceholder, setShowSectionDropPlaceholder] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (settingsMap) {
      const extractValue = settingsMap.get(PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowExtractPlaceholder(extractValue === "true");

      const sectionDropValue = settingsMap.get(PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY);
      // Default to true if not set
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSectionDropPlaceholder(sectionDropValue !== "false");
    }
  }, [settingsMap]);

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
      setIsDirty(false);
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
                setShowSectionDropPlaceholder(checked === true);
                setIsDirty(true);
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
                setShowExtractPlaceholder(checked === true);
                setIsDirty(true);
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
