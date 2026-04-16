'use client';

import { memo, useMemo } from 'react';
import type { Row } from '@tanstack/react-table';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { useProductListRowVisualsContext } from '@/features/products/context/ProductListContext';
import { ProductImageCell } from '@/features/products/components/cells/ProductImageCell';
import { resolveProductImageUrl } from '@/shared/utils/image-routing';
import { getProductDisplayName, getImageFilepath } from '../product-column-utils';

function resolveFirstValid(items: string[] | null | undefined): string | undefined {
  if (!Array.isArray(items)) return undefined;
  return items.find((l) => typeof l === 'string' && l !== '');
}

type BaseCandidate = { resFile: string | undefined, resLink: string | undefined, firstBase64: string | undefined };

function resolveBaseCandidate(product: ProductWithImages, imageExternalBaseUrl: string | null | undefined): BaseCandidate {
  const images = Array.isArray(product.images) ? product.images : [];
  const firstFile = getImageFilepath(images[0]?.imageFile);
  const resFile = resolveProductImageUrl(firstFile, imageExternalBaseUrl) ?? undefined;

  const firstLink = resolveFirstValid(product.imageLinks);
  const resLink = resolveProductImageUrl(firstLink, imageExternalBaseUrl) ?? undefined;

  const firstBase64 = resolveFirstValid(product.imageBase64s);

  return { resFile, resLink, firstBase64 };
}

const CANDIDATE_KEYS: Record<string, (keyof BaseCandidate)[]> = {
  link: ['resLink', 'resFile', 'firstBase64'],
  base64: ['firstBase64', 'resFile', 'resLink'],
  file: ['resFile', 'resLink', 'firstBase64'],
};

function resolveCandidateImageUrl(
  base: BaseCandidate, 
  thumbnailSource: string
): string | undefined {
  const keys = CANDIDATE_KEYS[thumbnailSource] ?? CANDIDATE_KEYS.file;
  return base[keys[0]] ?? base[keys[1]] ?? base[keys[2]];
}

export const ImageCell: React.FC<{ row: Row<ProductWithImages> }> = memo(({ row }) => {
  const product = row.original;
  const visuals = useProductListRowVisualsContext();
  const source = visuals.thumbnailSource;

  const imageUrl = useMemo(() => {
    const base = resolveBaseCandidate(product, visuals.imageExternalBaseUrl);
    return resolveCandidateImageUrl(base, source);
  }, [product, source, visuals.imageExternalBaseUrl]);

  const name = getProductDisplayName(product);

  return (
    <ProductImageCell
      imageUrl={imageUrl ?? null}
      productId={product.id}
      productName={name}
      note={product.notes ?? null}
    />
  );
});

ImageCell.displayName = 'ImageCell';
