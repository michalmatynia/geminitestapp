"use client";

import { Button, Input, Label, Switch, useToast } from "@/shared/ui";
import { useState, type ChangeEvent } from "react";





import {
  DEFAULT_TRANSIENT_RECOVERY_SETTINGS,
  TRANSIENT_RECOVERY_KEYS,
  type TransientRecoverySettings,
} from "@/features/observability/server";
import { parseJsonSetting, serializeSetting } from "@/shared/utils/settings-json";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/use-settings";

const toNumber = (value: string, fallback: number, min: number = 0): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
};

export default function TransientRecoverySettingsPage() {
  const settingsQuery = useSettingsMap();

  if (settingsQuery.isLoading || !settingsQuery.data) {
    return <div className="p-10 text-center text-gray-400">Loading settings...</div>;
  }

  const stored = parseJsonSetting<TransientRecoverySettings | null>(
    settingsQuery.data.get(TRANSIENT_RECOVERY_KEYS.settings),
    null
  );

  const initialSettings: TransientRecoverySettings = stored
    ? {
        enabled: stored.enabled ?? DEFAULT_TRANSIENT_RECOVERY_SETTINGS.enabled,
        retry: {
          enabled:
            stored.retry?.enabled ?? DEFAULT_TRANSIENT_RECOVERY_SETTINGS.retry.enabled,
          maxAttempts:
            stored.retry?.maxAttempts ??
            DEFAULT_TRANSIENT_RECOVERY_SETTINGS.retry.maxAttempts,
          initialDelayMs:
            stored.retry?.initialDelayMs ??
            DEFAULT_TRANSIENT_RECOVERY_SETTINGS.retry.initialDelayMs,
          maxDelayMs:
            stored.retry?.maxDelayMs ??
            DEFAULT_TRANSIENT_RECOVERY_SETTINGS.retry.maxDelayMs,
          timeoutMs:
            stored.retry?.timeoutMs === null
              ? 0
              : stored.retry?.timeoutMs ??
                DEFAULT_TRANSIENT_RECOVERY_SETTINGS.retry.timeoutMs,
        },
        circuit: {
          enabled:
            stored.circuit?.enabled ??
            DEFAULT_TRANSIENT_RECOVERY_SETTINGS.circuit.enabled,
          failureThreshold:
            stored.circuit?.failureThreshold ??
            DEFAULT_TRANSIENT_RECOVERY_SETTINGS.circuit.failureThreshold,
          resetTimeoutMs:
            stored.circuit?.resetTimeoutMs ??
            DEFAULT_TRANSIENT_RECOVERY_SETTINGS.circuit.resetTimeoutMs,
        },
      }
    : DEFAULT_TRANSIENT_RECOVERY_SETTINGS;

  return <TransientRecoverySettingsForm initialSettings={initialSettings} />;
}

