"use client";

import { useEffect, useState } from "react";
import { IntegrationConnection } from "@/types/integrations-ui";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

type BaselinkerSettingsProps = {
  activeConnection: IntegrationConnection | null;
  onTest: () => void;
  isTesting: boolean;
};

export function BaselinkerSettings({
  activeConnection,
  onTest,
  isTesting,
}: BaselinkerSettingsProps) {
  const baselinkerConnected = Boolean(activeConnection?.hasBaseApiToken);
  const baseTokenUpdatedAt = activeConnection?.baseTokenUpdatedAt
    ? new Date(activeConnection.baseTokenUpdatedAt).toLocaleString()
    : "—";
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState("10");
  const [loadingSyncInterval, setLoadingSyncInterval] = useState(true);
  const [savingSyncInterval, setSavingSyncInterval] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSyncInterval = async () => {
      try {
        setLoadingSyncInterval(true);
        const res = await fetch("/api/settings");
        if (!res.ok) return;
        const settings = (await res.json()) as Array<{ key: string; value: string }>;
        const found = settings.find((setting) => setting.key === "base_sync_poll_interval_minutes");
        if (found?.value) {
          setSyncIntervalMinutes(found.value);
        }
      } catch {
        // Ignore load errors
      } finally {
        setLoadingSyncInterval(false);
      }
    };
    void loadSyncInterval();
  }, []);

  const handleSaveSyncInterval = async () => {
    const parsed = Number(syncIntervalMinutes);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setSyncMessage("Enter a valid number of minutes.");
      return;
    }
    setSavingSyncInterval(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "base_sync_poll_interval_minutes",
          value: String(parsed),
        }),
      });
      if (!res.ok) {
        setSyncMessage("Failed to save sync interval.");
        return;
      }
      setSyncMessage("Sync interval saved.");
    } catch {
      setSyncMessage("Failed to save sync interval.");
    } finally {
      setSavingSyncInterval(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-200">
      <div>
        <h3 className="text-sm font-semibold text-white">Baselinker API</h3>
        <p className="mt-1 text-xs text-gray-400">
          Enter your Baselinker API token in the connection fields, then test the
          connection to verify it works.
        </p>
      </div>
      {!activeConnection ? (
        <div className="rounded-md border border-dashed border-gray-800 p-4 text-xs text-gray-400">
          Add a connection first to enable Baselinker API access.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-300">
            <div className="flex items-center justify-between">
              <span>Connection status</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  baselinkerConnected
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-amber-500/20 text-amber-200"
                }`}
              >
                {baselinkerConnected ? "Connected" : "Not tested"}
              </span>
            </div>
            <p className="mt-2">
              <span className="text-gray-400">Last verified:</span>{" "}
              {baseTokenUpdatedAt}
            </p>
            {activeConnection.baseLastInventoryId && (
              <p className="mt-1">
                <span className="text-gray-400">Last inventory:</span>{" "}
                {activeConnection.baseLastInventoryId}
              </p>
            )}
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-300">
            <div className="flex items-center justify-between">
              <span>Listing sync interval</span>
              {loadingSyncInterval ? (
                <span className="text-[10px] text-gray-500">Loading...</span>
              ) : (
                <span className="text-[10px] text-gray-500">Minutes</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min="1"
                value={syncIntervalMinutes}
                onChange={(event) => setSyncIntervalMinutes(event.target.value)}
                className="w-32 rounded-md border border-gray-800 bg-gray-900 px-2 py-1 text-xs text-white"
              />
              <Button
                type="button"
                onClick={() => { void handleSaveSyncInterval(); }}
                disabled={savingSyncInterval}
                className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-200 disabled:opacity-50"
              >
                {savingSyncInterval ? "Saving..." : "Save"}
              </Button>
            </div>
            <p className="mt-2 text-[10px] text-gray-400">
              Controls how often Base.com is checked for listing status updates.
            </p>
            {syncMessage && (
              <p className="mt-2 text-[10px] text-gray-400">{syncMessage}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={onTest}
              disabled={isTesting}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:opacity-50"
            >
              {isTesting
                ? "Testing..."
                : baselinkerConnected
                ? "Re-test Connection"
                : "Test Connection"}
            </Button>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-400">
            <p>
              To get your API token, log in to{" "}
              <a
                href="https://baselinker.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-300 hover:text-purple-200"
              >
                Baselinker
              </a>{" "}
              → My Account → API.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
