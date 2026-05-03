import type { ProductScanImageCandidate } from '@/shared/contracts/product-scans';
import type { ProductImageRecord, ProductWithImages } from '@/shared/contracts/products/product';

export const PRODUCT_SCAN_IMAGE_CANDIDATE_LIMIT = 3;
const PRODUCT_SCAN_DISPLAY_NAME_MAX_LENGTH = 300;
const HTTP_IMAGE_FILEPATH_PATTERN = /^https?:\/\//i;

export const normalizeOptionalProductScanString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

type ProductScanImageCandidateBuckets = {
  seen: Set<string>;
  fileBackedCandidates: ProductScanImageCandidate[];
  urlOnlyCandidates: ProductScanImageCandidate[];
};

const collectCandidateKeys = (...values: Array<string | null | undefined>): string[] =>
  Array.from(
    new Set(
      values.filter(
        (value: string | null | undefined): value is string =>
          value !== null && value !== undefined && value !== ''
      )
    )
  );

const resolveFirstProductScanDisplayName = (
  product: Pick<ProductWithImages, 'id' | 'name_en' | 'name_pl' | 'name_de' | 'sku'>
): string => {
  const candidates = [product.name_en, product.name_pl, product.name_de, product.sku]
    .map((value: string | null | undefined): string | null =>
      normalizeOptionalProductScanString(value)
    )
    .filter((value: string | null): value is string => value !== null);
  return candidates[0] ?? product.id;
};

export const resolveProductScanDisplayName = (
  product: Pick<ProductWithImages, 'id' | 'name_en' | 'name_pl' | 'name_de' | 'sku'>
): string => {
  const rawName = resolveFirstProductScanDisplayName(product);
  return rawName.slice(0, PRODUCT_SCAN_DISPLAY_NAME_MAX_LENGTH);
};

const resolveFilepathUrl = (rawFilepath: string | null): string | null => {
  if (rawFilepath === null) return null;
  return HTTP_IMAGE_FILEPATH_PATTERN.test(rawFilepath) ? rawFilepath : null;
};

const resolveLocalFilepath = (rawFilepath: string | null): string | null => {
  if (rawFilepath === null) return null;
  return HTTP_IMAGE_FILEPATH_PATTERN.test(rawFilepath) ? null : rawFilepath;
};

const resolveImageRecordCandidate = (
  image: ProductImageRecord
): ProductScanImageCandidate | null => {
  const imageFile = image.imageFile;
  const rawFilepath = normalizeOptionalProductScanString(imageFile.filepath);
  const url =
    normalizeOptionalProductScanString(imageFile.publicUrl) ??
    normalizeOptionalProductScanString(imageFile.url) ??
    normalizeOptionalProductScanString(imageFile.thumbnailUrl) ??
    resolveFilepathUrl(rawFilepath);
  const filepath = resolveLocalFilepath(rawFilepath);

  if (filepath === null && url === null) return null;

  return {
    id:
      normalizeOptionalProductScanString(imageFile.id) ??
      normalizeOptionalProductScanString(image.imageFileId),
    url,
    filepath,
    filename: normalizeOptionalProductScanString(imageFile.filename),
  };
};

const addCandidateIfUnique = (
  buckets: ProductScanImageCandidateBuckets,
  candidate: ProductScanImageCandidate
): void => {
  const candidateKeys = collectCandidateKeys(candidate.filepath, candidate.url, candidate.id);
  const key = candidateKeys[0] ?? null;

  if (key === null || candidateKeys.some((candidateKey: string): boolean => buckets.seen.has(candidateKey))) {
    return;
  }

  candidateKeys.forEach((candidateKey: string): void => {
    buckets.seen.add(candidateKey);
  });
  if (candidate.filepath !== null) {
    buckets.fileBackedCandidates.push(candidate);
    return;
  }
  buckets.urlOnlyCandidates.push(candidate);
};

const addImageRecordCandidate = (
  buckets: ProductScanImageCandidateBuckets,
  image: ProductImageRecord
): void => {
  const candidate = resolveImageRecordCandidate(image);
  if (candidate !== null) {
    addCandidateIfUnique(buckets, candidate);
  }
};

const addImageLinkCandidate = (
  buckets: ProductScanImageCandidateBuckets,
  imageLink: string
): void => {
  const normalizedUrl = normalizeOptionalProductScanString(imageLink);
  if (normalizedUrl === null) return;
  addCandidateIfUnique(buckets, {
    id: null,
    url: normalizedUrl,
    filepath: null,
    filename: null,
  });
};

export const resolveProductScanImageCandidates = (
  product: Pick<ProductWithImages, 'images' | 'imageLinks'>,
  limit = PRODUCT_SCAN_IMAGE_CANDIDATE_LIMIT
): ProductScanImageCandidate[] => {
  const buckets: ProductScanImageCandidateBuckets = {
    seen: new Set<string>(),
    fileBackedCandidates: [],
    urlOnlyCandidates: [],
  };

  for (const image of product.images) {
    addImageRecordCandidate(buckets, image);
  }

  for (const imageLink of product.imageLinks ?? []) {
    addImageLinkCandidate(buckets, imageLink);
  }

  return [...buckets.fileBackedCandidates, ...buckets.urlOnlyCandidates].slice(0, limit);
};
