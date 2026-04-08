import { existsSync } from 'fs';

import { chromium } from 'playwright';
import type { Browser, LaunchOptions } from 'playwright';

export type PlaywrightBrowserPreference = 'auto' | 'brave' | 'chrome' | 'chromium';

/** Brave executable paths by platform. */
const BRAVE_PATHS: Record<string, string> = {
  darwin: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  win32: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  linux: '/usr/bin/brave-browser',
};

type LaunchAttempt = {
  label: string;
  options: LaunchOptions;
};

const getBravePath = (): string | null => {
  const path = BRAVE_PATHS[process.platform];
  return path && existsSync(path) ? path : null;
};

/**
 * Build an ordered list of browser launch attempts based on the user's preference.
 *
 * When a specific browser is chosen (`brave`, `chrome`), only that browser is attempted
 * — no silent fallback. The user chose it explicitly and should see an error if it fails.
 *
 * `auto` is the only mode that cascades: Brave → Chrome → bundled Chromium.
 * `chromium` always uses the bundled Playwright Chromium.
 */
const buildLaunchAttempts = (
  preference: PlaywrightBrowserPreference,
  baseOptions: LaunchOptions
): LaunchAttempt[] => {
  const bravePath = getBravePath();

  switch (preference) {
    case 'brave': {
      if (!bravePath) {
        throw new Error(
          `Brave browser not found at expected path (${BRAVE_PATHS[process.platform] ?? 'unsupported platform'}). Install Brave or switch to a different browser in connection settings.`
        );
      }
      return [{ label: 'Brave', options: { ...baseOptions, executablePath: bravePath } }];
    }
    case 'chrome':
      return [{ label: 'Chrome', options: { ...baseOptions, channel: 'chrome' } }];
    case 'chromium':
      return [{ label: 'Chromium (bundled)', options: { ...baseOptions } }];
    case 'auto':
    default: {
      const attempts: LaunchAttempt[] = [];
      if (bravePath) {
        attempts.push({ label: 'Brave', options: { ...baseOptions, executablePath: bravePath } });
      }
      attempts.push({ label: 'Chrome', options: { ...baseOptions, channel: 'chrome' } });
      attempts.push({ label: 'Chromium (bundled)', options: { ...baseOptions } });
      return attempts;
    }
  }
};

export type BrowserLaunchResult = {
  browser: Browser;
  label: string;
  fallbackMessages: string[];
};

/**
 * Launch a Playwright Chromium-based browser according to the user's preference.
 * Tries each candidate in order, collecting fallback messages for logging.
 */
export const launchPlaywrightBrowser = async (
  preference: PlaywrightBrowserPreference,
  baseOptions: LaunchOptions
): Promise<BrowserLaunchResult> => {
  const attempts = buildLaunchAttempts(preference, baseOptions);
  const fallbackMessages: string[] = [];

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i]!;
    try {
      const browser = await chromium.launch(attempt.options);
      return { browser, label: attempt.label, fallbackMessages };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      fallbackMessages.push(`${attempt.label} unavailable: ${message}`);
    }
  }

  // Should never reach here since bundled Chromium is always included, but just in case
  throw new Error(
    `Failed to launch any browser. Tried: ${attempts.map((a) => a.label).join(', ')}`
  );
};
