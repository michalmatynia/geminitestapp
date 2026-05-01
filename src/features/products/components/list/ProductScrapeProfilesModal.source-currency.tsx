'use client';

import type {
  ProductScrapeProfile,
  ProductScrapeSourcePriceCurrencyCode,
} from '@/shared/contracts/products/scrape-profiles';
import { PRODUCT_SCRAPE_SOURCE_PRICE_CURRENCY_CODES } from '@/shared/contracts/products/scrape-profiles';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Label } from '@/shared/ui/label';

type ProductScrapeProfilesSourceCurrencyFieldProps = {
  selectedProfile: ProductScrapeProfile | null;
  sourcePriceCurrencyCode: ProductScrapeSourcePriceCurrencyCode;
  onSourcePriceCurrencyCodeChange: (code: ProductScrapeSourcePriceCurrencyCode) => void;
};

const normalizeSourcePriceCurrencyCode = (
  value: string
): ProductScrapeSourcePriceCurrencyCode =>
  PRODUCT_SCRAPE_SOURCE_PRICE_CURRENCY_CODES.includes(
    value as ProductScrapeSourcePriceCurrencyCode
  )
    ? (value as ProductScrapeSourcePriceCurrencyCode)
    : 'PLN';

const resolveSourcePriceCurrencyOptions = (
  profile: ProductScrapeProfile | null
): ProductScrapeSourcePriceCurrencyCode[] => {
  const profileCodes = profile?.sourcePriceCurrencyCodes ?? [];
  return profileCodes.length > 0
    ? profileCodes
    : [...PRODUCT_SCRAPE_SOURCE_PRICE_CURRENCY_CODES];
};

export function ProductScrapeProfilesSourceCurrencyField({
  selectedProfile,
  sourcePriceCurrencyCode,
  onSourcePriceCurrencyCodeChange,
}: ProductScrapeProfilesSourceCurrencyFieldProps): React.JSX.Element {
  const currencyOptions = resolveSourcePriceCurrencyOptions(selectedProfile);
  return (
    <div className='space-y-2'>
      <Label htmlFor='product-scrape-profile-source-price-currency'>Source price currency</Label>
      <SelectSimple
        id='product-scrape-profile-source-price-currency'
        size='sm'
        options={currencyOptions.map((code) => ({ value: code, label: code }))}
        value={sourcePriceCurrencyCode}
        onValueChange={(value): void =>
          onSourcePriceCurrencyCodeChange(normalizeSourcePriceCurrencyCode(value))
        }
        placeholder='PLN'
        ariaLabel='Select source price currency'
        title='Select source price currency'
      />
      <p className='text-xs text-muted-foreground'>
        Scraped sourcePrice is stored in this currency before price-group recalculation.
      </p>
    </div>
  );
}
