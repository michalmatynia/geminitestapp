import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { CanonicalProductImageEntryDto as TraderaCanonicalProductImageEntry } from '@/shared/contracts/integrations/listings';

type ProductImageUrlField = 'publicUrl' | 'url' | 'filepath' | 'thumbnailUrl';
type ProductLocalImageField = 'filepath' | 'publicUrl' | 'url';
type CanonicalTraderaProductImageEntryAccumulator = TraderaCanonicalProductImageEntry & {
  candidateIdentityKeys: Set<string>;
  hasPrimaryRemoteUrl: boolean;
};

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

const appendNormalizedCandidate = (candidates: string[], value: unknown): void => {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized || candidates.includes(normalized)) {
    return;
  }

  candidates.push(normalized);
};

const prependNormalizedCandidate = (candidates: string[], value: unknown): void => {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized || candidates.includes(normalized)) {
    return;
  }

  candidates.unshift(normalized);
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

const buildImageCandidateIdentityKeys = (values: readonly unknown[]): Set<string> => {
  const candidateIdentityKeys = new Set<string>();
  values.forEach((value) => addCandidateIdentityKeys(candidateIdentityKeys, value));
  return candidateIdentityKeys;
};

const buildCanonicalTraderaProductImageEntryAccumulator = (
  image: NonNullable<ProductWithImages['images']>[number]
): CanonicalTraderaProductImageEntryAccumulator | null => {
  const publicUrl = image.imageFile?.publicUrl;
  const url = image.imageFile?.url;
  const imageUrls = collectNormalizedCandidates(
    PRODUCT_IMAGE_URL_FIELDS.map((field) => image.imageFile?.[field])
  );
  const localCandidates = collectNormalizedCandidates(
    PRODUCT_LOCAL_IMAGE_FIELDS.map((field) => image.imageFile?.[field])
  );

  if (imageUrls.length === 0 && localCandidates.length === 0) {
    return null;
  }

  return {
    imageUrls,
    localCandidates,
    candidateIdentityKeys: buildImageCandidateIdentityKeys([...imageUrls, ...localCandidates]),
    hasPrimaryRemoteUrl: Boolean(normalizeNonEmptyString(publicUrl) || normalizeNonEmptyString(url)),
  };
};

const buildLinkOnlyTraderaProductImageEntryAccumulator = (
  value: string
): CanonicalTraderaProductImageEntryAccumulator => ({
  imageUrls: [value],
  localCandidates: [value],
  candidateIdentityKeys: buildImageCandidateIdentityKeys([value]),
  hasPrimaryRemoteUrl: /^https?:\/\//i.test(value),
});

const mergeImageLinkIntoEntry = (
  entry: CanonicalTraderaProductImageEntryAccumulator,
  value: string
): void => {
  if (entry.hasPrimaryRemoteUrl) {
    appendNormalizedCandidate(entry.imageUrls, value);
  } else {
    // Prefer same-slot imageLinks as the primary remote download URL when the
    // persisted product image only has local filepath candidates.
    prependNormalizedCandidate(entry.imageUrls, value);
  }
  appendNormalizedCandidate(entry.localCandidates, value);
  addCandidateIdentityKeys(entry.candidateIdentityKeys, value);
};

export const collectCanonicalTraderaProductImageEntries = (
  product: ProductWithImages
): TraderaCanonicalProductImageEntry[] => {
  const imageSlotEntries: Array<CanonicalTraderaProductImageEntryAccumulator | null> = (
    product.images ?? []
  ).map((image) => buildCanonicalTraderaProductImageEntryAccumulator(image));
  const entries: CanonicalTraderaProductImageEntryAccumulator[] = [];
  const seenCandidateKeys = new Set<string>();

  imageSlotEntries.forEach((entry, index) => {
    if (!entry) {
      return;
    }

    if (hasSeenCandidateOverlap(seenCandidateKeys, entry.candidateIdentityKeys)) {
      imageSlotEntries[index] = null;
      return;
    }

    entries.push(entry);
    entry.candidateIdentityKeys.forEach((candidate) => seenCandidateKeys.add(candidate));
  });

  // imageLinks often mirror the same logical slots as product.images with the
  // original remote URLs. Only merge them into the same index when the
  // canonical product image lacks a primary remote URL; otherwise treat them as
  // additional images appended after the canonical product image order.
  (product.imageLinks ?? []).forEach((value, index) => {
    const normalized = normalizeNonEmptyString(value);
    if (!normalized) {
      return;
    }

    const candidateIdentityKeys = new Set<string>();
    addCandidateIdentityKeys(candidateIdentityKeys, normalized);
    if (hasSeenCandidateOverlap(seenCandidateKeys, candidateIdentityKeys)) {
      return;
    }

    const matchingEntry = imageSlotEntries[index];
    if (matchingEntry && !matchingEntry.hasPrimaryRemoteUrl) {
      mergeImageLinkIntoEntry(matchingEntry, normalized);
      candidateIdentityKeys.forEach((candidate) => seenCandidateKeys.add(candidate));
      return;
    }

    const nextEntry = buildLinkOnlyTraderaProductImageEntryAccumulator(normalized);
    entries.push(nextEntry);
    candidateIdentityKeys.forEach((candidate) => seenCandidateKeys.add(candidate));
  });

  return entries
    .map(({ imageUrls, localCandidates }) => ({
      imageUrls,
      localCandidates,
    }));
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
