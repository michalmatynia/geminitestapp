import { type NextRequest, NextResponse } from 'next/server';

import { getCategoryMappingRepository } from '@/features/integrations/services/category-mapping-repository';
import { categoryMappingCreateInputSchema } from '@/shared/contracts/integrations/listings';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { TRADERA_BROWSER_INTEGRATION_SLUG } from '@/shared/lib/integration-slugs';

import { parseMarketplaceMappingsQuery } from './handler.helpers';
import { assertCategoryMappingsCanBeSaved } from './validation';

/**
 * GET /api/marketplace/mappings
 * Lists category mappings for a connection or supported marketplace.
 * Query params:
 *   - connectionId: The integration connection ID
 *   - marketplace: Supported marketplace scope. Tradera is connection agnostic.
 *   - catalogId (optional): Filter by catalog ID
 */
export async function getHandler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const query = parseMarketplaceMappingsQuery(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );

  const repo = getCategoryMappingRepository();
  const mappings =
    query.marketplace === TRADERA_BROWSER_INTEGRATION_SLUG
      ? await repo.listByMarketplace(query.marketplace, query.catalogId)
      : await repo.listByConnection(query.connectionId ?? '', query.catalogId);

  return NextResponse.json(mappings);
}

/**
 * POST /api/marketplace/mappings
 * Creates a new category mapping.
 */
export async function postHandler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseJsonBody(request, categoryMappingCreateInputSchema, {
    logPrefix: 'marketplace.mappings.create',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { connectionId, externalCategoryId, internalCategoryId, catalogId } = parsed.data;

  if (!connectionId || !externalCategoryId || !internalCategoryId || !catalogId) {
    throw badRequestError(
      'connectionId, externalCategoryId, internalCategoryId, and catalogId are required'
    );
  }

  await assertCategoryMappingsCanBeSaved({
    connectionId,
    mappings: [{ externalCategoryId, internalCategoryId }],
  });

  const repo = getCategoryMappingRepository();

  // Check if mapping already exists
  const existing = await repo.getByExternalCategory(
    connectionId,
    externalCategoryId,
    catalogId
  );

  if (existing) {
    // Update existing mapping
    const updated = await repo.update(existing.id, {
      internalCategoryId,
      isActive: true,
    });
    return NextResponse.json(updated);
  }

  // Create new mapping
  const mapping = await repo.create({
    connectionId,
    externalCategoryId,
    internalCategoryId,
    catalogId,
  });

  return NextResponse.json(mapping, { status: 201 });
}
