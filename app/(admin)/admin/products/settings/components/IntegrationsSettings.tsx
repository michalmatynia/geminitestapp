"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";

type IntegrationDbProvider = "prisma" | "mongodb";

export function IntegrationsSettings() {
  const { toast } = useToast();
  const [integrationDbProvider, setIntegrationDbProvider] =
    useState<IntegrationDbProvider>("prisma");
  const [integrationDbLoading, setIntegrationDbLoading] = useState(true);
  const [integrationDbSaving, setIntegrationDbSaving] = useState(false);
  const [integrationDbDirty, setIntegrationDbDirty] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to load integration settings.");
        }
        const data = (await res.json()) as { key: string; value: string }[];
        if (!mounted) return;
        const settingsMap = new Map(data.map((item) => [item.key, item.value]));
        const provider =
          settingsMap.get("integration_db_provider") === "mongodb"
            ? "mongodb"
            : "prisma";
        setIntegrationDbProvider(provider);
        setIntegrationDbDirty(false);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load integration settings.";
        toast(message, { variant: "error" });
      } finally {
        if (mounted) {
          setIntegrationDbLoading(false);
        }
      }
    };
    void loadSettings();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const handleSaveIntegrationDbProvider = async () => {
    try {
      setIntegrationDbSaving(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "integration_db_provider",
          value: integrationDbProvider,
        }),
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        toast(error.error || "Failed to save integration settings.", {
          variant: "error",
        });
        return;
      }
      setIntegrationDbDirty(false);
      toast("Integration settings saved.", { variant: "success" });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save integration settings.";
      toast(message, { variant: "error" });
    } finally {
      setIntegrationDbSaving(false);
    }
  };

  return (
    <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Integrations data store
          </h2>
          <p className="mt-1 text-xs text-gray-400">
            Control where integrations and connection data is stored.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveIntegrationDbProvider}
          disabled={
            integrationDbSaving || integrationDbLoading || !integrationDbDirty
          }
          className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-300"
        >
          {integrationDbSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div className="mt-4 max-w-md">
        <label className="text-xs text-gray-400">
          Choose data provider
        </label>
        <select
          value={integrationDbProvider}
          onChange={(event) => {
            const value =
              event.target.value === "mongodb" ? "mongodb" : "prisma";
            setIntegrationDbProvider(value);
            setIntegrationDbDirty(true);
          }}
          disabled={integrationDbLoading}
          className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:text-gray-500"
        >
          <option value="prisma">PostgreSQL (Prisma)</option>
          <option value="mongodb">MongoDB</option>
        </select>
        <p className="mt-2 text-xs text-gray-500">
          Switching providers does not migrate existing data.
        </p>
      </div>
    </div>
  );
}
