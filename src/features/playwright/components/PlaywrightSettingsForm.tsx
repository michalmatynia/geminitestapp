"use client";

import { Button, Input, Label, Checkbox, SectionPanel } from "@/shared/ui";
import { Dispatch, SetStateAction, ChangeEvent, ReactElement } from "react";
import type { PlaywrightSettings } from "@/features/playwright/types";
import { playwrightDeviceOptions } from "@/features/playwright/constants/playwright";

type PlaywrightSettingsProps = {
  settings: PlaywrightSettings;
  setSettings: Dispatch<SetStateAction<PlaywrightSettings>>;
  onSave?: () => void;
  saveLabel?: string;
  showSave?: boolean;
  title?: string;
  description?: string;
};

const toNumber = (value: string, fallback: number): number => {
  if (value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function PlaywrightSettingsForm({
  settings,
  setSettings,
  onSave,
  saveLabel,
  showSave,
  title,
  description,
}: PlaywrightSettingsProps): ReactElement {
  const shouldShowSave = showSave ?? Boolean(onSave);

  return (
    <SectionPanel
      variant="subtle"
      className="max-h-[70vh] overflow-y-auto p-4"
    >
      <h3 className="text-sm font-semibold text-white">
        {title ?? "Playwright settings"}
      </h3>
      <p className="mt-1 text-xs text-gray-400">
        {description ?? "Control how the browser behaves during crosslisting."}
      </p>

      <div className="mt-4 space-y-4">
        <SectionPanel variant="subtle-compact">
          <Label className="flex items-center justify-between text-sm text-gray-300">
            <span>
              Headless mode
              <span className="ml-2 block text-xs text-gray-500">
                Hide the browser window during execution.
              </span>
            </span>
            <Checkbox
              className="h-4 w-4 accent-emerald-400"
              checked={settings.headless}
              onCheckedChange={(checked: boolean | "indeterminate"): void =>
                setSettings((prev: PlaywrightSettings) => ({
                  ...prev,
                  headless: Boolean(checked),
                }))
              }
            />
          </Label>
        </SectionPanel>

        <SectionPanel variant="subtle-compact">
          <Label className="flex items-center justify-between text-sm text-gray-300">
            <span>
              Emulate Device
              <span className="ml-2 block text-xs text-gray-500">
                Simulate a mobile device or specific browser.
              </span>
            </span>
            <Checkbox
              className="h-4 w-4 accent-emerald-400"
              checked={settings.emulateDevice}
              onCheckedChange={(checked: boolean | "indeterminate"): void =>
                setSettings((prev: PlaywrightSettings) => ({
                  ...prev,
                  emulateDevice: Boolean(checked),
                }))
              }
            />
          </Label>
          {settings.emulateDevice && (
            <div className="mt-3">
              <select
                className="w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                value={settings.deviceName}
                onChange={(e: ChangeEvent<HTMLSelectElement>): void =>
                  setSettings((prev: PlaywrightSettings) => ({
                    ...prev,
                    deviceName: e.target.value,
                  }))
                }
              >
                {playwrightDeviceOptions.map(
                  (opt: { label: string; value: string }): ReactElement => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  )
                )}
              </select>
            </div>
          )}
        </SectionPanel>

        <div className="grid gap-4 md:grid-cols-3">
          <SectionPanel variant="subtle-compact">
            <Label className="text-xs text-gray-400">SlowMo (ms)</Label>
            <Input
              type="number"
              className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
              value={settings.slowMo}
              onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                setSettings((prev: PlaywrightSettings) => ({
                  ...prev,
                  slowMo: toNumber(e.target.value, prev.slowMo),
                }))
              }
            />
          </SectionPanel>
          <SectionPanel variant="subtle-compact">
            <Label className="text-xs text-gray-400">Timeout (ms)</Label>
            <Input
              type="number"
              className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
              value={settings.timeout}
              onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                setSettings((prev: PlaywrightSettings) => ({
                  ...prev,
                  timeout: toNumber(e.target.value, prev.timeout),
                }))
              }
            />
          </SectionPanel>
          <SectionPanel variant="subtle-compact">
            <Label className="text-xs text-gray-400">
              Navigation Timeout (ms)
            </Label>
            <Input
              type="number"
              className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
              value={settings.navigationTimeout}
              onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                setSettings((prev: PlaywrightSettings) => ({
                  ...prev,
                  navigationTimeout: toNumber(
                    e.target.value,
                    prev.navigationTimeout
                  ),
                }))
              }
            />
          </SectionPanel>
        </div>

        <SectionPanel variant="subtle-compact">
          <Label className="flex items-center justify-between text-sm text-gray-300">
            <span>
              Humanize Mouse
              <span className="ml-2 block text-xs text-gray-500">
                Add jitter and randomized movement paths.
              </span>
            </span>
            <Checkbox
              className="h-4 w-4 accent-emerald-400"
              checked={settings.humanizeMouse}
              onCheckedChange={(checked: boolean | "indeterminate"): void =>
                setSettings((prev: PlaywrightSettings) => ({
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
                className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                value={settings.mouseJitter}
                onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                  setSettings((prev: PlaywrightSettings) => ({
                    ...prev,
                    mouseJitter: toNumber(e.target.value, prev.mouseJitter),
                  }))
                }
              />
            </div>
          )}
        </SectionPanel>

        <details className="rounded-lg border bg-card/60 p-3 backdrop-blur">
          <summary className="cursor-pointer text-sm font-semibold text-gray-200">
            Advanced settings
          </summary>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-300">
                Interaction delays (ms)
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Add random pauses between actions for human-like pacing.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SectionPanel variant="subtle-compact">
                <Label className="text-xs text-gray-400">
                  Click delay min
                </Label>
                <Input
                  type="number"
                  className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                  value={settings.clickDelayMin}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                    setSettings((prev: PlaywrightSettings) => ({
                      ...prev,
                      clickDelayMin: toNumber(
                        e.target.value,
                        prev.clickDelayMin
                      ),
                    }))
                  }
                />
              </SectionPanel>
              <SectionPanel variant="subtle-compact">
                <Label className="text-xs text-gray-400">
                  Click delay max
                </Label>
                <Input
                  type="number"
                  className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                  value={settings.clickDelayMax}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                    setSettings((prev: PlaywrightSettings) => ({
                      ...prev,
                      clickDelayMax: toNumber(
                        e.target.value,
                        prev.clickDelayMax
                      ),
                    }))
                  }
                />
              </SectionPanel>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SectionPanel variant="subtle-compact">
                <Label className="text-xs text-gray-400">
                  Input delay min
                </Label>
                <Input
                  type="number"
                  className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                  value={settings.inputDelayMin}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                    setSettings((prev: PlaywrightSettings) => ({
                      ...prev,
                      inputDelayMin: toNumber(
                        e.target.value,
                        prev.inputDelayMin
                      ),
                    }))
                  }
                />
              </SectionPanel>
              <SectionPanel variant="subtle-compact">
                <Label className="text-xs text-gray-400">
                  Input delay max
                </Label>
                <Input
                  type="number"
                  className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                  value={settings.inputDelayMax}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                    setSettings((prev: PlaywrightSettings) => ({
                      ...prev,
                      inputDelayMax: toNumber(
                        e.target.value,
                        prev.inputDelayMax
                      ),
                    }))
                  }
                />
              </SectionPanel>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SectionPanel variant="subtle-compact">
                <Label className="text-xs text-gray-400">
                  Action delay min
                </Label>
                <Input
                  type="number"
                  className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                  value={settings.actionDelayMin}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                    setSettings((prev: PlaywrightSettings) => ({
                      ...prev,
                      actionDelayMin: toNumber(
                        e.target.value,
                        prev.actionDelayMin
                      ),
                    }))
                  }
                />
              </SectionPanel>
              <SectionPanel variant="subtle-compact">
                <Label className="text-xs text-gray-400">
                  Action delay max
                </Label>
                <Input
                  type="number"
                  className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                  value={settings.actionDelayMax}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                    setSettings((prev: PlaywrightSettings) => ({
                      ...prev,
                      actionDelayMax: toNumber(
                        e.target.value,
                        prev.actionDelayMax
                      ),
                    }))
                  }
                />
              </SectionPanel>
            </div>

            <SectionPanel variant="subtle-compact">
              <Label className="flex items-center justify-between text-sm text-gray-300">
                <span>
                  Proxy
                  <span className="ml-2 block text-xs text-gray-500">
                    Route traffic through a proxy server.
                  </span>
                </span>
                <Checkbox
                  className="h-4 w-4 accent-emerald-400"
                  checked={settings.proxyEnabled}
                  onCheckedChange={(checked: boolean | "indeterminate"): void =>
                    setSettings((prev: PlaywrightSettings) => ({
                      ...prev,
                      proxyEnabled: Boolean(checked),
                    }))
                  }
                />
              </Label>
              {settings.proxyEnabled && (
                <div className="mt-3 space-y-3">
                  <div>
                    <Label className="text-xs text-gray-400">
                      Proxy server
                    </Label>
                    <Input
                      type="text"
                      className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                      placeholder="http://host:port"
                      value={settings.proxyServer}
                      onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                        setSettings((prev: PlaywrightSettings) => ({
                          ...prev,
                          proxyServer: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-xs text-gray-400">
                        Proxy username
                      </Label>
                      <Input
                        type="text"
                        className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                        value={settings.proxyUsername}
                        onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                          setSettings((prev: PlaywrightSettings) => ({
                            ...prev,
                            proxyUsername: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">
                        Proxy password
                      </Label>
                      <Input
                        type="password"
                        className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                        value={settings.proxyPassword}
                        onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                          setSettings((prev: PlaywrightSettings) => ({
                            ...prev,
                            proxyPassword: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </SectionPanel>
          </div>
        </details>

        {shouldShowSave && onSave ? (
          <div className="flex justify-end">
            <Button
              type="button"
              className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
              onClick={onSave}
            >
              {saveLabel ?? "Save Playwright Settings"}
            </Button>
          </div>
        ) : null}
      </div>
    </SectionPanel>
  );
}

