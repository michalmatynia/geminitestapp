"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Label, SectionHeader, SectionPanel, UnifiedSelect, useToast } from "@/shared/ui";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/use-settings";
import { APP_FONT_SET_SETTING_KEY, APP_FONT_SETS, getAppFontSet, type AppFontSetId } from "@/shared/constants/typography";

export function AdminTypographySettingsPage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();

  const storedId: AppFontSetId = useMemo(() => {
    const raw = settingsQuery.data?.get(APP_FONT_SET_SETTING_KEY);
    return getAppFontSet(raw).id;
  }, [settingsQuery.data]);

  const [selected, setSelected] = useState<AppFontSetId>(storedId);

  useEffect(() => {
    setSelected(storedId);
  }, [storedId]);

  const isDirty = selected !== storedId;
  const current = useMemo(() => getAppFontSet(selected), [selected]);

  const handleSave = (): void => {
    updateSetting.mutate(
      { key: APP_FONT_SET_SETTING_KEY, value: selected },
      {
        onSuccess: (): void => toast("Typography settings saved", { variant: "success" }),
        onError: (error: Error): void =>
          toast(error.message || "Failed to save typography settings", { variant: "error" }),
      }
    );
  };

  if (settingsQuery.isLoading || !settingsQuery.data) {
    return <div className="p-10 text-center text-gray-400">Loading settings...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <SectionHeader
        title="Typography"
        description="Choose an app-wide font set. Fonts are served locally from public/fonts."
        eyebrow={
          <Link href="/admin/settings" className="text-blue-300 hover:text-blue-200">
            ← Back to settings
          </Link>
        }
        className="mb-8"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SectionPanel className="p-6 space-y-6">
            <div>
              <Label htmlFor="font-set" className="mb-3 block text-sm font-semibold">
                Font set
              </Label>
              <UnifiedSelect
                value={selected}
                onValueChange={(val: string) => setSelected(val as AppFontSetId)}
                options={APP_FONT_SETS.map((set: { id: AppFontSetId; name: string; description: string }) => ({
                  value: set.id,
                  label: set.name,
                  description: set.description
                }))}
                placeholder="Select a font set"
              />
              <p className="mt-2 text-xs text-gray-400">
                Fonts are defined in <span className="font-mono">src/app/fonts.css</span> and loaded from{" "}
                <span className="font-mono">public/fonts</span>.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-border pt-6">
              <Button onClick={handleSave} disabled={!isDirty || updateSetting.isPending}>
                {updateSetting.isPending ? "Saving..." : "Save Settings"}
              </Button>
              <Button variant="outline" onClick={() => setSelected(storedId)} disabled={!isDirty}>
                Reset
              </Button>
            </div>
          </SectionPanel>
        </div>

        <div>
          <SectionPanel className="sticky top-6 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">Preview</h2>

            <SectionPanel variant="subtle-compact" className="p-4">
              <div className="text-xs text-gray-400">Headings</div>
              <div className="mt-2 space-y-2">
                <h3 className="text-xl font-semibold text-white">Edit Product</h3>
                <h4 className="text-base font-semibold text-white">Product Settings</h4>
              </div>
            </SectionPanel>

            <SectionPanel variant="subtle-compact" className="p-4">
              <div className="text-xs text-gray-400">Body</div>
              <p className="mt-2 text-sm text-gray-200">
                The quick brown fox jumps over the lazy dog. 0123456789.
              </p>
            </SectionPanel>

            <SectionPanel variant="subtle-compact" className="p-4 text-xs text-gray-300">
              <div className="flex justify-between">
                <span>Selected</span>
                <span className="font-mono text-gray-200">{current.id}</span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">Heading</span>
                  <span className="truncate font-mono text-[10px] text-gray-200">{current.heading}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">Body</span>
                  <span className="truncate font-mono text-[10px] text-gray-200">{current.body}</span>
                </div>
              </div>
            </SectionPanel>

            <SectionPanel variant="subtle-compact" className="border-blue-500/20 bg-blue-500/5 p-3">
              <p className="text-xs text-blue-200">
                Tip: If a font file is missing, the app silently falls back to system fonts.
              </p>
            </SectionPanel>
          </SectionPanel>
        </div>
      </div>
    </div>
  );
}

