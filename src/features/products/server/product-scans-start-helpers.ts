import 'server-only';

import {
  type startPlaywrightEngineTask,
} from '@/features/playwright/server';
import {
  type createDefaultProductScannerSettings,
} from '@/features/products/scanner-settings';
import {
  type buildProductScannerEngineRequestOptions,
} from './product-scanner-settings';
import { toRecord } from './product-scans-service.helpers';

const AMAZON_SCAN_DEFAULT_SLOW_MO_MS = 80;
const AMAZON_SCAN_DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const AMAZON_SCAN_STEALTH_LAUNCH_ARGS = ['--disable-blink-features=AutomationControlled'];

export const mergeUniqueStringValues = (
  values: ReadonlyArray<string>,
  nextValues: ReadonlyArray<string>
): string[] => {
  const merged = new Set(values.filter((value) => value.trim().length > 0));
  for (const value of nextValues) {
    const normalized = value.trim();
    if (normalized.length > 0) {
      merged.add(normalized);
    }
  }
  return Array.from(merged);
};

export const buildAmazonScannerRequestRuntimeOptions = (input: {
  scannerSettings: ReturnType<typeof createDefaultProductScannerSettings>;
  scannerEngineRequestOptions: ReturnType<typeof buildProductScannerEngineRequestOptions>;
  forceHeadless?: boolean;
}): Pick<
  Parameters<typeof startPlaywrightEngineTask>[0]['request'],
  'personaId' | 'settingsOverrides' | 'launchOptions' | 'contextOptions'
> => {
  const existingSettingsOverrides =
    toRecord(input.scannerEngineRequestOptions.settingsOverrides) ?? {};
  const existingLaunchOptions = toRecord(input.scannerEngineRequestOptions.launchOptions) ?? {};
  const existingContextOptions =
    toRecord(
      (input.scannerEngineRequestOptions as { contextOptions?: unknown }).contextOptions
    ) ?? {};

  const settingsOverrides: Record<string, unknown> = {
    ...existingSettingsOverrides,
  };

  if (typeof input.forceHeadless === 'boolean') {
    settingsOverrides['headless'] = input.forceHeadless;
  }

  if (!input.scannerSettings.playwrightPersonaId) {
    if (typeof settingsOverrides['humanizeMouse'] !== 'boolean') {
      settingsOverrides['humanizeMouse'] = true;
    }
    const slowMo = settingsOverrides['slowMo'];
    if (typeof slowMo !== 'number' || !Number.isFinite(slowMo) || slowMo <= 0) {
      settingsOverrides['slowMo'] = AMAZON_SCAN_DEFAULT_SLOW_MO_MS;
    }
  }

  const existingLaunchArgs = Array.isArray(existingLaunchOptions['args'])
    ? existingLaunchOptions['args'].filter((entry): entry is string => typeof entry === 'string')
    : [];

  const launchOptions: Record<string, unknown> = {
    ...existingLaunchOptions,
    args: mergeUniqueStringValues(existingLaunchArgs, AMAZON_SCAN_STEALTH_LAUNCH_ARGS),
  };

  const contextOptions: Record<string, unknown> = {
    ...existingContextOptions,
  };
  if (typeof contextOptions['userAgent'] !== 'string' || contextOptions['userAgent'].trim().length === 0) {
    contextOptions['userAgent'] = AMAZON_SCAN_DEFAULT_USER_AGENT;
  }

  return {
    ...(input.scannerEngineRequestOptions.personaId
      ? { personaId: input.scannerEngineRequestOptions.personaId }
      : {}),
    settingsOverrides,
    launchOptions,
    contextOptions,
  };
};

export async function mapWithConcurrencyLimit<TInput, TOutput>(
  values: readonly TInput[],
  concurrency: number,
  mapper: (value: TInput, index: number) => Promise<TOutput>
): Promise<TOutput[]> {
  if (values.length === 0) {
    return [];
  }

  const normalizedConcurrency = Math.max(1, Math.trunc(concurrency));
  const workerCount = Math.min(values.length, normalizedConcurrency);
  const results = new Array<TOutput>(values.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < values.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(values[index] as TInput, index);
      }
    })
  );

  return results;
}
