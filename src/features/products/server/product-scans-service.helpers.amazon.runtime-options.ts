import 'server-only';

import {
  buildPlaywrightConnectionEngineLaunchOptions,
  type startPlaywrightEngineTask,
} from '@/features/playwright/server';
import {
  resolvePlaywrightActionExecutionSettingsOverrides,
} from '@/features/playwright/utils/playwright-action-execution-settings';
import type { createDefaultProductScannerSettings } from '@/features/products/scanner-settings';
import type { PlaywrightActionExecutionSettings } from '@/shared/contracts/playwright-steps';

import { toRecord, readOptionalString } from './product-scans-service.helpers.base';
import {
  AMAZON_GOOGLE_RUNTIME_DEFAULT_ACTION_DELAY_MAX_MS,
  AMAZON_GOOGLE_RUNTIME_DEFAULT_ACTION_DELAY_MIN_MS,
  AMAZON_GOOGLE_RUNTIME_DEFAULT_CLICK_DELAY_MAX_MS,
  AMAZON_GOOGLE_RUNTIME_DEFAULT_CLICK_DELAY_MIN_MS,
  AMAZON_GOOGLE_RUNTIME_DEFAULT_INPUT_DELAY_MAX_MS,
  AMAZON_GOOGLE_RUNTIME_DEFAULT_INPUT_DELAY_MIN_MS,
  AMAZON_SCAN_DEFAULT_SLOW_MO_MS,
  AMAZON_SCAN_DEFAULT_USER_AGENT,
  AMAZON_SCAN_STEALTH_LAUNCH_ARGS,
  hasFiniteNumberSetting,
  isGoogleFacingAmazonRuntimeKey,
  mergeUniqueStringValues,
} from './product-scans-service.helpers.amazon.constants';

type ScannerSettings = ReturnType<typeof createDefaultProductScannerSettings>;
type ScannerEngineRequestOptions = {
  contextOptions?: unknown;
  launchOptions?: unknown;
  personaId?: unknown;
  settingsOverrides?: unknown;
};

type AmazonScannerRequestRuntimeOptionsInput = {
  scannerSettings: ScannerSettings;
  scannerEngineRequestOptions: Record<string, unknown>;
  actionExecutionSettings?: PlaywrightActionExecutionSettings | null;
  actionPersonaId?: string | null;
  runtimeKey?: string | null;
  forceHeadless?: boolean;
};

type AmazonScannerRequestRuntimeOptions = Pick<
  NonNullable<Parameters<typeof startPlaywrightEngineTask>[0]['request']>,
  'personaId' | 'settingsOverrides' | 'launchOptions' | 'contextOptions'
>;

const readScannerEngineRequestOptions = (
  value: Record<string, unknown>
): ScannerEngineRequestOptions => ({
  contextOptions: value['contextOptions'],
  launchOptions: value['launchOptions'],
  personaId: value['personaId'],
  settingsOverrides: value['settingsOverrides'],
});

const resolveSettingsOverrides = (
  input: AmazonScannerRequestRuntimeOptionsInput,
  scannerEngineRequestOptions: ScannerEngineRequestOptions
): Record<string, unknown> => ({
  ...(toRecord(scannerEngineRequestOptions.settingsOverrides) ?? {}),
  ...resolvePlaywrightActionExecutionSettingsOverrides(input.actionExecutionSettings),
});

const applyPersonaFreeDefaults = (
  settingsOverrides: Record<string, unknown>,
  scannerSettings: ScannerSettings
): Record<string, unknown> => {
  if ((scannerSettings.playwrightPersonaId ?? '') !== '') return settingsOverrides;
  return {
    ...settingsOverrides,
    humanizeMouse:
      typeof settingsOverrides['humanizeMouse'] === 'boolean'
        ? settingsOverrides['humanizeMouse']
        : true,
    slowMo: hasFiniteNumberSetting(settingsOverrides['slowMo'])
      ? settingsOverrides['slowMo']
      : AMAZON_SCAN_DEFAULT_SLOW_MO_MS,
  };
};

const buildActionLaunchOptions = (
  actionExecutionSettings: PlaywrightActionExecutionSettings | null | undefined
): Record<string, unknown> => {
  const browserPreference = actionExecutionSettings?.browserPreference ?? null;
  if (browserPreference === null) return {};
  return buildPlaywrightConnectionEngineLaunchOptions({ browserPreference });
};

const buildLaunchOptions = (
  scannerEngineRequestOptions: ScannerEngineRequestOptions,
  actionExecutionSettings: PlaywrightActionExecutionSettings | null | undefined
): Record<string, unknown> => {
  const existingLaunchOptions = toRecord(scannerEngineRequestOptions.launchOptions) ?? {};
  const actionBrowserPreference = actionExecutionSettings?.browserPreference ?? null;
  const baseLaunchOptions: Record<string, unknown> = { ...existingLaunchOptions };
  if (actionBrowserPreference !== null) {
    delete baseLaunchOptions['channel'];
    delete baseLaunchOptions['executablePath'];
  }
  const mergedLaunchOptions = {
    ...baseLaunchOptions,
    ...buildActionLaunchOptions(actionExecutionSettings),
  };
  const existingLaunchArgs = Array.isArray(mergedLaunchOptions['args'])
    ? (mergedLaunchOptions['args'] as unknown[]).filter((entry): entry is string => typeof entry === 'string')
    : [];
  return {
    ...mergedLaunchOptions,
    args: mergeUniqueStringValues(existingLaunchArgs, AMAZON_SCAN_STEALTH_LAUNCH_ARGS),
  };
};

