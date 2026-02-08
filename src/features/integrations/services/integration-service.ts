import 'server-only';

import { ErrorSystem } from '@/features/observability/server';

import { getIntegrationRepository } from './integration-repository';

import type {
  IntegrationRecord,
  IntegrationConnectionRecord,
  IntegrationRepository,
} from '../types/integrations';

/**
 * Service that wraps the Integration repository with error handling and logging.
 */
const repoCall = async <K extends keyof IntegrationRepository>(
  key: K,
  ...args: Parameters<IntegrationRepository[K]>
): Promise<Awaited<ReturnType<IntegrationRepository[K]>>> => {
  try {
    const repo = await getIntegrationRepository();
    const fn = repo[key] as (
      ...args: Parameters<IntegrationRepository[K]>
    ) => ReturnType<IntegrationRepository[K]>;
    return await fn(...args) as Promise<Awaited<ReturnType<IntegrationRepository[K]>>>;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'integration-service',
      action: 'repoCall',
      method: key,
    });
    throw error;
  }
};

export const integrationService: IntegrationRepository = {
  listIntegrations: (): Promise<IntegrationRecord[]> => repoCall('listIntegrations'),
  upsertIntegration: (input: { name: string; slug: string }): Promise<IntegrationRecord> =>
    repoCall('upsertIntegration', input),
  getIntegrationById: (id: string): Promise<IntegrationRecord | null> =>
    repoCall('getIntegrationById', id),
  listConnections: (integrationId: string): Promise<IntegrationConnectionRecord[]> =>
    repoCall('listConnections', integrationId),
  getConnectionById: (id: string): Promise<IntegrationConnectionRecord | null> =>
    repoCall('getConnectionById', id),
  getConnectionByIdAndIntegration: (
    id: string,
    integrationId: string
  ): Promise<IntegrationConnectionRecord | null> =>
    repoCall('getConnectionByIdAndIntegration', id, integrationId),
  createConnection: (
    integrationId: string,
    input: { name: string; username: string; password: string }
  ): Promise<IntegrationConnectionRecord> =>
    repoCall('createConnection', integrationId, input),
  updateConnection: (
    id: string,
    input: Partial<IntegrationConnectionRecord>
  ): Promise<IntegrationConnectionRecord> =>
    repoCall('updateConnection', id, input),
  deleteConnection: (id: string): Promise<void> =>
    repoCall('deleteConnection', id),
};
