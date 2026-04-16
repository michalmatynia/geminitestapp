import type {
  ProductMarketplaceContentOverride,
  ProductRecord,
} from '@/shared/contracts/products/product';
import { normalizeProductMarketplaceContentOverrides } from '@/shared/contracts/products/product';

type ListingCopyLocale = 'en' | 'pl' | 'de';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const resolveLocalizedProductValue = (
  product: Pick<
    ProductRecord,
    'name_en' | 'name_pl' | 'name_de' | 'description_en' | 'description_pl' | 'description_de'
  >,
  field: 'name' | 'description',
  preferredLocales: readonly ListingCopyLocale[]
): string => {
  const fieldValueByLocale: Record<ListingCopyLocale, string> =
    field === 'name'
      ? {
          en: toTrimmedString(product.name_en),
          pl: toTrimmedString(product.name_pl),
          de: toTrimmedString(product.name_de),
        }
      : {
          en: toTrimmedString(product.description_en),
          pl: toTrimmedString(product.description_pl),
          de: toTrimmedString(product.description_de),
        };

  for (const locale of preferredLocales) {
    const resolved = fieldValueByLocale[locale];
    if (resolved) return resolved;
  }

  return Object.values(fieldValueByLocale).find(Boolean) ?? '';
};

export const resolveMarketplaceContentOverride = (
  overrides: unknown,
  integrationId: string | null | undefined
): ProductMarketplaceContentOverride | null => {
  const normalizedIntegrationId = toTrimmedString(integrationId);
  if (!normalizedIntegrationId) return null;

  return (
    normalizeProductMarketplaceContentOverrides(overrides).find((entry) =>
      entry.integrationIds.includes(normalizedIntegrationId)
    ) ?? null
  );
};

export const resolveMarketplaceAwareProductCopy = ({
  product,
  integrationId,
  preferredLocales,
}: {
  product: Pick<
    ProductRecord,
    | 'id'
    | 'sku'
    | 'name_en'
    | 'name_pl'
    | 'name_de'
    | 'description_en'
    | 'description_pl'
    | 'description_de'
    | 'marketplaceContentOverrides'
  >;
  integrationId?: string | null | undefined;
  preferredLocales: readonly ListingCopyLocale[];
}): {
  title: string;
  description: string;
  override: ProductMarketplaceContentOverride | null;
} => {
  const override = resolveMarketplaceContentOverride(
    product.marketplaceContentOverrides,
    integrationId
  );
  const baseTitle =
    resolveLocalizedProductValue(product, 'name', preferredLocales) ||
    toTrimmedString(product.sku) ||
    `Product ${product.id}`;
  const title = toTrimmedString(override?.title) || baseTitle;
  const description =
    toTrimmedString(override?.description) ||
    resolveLocalizedProductValue(product, 'description', preferredLocales) ||
    title;

  return {
    title,
    description,
    override,
  };
};
