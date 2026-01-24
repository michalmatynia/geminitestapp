"use client";

import { Dispatch, SetStateAction } from "react";
import { defaultPlaywrightSettings } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type PlaywrightSettingsProps = {
  settings: typeof defaultPlaywrightSettings;
  setSettings: Dispatch<SetStateAction<typeof defaultPlaywrightSettings>>;
  onSave: () => void;
};

export function PlaywrightSettings({
  settings,
  setSettings,
  onSave,
}: PlaywrightSettingsProps) {
  const deviceOptions = [
    { value: "Desktop Chrome", label: "Desktop Chrome" },
    { value: "Desktop Firefox", label: "Desktop Firefox" },
    { value: "Desktop Safari", label: "Desktop Safari" },
    { value: "iPhone 13", label: "iPhone 13" },
    { value: "iPhone 14 Pro", label: "iPhone 14 Pro" },
    { value: "Pixel 7", label: "Pixel 7" },
    { value: "iPad (gen 7)", label: "iPad (gen 7)" },
  ];

  return (
    <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-800 bg-gray-900/60 p-4">
      <h3 className="text-sm font-semibold text-white">Playwright settings</h3>
      <p className="mt-1 text-xs text-gray-400">
        Control how the browser behaves during crosslisting.
      </p>

      <div className="mt-4 space-y-4">
        <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
          <Label className="flex items-center justify-between text-sm text-gray-300">
            <span>
              Headless mode
              <span className="ml-2 block text-xs text-gray-500">
                Hide the browser window during execution.
              </span>
            </span>
            <Checkbox
              className="h-4 w-4 accent-emerald-400"
              checked={settings.headless} onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, headless: Boolean(checked) }))
              }
            />
          </Label>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
          <Label className="flex items-center justify-between text-sm text-gray-300">
            <span>
              Emulate Device
              <span className="ml-2 block text-xs text-gray-500">
                Simulate a mobile device or specific browser.
              </span>
            </span>
            <Checkbox
              className="h-4 w-4 accent-emerald-400"
              checked={settings.emulateDevice} onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  emulateDevice: Boolean(checked),
                }))
              }
            />
          </Label>
          {settings.emulateDevice && (
            <div className="mt-3">
              <select
                className="w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                value={settings.deviceName}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    deviceName: e.target.value,
                  }))
                }
              >
                {deviceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
            <Label className="text-xs text-gray-400">SlowMo (ms)</Label>
            <Input
              type="number"
              className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
              value={settings.slowMo}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  slowMo: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
            <Label className="text-xs text-gray-400">Timeout (ms)</Label>
            <Input
              type="number"
              className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
              value={settings.timeout}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  timeout: Number(e.target.value),
                }))
              }
            />
          </div>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
          <Label className="flex items-center justify-between text-sm text-gray-300">
            <span>
              Humanize Mouse
              <span className="ml-2 block text-xs text-gray-500">
                Add jitter and randomized movement paths.
              </span>
            </span>
            <Checkbox
              className="h-4 w-4 accent-emerald-400"
              checked={settings.humanizeMouse} onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  humanizeMouse: Boolean(checked),
                }))
              }
            />
          </Label>
          {settings.humanizeMouse && (
            <div className="mt-3">
              <Label className="text-xs text-gray-400">
                Mouse Jitter (pixels)
              </Label>
              <Input
                type="number"
                className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
                value={settings.mouseJitter}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    mouseJitter: Number(e.target.value),
                  }))
                }
              />
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
            onClick={onSave}
          >
            Save Playwright Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
