"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Checkbox, SectionHeader, SectionPanel, useToast } from "@/shared/ui";
import { parseJsonSetting, serializeSetting } from "@/shared/utils/settings-json";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/useSettings";
import { APP_EMBED_OPTIONS, APP_EMBED_SETTING_KEY, type AppEmbedId } from "../lib/constants";

export function AdminAppEmbedsPage(): React.ReactNode {
  const settingsQuery = useSettingsMap();

  if (settingsQuery.isLoading || !settingsQuery.data) {
    return (
      <div className="container mx-auto py-10 text-gray-400">
        Loading app embed settings...
      </div>
    );
  }

  const stored = parseJsonSetting<AppEmbedId[]>(
    settingsQuery.data.get(APP_EMBED_SETTING_KEY),
    []
  );

  return <AdminAppEmbedsContent initialEnabled={stored} />;
}

function AdminAppEmbedsContent({
  initialEnabled,
}: {
  initialEnabled: AppEmbedId[];
}): React.ReactNode {
  const { toast } = useToast();
  const updateSetting = useUpdateSetting();
  const [enabled, setEnabled] = useState<Set<AppEmbedId>>(() => new Set(initialEnabled));

  const options = useMemo(() => APP_EMBED_OPTIONS, []);

  const toggleOption = (id: AppEmbedId, checked: boolean): void => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSave = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: APP_EMBED_SETTING_KEY,
        value: serializeSetting(Array.from(enabled)),
      });
      toast("App embed settings saved.", { variant: "success" });
    } catch (error) {
      console.error("Failed to save app embed settings:", error);
      toast("Failed to save app embed settings.", { variant: "error" });
    }
  };

  return (
    <div className="container mx-auto max-w-5xl py-10">
      <SectionHeader
        title="App Embeds"
        description="Enable internal apps that can be embedded into CMS pages."
        className="mb-6"
      />

      <SectionPanel className="p-6">
        <div className="space-y-4">
          {options.map((option) => {
            const isEnabled = enabled.has(option.id);
            return (
              <div
                key={option.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border/50 bg-card/40 px-4 py-3"
              >
                <div className="min-w-[220px]">
                  <div className="text-base font-semibold text-white">{option.label}</div>
                  <div className="text-xs text-gray-400">{option.description}</div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <Checkbox
                      checked={isEnabled}
                      onCheckedChange={(checked) => toggleOption(option.id, checked === true)}
                    />
                    Enable
                  </label>
                  <Link
                    href={option.settingsRoute}
                    className="text-xs text-blue-300 hover:text-blue-200"
                  >
                    Open settings
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => void handleSave()}
            disabled={updateSetting.isPending}
            className="min-w-[140px] bg-blue-600 text-white hover:bg-blue-700"
          >
            {updateSetting.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </SectionPanel>
    </div>
  );
}
