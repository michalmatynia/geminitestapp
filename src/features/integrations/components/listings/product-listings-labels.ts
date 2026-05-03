import { isVintedIntegrationSlug } from '@/features/integrations/constants/slugs';
import type { ProductWithImages } from '@/shared/contracts/products/product';

type ProductNameSource = Pick<ProductWithImages, 'name_en' | 'name_pl' | 'name_de'>;

export const resolveProductListingsProductName = (
  product: ProductNameSource | null | undefined
): string =>
  product?.name_en || product?.name_pl || product?.name_de || 'Unnamed Product';

export const resolveIntegrationDisplayName = (
  integrationName: string | null | undefined,
  integrationSlug?: string | null | undefined
): string | null => {
  const normalizedIntegrationName = integrationName?.trim();
  if (!normalizedIntegrationName) {
    return null;
  }

  if (isVintedIntegrationSlug(integrationSlug ?? normalizedIntegrationName)) {
    return 'Vinted.pl';
  }

  return normalizedIntegrationName;
};
