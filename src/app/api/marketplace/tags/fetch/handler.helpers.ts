import { resolveBaseConnectionToken } from '@/features/integrations/server';
import type { MarketplaceConnectionRequest, MarketplaceFetchResponse } from '@/shared/contracts/integrations/marketplace';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

const BASE_MARKETPLACE_SLUGS = new Set(['baselinker', 'base', 'base-com']);

type TagFetchConnectionRecord = {
  integrationId: string;
  baseApiToken?: string | null;
  baseLastInventoryId?: string | null;
};

type TagFetchIntegrationRecord = {
  slug?: string | null;
};

export type TagFetchIntegrationRepository = {
  getConnectionById: (id: string) => Promise<TagFetchConnectionRecord | null>;
  getIntegrationById: (id: string) => Promise<TagFetchIntegrationRecord | null>;
};

export type BaseMarketplaceTagFetchContext = {
  connectionId: string;
  inventoryId: string | null;
  token: string;
};

export const requireMarketplaceConnectionId = (
  body: Pick<MarketplaceConnectionRequest, 'connectionId'>
): string => {
  if (!body.connectionId) {
    throw badRequestError('connectionId is required');
  }
  return body.connectionId;
};

export const resolveBaseMarketplaceTagFetchContext = async (
  integrationRepo: TagFetchIntegrationRepository,
  connectionId: string
): Promise<BaseMarketplaceTagFetchContext> => {
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
    throw badRequestError('Only Base.com connections are supported for tag fetch');
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

export const buildEmptyMarketplaceTagFetchResponse = (): MarketplaceFetchResponse => ({
  fetched: 0,
  total: 0,
  message: 'No tags found in Base.com. Verify tag/label records exist in the selected inventory.',
});

export const buildMarketplaceTagFetchResponse = (
  syncedCount: number,
  total: number
): MarketplaceFetchResponse => ({
  fetched: syncedCount,
  total,
  message: `Successfully synced ${syncedCount} tags from Base.com`,
});
