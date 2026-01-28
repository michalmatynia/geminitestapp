"use client";
import { Button, useToast, Textarea, Label } from "@/shared/ui";
import { useEffect, useState } from "react";


import { CLIENT_LOGGING_KEYS } from "@/features/observability";
import { parseJsonSetting, serializeSetting } from "@/shared/utils/settings-json";


export default function LoggingSettingsPage() {
  const { toast } = useToast();
  const [clientTags, setClientTags] = useState("{}");
  const [clientFlags, setClientFlags] = useState("{}");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) return;
        const settings = (await res.json()) as Array<{ key: string; value: string }>;
        const map = new Map(settings.map((item) => [item.key, item.value]));
        const tags = parseJsonSetting<Record<string, unknown> | null>(
          map.get(CLIENT_LOGGING_KEYS.tags),
          null
        );
        const flags = parseJsonSetting<Record<string, unknown> | null>(
          map.get(CLIENT_LOGGING_KEYS.featureFlags),
          null
        );
        if (!active) return;
        setClientTags(JSON.stringify(tags ?? {}, null, 2));
        setClientFlags(JSON.stringify(flags ?? {}, null, 2));
        setDirty(false);
      } catch {
        // ignore
      }
    };
    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  const saveSettings = async () => {
    try {
      setSaving(true);
      const parsedTags = clientTags.trim()
        ? (JSON.parse(clientTags) as Record<string, unknown>)
        : {};
      const parsedFlags = clientFlags.trim()
        ? (JSON.parse(clientFlags) as Record<string, unknown>)
        : {};
      const responses = await Promise.all([
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: CLIENT_LOGGING_KEYS.tags,
            value: serializeSetting(parsedTags),
          }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: CLIENT_LOGGING_KEYS.featureFlags,
            value: serializeSetting(parsedFlags),
          }),
        }),
      ]);
      if (responses.some((res) => !res.ok)) {
        throw new Error("Failed to save logging settings.");
      }
      setDirty(false);
      toast("Logging settings saved.", { variant: "success" });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to save settings.", {
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Logging Settings</h1>
        <p className="mt-2 text-sm text-gray-400">
          Configure client logging context shared with error reports.
        </p>
      </div>

      <div className="rounded-md border border-gray-800 bg-gray-950 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Client logging context</h2>
            <p className="mt-1 text-xs text-gray-400">
              Provide feature flags and tags attached to client errors.
            </p>
          </div>
          <Button size="sm" onClick={() => void saveSettings()} disabled={!dirty || saving}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Feature flags (JSON)</Label>
            <Textarea
              className="min-h-[180px] w-full rounded-md border border-gray-800 bg-gray-900 p-2 text-xs text-gray-200"
              value={clientFlags}
              onChange={(event) => {
                setClientFlags(event.target.value);
                setDirty(true);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Tags (JSON)</Label>
            <Textarea
              className="min-h-[180px] w-full rounded-md border border-gray-800 bg-gray-900 p-2 text-xs text-gray-200"
              value={clientTags}
              onChange={(event) => {
                setClientTags(event.target.value);
                setDirty(true);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
