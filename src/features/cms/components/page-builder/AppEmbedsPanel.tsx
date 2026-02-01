"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Checkbox, useToast } from "@/shared/ui";
import { parseJsonSetting, serializeSetting } from "@/shared/utils/settings-json";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/use-settings";
import { APP_EMBED_OPTIONS, APP_EMBED_SETTING_KEY, type AppEmbedId } from "@/features/app-embeds/lib/constants";

export function AppEmbedsPanel({ showHeader = true }: { showHeader?: boolean } = {}): React.ReactNode {
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  
  const initialEnabled = useMemo<Set<AppEmbedId>>(() => {
    if (!settingsQuery.data) return new Set<AppEmbedId>();
    const stored = parseJsonSetting<AppEmbedId[]>(
      settingsQuery.data.get(APP_EMBED_SETTING_KEY),
      []
    );
    return new Set(stored);
  }, [settingsQuery.data]);

  const [userEnabled, setUserEnabled] = useState<Set<AppEmbedId> | null>(null);
  const enabled: Set<AppEmbedId> = userEnabled ?? initialEnabled;

  const toggleOption = (id: AppEmbedId, checked: boolean): void => {
    setUserEnabled((prev: Set<AppEmbedId> | null) => {
      const current = prev ?? initialEnabled;
      const next = new Set(current);
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
      setUserEnabled(null); // Reset to follow server data after save
      toast("App embeds saved.", { variant: "success" });
    } catch (error) {
      console.error("Failed to save app embeds:", error);
      toast("Failed to save app embeds.", { variant: "error" });
    }
  };

  if (settingsQuery.isLoading || !settingsQuery.data) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-xs text-gray-500">
        Loading app embeds...
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showHeader && (
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-white">App Embeds</h3>
          <p className="mt-1 text-xs text-gray-500">
            Enable apps you can embed into CMS layouts.
          </p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          {APP_EMBED_OPTIONS.map((option: { id: AppEmbedId; label: string; description: string; settingsRoute: string }) => {
            const isEnabled = enabled.has(option.id);
            return (
              <div
                key={option.id}
                className="rounded-md border border-border/50 bg-gray-900/60 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-gray-100">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <Checkbox
                      checked={isEnabled}
                      onCheckedChange={(checked: boolean | "indeterminate") => toggleOption(option.id, checked === true)}
                    />
                    Enabled
                  </label>
                </div>
                <div className="mt-2">
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
      </div>
      <div className="border-t border-border px-4 py-3">
        <Button
          onClick={() => void handleSave()}
          disabled={updateSetting.isPending}
          className="w-full bg-blue-600 text-white hover:bg-blue-700"
        >
          {updateSetting.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
