import 'server-only';

import { chromium } from 'playwright';

import { createPlaywrightPageDriver } from './playwright-page-driver';
import type { ScripterDriverFactory } from './scripter-server';

export type SimpleScripterDriverOptions = {
  headless?: boolean;
};

export const createSimpleScripterDriverFactory = (
  options: SimpleScripterDriverOptions = {}
): ScripterDriverFactory => {
  const headless = options.headless ?? true;
  return async () => {
    const browser = await chromium.launch({ headless });
    const context = await browser.newContext();
    const page = await context.newPage();
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
