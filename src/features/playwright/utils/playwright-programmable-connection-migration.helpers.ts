import type {
  IntegrationConnection,
  LegacyIntegrationConnectionPlaywrightSettings,
} from '@/shared/contracts/integrations/connections';
import {
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
  type PlaywrightAction,
  type PlaywrightActionExecutionSettings,
} from '@/shared/contracts/playwright-steps';
import { getPlaywrightRuntimeActionSeed } from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';

import { extractIntegrationConnectionPlaywrightSettingsOverrides } from './playwright-legacy-connection-overrides';
import { normalizeIntegrationConnectionPlaywrightPersonaId } from './playwright-settings-baseline';

type ProgrammableSessionKind = 'listing' | 'import';

type ProgrammableConnectionLegacyBehaviorFields = Pick<
  LegacyIntegrationConnectionPlaywrightSettings,
  | 'playwrightBrowser'
  | 'playwrightPersonaId'
  | 'playwrightIdentityProfile'
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
> &
  Pick<IntegrationConnection, 'playwrightListingActionId' | 'playwrightImportActionId'>;

export type ProgrammableConnectionActionMigrationSource = Pick<
  IntegrationConnection,
  'id' | 'name' | 'integrationId'
> &
  Partial<ProgrammableConnectionLegacyBehaviorFields>;

const LEGACY_BROWSER_BEHAVIOR_LABELS: Array<
  [keyof PlaywrightActionExecutionSettings | 'browserPreference' | 'personaId', string]
> = [
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

const resolveLegacyConnectionBrowserPreference = (
  connection: Pick<LegacyIntegrationConnectionPlaywrightSettings, 'playwrightBrowser'>
): 'auto' | 'brave' | 'chrome' | 'chromium' | undefined => {
  const browser = connection.playwrightBrowser;
  return browser === 'auto' ||
    browser === 'brave' ||
    browser === 'chrome' ||
    browser === 'chromium'
    ? browser
    : undefined;
};

export const resolveProgrammableBaseAction = ({
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

export const extractConnectionActionExecutionSettings = (
  connection: ProgrammableConnectionActionMigrationSource
): {
  personaId: string | null;
  executionSettings: Partial<PlaywrightActionExecutionSettings>;
} => {
  const overrides = extractIntegrationConnectionPlaywrightSettingsOverrides(connection);
  const browserPreference = resolveLegacyConnectionBrowserPreference(connection);
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

export const buildLegacyBrowserBehaviorSummary = ({
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

export const buildProgrammableMigrationDraftAction = ({
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
