import type { ProductWithImages } from '@/shared/contracts/products/product';

type ProductImageUrlField = 'publicUrl' | 'url' | 'filepath' | 'thumbnailUrl';
type ProductLocalImageField = 'filepath' | 'publicUrl' | 'url';

const PRODUCT_IMAGE_URL_FIELDS: readonly ProductImageUrlField[] = [
  'publicUrl',
  'url',
  'filepath',
  'thumbnailUrl',
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

const collectNormalizedCandidates = (
  values: readonly unknown[]
): string[] => {
  const candidates = new Set<string>();
  values.forEach((value) => addNormalizedCandidate(candidates, value));
  return Array.from(candidates);
};

export type TraderaCanonicalProductImageEntry = {
  imageUrls: string[];
  localCandidates: string[];
};

export const collectCanonicalTraderaProductImageEntries = (
  product: ProductWithImages
): TraderaCanonicalProductImageEntry[] => {
  const entries: TraderaCanonicalProductImageEntry[] = [];
  const seenExtraCandidates = new Set<string>();

  // product.images is the canonical source of image ordering — emit one slot per
  // product image so Tradera uploads can match the product exactly.
  (product.images ?? []).forEach((image) => {
    const imageUrls = collectNormalizedCandidates(
      PRODUCT_IMAGE_URL_FIELDS.map((field) => image.imageFile?.[field])
    );
    const localCandidates = collectNormalizedCandidates(
      PRODUCT_LOCAL_IMAGE_FIELDS.map((field) => image.imageFile?.[field])
    );
    const allCandidates = new Set<string>([...imageUrls, ...localCandidates]);

    if (imageUrls.length === 0 && localCandidates.length === 0) {
      return;
    }

    entries.push({
      imageUrls,
      localCandidates,
    });
    allCandidates.forEach((candidate) => seenExtraCandidates.add(candidate));
  });

  // imageLinks may contain additional images not present in product.images;
  // append them only after the canonical images and only when they are new.
  (product.imageLinks ?? []).forEach((value) => {
    const normalized = normalizeNonEmptyString(value);
    if (!normalized || seenExtraCandidates.has(normalized)) {
      return;
    }

    entries.push({
      imageUrls: [normalized],
      localCandidates: [normalized],
    });
    seenExtraCandidates.add(normalized);
  });

  return entries;
};

export const collectProductImageUrlCandidates = (product: ProductWithImages): string[] =>
  collectCanonicalTraderaProductImageEntries(product)
    .map((entry) => entry.imageUrls[0] ?? entry.localCandidates[0] ?? null)
    .filter((value): value is string => Boolean(value));

export const collectProductLocalImageCandidates = (product: ProductWithImages): string[] =>
  collectCanonicalTraderaProductImageEntries(product)
    .map((entry) => entry.localCandidates[0] ?? null)
    .filter((value): value is string => Boolean(value));

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
