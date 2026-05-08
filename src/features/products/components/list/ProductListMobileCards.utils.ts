import type { ProductWithImages } from '@/shared/contracts/products/product';
import { resolveProductImageFileUrl, resolveProductImageUrl } from '@/shared/utils/image-routing';

export const EMPTY_PRODUCT_LIST_VALUE = '—';

export const toTrimmedText = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const isNonEmptyText = (value: string | null | undefined): value is string =>
  toTrimmedText(value).length > 0;

const resolveFirstNonEmptyText = (
  values: readonly string[] | null | undefined
): string | undefined => {
  if (values === null || values === undefined) return undefined;
  return values.find(isNonEmptyText);
};

const resolveFirstFileImage = (
  product: ProductWithImages,
  imageExternalBaseUrl: string | null
): string | undefined =>
  product.images
    .map((image) => resolveProductImageFileUrl(image.imageFile, imageExternalBaseUrl))
    .find((filepath): filepath is string => isNonEmptyText(filepath));

type ThumbnailCandidateKey = 'file' | 'link' | 'base64';

const THUMBNAIL_PRIORITY_BY_SOURCE: Record<
  ThumbnailCandidateKey,
  readonly ThumbnailCandidateKey[]
> = {
  file: ['file', 'link', 'base64'],
  link: ['link', 'file', 'base64'],
  base64: ['base64', 'file', 'link'],
};

const chooseThumbnailUrl = ({
  thumbnailSource,
  resolvedFileImage,
  resolvedLinkImage,
  firstBase64Image,
}: {
  thumbnailSource: 'file' | 'link' | 'base64';
  resolvedFileImage: string | undefined;
  resolvedLinkImage: string | undefined;
  firstBase64Image: string | undefined;
}): string | undefined => {
  const candidates: Record<ThumbnailCandidateKey, string | undefined> = {
    file: resolvedFileImage,
    link: resolvedLinkImage,
    base64: firstBase64Image,
  };

  return THUMBNAIL_PRIORITY_BY_SOURCE[thumbnailSource]
    .map((key) => candidates[key])
    .find((candidate): candidate is string => candidate !== undefined);
};

export const resolveThumbnailUrl = (
  product: ProductWithImages,
  thumbnailSource: 'file' | 'link' | 'base64',
  imageExternalBaseUrl: string | null
): string | null => {
  const firstFileImage = resolveFirstFileImage(product, imageExternalBaseUrl);
  const firstLinkImage = resolveFirstNonEmptyText(product.imageLinks);
  const firstBase64Image = resolveFirstNonEmptyText(product.imageBase64s);
  const resolvedFileImage = firstFileImage ?? null;
  const resolvedLinkImage = resolveProductImageUrl(firstLinkImage, imageExternalBaseUrl);

  return (
    chooseThumbnailUrl({
      thumbnailSource,
      resolvedFileImage: resolvedFileImage ?? undefined,
      resolvedLinkImage: resolvedLinkImage ?? undefined,
      firstBase64Image,
    }) ?? null
  );
};

export const formatDateLabel = (value: string | null | undefined): string => {
  const normalizedValue = toTrimmedText(value);
  if (normalizedValue.length === 0) return EMPTY_PRODUCT_LIST_VALUE;

  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return EMPTY_PRODUCT_LIST_VALUE;
  return date.toLocaleDateString();
};

export const joinNonEmptyLabels = (labels: readonly string[]): string =>
  labels
    .map((label) => toTrimmedText(label))
    .filter((label) => label.length > 0)
    .join(', ');
