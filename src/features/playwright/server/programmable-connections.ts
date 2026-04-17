import { fetchResolvedPlaywrightRuntimeActions } from '@/shared/lib/browser-execution/runtime-action-resolver.server';
import { encryptSecret } from '@/shared/lib/security/encryption';
import { badRequestError } from '@/shared/errors/app-error';

import type { PlaywrightProgrammableConnectionMutationInput } from './programmable-connections.schemas';
import { serializePlaywrightProgrammableConnection } from './programmable-connections.serializer';
import {
  createPlaywrightProgrammableConnectionRecord,
  listPlaywrightProgrammableConnectionRecords,
  requirePlaywrightProgrammableConnectionById,
  requirePlaywrightProgrammableIntegrationById,
  updatePlaywrightProgrammableConnectionRecord,
} from './programmable-storage';

type ProgrammableConnectionWriteInput = Record<string, unknown>;

const withNullableStringField = <TKey extends string>(
  key: TKey,
  value: string | null | undefined
): Partial<Record<TKey, string | null>> => {
  if (typeof value === 'string' || value === null) {
    const field: Partial<Record<TKey, string | null>> = { [key]: value ?? null };
    return field;
  }

  return {};
};

const withNonEmptyStringField = <TKey extends string>(
  key: TKey,
  value: string | undefined
): Partial<Record<TKey, string>> => {
  if (typeof value === 'string' && value.length > 0) {
    const field: Partial<Record<TKey, string>> = { [key]: value };
    return field;
  }

  return {};
};

const PROGRAMMABLE_PLAYWRIGHT_BROWSER_PAYLOAD_KEYS = [
  'playwrightPersonaId',
  'playwrightBrowser',
  'playwrightIdentityProfile',
  'playwrightSlowMo',
  'playwrightTimeout',
  'playwrightNavigationTimeout',
  'playwrightLocale',
  'playwrightTimezoneId',
  'playwrightHumanizeMouse',
  'playwrightMouseJitter',
  'playwrightClickDelayMin',
  'playwrightClickDelayMax',
  'playwrightInputDelayMin',
  'playwrightInputDelayMax',
  'playwrightActionDelayMin',
  'playwrightActionDelayMax',
  'playwrightProxyEnabled',
  'playwrightProxyServer',
  'playwrightProxyUsername',
  'playwrightProxyPassword',
  'playwrightEmulateDevice',
  'playwrightDeviceName',
] as const;

const PLAYWRIGHT_OVERRIDE_RESET_VALUES = {
  playwrightPersonaId: null,
  playwrightIdentityProfile: null,
  playwrightSlowMo: null,
  playwrightTimeout: null,
  playwrightNavigationTimeout: null,
  playwrightLocale: null,
  playwrightTimezoneId: null,
  playwrightHumanizeMouse: null,
  playwrightMouseJitter: null,
  playwrightClickDelayMin: null,
  playwrightClickDelayMax: null,
  playwrightInputDelayMin: null,
  playwrightInputDelayMax: null,
  playwrightActionDelayMin: null,
  playwrightActionDelayMax: null,
  playwrightProxyEnabled: null,
  playwrightProxyServer: null,
  playwrightProxyUsername: null,
  playwrightProxyPassword: null,
  playwrightProxySessionAffinity: null,
  playwrightProxySessionMode: null,
  playwrightProxyProviderPreset: null,
  playwrightEmulateDevice: null,
  playwrightDeviceName: null,
} as const;

export const assertNoProgrammableConnectionBrowserPayload = (
  data: Record<string, unknown>
): void => {
  const rejectedFields = PROGRAMMABLE_PLAYWRIGHT_BROWSER_PAYLOAD_KEYS.filter((key) =>
    Object.prototype.hasOwnProperty.call(data, key)
  );

  if (rejectedFields.length > 0) {
    throw badRequestError(
      'Programmable connections no longer accept connection-level Playwright browser settings. Edit the selected Step Sequencer action instead.',
      { rejectedFields, integrationSlug: 'playwright-programmable' }
    );
  }
};

