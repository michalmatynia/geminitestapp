import 'server-only';

import type { Browser, BrowserContext, Page } from 'playwright';

import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import {
  launchPlaywrightBrowser,
  type PlaywrightBrowserPreference,
} from '@/shared/lib/playwright/browser-launch';
import {
  buildPlaywrightConnectionContextOptions,
  buildPlaywrightConnectionLaunchOptions,
  resolvePlaywrightConnectionRuntime,
  type ResolvedPlaywrightConnectionRuntime,
} from './connection-runtime';

export type OpenPlaywrightConnectionPageSessionInput = {
  connection: IntegrationConnectionRecord;
  browserPreference?: PlaywrightBrowserPreference;
  headless?: boolean;
  viewport?: { width: number; height: number };
};

export type OpenPlaywrightConnectionPageSessionResult = {
  runtime: ResolvedPlaywrightConnectionRuntime;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  launchLabel: string;
  fallbackMessages: string[];
  close: () => Promise<void>;
};

export const openPlaywrightConnectionPageSession = async (
  input: OpenPlaywrightConnectionPageSessionInput
): Promise<OpenPlaywrightConnectionPageSessionResult> => {
  const runtime = await resolvePlaywrightConnectionRuntime(input.connection);
  const browserPreference = input.browserPreference ?? runtime.browserPreference;
  const headless =
    typeof input.headless === 'boolean' ? input.headless : runtime.settings.headless;

  const launchResult = await launchPlaywrightBrowser(
    browserPreference,
    buildPlaywrightConnectionLaunchOptions({
      settings: runtime.settings,
      headless,
    })
  );

  const context = await launchResult.browser.newContext(
    buildPlaywrightConnectionContextOptions({
      runtime,
      viewport: input.viewport,
    })
  );
  context.setDefaultTimeout(runtime.settings.timeout);
  context.setDefaultNavigationTimeout(runtime.settings.navigationTimeout);

  const page = await context.newPage();

  return {
    runtime,
    browser: launchResult.browser,
    context,
    page,
    launchLabel: launchResult.label,
    fallbackMessages: launchResult.fallbackMessages,
    close: async () => {
      await context.close().catch(() => undefined);
      await launchResult.browser.close();
    },
  };
};
