import { TraderaSystemSettings } from '@/features/integrations/constants/tradera';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { BrowserListingResultDto, PlaywrightRelistBrowserMode, ProductListing } from '@/shared/contracts/integrations/listings';
export { ensureLoggedIn } from './tradera-browser-auth';
import { runTraderaBrowserListingScripted } from './tradera-browser-scripted';
import { runTraderaBrowserListingStandard } from './tradera-browser-standard';

export type { BrowserListingResultDto as TraderaBrowserListingResult };

export const runTraderaBrowserListing = async ({
  listing,
  connection,
  systemSettings,
  source,
  action,
  browserMode,
  syncSkipImages,
}: {
  listing: ProductListing;
  connection: IntegrationConnectionRecord;
  systemSettings: TraderaSystemSettings;
  source: 'manual' | 'scheduler' | 'api';
  action: 'list' | 'relist' | 'sync';
  browserMode: PlaywrightRelistBrowserMode;
  syncSkipImages?: boolean;
}): Promise<BrowserListingResultDto> => {
  // Relist relies on the managed quicklist flow for duplicate detection before creating a new listing.
  if (
    action === 'relist' ||
    action === 'sync' ||
    connection.traderaBrowserMode === 'scripted' ||
    browserMode !== 'connection_default'
  ) {
    return runTraderaBrowserListingScripted({
      listing,
      connection,
      systemSettings,
      source,
      action,
      browserMode,
      syncSkipImages,
    });
  }

  return runTraderaBrowserListingStandard({
    listing,
    connection,
    systemSettings,
    source,
    action,
  });
};
