import { resolveBaseConnectionToken } from '@/features/integrations/server';
import type { IntegrationLookupRepository } from '@/shared/contracts/integrations/repositories';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

export const BASE_MARKETPLACE_SLUGS = new Set(['baselinker', 'base', 'base-com']);

export type BaseMarketplaceFetchContext = {
  connectionId: string;
  inventoryId: string | null;
  token: string;
};

export const resolveBaseMarketplaceFetchContext = async (
  integrationRepo: IntegrationLookupRepository,
  connectionId: string,
  resourceLabel: string
): Promise<BaseMarketplaceFetchContext> => {
  const connection = await integrationRepo.getConnectionById(connectionId);
  if (!connection) {
    throw notFoundError('Connection not found');
  }

  const integration = await integrationRepo.getIntegrationById(connection.integrationId);
  if (!integration) {
    throw notFoundError('Integration not found');
  }

  const integrationSlug = integration.slug?.toLowerCase();
  if (!integrationSlug || !BASE_MARKETPLACE_SLUGS.has(integrationSlug)) {
    throw badRequestError(`Only Base.com connections are supported for ${resourceLabel} fetch`);
  }

  const tokenResolution = resolveBaseConnectionToken({
    baseApiToken: connection.baseApiToken,
  });
  if (!tokenResolution.token) {
    throw badRequestError(
      tokenResolution.error ?? 'Base.com API token not configured for this connection'
    );
  }

  return {
    connectionId,
    inventoryId: connection.baseLastInventoryId ?? null,
    token: tokenResolution.token,
  };
};
