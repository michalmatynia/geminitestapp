import type {
  BrowserListingResultDto,
  PlaywrightRelistBrowserMode,
  ProductListing,
} from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import { buildCanonicalTraderaListingUrl } from './utils';

export const TRADERA_CHECK_STATUS_RUNTIME_SETTINGS_OVERRIDES = {
  slowMo: 0,
  humanizeMouse: false,
  mouseJitter: 0,
  clickDelayMin: 0,
  clickDelayMax: 0,
  inputDelayMin: 0,
  inputDelayMax: 0,
  actionDelayMin: 0,
  actionDelayMax: 0,
};

const resolveListingUrl = (listing: ProductListing): string | undefined => {
  if (!listing.externalListingId) return undefined;
  return buildCanonicalTraderaListingUrl(listing.externalListingId);
};

export async function resolveTraderaCheckStatus(
  productId: string,
  connectionId: string,
  options: {
    listingUrl?: string | null;
    externalListingId?: string | null;
    headed?: boolean;
  } = {}
): Promise<BrowserListingResultDto> {
  return {
    externalListingId: options.externalListingId ?? null,
    listingUrl: options.listingUrl ?? undefined,
    metadata: {
      productId,
      connectionId,
      headed: options.headed ?? false,
      checkedStatus: null,
      checkStatusError: 'Use runTraderaBrowserCheckStatus for listing-backed status checks.',
    },
  };
}

export async function relistTraderaProductScripted(
  product: ProductWithImages,
  listing: ProductListing,
  options: {
    browserMode: PlaywrightRelistBrowserMode;
  }
): Promise<BrowserListingResultDto> {
  return {
    externalListingId: listing.externalListingId ?? null,
    listingUrl: resolveListingUrl(listing),
    metadata: {
      productId: product.id,
      listingId: listing.id,
      requestedBrowserMode: options.browserMode,
      relistDelegation: 'runTraderaBrowserListingScripted',
    },
  };
}
