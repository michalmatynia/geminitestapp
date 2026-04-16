import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { CanonicalProductImageEntryDto as TraderaCanonicalProductImageEntry } from '@/shared/contracts/integrations/listings';

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

const collectCandidateIdentityKeys = (value: unknown): string[] => {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized) {
    return [];
  }

  const keys = new Set<string>([normalized]);

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      const pathname = decodeURIComponent(url.pathname || '/').trim();
      if (pathname) {
        keys.add(pathname.startsWith('/') ? pathname : `/${pathname}`);
      }
    } catch {
      // Ignore malformed URLs and keep the raw normalized value.
    }
  } else {
    keys.add(normalized.startsWith('/') ? normalized : `/${normalized}`);
  }

  return Array.from(keys);
};

const addNormalizedCandidate = (candidates: Set<string>, value: unknown): void => {
  const normalized = normalizeNonEmptyString(value);
  if (normalized) {
    candidates.add(normalized);
  }
};

const addCandidateIdentityKeys = (keys: Set<string>, value: unknown): void => {
  collectCandidateIdentityKeys(value).forEach((key) => keys.add(key));
};

const collectNormalizedCandidates = (
  values: readonly unknown[]
): string[] => {
  const candidates = new Set<string>();
  values.forEach((value) => addNormalizedCandidate(candidates, value));
  return Array.from(candidates);
};

const hasSeenCandidateOverlap = (
  seenCandidates: ReadonlySet<string>,
  candidates: ReadonlySet<string>
): boolean => {
  for (const candidate of candidates) {
    if (seenCandidates.has(candidate)) {
      return true;
    }
  }

  return false;
};

export const collectCanonicalTraderaProductImageEntries = (
  product: ProductWithImages
): TraderaCanonicalProductImageEntry[] => {
  const entries: TraderaCanonicalProductImageEntry[] = [];
  const seenCandidateKeys = new Set<string>();

  // product.images is the canonical source of image ordering — emit one slot per
  // product image so Tradera uploads can match the product exactly.
  (product.images ?? []).forEach((image) => {
    const imageUrls = collectNormalizedCandidates(
      PRODUCT_IMAGE_URL_FIELDS.map((field) => image.imageFile?.[field])
    );
    const localCandidates = collectNormalizedCandidates(
      PRODUCT_LOCAL_IMAGE_FIELDS.map((field) => image.imageFile?.[field])
    );
    const candidateIdentityKeys = new Set<string>();
    [...imageUrls, ...localCandidates].forEach((candidate) =>
      addCandidateIdentityKeys(candidateIdentityKeys, candidate)
    );

    if (imageUrls.length === 0 && localCandidates.length === 0) {
      return;
    }

    if (hasSeenCandidateOverlap(seenCandidateKeys, candidateIdentityKeys)) {
      return;
    }

    entries.push({
      imageUrls,
      localCandidates,
    });
    candidateIdentityKeys.forEach((candidate) => seenCandidateKeys.add(candidate));
  });

  // imageLinks may contain additional images not present in product.images;
  // append them only after the canonical images and only when they are new.
  (product.imageLinks ?? []).forEach((value) => {
    const normalized = normalizeNonEmptyString(value);
    if (!normalized) {
      return;
    }

    const candidateIdentityKeys = new Set<string>();
    addCandidateIdentityKeys(candidateIdentityKeys, normalized);
    if (hasSeenCandidateOverlap(seenCandidateKeys, candidateIdentityKeys)) {
      return;
    }

    entries.push({
      imageUrls: [normalized],
      localCandidates: [normalized],
    });
    candidateIdentityKeys.forEach((candidate) => seenCandidateKeys.add(candidate));
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
