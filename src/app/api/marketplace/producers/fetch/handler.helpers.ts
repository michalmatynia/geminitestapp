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

export const resolveBaseMarketplaceProducerFetchContext = (
  integrationRepo: IntegrationLookupRepository,
  connectionId: string
): Promise<BaseMarketplaceFetchContext> =>
  resolveBaseMarketplaceFetchContext(integrationRepo, connectionId, 'producer');

export const buildEmptyMarketplaceProducerFetchResponse = (): MarketplaceFetchResponse => ({
  fetched: 0,
  total: 0,
  message:
    'No producers found in Base.com. Verify producer/manufacturer records exist in the selected inventory.',
});

export const buildMarketplaceProducerFetchResponse = (
  syncedCount: number,
  total: number
): MarketplaceFetchResponse => ({
  fetched: syncedCount,
  total,
  message: `Successfully synced ${syncedCount} producers from Base.com`,
});
