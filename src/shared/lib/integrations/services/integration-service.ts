import 'server-only';

import { logActivity } from '@/shared/utils/observability/activity-service';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { ActivityTypes } from '@/shared/constants/observability';

import { getIntegrationRepository } from './integration-repository';

import type {
  IntegrationRecord,
  IntegrationConnectionRecord,
  IntegrationRepository,
} from '../types/integrations';

/**
 * Helper to call the Integration repository with error handling and logging.
 */
async function repoCall<K extends keyof IntegrationRepository>(
  key: K,
  ...args: Parameters<IntegrationRepository[K]>
): Promise<Awaited<ReturnType<IntegrationRepository[K]>>> {
  try {
    const repo = await getIntegrationRepository();
    const fn = repo[key];
    // @ts-expect-error - Higher order generic function call with spread parameters
    return await fn(...args);
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'integration-service',
      action: 'repoCall',
      method: key,
    });
    throw error;
  }
}

export const integrationService: IntegrationRepository = {
  listIntegrations: (): Promise<IntegrationRecord[]> => repoCall('listIntegrations'),
  upsertIntegration: async (input: { name: string; slug: string }): Promise<IntegrationRecord> => {
    const result = await repoCall('upsertIntegration', input);
    void logActivity({
      type: ActivityTypes.INTEGRATION.UPDATED,
      description: `Upserted integration ${result.name}`,
      entityId: result.id,
      entityType: 'integration',
      metadata: { slug: result.slug },
    }).catch(() => {});
    return result;
  },
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
  createConnection: async (
    integrationId: string,
    input: Record<string, unknown>
  ): Promise<IntegrationConnectionRecord> => {
    const result = await repoCall('createConnection', integrationId, input);
    void logActivity({
      type: ActivityTypes.INTEGRATION.CONNECTION_CREATED,
      description: `Created connection ${result.name}`,
      entityId: result.id,
      entityType: 'integration_connection',
      metadata: { integrationId },
    }).catch(() => {});
    return result;
  },
  updateConnection: async (
    id: string,
    input: Partial<IntegrationConnectionRecord>
  ): Promise<IntegrationConnectionRecord> => {
    const result = await repoCall('updateConnection', id, input);
    void logActivity({
      type: ActivityTypes.INTEGRATION.CONNECTION_UPDATED,
      description: `Updated connection ${result.name}`,
      entityId: result.id,
      entityType: 'integration_connection',
      metadata: { changes: Object.keys(input) },
    }).catch(() => {});
    return result;
  },
  deleteConnection: async (id: string): Promise<void> => {
    await repoCall('deleteConnection', id);
    void logActivity({
      type: ActivityTypes.INTEGRATION.CONNECTION_DELETED,
      description: `Deleted connection ${id}`,
      entityId: id,
      entityType: 'integration_connection',
    }).catch(() => {});
  },
};
