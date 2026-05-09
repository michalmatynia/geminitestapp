/**
 * Playwright Runtime Module
 * 
 * Server-side Playwright runtime and module management.
 * Provides:
 * - Playwright module loading and initialization
 * - Device descriptor catalog access
 * - Browser context configuration
 * - Server-only runtime utilities
 * - Module require wrapper for ESM compatibility
 */

import 'server-only';

import { createRequire } from 'module';

import type { BrowserContextOptions } from 'playwright';

/** Type for the Playwright runtime module */
export type PlaywrightRuntimeModule = typeof import('playwright');

/** Device descriptor with browser type configuration */
export type PlaywrightDeviceDescriptor = BrowserContextOptions & {
  /** Default browser type for the device */
  defaultBrowserType?: string;
};

/** CommonJS require function for ESM compatibility */
const requireFn = createRequire(import.meta.url);

/**
 * Gets the Playwright runtime module
 * @returns Playwright module instance
 */
export const getPlaywrightRuntime = (): PlaywrightRuntimeModule =>
  requireFn('playwright') as PlaywrightRuntimeModule;

/**
 * Gets the Playwright devices catalog
 * @returns Record of device descriptors by name
 */
export const getPlaywrightDevicesCatalog = (): Record<string, PlaywrightDeviceDescriptor> =>
  getPlaywrightRuntime().devices as Record<string, PlaywrightDeviceDescriptor>;
