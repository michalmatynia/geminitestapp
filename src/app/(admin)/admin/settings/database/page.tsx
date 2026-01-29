"use client";

import { useToast, Button, Label } from "@/shared/ui";
import { useMemo, useState } from "react";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/useSettings";



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
  const settingsQuery = useSettingsMap();

  if (settingsQuery.isLoading || !settingsQuery.data) {
    return <div className="p-10 text-center text-gray-400">Loading settings...</div>;
  }

  const initialProvider: ProviderValue =
    settingsQuery.data.get("app_db_provider") === "mongodb" ? "mongodb" : "prisma";

  return <DatabaseSettingsForm initialProvider={initialProvider} />;
}

function DatabaseSettingsForm({ initialProvider }: { initialProvider: ProviderValue }) {
  const { toast } = useToast();
  const [provider, setProvider] = useState<ProviderValue>(initialProvider);
  const [dirty, setDirty] = useState(false);
  const updateSetting = useUpdateSetting();
  const settingsQuery = useSettingsMap(); // Re-fetch or pass as prop if needed for other things, but here it seems only used for initial value. 
  // Wait, the original code used settingsQuery.isPending in the button disabled state.
  // We can just call useSettingsMap() again, it will use the cache.

  const providerDescription = useMemo(
    () =>
      providerOptions.find((option: (typeof providerOptions)[number]) => option.value === provider)?.description ??
      "",
    [provider]
  );

  const saveProvider = async () => {
    try {
      await updateSetting.mutateAsync({
        key: "app_db_provider",
        value: provider,
      });
      setDirty(false);
      toast("Database provider saved.", { variant: "success" });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to save settings.",
        { variant: "error" }
      );
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
            disabled={settingsQuery.isPending || updateSetting.isPending || !dirty}
            className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-300"
          >
            {updateSetting.isPending ? "Saving..." : "Save"}
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
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
              const value = event.target.value === "mongodb" ? "mongodb" : "prisma";
              setProvider(value);
              setDirty(true);
            }}
            disabled={settingsQuery.isPending}
          >
            {providerOptions.map((option: (typeof providerOptions)[number]) => (
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
