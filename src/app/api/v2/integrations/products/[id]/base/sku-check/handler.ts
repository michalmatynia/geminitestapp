import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getIntegrationRepository, checkBaseSkuExists } from '@/features/integrations/server';
import { resolveBaseConnectionToken } from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import { getProductRepository } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

const requestSchema = z.object({
  connectionId: z.string().trim().min(1),
  inventoryId: z.string().trim().min(1),
});

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

const isBaseIntegrationSlug = (value: string | null | undefined): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  return BASE_INTEGRATION_SLUGS.has(normalized);
};

/**
 * POST /api/v2/integrations/products/[id]/base/sku-check
 * Checks if the current product SKU exists in the target Base.com inventory.
 */
export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = params.id?.trim() ?? '';
  if (!productId) {
    throw badRequestError('Product id is required.');
  }

  const parsed = await parseJsonBody(req, requestSchema, {
    logPrefix: 'integrations.products.base.sku-check.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const connectionId = parsed.data.connectionId.trim();
  const inventoryId = parsed.data.inventoryId.trim();

  const [productRepository, integrationRepository] = await Promise.all([
    getProductRepository(),
    getIntegrationRepository(),
  ]);

  const product = await productRepository.getProductById(productId);
  if (!product) {
    throw notFoundError('Product not found.', { productId });
  }

  const sku = (product.sku ?? '').trim();
  if (!sku) {
    throw badRequestError('Product SKU is required to check Base.com availability.', {
      productId,
    });
  }

  const connection = await integrationRepository.getConnectionById(connectionId);
  if (!connection) {
    throw notFoundError('Connection not found.', { connectionId });
  }

  const integration = await integrationRepository.getIntegrationById(connection.integrationId);
  if (!integration || !isBaseIntegrationSlug(integration.slug)) {
    throw badRequestError('Selected connection is not a Base.com integration.', {
      connectionId,
    });
  }

  const tokenResolution = resolveBaseConnectionToken({
    baseApiToken: connection.baseApiToken,
  });
  if (!tokenResolution.token) {
    throw badRequestError(
      tokenResolution.error ??
        'No Base API token configured. Please test or re-save the connection.',
      { connectionId }
    );
  }

  const checkResult = await checkBaseSkuExists(tokenResolution.token, inventoryId, sku);

  return NextResponse.json({
    sku,
    exists: checkResult.exists,
    existingProductId: checkResult.productId?.trim() || null,
  });
}
