import {
  DEFAULT_TRADERA_SYSTEM_SETTINGS,
  type TraderaSystemSettings,
} from '@/features/integrations/constants/tradera';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { BrowserListingResultDto, PlaywrightRelistBrowserMode, ProductListing } from '@/shared/contracts/integrations/listings';
export { ensureLoggedIn } from './tradera-browser-auth';
import {
  runTraderaBrowserListingScripted,
  runTraderaBrowserCheckStatus as runTraderaBrowserCheckStatusScripted,
} from './tradera-browser-scripted';
import { runTraderaBrowserListingStandard } from './tradera-browser-standard';

export type { BrowserListingResultDto as TraderaBrowserListingResult };

type TraderaBrowserRunOptions = {
  onRunStarted?: ((runId: string) => Promise<void> | void) | undefined;
};

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
}, options?: TraderaBrowserRunOptions): Promise<BrowserListingResultDto> => {
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
    }, options);
  }

  return runTraderaBrowserListingStandard({
    listing,
    connection,
    systemSettings,
    source,
    action,
  });
};

export const runTraderaBrowserCheckStatus = async ({
  listing,
  connection,
  systemSettings,
  browserMode,
}: {
  listing: ProductListing;
  connection: IntegrationConnectionRecord;
  systemSettings?: TraderaSystemSettings;
  browserMode: PlaywrightRelistBrowserMode;
}, options?: TraderaBrowserRunOptions): Promise<BrowserListingResultDto> =>
  runTraderaBrowserCheckStatusScripted(
    {
      listing,
      connection,
      systemSettings: systemSettings ?? DEFAULT_TRADERA_SYSTEM_SETTINGS,
      browserMode,
    },
    options
  );
