"use client";

import { Dispatch, SetStateAction } from "react";
import { defaultPlaywrightSettings } from "../types";

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
          <label className="flex items-center justify-between text-sm text-gray-300">
            <span>
              Headless mode
              <span className="ml-2 block text-xs text-gray-500">
                Hide the browser window during execution.
              </span>
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-400"
              checked={settings.headless}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, headless: e.target.checked }))
              }
            />
          </label>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
          <label className="flex items-center justify-between text-sm text-gray-300">
            <span>
              Emulate Device
              <span className="ml-2 block text-xs text-gray-500">
                Simulate a mobile device or specific browser.
              </span>
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-400"
              checked={settings.emulateDevice}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  emulateDevice: e.target.checked,
                }))
              }
            />
          </label>
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
            <label className="text-xs text-gray-400">SlowMo (ms)</label>
            <input
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
            <label className="text-xs text-gray-400">Timeout (ms)</label>
            <input
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
          <label className="flex items-center justify-between text-sm text-gray-300">
            <span>
              Humanize Mouse
              <span className="ml-2 block text-xs text-gray-500">
                Add jitter and randomized movement paths.
              </span>
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-400"
              checked={settings.humanizeMouse}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  humanizeMouse: e.target.checked,
                }))
              }
            />
          </label>
          {settings.humanizeMouse && (
            <div className="mt-3">
              <label className="text-xs text-gray-400">
                Mouse Jitter (pixels)
              </label>
              <input
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
          <button
            type="button"
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
            onClick={onSave}
          >
            Save Playwright Settings
          </button>
        </div>
      </div>
    </div>
  );
}
