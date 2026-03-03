import { 
  normalizeSelectedIds, 
  shouldFilterToUniqueOnly 
} from '../base-import-service-shared';
import { fetchBaseProductIds } from '@/features/integrations/services/imports/base-client';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import type { ProductWithImages } from '@/shared/contracts/products';

export const resolveRunItems = async (input: {
  token: string;
  inventoryId: string;
  selectedIds?: string[];
  limit?: number;
  uniqueOnly: boolean;
}): Promise<string[]> => {
  const selected = normalizeSelectedIds(input.selectedIds);
  let ids =
    selected.length > 0 ? selected : await fetchBaseProductIds(input.token, input.inventoryId);

  if (selected.length === 0 && typeof input.limit === 'number' && input.limit > 0) {
    ids = ids.slice(0, input.limit);
  }

  if (!shouldFilterToUniqueOnly(input) || ids.length === 0) {
    return ids;
  }

  const productRepository = await getProductRepository();
  const existingProducts = await productRepository.getProducts({ page: 1, pageSize: 10_000 });
  const existingBaseIds = new Set(
    existingProducts
      .map((product: ProductWithImages) => product.baseProductId?.trim())
      .filter((value: string | undefined): value is string => Boolean(value))
  );

  return ids.filter((id: string) => !existingBaseIds.has(id));
};
