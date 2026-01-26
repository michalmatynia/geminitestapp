"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/shared/ui/toast";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";

const providerOptions = [
  {
    value: "prisma",
    label: "PostgreSQL (Prisma)",
    description: "Use Prisma-backed Postgres for all app data.",
  },
  {
    value: "mongodb",
    label: "MongoDB",
    description: "Use MongoDB for all app data.",
  },
] as const;

type ProviderValue = (typeof providerOptions)[number]["value"];

export default function DatabaseSettingsPage() {
  const { toast } = useToast();
  const [provider, setProvider] = useState<ProviderValue>("prisma");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const providerDescription = useMemo(
    () =>
      providerOptions.find((option) => option.value === provider)?.description ??
      "",
    [provider]
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load database settings.");
        const data = (await res.json()) as { key: string; value: string }[];
        if (!mounted) return;
        const settingsMap = new Map(data.map((item) => [item.key, item.value]));
        const value =
          settingsMap.get("app_db_provider") === "mongodb" ? "mongodb" : "prisma";
        setProvider(value);
        setDirty(false);
      } catch (error) {
        toast(
          error instanceof Error ? error.message : "Failed to load settings.",
          { variant: "error" }
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const saveProvider = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "app_db_provider",
          value: provider,
        }),
      });
      if (!res.ok) throw new Error("Failed to save database provider.");
      setDirty(false);
      toast("Database provider saved.", { variant: "success" });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to save settings.",
        { variant: "error" }
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Database Provider</h1>
        <p className="mt-2 text-sm text-gray-400">
          Choose the single database provider for the entire application.
        </p>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-950 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Global provider</h2>
            <p className="mt-1 text-sm text-gray-400">
              This overrides product, integration, auth, and notes data sources.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void saveProvider()}
            disabled={loading || saving || !dirty}
            className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-300"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        <div className="mt-6 max-w-lg space-y-2">
          <Label className="text-sm font-medium text-gray-200" htmlFor="app-db-provider">
            Database provider
          </Label>
          <select
            id="app-db-provider"
            className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-600 disabled:cursor-not-allowed disabled:text-gray-500"
            value={provider}
            onChange={(event) => {
              const value = event.target.value === "mongodb" ? "mongodb" : "prisma";
              setProvider(value);
              setDirty(true);
            }}
            disabled={loading}
          >
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400">{providerDescription}</p>
        </div>

        <div className="mt-6 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
          Switching providers does not migrate existing data. Make sure the target
          database is prepared before switching.
        </div>
      </div>
    </div>
  );
}
