import 'server-only';

import type { BrowserContextOptions, LaunchOptions, Page } from 'playwright';
import { chromium } from 'playwright';

import type { PlaywrightActionExecutionSettings } from '@/shared/contracts/playwright-steps';
import { resolvePlaywrightBrowserLaunchOptions } from '@/shared/lib/playwright/browser-launch';

import { createPlaywrightPageDriver } from './playwright-page-driver';
import type { ScripterDriverFactory, ScripterDriverFactoryOptions } from './scripter-server';

export type SimpleScripterDriverOptions = {
  headless?: boolean;
};

const readStringSetting = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildProxyLaunchOptions = (
  settings: PlaywrightActionExecutionSettings | null | undefined
): Pick<LaunchOptions, 'proxy'> => {
  if (settings?.proxyEnabled !== true) return {};
  const server = readStringSetting(settings.proxyServer);
  if (server === null) return {};
  const username = readStringSetting(settings.proxyUsername);
  const password = readStringSetting(settings.proxyPassword);
  return {
    proxy: {
      server,
      ...(username !== null ? { username } : {}),
      ...(password !== null ? { password } : {}),
    },
  };
};

const buildBrowserPreferenceLaunchOptions = (
  settings: PlaywrightActionExecutionSettings | null | undefined
): LaunchOptions => {
  const browserPreference = settings?.browserPreference ?? null;
  return browserPreference !== null
    ? resolvePlaywrightBrowserLaunchOptions(browserPreference)
    : {};
};

const buildSlowMoLaunchOptions = (
  settings: PlaywrightActionExecutionSettings | null | undefined
): Pick<LaunchOptions, 'slowMo'> =>
  typeof settings?.slowMo === 'number' ? { slowMo: settings.slowMo } : {};

const buildLaunchOptions = (
  defaultHeadless: boolean,
  runtimeOptions: ScripterDriverFactoryOptions | undefined
): LaunchOptions => {
  const settings = runtimeOptions?.executionSettings;
  return {
    ...buildBrowserPreferenceLaunchOptions(settings),
    ...buildProxyLaunchOptions(settings),
    ...buildSlowMoLaunchOptions(settings),
    headless: settings?.headless ?? defaultHeadless,
  };
};

const buildContextOptions = (
  settings: PlaywrightActionExecutionSettings | null | undefined
): BrowserContextOptions => {
  const locale = readStringSetting(settings?.locale);
  const timezoneId = readStringSetting(settings?.timezoneId);
  return {
    ...(locale !== null ? { locale } : {}),
    ...(timezoneId !== null ? { timezoneId } : {}),
  };
};

const applyPageRuntimeSettings = (
  page: Page,
  settings: PlaywrightActionExecutionSettings | null | undefined
): void => {
  if (typeof settings?.timeout === 'number') {
    page.setDefaultTimeout(settings.timeout);
  }
  if (typeof settings?.navigationTimeout === 'number') {
    page.setDefaultNavigationTimeout(settings.navigationTimeout);
  }
};

export const createSimpleScripterDriverFactory = (
  options: SimpleScripterDriverOptions = {}
): ScripterDriverFactory => {
  const headless = options.headless ?? true;
  return async (_definition, runtimeOptions) => {
    const settings = runtimeOptions?.executionSettings;
    const browser = await chromium.launch(buildLaunchOptions(headless, runtimeOptions));
    const context = await browser.newContext(buildContextOptions(settings));
    const page = await context.newPage();
    applyPageRuntimeSettings(page, settings);
    const driver = createPlaywrightPageDriver(page);
    return {
      driver,
      close: async () => {
        await context.close().catch(() => undefined);
        await browser.close().catch(() => undefined);
      },
    };
  };
};
