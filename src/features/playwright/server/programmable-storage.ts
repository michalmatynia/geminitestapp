import 'server-only';

import type {
  IntegrationConnectionRecord,
  IntegrationConnectionUpdateInput,
  IntegrationRecord,
} from '@/shared/contracts/integration-storage';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { getMongoIntegrationRepository } from '@/shared/lib/integration-repository';

export const PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG = 'playwright-programmable';

const isPlaywrightProgrammableIntegration = (
  integration: Pick<IntegrationRecord, 'slug'> | null | undefined
): boolean =>
  typeof integration?.slug === 'string' &&
  integration.slug.trim().toLowerCase() === PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG;

const requireNonEmptyId = (kind: 'connection' | 'integration', value: string): string => {
  if (value.length === 0) {
    throw badRequestError(`${kind === 'connection' ? 'Connection' : 'Integration'} id is required`);
  }
  return value;
};

const getPlaywrightProgrammableStorage = (): ReturnType<
  typeof getMongoIntegrationRepository
> => getMongoIntegrationRepository();

export const findPlaywrightProgrammableIntegration = async (): Promise<IntegrationRecord | null> => {
  const storage = getPlaywrightProgrammableStorage();
  const integrations = await storage.listIntegrations();
  return (
    integrations.find((integration) => isPlaywrightProgrammableIntegration(integration)) ?? null
  );
};

export const requirePlaywrightProgrammableIntegration = async (): Promise<IntegrationRecord> => {
  const integration = await findPlaywrightProgrammableIntegration();
  if (integration !== null) {
    return integration;
  }

  throw notFoundError('Playwright programmable integration not found', {
    integrationSlug: PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG,
  });
};

export const requirePlaywrightProgrammableIntegrationById = async ({
  integrationId,
  errorMessage,
}: {
  integrationId: string;
  errorMessage: string;
}): Promise<IntegrationRecord> => {
  const nextIntegrationId = requireNonEmptyId('integration', integrationId);
  const storage = getPlaywrightProgrammableStorage();
  const integration = await storage.getIntegrationById(nextIntegrationId);
  if (integration === null) {
    throw notFoundError('Integration not found', { integrationId: nextIntegrationId });
  }

  if (!isPlaywrightProgrammableIntegration(integration)) {
    throw badRequestError(errorMessage, {
      integrationId: nextIntegrationId,
      integrationSlug: integration.slug,
    });
  }

  return integration;
};

export const requirePlaywrightProgrammableConnectionById = async ({
  connectionId,
  errorMessage,
}: {
  connectionId: string;
  errorMessage: string;
}): Promise<{ connection: IntegrationConnectionRecord; integration: IntegrationRecord }> => {
  const nextConnectionId = requireNonEmptyId('connection', connectionId);
  const storage = getPlaywrightProgrammableStorage();
  const connection = await storage.getConnectionById(nextConnectionId);
  if (connection === null) {
    throw notFoundError('Connection not found', { connectionId: nextConnectionId });
  }

  const integration = await storage.getIntegrationById(connection.integrationId);
  if (integration === null) {
    throw notFoundError('Integration not found', { integrationId: connection.integrationId });
  }

  if (!isPlaywrightProgrammableIntegration(integration)) {
    throw badRequestError(errorMessage, {
      connectionId: nextConnectionId,
      integrationId: connection.integrationId,
      integrationSlug: integration.slug,
    });
  }

  return { connection, integration };
};

export const listPlaywrightProgrammableConnectionRecords = async (
  integrationId: string
): Promise<IntegrationConnectionRecord[]> => {
  const nextIntegrationId = requireNonEmptyId('integration', integrationId);
  await requirePlaywrightProgrammableIntegrationById({
    integrationId: nextIntegrationId,
    errorMessage:
      'Only programmable integrations use the Playwright programmable admin connection API.',
  });

  const storage = getPlaywrightProgrammableStorage();
  return storage.listConnections(nextIntegrationId);
};

export const createPlaywrightProgrammableConnectionRecord = async ({
  integrationId,
  input,
}: {
  integrationId: string;
  input: Record<string, unknown>;
}): Promise<IntegrationConnectionRecord> => {
  const nextIntegrationId = requireNonEmptyId('integration', integrationId);
  await requirePlaywrightProgrammableIntegrationById({
    integrationId: nextIntegrationId,
    errorMessage:
      'Only programmable integrations use the Playwright programmable admin connection API.',
  });

  const storage = getPlaywrightProgrammableStorage();
  return storage.createConnection(nextIntegrationId, input);
};

export const updatePlaywrightProgrammableConnectionRecord = async ({
  connectionId,
  input,
}: {
  connectionId: string;
  input: IntegrationConnectionUpdateInput;
}): Promise<IntegrationConnectionRecord> => {
  const nextConnectionId = requireNonEmptyId('connection', connectionId);
  await requirePlaywrightProgrammableConnectionById({
    connectionId: nextConnectionId,
    errorMessage:
      'Only programmable integrations use the Playwright programmable admin connection API.',
  });

  const storage = getPlaywrightProgrammableStorage();
  return storage.updateConnection(nextConnectionId, input);
};
