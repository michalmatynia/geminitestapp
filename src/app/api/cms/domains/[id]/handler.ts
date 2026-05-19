import { type NextRequest, NextResponse } from 'next/server';

import { deleteCmsDomain, setCmsDomainAlias } from '@/features/cms/server';
import { cmsDomainUpdateSchema } from '@/features/cms/server';
import { logCmsActivity } from '@/features/cms/services/cms-activity';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { IdDto as ApiParams } from '@/shared/contracts/base';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

/**
 * CMS Domain Detail API Handlers
 *
 * HTTP request handlers for individual CMS domain operations.
 * Handlers: getHandler, putHandler, deleteHandler
 *
 * - Retrieves, updates, and deletes CMS domains
 * - Manages domain configuration and routing
 * - Validates domain settings before persistence
 */

/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function putHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: ApiParams
): Promise<Response> {
  const parsed = await parseJsonBody(req, cmsDomainUpdateSchema, {
    logPrefix: 'cms-domains',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const updated = await setCmsDomainAlias(params.id, parsed.data.aliasOf ?? null);
  void logCmsActivity({
    event: 'DOMAIN_UPDATED',
    description: 'Updated CMS domain',
    userId: ctx.userId ?? null,
    entityId: params.id,
    entityType: 'cms_domain',
    metadata: { aliasOf: parsed.data.aliasOf ?? null },
  }).catch(() => {});
  return NextResponse.json(updated ?? {});
}

/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function deleteHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: ApiParams
): Promise<Response> {
  await deleteCmsDomain(params.id);
  void logCmsActivity({
    event: 'DOMAIN_DELETED',
    description: 'Deleted CMS domain',
    userId: ctx.userId ?? null,
    entityId: params.id,
    entityType: 'cms_domain',
  }).catch(() => {});
  return new Response(null, { status: 204 });
}
