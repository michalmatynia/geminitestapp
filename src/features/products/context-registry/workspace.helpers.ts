// Workspace helpers: string and title helpers used across the product editor
// context workspace. Keep these small, deterministic, and free of runtime
// side-effects so they can be used in server and client contexts.
import type {
  ProductStudioVariantsResponse,
} from '@/features/products/context/ProductStudioContext.types';
import type { ProductWithImages } from '@/shared/contracts/products/product';

const normalizeTrimmedText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized ? normalized : null;
};

const truncateText = (value: string, maxLength: number): string =>
  value.length <= maxLength
    ? value
    : `${value.slice(0, Math.max(0, maxLength - 1))}...`;

const pickFirstTrimmedText = (
  values: Array<string | null | undefined>,
  maxLength: number
): string | null => {
  for (const value of values) {
    const normalized = trimText(value, maxLength);
    if (normalized) {
      return normalized;
    }
  }
  return null;
};

export const trimText = (value: string | null | undefined, maxLength: number): string | null => {
  const normalized = normalizeTrimmedText(value);
  return normalized ? truncateText(normalized, maxLength) : null;
};

export const pickProductTitle = (product: ProductWithImages): string =>
  pickFirstTrimmedText(
    [product.name_en, product.name_pl, product.name_de, product.sku, product.id],
    120
  ) ?? product.id;

export const resolveProductEditorEntityKey = ({
  productId,
  draftId,
}: {
  productId: string | null;
  draftId: string | null;
}): string => pickFirstTrimmedText([productId, draftId], 120) ?? 'unsaved';

export const resolveProductEditorTitle = (input: {
  productTitle: string | null;
  productId: string | null;
  draftId: string | null;
}): string =>
  pickFirstTrimmedText([input.productTitle, input.productId, input.draftId], 120) ??
  'Unsaved product';

export const resolveVariantImagePath = (
  variant: ProductStudioVariantsResponse['variants'][number]
): string | null => variant.imageFile?.filepath ?? variant.imageUrl ?? null;

export const summarizeVariant = (
  variant: ProductStudioVariantsResponse['variants'][number]
): Record<string, unknown> => ({
  id: variant.id,
  name: variant.name,
  folderPath: variant.folderPath ?? null,
  createdAt: variant.createdAt ?? null,
  imagePath: resolveVariantImagePath(variant),
});
