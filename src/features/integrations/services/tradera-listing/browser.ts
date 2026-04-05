import { TraderaSystemSettings } from '@/features/integrations/constants/tradera';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { PlaywrightRelistBrowserMode, ProductListing } from '@/shared/contracts/integrations/listings';
export { ensureLoggedIn } from './tradera-browser-auth';
import { runTraderaBrowserListingScripted } from './tradera-browser-scripted';
import { runTraderaBrowserListingStandard } from './tradera-browser-standard';
import type { TraderaBrowserListingResult } from './browser-types';

export type { TraderaBrowserListingResult } from './browser-types';

export const runTraderaBrowserListing = async ({
  listing,
  connection,
  systemSettings,
  source,
  action,
  browserMode,
}: {
  listing: ProductListing;
  connection: IntegrationConnectionRecord;
  systemSettings: TraderaSystemSettings;
  source: 'manual' | 'scheduler' | 'api';
  action: 'list' | 'relist';
  browserMode: PlaywrightRelistBrowserMode;
}): Promise<TraderaBrowserListingResult> => {
  if (connection.traderaBrowserMode === 'scripted' || browserMode !== 'connection_default') {
    return runTraderaBrowserListingScripted({
      listing,
      connection,
      systemSettings,
      source,
      action,
      browserMode,
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