const resolvePersonaId = (
  actionPersonaId: string | null | undefined,
  scannerEngineRequestOptions: ScannerEngineRequestOptions
): string | null => {
  const actionPersona = readOptionalString(actionPersonaId, 160);
  const scannerPersona =
    typeof scannerEngineRequestOptions.personaId === 'string' &&
    scannerEngineRequestOptions.personaId.trim().length > 0
      ? scannerEngineRequestOptions.personaId
      : null;
  return actionPersona ?? scannerPersona;
};

const resolveNumberSetting = (value: unknown, fallback: number): number =>
  hasFiniteNumberSetting(value) ? value : fallback;

const applyGoogleFacingRuntimeDefaults = (
  settingsOverrides: Record<string, unknown>
): Record<string, unknown> => {
  return {
    ...settingsOverrides,
    actionDelayMax: resolveNumberSetting(
      settingsOverrides['actionDelayMax'],
      AMAZON_GOOGLE_RUNTIME_DEFAULT_ACTION_DELAY_MAX_MS
    ),
    actionDelayMin: resolveNumberSetting(
      settingsOverrides['actionDelayMin'],
      AMAZON_GOOGLE_RUNTIME_DEFAULT_ACTION_DELAY_MIN_MS
    ),
    clickDelayMax: resolveNumberSetting(
      settingsOverrides['clickDelayMax'],
      AMAZON_GOOGLE_RUNTIME_DEFAULT_CLICK_DELAY_MAX_MS
    ),
    clickDelayMin: resolveNumberSetting(
      settingsOverrides['clickDelayMin'],
      AMAZON_GOOGLE_RUNTIME_DEFAULT_CLICK_DELAY_MIN_MS
    ),
    identityProfile: 'search',
    inputDelayMax: resolveNumberSetting(
      settingsOverrides['inputDelayMax'],
      AMAZON_GOOGLE_RUNTIME_DEFAULT_INPUT_DELAY_MAX_MS
    ),
    inputDelayMin: resolveNumberSetting(
      settingsOverrides['inputDelayMin'],
      AMAZON_GOOGLE_RUNTIME_DEFAULT_INPUT_DELAY_MIN_MS
    ),
  };
};

const resolveProxySessionMode = (settingsOverrides: Record<string, unknown>): unknown => {
  if (settingsOverrides['proxySessionAffinity'] !== true) return settingsOverrides['proxySessionMode'];
  if (settingsOverrides['proxySessionMode'] === 'sticky') return 'sticky';
  if (settingsOverrides['proxySessionMode'] === 'rotate') return 'rotate';
  return 'sticky';
};

const applyGoogleProxyDefaults = (
  settingsOverrides: Record<string, unknown>
): Record<string, unknown> => {
  if (settingsOverrides['proxyEnabled'] !== true) return settingsOverrides;
  const proxySessionAffinity =
    typeof settingsOverrides['proxySessionAffinity'] === 'boolean'
      ? settingsOverrides['proxySessionAffinity']
      : true;
  return {
    ...settingsOverrides,
    proxySessionAffinity,
    proxySessionMode: resolveProxySessionMode({
      ...settingsOverrides,
      proxySessionAffinity,
    }),
  };
};

const buildContextOptions = (
  scannerEngineRequestOptions: ScannerEngineRequestOptions,
  shouldApplyGoogleFacingRuntimeDefaults: boolean
): Record<string, unknown> => {
  const contextOptions: Record<string, unknown> = {
    ...(toRecord(scannerEngineRequestOptions.contextOptions) ?? {}),
  };
  const userAgent = contextOptions['userAgent'];
  if (
    (typeof userAgent !== 'string' || userAgent.trim().length === 0) &&
    shouldApplyGoogleFacingRuntimeDefaults === false
  ) {
    contextOptions['userAgent'] = AMAZON_SCAN_DEFAULT_USER_AGENT;
  }
  return contextOptions;
};

export const buildAmazonScannerRequestRuntimeOptions = (
  input: AmazonScannerRequestRuntimeOptionsInput
): AmazonScannerRequestRuntimeOptions => {
  const scannerEngineRequestOptions = readScannerEngineRequestOptions(
    input.scannerEngineRequestOptions
  );
  let settingsOverrides = applyPersonaFreeDefaults(
    resolveSettingsOverrides(input, scannerEngineRequestOptions),
    input.scannerSettings
  );
  settingsOverrides = {
    ...settingsOverrides,
    headless: typeof input.forceHeadless === 'boolean' ? input.forceHeadless : true,
  };
  const personaId = resolvePersonaId(input.actionPersonaId, scannerEngineRequestOptions);
  const shouldApplyGoogleDefaults =
    personaId === null && isGoogleFacingAmazonRuntimeKey(input.runtimeKey);
  if (shouldApplyGoogleDefaults) {
    settingsOverrides = applyGoogleProxyDefaults(applyGoogleFacingRuntimeDefaults(settingsOverrides));
  }
  return {
    ...(personaId !== null ? { personaId } : {}),
    contextOptions: buildContextOptions(scannerEngineRequestOptions, shouldApplyGoogleDefaults),
    launchOptions: buildLaunchOptions(scannerEngineRequestOptions, input.actionExecutionSettings),
    settingsOverrides,
  };
};
