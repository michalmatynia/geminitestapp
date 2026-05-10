import 'server-only';

import type {
  ProductScrapeProfile,
  ProductScrapeProfilesListResponse,
} from '@/shared/contracts/products/scrape-profiles';
import { notFoundError } from '@/shared/errors/app-error';
import { PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY } from '@/shared/lib/browser-execution/product-scrape-runtime-constants';

import type { ProductScrapeProfileConfig } from './product-scrape-profiles.candidates';

const BATTLESTOCK_CATALOG_NAME = 'BattleStock';

const PRODUCT_SCRAPE_PROFILES: ProductScrapeProfileConfig[] = [
  {
    id: 'battlestock-warhammer-40k-30k',
    label: 'BattleStock Warhammer 40k / 30k',
    description: 'Products from the BattleStock Warhammer 40k / 30k category.',
    siteHost: 'www.battle-stock.pl',
    sourceUrl: 'https://www.battle-stock.pl/pl/c/Warhammer-40k-30k/45',
    scripterId: 'battlestock-warhammer-40k-30k',
    runtimeActionKey: PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY,
    targetCatalogName: BATTLESTOCK_CATALOG_NAME,
    defaultLimit: null,
    maxPages: 75,
    defaultSourcePriceCurrencyCode: 'PLN',
    sourcePriceCurrencyCodes: ['PLN', 'EUR', 'USD', 'GBP', 'SEK'],
    skuPrefix: 'BATTLESTOCK-',
    supplierName: BATTLESTOCK_CATALOG_NAME,
    priceComment: 'Scraped from BattleStock',
  },
];

const toPublicProfile = (profile: ProductScrapeProfileConfig): ProductScrapeProfile => ({
  id: profile.id,
  label: profile.label,
  description: profile.description,
  siteHost: profile.siteHost,
  sourceUrl: profile.sourceUrl,
  scripterId: profile.scripterId,
  runtimeActionKey: profile.runtimeActionKey,
  targetCatalogName: profile.targetCatalogName,
  defaultLimit: profile.defaultLimit,
  maxPages: profile.maxPages,
  defaultSourcePriceCurrencyCode: profile.defaultSourcePriceCurrencyCode,
  sourcePriceCurrencyCodes: profile.sourcePriceCurrencyCodes,
});

export const listProductScrapeProfiles = (): ProductScrapeProfilesListResponse => ({
  profiles: PRODUCT_SCRAPE_PROFILES.map(toPublicProfile),
});

export const findProductScrapeProfile = (profileId: string): ProductScrapeProfileConfig => {
  const profile = PRODUCT_SCRAPE_PROFILES.find((entry) => entry.id === profileId);
  if (profile === undefined) {
    throw notFoundError(`Scrape profile not found: ${profileId}`, { profileId });
  }
  return profile;
};
