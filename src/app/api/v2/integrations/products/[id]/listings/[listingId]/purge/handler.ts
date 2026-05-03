import { type NextRequest, NextResponse } from 'next/server';

import {
  findProductListingByIdAcrossProviders,
  listProductListingsByProductIdAcrossProviders,
} from '@/features/integrations/server';
import { getProductRepository } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const BASE_INTEGRATION_SLUGS = new Set(['base', 'base-com', 'baselinker']);

const normalizeString = (value: string | null | undefined): string => (value ?? '').trim();

const resolveCanonicalRemainingBaseProductId = async (
  productId: string
): Promise<string | null> => {
  const listings = await listProductListingsByProductIdAcrossProviders(productId);
  const remainingBaseIds = Array.from(
    new Set(
      listings
        .filter((candidate) =>
          BASE_INTEGRATION_SLUGS.has(normalizeString(candidate.integration.slug).toLowerCase())
        )
        .map((candidate) => normalizeString(candidate.externalListingId))
        .filter((candidate) => candidate.length > 0)
    )
  );

  return remainingBaseIds.length === 1 ? (remainingBaseIds[0] ?? null) : null;
};

export async function deleteHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; listingId: string }
): Promise<Response> {
  const { id: productId, listingId } = params;
  if (productId.trim().length === 0 || listingId.trim().length === 0) {
    throw badRequestError('Product id and listing id are required');
  }
  const resolved = await findProductListingByIdAcrossProviders(listingId);
  if (resolved?.listing.productId !== productId) {
    throw notFoundError('Listing not found', { listingId, productId });
  }

  await resolved.repository.deleteListing(listingId);
  try {
    const productRepository = await getProductRepository();
    const product = await productRepository.getProductById(productId);
    const normalizedCurrentBaseProductId = normalizeString(product?.baseProductId);
    const nextBaseProductId = await resolveCanonicalRemainingBaseProductId(productId);

    if (normalizedCurrentBaseProductId !== normalizeString(nextBaseProductId)) {
      await productRepository.updateProduct(productId, {
        baseProductId: nextBaseProductId,
      });
    }
  } catch (error) {
    void ErrorSystem.captureException(error);

    // Keep history purge successful even if local product cleanup fails.
  }
  return new NextResponse(null, { status: 204 });
}