function TransientRecoverySettingsForm({
  initialSettings,
}: {
  initialSettings: TransientRecoverySettings;
}) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<TransientRecoverySettings>(initialSettings);
  const [dirty, setDirty] = useState(false);
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();

  const updateRetry = (key: keyof TransientRecoverySettings["retry"], value: number | boolean): void => {
    setSettings((prev: TransientRecoverySettings) => ({
      ...prev,
      retry: {
        ...prev.retry,
        [key]: value,
      },
    }));
    setDirty(true);
  };

  const updateCircuit = (
    key: keyof TransientRecoverySettings["circuit"],
    value: number | boolean
  ): void => {
    setSettings((prev: TransientRecoverySettings) => ({
      ...prev,
      circuit: {
        ...prev.circuit,
        [key]: value,
      },
    }));
    setDirty(true);
  };

  const saveSettings = async (): Promise<void> => {
    try {
      const payload: TransientRecoverySettings = {
        enabled: settings.enabled,
        retry: {
          ...settings.retry,
          timeoutMs:
            settings.retry.timeoutMs && settings.retry.timeoutMs > 0
              ? settings.retry.timeoutMs
              : null,
        },
        circuit: {
          ...settings.circuit,
        },
      };
      await updateSetting.mutateAsync({
        key: TRANSIENT_RECOVERY_KEYS.settings,
        value: serializeSetting(payload),
      });
      setDirty(false);
      toast("Transient recovery settings saved.", { variant: "success" });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to save settings.", {
        variant: "error",
      });
    }
  };

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Transient Recovery</h1>
        <p className="mt-2 text-sm text-gray-400">
          Configure retry and circuit-breaker policies for transient failures.
        </p>
      </div>

      <div className="rounded-md border border-gray-800 bg-gray-950 p-4 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Global toggle</h2>
            <p className="mt-1 text-xs text-gray-400">
              Disable to skip all retries and circuit breakers across the app.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-400">Enabled</Label>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked: boolean) => {
                setSettings((prev: TransientRecoverySettings) => ({ ...prev, enabled: checked }));
                setDirty(true);
              }}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-md border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Retry policy</h3>
                <p className="text-xs text-gray-400">
                  Applies to transient external calls and webhooks.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-400">Enabled</Label>
                <Switch
                  checked={settings.retry.enabled}
                  onCheckedChange={(checked: boolean) => updateRetry("enabled", checked)}
                />
              </div>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label className="text-xs text-gray-400">Max attempts</Label>
                <Input
                  type="number"
                  min={1}
                  value={settings.retry.maxAttempts}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateRetry(
                      "maxAttempts",
                      toNumber(event.target.value, settings.retry.maxAttempts, 1)
                    )
                  }
                  disabled={settingsQuery.isPending}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-gray-400">Initial delay (ms)</Label>
                <Input
                  type="number"
                  min={0}
                  value={settings.retry.initialDelayMs}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateRetry(
                      "initialDelayMs",
                      toNumber(event.target.value, settings.retry.initialDelayMs)
                    )
                  }
                  disabled={settingsQuery.isPending}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-gray-400">Max delay (ms)</Label>
                <Input
                  type="number"
                  min={0}
                  value={settings.retry.maxDelayMs}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateRetry(
                      "maxDelayMs",
                      toNumber(event.target.value, settings.retry.maxDelayMs)
                    )
                  }
                  disabled={settingsQuery.isPending}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-gray-400">Timeout per attempt (ms)</Label>
                <Input
                  type="number"
                  min={0}
                  value={settings.retry.timeoutMs ?? 0}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateRetry(
                      "timeoutMs",
                      toNumber(event.target.value, settings.retry.timeoutMs ?? 0)
                    )
                  }
                  disabled={settingsQuery.isPending}
                />
                <p className="text-[11px] text-gray-500">
                  Set to 0 to disable per-attempt timeout.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-md border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Circuit breaker</h3>
                <p className="text-xs text-gray-400">
                  Prevents repeated calls to failing services.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-400">Enabled</Label>
                <Switch
                  checked={settings.circuit.enabled}
                  onCheckedChange={(checked: boolean) => updateCircuit("enabled", checked)}
                />
              </div>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label className="text-xs text-gray-400">Failure threshold</Label>
                <Input
                  type="number"
                  min={1}
                  value={settings.circuit.failureThreshold}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateCircuit(
                      "failureThreshold",
                      toNumber(
                        event.target.value,
                        settings.circuit.failureThreshold,
                        1
                      )
                    )
                  }
                  disabled={settingsQuery.isPending}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-gray-400">Reset timeout (ms)</Label>
                <Input
                  type="number"
                  min={0}
                  value={settings.circuit.resetTimeoutMs}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateCircuit(
                      "resetTimeoutMs",
                      toNumber(
                        event.target.value,
                        settings.circuit.resetTimeoutMs
                      )
                    )
                  }
                  disabled={settingsQuery.isPending}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Changes apply across the app after saving.
          </p>
          <Button
            size="sm"
            onClick={() => void saveSettings()}
            disabled={!dirty || updateSetting.isPending}
          >
            {updateSetting.isPending ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
