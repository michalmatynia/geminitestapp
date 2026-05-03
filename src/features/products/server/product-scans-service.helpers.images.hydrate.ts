import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import { readOptionalString } from './product-scans-service.helpers.base';
import { writeProductScanTempImageCandidate } from './product-scans-service.helpers.images.shared';

type ProductScanBase64ImageParts = {
  base64Value: string;
  mimeType: string;
};

type HydratedProductImageFileCandidate = {
  candidate: ProductScanRecord['imageCandidates'][number];
  filepath: string | null;
  sourceKey: string;
  url: string | null;
};

const PRODUCT_SCAN_BASE64_DATA_URI_PATTERN = /^data:([^;,]+);base64,(.*)$/is;
const PRODUCT_SCAN_BASE64_VALUE_PATTERN = /^[a-zA-Z0-9+/]+={0,2}$/;

const isValidProductScanBase64Value = (base64Value: string): boolean => {
  if (base64Value.length === 0) return false;
  if (base64Value.length % 4 !== 0) return false;
  return PRODUCT_SCAN_BASE64_VALUE_PATTERN.test(base64Value);
};

const resolveProductScanBase64ImageParts = (
  normalized: string
): ProductScanBase64ImageParts | null => {
  const dataUriMatch = normalized.match(PRODUCT_SCAN_BASE64_DATA_URI_PATTERN);
  const mimeType = dataUriMatch?.[1]?.trim().toLowerCase() ?? 'image/jpeg';
  if (mimeType.startsWith('image/') === false) return null;

  const base64Value = (dataUriMatch?.[2] ?? normalized).replace(/\s+/g, '');
  if (isValidProductScanBase64Value(base64Value) === false) return null;
  return { base64Value, mimeType };
};

const resolveProductScanBase64Image = (
  value: unknown
): { buffer: Buffer; mimeType: string } | null => {
  const normalized = readOptionalString(value);
  if (normalized === null) return null;

  const parts = resolveProductScanBase64ImageParts(normalized);
  if (parts === null) return null;

  return {
    buffer: Buffer.from(parts.base64Value, 'base64'),
    mimeType: parts.mimeType,
  };
};

const collectProcessedScanImageSources = (
  imageCandidates: ProductScanRecord['imageCandidates']
): Set<string> =>
  new Set(
    imageCandidates.flatMap((candidate) =>
      [candidate.url, candidate.filepath].filter((value): value is string => value !== null)
    )
  );

const resolveProductImageFileCandidate = (
  image: ProductWithImages['images'][number]
): HydratedProductImageFileCandidate | null => {
  const imageFile = image.imageFile;
  const filepath = readOptionalString(imageFile.filepath);
  const url =
    readOptionalString(imageFile.publicUrl) ??
    readOptionalString(imageFile.url) ??
    readOptionalString(imageFile.thumbnailUrl);
  const sourceKey = url ?? filepath;
  if (sourceKey === null) return null;

  return {
    candidate: {
      id: readOptionalString(imageFile.id) ?? readOptionalString(image.imageFileId),
      filepath,
      url,
      filename: readOptionalString(imageFile.filename),
    },
    filepath,
    sourceKey,
    url,
  };
};

const trackProcessedProductImageSources = (
  processedSources: Set<string>,
  resolved: HydratedProductImageFileCandidate
): void => {
  processedSources.add(resolved.sourceKey);
  if (resolved.url !== null) processedSources.add(resolved.url);
  if (resolved.filepath !== null) processedSources.add(resolved.filepath);
};

const appendProductImageFileCandidates = (input: {
  product: ProductWithImages;
  results: ProductScanRecord['imageCandidates'];
  processedSources: Set<string>;
}): void => {
  input.product.images.forEach((image) => {
    const resolved = resolveProductImageFileCandidate(image);
    if (resolved === null || input.processedSources.has(resolved.sourceKey)) return;
    input.results.push(resolved.candidate);
    trackProcessedProductImageSources(input.processedSources, resolved);
  });
};

const hydrateBase64ImageCandidate = async (
  value: unknown,
  index: number,
  productId: string
): Promise<ProductScanRecord['imageCandidates'][number] | null> => {
  const resolved = resolveProductScanBase64Image(value);
  if (resolved === null) return null;

  return await writeProductScanTempImageCandidate({
    id: `base64-slot-${index + 1}`,
    filename: null,
    buffer: resolved.buffer,
    mimeType: resolved.mimeType,
    sourceUrl: null,
    productId,
    slotIndex: index,
  });
};

export const hydrateProductScanImageCandidates = async (input: {
  product: ProductWithImages;
  imageCandidates: ProductScanRecord['imageCandidates'];
}): Promise<ProductScanRecord['imageCandidates']> => {
  const results = [...input.imageCandidates];
  appendProductImageFileCandidates({
    product: input.product,
    results,
    processedSources: collectProcessedScanImageSources(results),
  });

  const base64Candidates = await Promise.all(
    (input.product.imageBase64s ?? []).map((value, index) =>
      hydrateBase64ImageCandidate(value, index, input.product.id)
    )
  );

  return [
    ...results,
    ...base64Candidates.filter(
      (candidate): candidate is ProductScanRecord['imageCandidates'][number] => candidate !== null
    ),
  ];
};
