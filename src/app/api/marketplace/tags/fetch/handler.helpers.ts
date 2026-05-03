import type { IntegrationLookupRepository } from '@/shared/contracts/integrations/repositories';
import type { MarketplaceConnectionRequest, MarketplaceFetchResponse } from '@/shared/contracts/integrations/marketplace';
import { badRequestError } from '@/shared/errors/app-error';
import {
  type BaseMarketplaceFetchContext,
  resolveBaseMarketplaceFetchContext,
} from '../../marketplace-fetch.helpers';

export const requireMarketplaceConnectionId = (
  body: Pick<MarketplaceConnectionRequest, 'connectionId'>
): string => {
  if (!body.connectionId) {
    throw badRequestError('connectionId is required');
  }
  return body.connectionId;
};

export const resolveBaseMarketplaceTagFetchContext = (
  integrationRepo: IntegrationLookupRepository,
  connectionId: string
): Promise<BaseMarketplaceFetchContext> =>
  resolveBaseMarketplaceFetchContext(integrationRepo, connectionId, 'tag');

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
