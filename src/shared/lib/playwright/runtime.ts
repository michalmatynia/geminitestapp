import 'server-only';

import { createRequire } from 'module';

import type { BrowserContextOptions } from 'playwright';

export type PlaywrightRuntimeModule = typeof import('playwright');

export type PlaywrightDeviceDescriptor = BrowserContextOptions & {
  defaultBrowserType?: string;
};

const requireFn = createRequire(import.meta.url);

export const getPlaywrightRuntime = (): PlaywrightRuntimeModule =>
  requireFn('playwright') as PlaywrightRuntimeModule;

export const getPlaywrightDevicesCatalog = (): Record<string, PlaywrightDeviceDescriptor> =>
  getPlaywrightRuntime().devices as Record<string, PlaywrightDeviceDescriptor>;
