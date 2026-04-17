import type { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import {
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
  type PlaywrightAction,
  type PlaywrightActionExecutionSettings,
} from '@/shared/contracts/playwright-steps';
import { getPlaywrightRuntimeActionSeed } from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';

import {
  extractIntegrationConnectionPlaywrightSettingsOverrides,
  normalizeIntegrationConnectionPlaywrightPersonaId,
  resolveIntegrationConnectionPlaywrightBrowserOverride,
} from './playwright-connection-settings';

type ProgrammableSessionKind = 'listing' | 'import';

type ProgrammableConnectionLegacyBehaviorFields = Pick<
  IntegrationConnection,
  | 'playwrightBrowser'
  | 'playwrightPersonaId'
  | 'playwrightListingActionId'
  | 'playwrightImportActionId'
  | 'playwrightIdentityProfile'
  | 'playwrightHeadless'
  | 'playwrightSlowMo'
  | 'playwrightTimeout'
  | 'playwrightNavigationTimeout'
  | 'playwrightLocale'
  | 'playwrightTimezoneId'
  | 'playwrightHumanizeMouse'
  | 'playwrightMouseJitter'
  | 'playwrightClickDelayMin'
  | 'playwrightClickDelayMax'
  | 'playwrightInputDelayMin'
  | 'playwrightInputDelayMax'
  | 'playwrightActionDelayMin'
  | 'playwrightActionDelayMax'
  | 'playwrightProxyEnabled'
  | 'playwrightProxyServer'
  | 'playwrightProxyUsername'
  | 'playwrightProxyPassword'
  | 'playwrightProxyHasPassword'
  | 'playwrightProxySessionAffinity'
  | 'playwrightProxySessionMode'
  | 'playwrightProxyProviderPreset'
  | 'playwrightEmulateDevice'
  | 'playwrightDeviceName'
>;

export type ProgrammableConnectionActionMigrationSource = Pick<
  IntegrationConnection,
  'id' | 'name' | 'integrationId'
> &
  Partial<ProgrammableConnectionLegacyBehaviorFields>;

const LEGACY_BROWSER_BEHAVIOR_LABELS: Array<[
  keyof PlaywrightActionExecutionSettings | 'browserPreference' | 'personaId',
  string,
]> = [
  ['personaId', 'Persona'],
  ['browserPreference', 'Browser preference'],
  ['identityProfile', 'Identity profile'],
  ['headless', 'Headless mode'],
  ['slowMo', 'SlowMo'],
  ['timeout', 'Timeout'],
  ['navigationTimeout', 'Navigation timeout'],
  ['locale', 'Locale'],
  ['timezoneId', 'Timezone'],
  ['humanizeMouse', 'Humanize mouse'],
  ['mouseJitter', 'Mouse jitter'],
  ['clickDelayMin', 'Click delay min'],
  ['clickDelayMax', 'Click delay max'],
  ['inputDelayMin', 'Input delay min'],
  ['inputDelayMax', 'Input delay max'],
  ['actionDelayMin', 'Action delay min'],
  ['actionDelayMax', 'Action delay max'],
  ['proxyEnabled', 'Proxy enabled'],
  ['proxyServer', 'Proxy server'],
  ['proxyUsername', 'Proxy username'],
  ['proxyPassword', 'Proxy password'],
  ['proxySessionAffinity', 'Proxy session affinity'],
  ['proxySessionMode', 'Proxy session mode'],
  ['proxyProviderPreset', 'Proxy provider preset'],
  ['emulateDevice', 'Device emulation'],
  ['deviceName', 'Device'],
];

const LEGACY_CONNECTION_OVERRIDE_KEYS: Array<
  Exclude<keyof PlaywrightActionExecutionSettings, 'browserPreference'>
> = [
  'identityProfile',
  'headless',
  'slowMo',
  'timeout',
  'navigationTimeout',
  'locale',
  'timezoneId',
  'humanizeMouse',
  'mouseJitter',
  'clickDelayMin',
  'clickDelayMax',
  'inputDelayMin',
  'inputDelayMax',
  'actionDelayMin',
  'actionDelayMax',
  'proxyEnabled',
  'proxyServer',
  'proxyUsername',
  'proxyPassword',
  'proxySessionAffinity',
  'proxySessionMode',
  'proxyProviderPreset',
  'emulateDevice',
  'deviceName',
];

export type ProgrammableConnectionActionMigrationPreview = {
  hasLegacyBrowserBehavior: boolean;
  legacySummary: string[];
  requiresManualProxyPasswordInput: boolean;
  listingBaseAction: PlaywrightAction;
  importBaseAction: PlaywrightAction;
  listingDraftAction: PlaywrightAction;
  importDraftAction: PlaywrightAction;
  cleanupPayload: {
    playwrightBrowser: null;
    playwrightPersonaId: null;
    resetPlaywrightOverrides: boolean;
  };
};

const resolveProgrammableBaseAction = ({
  actions,
  selectedActionId,
  defaultRuntimeKey,
}: {
  actions: PlaywrightAction[] | undefined;
  selectedActionId: string | null | undefined;
  defaultRuntimeKey: 'playwright_programmable_listing' | 'playwright_programmable_import';
}): PlaywrightAction => {
  const normalizedSelectedActionId = selectedActionId?.trim() ?? '';
  const selectedAction =
    normalizedSelectedActionId.length > 0
      ? (actions ?? []).find((action) => action.id === normalizedSelectedActionId) ?? null
      : null;

  return (
    selectedAction ??
    getPlaywrightRuntimeActionSeed(defaultRuntimeKey) ??
    normalizePlaywrightAction({
      id: `runtime_action__${defaultRuntimeKey}`,
      name: defaultRuntimeKey,
      description: null,
      runtimeKey: defaultRuntimeKey,
      blocks: [],
      stepSetIds: [],
      personaId: null,
      executionSettings: defaultPlaywrightActionExecutionSettings,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    })
  );
};

const extractConnectionActionExecutionSettings = (
  connection: ProgrammableConnectionActionMigrationSource
): {
  personaId: string | null;
  executionSettings: Partial<PlaywrightActionExecutionSettings>;
} => {
  const overrides = extractIntegrationConnectionPlaywrightSettingsOverrides(connection);
  const browserPreference = resolveIntegrationConnectionPlaywrightBrowserOverride(connection);
  const executionSettings = Object.fromEntries(
    LEGACY_CONNECTION_OVERRIDE_KEYS.map((key) => [key, overrides[key]]).filter(
      ([, value]) => value !== undefined
    )
  ) as Partial<PlaywrightActionExecutionSettings>;

  return {
    personaId: normalizeIntegrationConnectionPlaywrightPersonaId(connection.playwrightPersonaId),
    executionSettings: {
      ...executionSettings,
      ...(browserPreference !== undefined && browserPreference !== 'auto'
        ? { browserPreference }
        : {}),
    },
  };
};

const buildLegacyBrowserBehaviorSummary = ({
  personaId,
  executionSettings,
  hasStoredProxyPassword,
}: {
  personaId: string | null;
  executionSettings: Partial<PlaywrightActionExecutionSettings>;
  hasStoredProxyPassword: boolean;
}): string[] =>
  LEGACY_BROWSER_BEHAVIOR_LABELS.filter(([key]) => {
    if (key === 'personaId') {
      return personaId !== null;
    }
    if (key === 'proxyPassword') {
      return hasStoredProxyPassword || executionSettings.proxyPassword !== undefined;
    }
    return executionSettings[key] !== undefined;
  }).map(([, label]) => label);

const buildProgrammableMigrationDraftAction = ({
  baseAction,
  connection,
  sessionKind,
  personaId,
  executionSettings,
}: {
  baseAction: PlaywrightAction;
  connection: ProgrammableConnectionActionMigrationSource;
  sessionKind: ProgrammableSessionKind;
  personaId: string | null;
  executionSettings: Partial<PlaywrightActionExecutionSettings>;
}): PlaywrightAction => {
  const now = new Date().toISOString();
  const sessionLabel = sessionKind === 'listing' ? 'Listing session' : 'Import session';

  return normalizePlaywrightAction({
    ...baseAction,
    id: `programmable_connection__${connection.id}__${sessionKind}_session`,
    name: `${connection.name} / ${sessionLabel}`,
    description: `Migrated from programmable connection "${connection.name}" legacy browser settings.`,
    runtimeKey: null,
    personaId: personaId ?? baseAction.personaId,
    executionSettings: {
      ...defaultPlaywrightActionExecutionSettings,
      ...baseAction.executionSettings,
      ...executionSettings,
    },
    blocks: baseAction.blocks.map((block) => ({
      ...block,
      config: { ...block.config },
    })),
    updatedAt: now,
    createdAt: baseAction.createdAt,
  });
};

export const buildProgrammableConnectionActionMigrationPreview = ({
  connection,
  actions,
}: {
  connection: ProgrammableConnectionActionMigrationSource;
  actions: PlaywrightAction[] | undefined;
}): ProgrammableConnectionActionMigrationPreview => {
  const listingBaseAction = resolveProgrammableBaseAction({
    actions,
    selectedActionId: connection.playwrightListingActionId,
    defaultRuntimeKey: 'playwright_programmable_listing',
  });
  const importBaseAction = resolveProgrammableBaseAction({
    actions,
    selectedActionId: connection.playwrightImportActionId,
    defaultRuntimeKey: 'playwright_programmable_import',
  });
  const { personaId, executionSettings } = extractConnectionActionExecutionSettings(connection);
  const hasStoredProxyPassword = connection.playwrightProxyHasPassword === true;
  const legacySummary = buildLegacyBrowserBehaviorSummary({
    personaId,
    executionSettings,
    hasStoredProxyPassword,
  });

  return {
    hasLegacyBrowserBehavior: legacySummary.length > 0,
    legacySummary,
    requiresManualProxyPasswordInput:
      hasStoredProxyPassword && executionSettings.proxyPassword === undefined,
    listingBaseAction,
    importBaseAction,
    listingDraftAction: buildProgrammableMigrationDraftAction({
      baseAction: listingBaseAction,
      connection,
      sessionKind: 'listing',
      personaId,
      executionSettings,
    }),
    importDraftAction: buildProgrammableMigrationDraftAction({
      baseAction: importBaseAction,
      connection,
      sessionKind: 'import',
      personaId,
      executionSettings,
    }),
    cleanupPayload: {
      playwrightBrowser: null,
      playwrightPersonaId: null,
      resetPlaywrightOverrides: legacySummary.length > 0,
    },
  };
};

export const mergePlaywrightActionsWithProgrammableConnectionDrafts = ({
  actions,
  listingDraftAction,
  importDraftAction,
}: {
  actions: PlaywrightAction[] | undefined;
  listingDraftAction: PlaywrightAction;
  importDraftAction: PlaywrightAction;
}): PlaywrightAction[] => {
  const merged = new Map((actions ?? []).map((action) => [action.id, action]));
  merged.set(listingDraftAction.id, listingDraftAction);
  merged.set(importDraftAction.id, importDraftAction);
  return Array.from(merged.values());
};
