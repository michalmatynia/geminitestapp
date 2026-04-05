import type { ProductWithImages } from '@/shared/contracts/products/product';

type ProductImageUrlField = 'publicUrl' | 'url' | 'thumbnailUrl' | 'filepath';
type ProductLocalImageField = 'filepath' | 'publicUrl' | 'url';

const PRODUCT_IMAGE_URL_FIELDS: readonly ProductImageUrlField[] = [
  'publicUrl',
  'url',
  'thumbnailUrl',
  'filepath',
];
const PRODUCT_LOCAL_IMAGE_FIELDS: readonly ProductLocalImageField[] = [
  'filepath',
  'publicUrl',
  'url',
];

const normalizeNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const addNormalizedCandidate = (candidates: Set<string>, value: unknown): void => {
  const normalized = normalizeNonEmptyString(value);
  if (normalized) {
    candidates.add(normalized);
  }
};

const collectProductImageCandidates = (
  product: ProductWithImages,
  fields: readonly ProductImageUrlField[] | readonly ProductLocalImageField[]
): string[] => {
  const candidates = new Set<string>();

  (product.imageLinks ?? []).forEach((value) => {
    addNormalizedCandidate(candidates, value);
  });

  (product.images ?? []).forEach((image) => {
    fields.forEach((field) => {
      addNormalizedCandidate(candidates, image.imageFile?.[field]);
    });
  });

  return Array.from(candidates);
};

export const collectProductImageUrlCandidates = (product: ProductWithImages): string[] =>
  collectProductImageCandidates(product, PRODUCT_IMAGE_URL_FIELDS);

export const collectProductLocalImageCandidates = (product: ProductWithImages): string[] =>
  collectProductImageCandidates(product, PRODUCT_LOCAL_IMAGE_FIELDS);

export const readNormalizedScriptInputStrings = (
  scriptInput: Record<string, unknown> | null,
  key: string
): string[] => {
  const values = scriptInput?.[key];
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => normalizeNonEmptyString(value))
    .filter((value): value is string => value !== null);
};

export const resolveScriptInputImageSource = (
  localImagePathCount: number,
  imageUrlCount: number
): 'local' | 'remote' | 'none' => {
  if (localImagePathCount > 0) return 'local';
  if (imageUrlCount > 0) return 'remote';
  return 'none';
};