const buildProgrammableConnectionCredentialInput = (
  data: PlaywrightProgrammableConnectionMutationInput
): ProgrammableConnectionWriteInput => {
  const normalizedUsername = data.username?.trim();
  const normalizedPassword = data.password?.trim();

  return {
    ...withNonEmptyStringField('username', normalizedUsername),
    ...(typeof normalizedPassword === 'string' && normalizedPassword.length > 0
      ? { password: encryptSecret(normalizedPassword) }
      : {}),
  };
};

const buildProgrammableConnectionScriptInput = (
  data: PlaywrightProgrammableConnectionMutationInput
): ProgrammableConnectionWriteInput => {
  return {
    ...(data.resetPlaywrightOverrides === true ? PLAYWRIGHT_OVERRIDE_RESET_VALUES : {}),
    ...withNullableStringField('playwrightListingScript', data.playwrightListingScript),
    ...withNullableStringField('playwrightImportScript', data.playwrightImportScript),
    ...withNullableStringField('playwrightImportBaseUrl', data.playwrightImportBaseUrl),
    ...withNullableStringField('playwrightListingActionId', data.playwrightListingActionId),
    ...withNullableStringField('playwrightImportActionId', data.playwrightImportActionId),
    ...withNullableStringField(
      'playwrightImportCaptureRoutesJson',
      data.playwrightImportCaptureRoutesJson
    ),
    ...withNullableStringField('playwrightFieldMapperJson', data.playwrightFieldMapperJson),
  };
};

const buildProgrammableConnectionWriteInput = (
  data: PlaywrightProgrammableConnectionMutationInput
): ProgrammableConnectionWriteInput => ({
  name: data.name,
  ...buildProgrammableConnectionCredentialInput(data),
  ...buildProgrammableConnectionScriptInput(data),
});

export const listPlaywrightProgrammableConnections = async (
  integrationId: string
): Promise<ReturnType<typeof serializePlaywrightProgrammableConnection>[]> => {
  await requirePlaywrightProgrammableIntegrationById({
    integrationId,
    errorMessage:
      'Only programmable integrations use the Playwright programmable admin connection API.',
  });
  const [connections, actions] = await Promise.all([
    listPlaywrightProgrammableConnectionRecords(integrationId),
    fetchResolvedPlaywrightRuntimeActions(),
  ]);

  return connections.map((connection) =>
    serializePlaywrightProgrammableConnection({ connection, actions })
  );
};

export const createPlaywrightProgrammableConnection = async ({
  integrationId,
  data,
}: {
  integrationId: string;
  data: PlaywrightProgrammableConnectionMutationInput;
}): Promise<ReturnType<typeof serializePlaywrightProgrammableConnection>> => {
  await requirePlaywrightProgrammableIntegrationById({
    integrationId,
    errorMessage:
      'Only programmable integrations use the Playwright programmable admin connection API.',
  });
  assertNoProgrammableConnectionBrowserPayload(data as Record<string, unknown>);

  const created = await createPlaywrightProgrammableConnectionRecord({
    integrationId,
    input: buildProgrammableConnectionWriteInput(data),
  });
  const actions = await fetchResolvedPlaywrightRuntimeActions();

  return serializePlaywrightProgrammableConnection({ connection: created, actions });
};

export const updatePlaywrightProgrammableConnection = async ({
  connectionId,
  data,
}: {
  connectionId: string;
  data: PlaywrightProgrammableConnectionMutationInput;
}): Promise<ReturnType<typeof serializePlaywrightProgrammableConnection>> => {
  await requirePlaywrightProgrammableConnectionById({
    connectionId,
    errorMessage:
      'Only programmable integrations use the Playwright programmable admin connection API.',
  });
  assertNoProgrammableConnectionBrowserPayload(data as Record<string, unknown>);

  const updated = await updatePlaywrightProgrammableConnectionRecord({
    connectionId,
    input: buildProgrammableConnectionWriteInput(data),
  });
  const actions = await fetchResolvedPlaywrightRuntimeActions();

  return serializePlaywrightProgrammableConnection({ connection: updated, actions });
};
