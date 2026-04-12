import type { ProductScanImageCandidate } from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products/product';

export const PRODUCT_SCAN_IMAGE_CANDIDATE_LIMIT = 3;
const PRODUCT_SCAN_DISPLAY_NAME_MAX_LENGTH = 300;

export const normalizeOptionalProductScanString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const collectCandidateKeys = (...values: Array<string | null | undefined>): string[] =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))));

export const resolveProductScanDisplayName = (
  product: Pick<ProductWithImages, 'id' | 'name_en' | 'name_pl' | 'name_de' | 'sku'>
): string => {
  const rawName =
    product.name_en?.trim() ||
    product.name_pl?.trim() ||
    product.name_de?.trim() ||
    product.sku?.trim() ||
    product.id;

  return rawName.slice(0, PRODUCT_SCAN_DISPLAY_NAME_MAX_LENGTH);
};

export const resolveProductScanImageCandidates = (
  product: Pick<ProductWithImages, 'images' | 'imageLinks'>,
  limit = PRODUCT_SCAN_IMAGE_CANDIDATE_LIMIT
): ProductScanImageCandidate[] => {
  const seen = new Set<string>();
  const urlBackedCandidates: ProductScanImageCandidate[] = [];
  const fileOnlyCandidates: ProductScanImageCandidate[] = [];

  for (const image of Array.isArray(product.images) ? product.images : []) {
    const imageFile = image.imageFile;
    const url =
      normalizeOptionalProductScanString(imageFile?.publicUrl) ??
      normalizeOptionalProductScanString(imageFile?.url);
    const filepath = normalizeOptionalProductScanString(imageFile?.filepath);
    const id =
      normalizeOptionalProductScanString(imageFile?.id) ??
      normalizeOptionalProductScanString(image.imageFileId);

    if (!filepath && !url) {
      continue;
    }

    const candidateKeys = collectCandidateKeys(filepath, url, id);
    const key = candidateKeys[0] ?? null;

    if (!key || candidateKeys.some((candidateKey) => seen.has(candidateKey))) {
      continue;
    }

    candidateKeys.forEach((candidateKey) => seen.add(candidateKey));
    const candidate = {
      id,
      url,
      filepath,
      filename: normalizeOptionalProductScanString(imageFile?.filename),
    };
    if (url) {
      urlBackedCandidates.push(candidate);
    } else {
      fileOnlyCandidates.push(candidate);
    }
  }

  for (const imageLink of Array.isArray(product.imageLinks) ? product.imageLinks : []) {
    const normalizedUrl = normalizeOptionalProductScanString(imageLink);
    if (!normalizedUrl || seen.has(normalizedUrl)) {
      continue;
    }

    seen.add(normalizedUrl);
    urlBackedCandidates.push({
      id: null,
      url: normalizedUrl,
      filepath: null,
      filename: null,
    });
  }

  return [...urlBackedCandidates, ...fileOnlyCandidates].slice(0, limit);
};
